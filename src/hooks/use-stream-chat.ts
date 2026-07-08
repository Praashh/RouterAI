import { useRef, useCallback } from "react";
import { getModelById, isImageModel } from "@/models/constants";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface UseStreamChatOptions {
  model: string;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLoading: (loading: boolean) => void;
  onScroll?: () => void;
}

export function useStreamChat({
  model,
  setMessages,
  setIsLoading,
  onScroll,
}: UseStreamChatOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStreamError = useCallback(
    (response: Response, errorDetail: string) => {
      const modelInfo = getModelById(model);
      const modelName = modelInfo?.name ?? model;

      if (response.status === 401 || response.status === 403) {
        toast.error(`Invalid API key for ${modelName}`, {
          description: "Please check your API key and try again.",
        });
      } else if (response.status === 429) {
        toast.error(`Rate limit exceeded for ${modelName}`, {
          description:
            "You've exceeded your quota. Please check your plan and billing details.",
        });
      } else {
        toast.error(`${modelName} failed (${response.status})`, {
          description: errorDetail,
        });
      }
    },
    [model],
  );

  const processStream = useCallback(
    async (response: Response) => {
      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorBody = (await response.json()) as {
            error?: { message?: string };
            message?: string;
          };
          errorDetail =
            errorBody?.error?.message ??
            errorBody?.message ??
            response.statusText;
        } catch {
          // ignore
        }
        handleStreamError(response, errorDetail);
        setIsLoading(false);
        return "";
      }

      try {
        const reader = response.body?.getReader();
        if (!reader) {
          setIsLoading(false);
          return "";
        }

        const tempMessageId = `ai-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: tempMessageId, role: "assistant" as const, content: "" },
        ]);

        let accumulatedContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += new TextDecoder().decode(value);
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.trim() === "" || !line.startsWith("data: ")) continue;
            const data = line.substring(6);
            if (data === "[DONE]") continue;

            try {
              const parsedData = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
                error?: string;
              };

              if (parsedData.error) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === tempMessageId
                      ? { ...msg, content: `Error: ${parsedData.error}` }
                      : msg,
                  ),
                );
                break;
              }

              const content = parsedData.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedContent += content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === tempMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg,
                  ),
                );
                onScroll?.();
              }
            } catch (e) {
              console.error("Error parsing JSON:", e, line);
            }
          }
        }

        return accumulatedContent;
      } catch (error) {
        console.error("Error processing stream:", error);
        return "";
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [handleStreamError, setMessages, setIsLoading, onScroll],
  );

  const processImageGeneration = useCallback(
    async (prompt: string, targetChatId: string) => {
      const tempMessageId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempMessageId,
          role: "assistant" as const,
          content: "Generating image...",
        },
      ]);

      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, model, chatId: targetChatId }),
          signal: abortControllerRef.current?.signal,
        });

        const data = (await response.json()) as {
          content?: string;
          error?: string;
        };

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessageId
              ? {
                  ...msg,
                  content:
                    !response.ok || data.error
                      ? `Error: ${data.error ?? "Image generation failed"}`
                      : (data.content ?? ""),
                }
              : msg,
          ),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempMessageId
                ? { ...msg, content: "Error: Failed to generate image" }
                : msg,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [model, setMessages, setIsLoading],
  );

  const sendMessage = useCallback(
    async (
      messages: ChatMessage[],
      chatId: string,
    ) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return "";

      if (isImageModel(model)) {
        await processImageGeneration(lastMessage.content, chatId);
        return "";
      }

      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          model,
          chatId,
        }),
        signal: abortControllerRef.current.signal,
      });

      return processStream(response);
    },
    [model, processStream, processImageGeneration],
  );

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { sendMessage, abort, abortControllerRef };
}
