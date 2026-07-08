import { auth } from "@/server/auth";
import { fetchChatCompletion } from "@/models/service";
import { DEFAULT_MODEL_ID, getModelById } from "@/models/constants";
import { db } from "@/server/db";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatPayload {
  messages: ChatMessage[];
  model?: string;
  chatId: string;
  userApiKey?: string;
}

interface ChatErrorResponse {
  error?: {
    message: string;
    type: string;
    code?: string;
  };
  status?: number;
  message?: string;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const authResult = await auth();
    if (!authResult?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, model = DEFAULT_MODEL_ID, chatId, userApiKey } =
      (await req.json()) as ChatPayload;

    const userContent = messages[messages.length - 1]?.content ?? "";

    // Save user message
    await db.message.create({
      data: {
        chatId,
        content: userContent,
        role: "USER",
      },
    });

    // Auto-generate title from first user message if chat has no title
    const chat = await db.chat.findUnique({ where: { id: chatId }, select: { title: true } });
    if (!chat?.title && userContent) {
      await db.chat.update({
        where: { id: chatId },
        data: { title: userContent.slice(0, 100) },
      });
    }

    const modelInfo = getModelById(model);
    if (!modelInfo) {
      return new Response(
        JSON.stringify({ error: `Model ${model} not supported` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Call the model FIRST so we can return a proper HTTP error if it fails
    let modelResponse: Response;
    try {
      modelResponse = await fetchChatCompletion({
        modelId: model,
        messages,
        stream: true,
        userApiKey,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to communicate with model";
      return new Response(
        JSON.stringify({ error: { message, type: "model_error" } }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!modelResponse.ok) {
      // Forward the upstream error status and body to the client
      let errorBody: ChatErrorResponse = {};
      try {
        errorBody = (await modelResponse.json()) as ChatErrorResponse;
      } catch {
        // ignore parse errors
      }
      const errorMessage =
        errorBody?.error?.message ?? errorBody?.message ?? modelResponse.statusText;
      return new Response(
        JSON.stringify({ error: { message: errorMessage, type: "api_error" } }),
        { status: modelResponse.status, headers: { "Content-Type": "application/json" } },
      );
    }

    // Model responded OK — now set up the stream
    const headers = new Headers();
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    void (async () => {
      let accumulatedContent = "";
      
      try {
        const reader = modelResponse.body?.getReader();
        if (!reader) {
          const encoder = new TextEncoder();
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ error: "No reader available from API" })}\n\n`,
            ),
          );
          await writer.close();
          return;
        }

        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Save AI message to database after stream completes
              if (accumulatedContent.trim()) {
                await db.message.create({
                  data: {
                    chatId,
                    content: accumulatedContent,
                    role: "ASSISTANT",
                  },
                });
                // Update chat timestamp so sidebar ordering stays correct
                await db.chat.update({
                  where: { id: chatId },
                  data: { updatedAt: new Date() },
                });
              }
              
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              await writer.close();
              break;
            }

            // Accumulate content for database storage
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.trim() === "") continue;
              
              if (line.startsWith("data: ")) {
                const data = line.substring(6);
                
                if (data === "[DONE]") continue;
                
                try {
                  const parsedData = JSON.parse(data) as {
                    choices?: Array<{
                      delta?: {
                        content?: string;
                      };
                    }>;
                  };
                  
                  const content = parsedData.choices?.[0]?.delta?.content;
                  if (content) {
                    accumulatedContent += content;
                  }
                } catch (e) {
                  // Ignore parsing errors for non-JSON lines
                }
              }
            }

            await writer.write(value);
          }
        } catch (error) {
          console.error("Error processing stream:", error);
          await writer.abort(error as Error);
        }
      } catch (error) {
        console.error("Error in chat API:", error);
        const encoder = new TextEncoder();
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Failed to communicate with API" })}\n\n`,
          ),
        );
        await writer.close();
      }
    })();

    return new Response(readable, { headers });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
