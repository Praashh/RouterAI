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
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
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

  // OpenAI-compatible (Groq, OpenAI, Google)
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

export async function fetchChatCompletion(
  options: ChatOptions,
): Promise<Response> {
  const model = getModelById(options.modelId);
  if (!model) {
    throw new Error(`Model ${options.modelId} not found`);
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
    console.error(
      `Model ${options.modelId} failed with status ${response.status}`,
    );
  }

  return response;
}
