"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSpeechSynthesis } from "react-speech-kit";
import { useTheme } from "next-themes";
import { Loader2Icon } from "lucide-react";
import { api } from "@/trpc/client";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { MessageActions } from "@/components/chat/MessageActions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SharedChat = ({ chatId: initialChatId }: { chatId: string }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [chatId, setChatId] = useState<string>(initialChatId);
  const [isWrapped, setIsWrapped] = useState(false);

  const { data: chatMessages } = api.chat.getChatById.useQuery({
    chatId: chatId,
  });

  useEffect(() => {
    setChatId(initialChatId);
  }, [initialChatId]);

  // Derive messages directly from query data instead of copying into state
  const messages: ChatMessage[] = useMemo(
    () =>
      chatMessages?.messages.map((message) => ({
        id: message.id,
        role: message.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: message.content,
      })) ?? [],
    [chatMessages],
  );

  const {
    speak,
    cancel,
    speaking,
    supported: ttsSupported,
    voices,
  } = useSpeechSynthesis();
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (ttsSupported && voices.length > 0) {
      const defaultVoice = voices.find((v) => v.default) || voices[0];
      selectedVoiceRef.current = defaultVoice!;
    }
  }, [voices, ttsSupported]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = async (content: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id ?? content);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const toggleWrap = () => setIsWrapped((prev) => !prev);

  const handleSpeak = (text: string) => {
    if (ttsSupported && selectedVoiceRef.current) {
      speak({ text, voice: selectedVoiceRef.current });
    }
  };

  return (
    <div className="h-[96vh] w-full">
      <div className="relative flex h-full w-full flex-col">
        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-4 pb-40 md:px-4">
          <div className="mx-auto w-full max-w-4xl py-4">
            {messages.length === 0 ? (
              <div className="text-muted-foreground flex h-[50vh] items-center justify-center">
                <Loader2Icon className="animate-spin" />
              </div>
            ) : (
              <div className="no-scrollbar mt-6 flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-10 md:px-8">
                <div className="mx-auto h-full w-full max-w-4xl">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`group mb-8 flex w-full flex-col ${message.role === "assistant" ? "items-start" : "items-end"} gap-2`}
                    >
                      <div
                        className={cn(
                          "prose dark:prose-invert max-w-none rounded-lg px-4 py-2",
                          message.role === "user"
                            ? "bg-accent/40 w-fit max-w-full font-medium"
                            : "w-full p-0",
                        )}
                      >
                        <MarkdownRenderer
                          content={message.content}
                          isWrapped={isWrapped}
                          onToggleWrap={toggleWrap}
                          copiedId={copiedId}
                          onCopy={handleCopy}
                          resolvedTheme={resolvedTheme}
                        />
                      </div>
                      <div className="font-medium">
                        <MessageActions
                          role={message.role}
                          messageId={message.id}
                          content={message.content}
                          copiedId={copiedId}
                          onCopy={handleCopy}
                          speaking={speaking}
                          onSpeak={handleSpeak}
                          onCancelSpeak={cancel}
                        />
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedChat;
