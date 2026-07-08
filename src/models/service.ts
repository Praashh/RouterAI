import { env } from "@/env";
import { getModelById } from "./constants";
import { ModelProvider } from "./types";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatOptions {
  modelId: string;
  messages: ChatMessage[];
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  fallbackToDefaultModel?: boolean;
  userApiKey?: string;
}

const PROVIDER_ENDPOINTS: Record<ModelProvider, string> = {
  [ModelProvider.GROQ]: "https://api.groq.com/openai/v1/chat/completions",
  [ModelProvider.OPENAI]: "https://api.openai.com/v1/chat/completions",
  [ModelProvider.GOOGLE]:
    "https://generativelanguage.googleapis.com/v1beta/models",
  [ModelProvider.ANTHROPIC]: "https://api.anthropic.com/v1/messages",
};

function getApiKeyForProvider(
  provider: ModelProvider,
  userApiKey?: string,
): string {
  if (provider === ModelProvider.GROQ) {
    return env.GROQ_API_KEY;
  }

  if (userApiKey) {
    return userApiKey;
  }

  throw new Error(
    `No API key provided for ${provider}. Please add your API key in Settings.`,
  );
}

function buildHeaders(
  provider: ModelProvider,
  apiKey: string,
): Record<string, string> {
  if (provider === ModelProvider.ANTHROPIC) {
    return {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  if (provider === ModelProvider.GOOGLE) {
    return {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function buildRequestBody(
  provider: ModelProvider,
  options: ChatOptions,
): Record<string, unknown> {
  const { messages, stream, maxTokens, temperature } = options;

  if (provider === ModelProvider.ANTHROPIC) {
    const systemMessage = messages.find((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    return {
      model: options.modelId.replace("anthropic/", ""),
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      ...(systemMessage && { system: systemMessage.content }),
      max_tokens: maxTokens ?? 4096,
      stream: stream ?? true,
    };
  }

  if (provider === ModelProvider.GOOGLE) {
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystemMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      contents: nonSystemMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content }],
      })),
    };

    if (systemMessages.length > 0) {
      body.systemInstruction = {
        parts: systemMessages.map((m) => ({ text: m.content })),
      };
    }

    if (maxTokens) {
      body.maxOutputTokens = maxTokens;
    }

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    return body;
  }

  // OpenAI-compatible (Groq, OpenAI)
  const body: Record<string, unknown> = {
    model: options.modelId,
    messages,
    stream: stream ?? true,
  };

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  return body;
}

async function handleGoogleStream(response: Response): Promise<Response> {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let buffer = "";

  (async () => {
    try {
      const reader = response.body?.getReader();
      if (!reader) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: "No reader available from API" })}\n\n`,
          ),
        );
        await writer.close();
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let outputBuffer = "";
        for (const line of lines) {
          if (line.trim() === "" || !line.startsWith("data: ")) continue;

          const data = line.substring(6);
          try {
            const parsed = JSON.parse(data) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
                finishReason?: string;
              }>;
            };

            // Each SSE chunk from Google contains only the delta text
            const text =
              parsed.candidates?.[0]?.content?.parts
                ?.map((p) => p.text ?? "")
                .join("") ?? "";
            if (text) {
              outputBuffer += `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
            }
          } catch {
            // skip parse errors
          }
        }
        if (outputBuffer) {
          await writer.write(encoder.encode(outputBuffer));
        }
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error) {
      console.error("Google stream transform error:", error);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function handleGoogleCompletion(options: ChatOptions): Promise<Response> {
  const model = getModelById(options.modelId);
  if (!model) throw new Error(`Model ${options.modelId} not found`);

  const apiKey = getApiKeyForProvider(model.provider, options.userApiKey);
  const headers = buildHeaders(model.provider, apiKey);
  const requestBody = buildRequestBody(model.provider, options);
  const action = options.stream ? "streamGenerateContent" : "generateContent";

  const altParam = options.stream ? "?alt=sse" : "";
  const apiUrl = `${PROVIDER_ENDPOINTS[ModelProvider.GOOGLE]}/${options.modelId}:${action}${altParam}`;

  console.log(`Requesting Google model: ${options.modelId}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const cloned = response.clone();
    try {
      const errorBody = await cloned.text();
      console.error(
        `Google model ${options.modelId} failed with status ${response.status}:`,
        errorBody,
      );
    } catch {
      console.error(
        `Google model ${options.modelId} failed with status ${response.status}`,
      );
    }
    return response;
  }

  if (!options.stream) {
    // Non-streaming: transform Google response to OpenAI format
    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    const body = JSON.stringify({
      choices: [{ message: { role: "assistant", content: text } }],
    });
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
  }

  return handleGoogleStream(response);
}

export async function fetchChatCompletion(
  options: ChatOptions,
): Promise<Response> {
  const model = getModelById(options.modelId);
  if (!model) {
    throw new Error(`Model ${options.modelId} not found`);
  }

  if (model.provider === ModelProvider.GOOGLE) {
    return handleGoogleCompletion(options);
  }

  const apiKey = getApiKeyForProvider(model.provider, options.userApiKey);
  const apiUrl = PROVIDER_ENDPOINTS[model.provider];
  const headers = buildHeaders(model.provider, apiKey);
  const requestBody = buildRequestBody(model.provider, options);

  console.log(`Requesting model: ${options.modelId} via ${model.provider}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (response.ok) {
    console.log(`Successfully used model: ${options.modelId}`);
  } else {
    const cloned = response.clone();
    try {
      const errorBody = await cloned.text();
      console.error(
        `Model ${options.modelId} failed with status ${response.status}:`,
        errorBody,
      );
    } catch {
      console.error(
        `Model ${options.modelId} failed with status ${response.status}`,
      );
    }
  }

  return response;
}
