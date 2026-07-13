"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MicrophoneIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ui/model-selector";
import { useModel } from "@/hooks/use-model";
import { useStreamChat } from "@/hooks/use-stream-chat";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { MessageActions } from "@/components/chat/MessageActions";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { useSpeechSynthesis } from "react-speech-kit";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Globe, Loader2Icon, Paperclip } from "lucide-react";
import { api } from "@/trpc/client";
import { isImageModel } from "@/models/constants";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function handleStopListening() {
  SpeechRecognition.stopListening();
  toast.success("Stopped listening", {
    description: "Processing your voice input...",
  });
}

const Chat = ({ chatId: initialChatId }: { chatId: string }) => {
  const { modelId: model, setModelId: setModel } = useModel();
  const [localMessages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState(false);
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return "";
    const query = localStorage.getItem("chatQuery");
    if (query) {
      localStorage.removeItem("chatQuery");
      return query;
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modeOfChatting, setModeOfChatting] = useState<"text" | "voice">("text");
  const [showWelcome, setShowWelcome] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeSpokenRef = useRef(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const { resolvedTheme } = useTheme();
  const queryRef = useRef<string>("");
  const attachmentsRef = useRef<File[]>([]);
  const [chatId, setChatId] = useState(initialChatId);
  const utils = api.useUtils();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const { sendMessage, abortControllerRef } = useStreamChat({
    model,
    setMessages,
    setIsLoading,
    onScroll: scrollToBottom,
  });

  const { data: chatMessages, isLoading: isQueryLoading } = api.chat.getChatMessages.useQuery({ chatId });

  // Derive display messages: prefer local state (during/after streaming),
  // fall back to server data so cached queries render instantly without a loader flash
  const messages = localMessages.length > 0
    ? localMessages
    : (chatMessages?.messages.map((m) => ({
        id: m.id,
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })) ?? []);

  useEffect(() => {
    setChatId(initialChatId);
    setMessages([]);
  }, [initialChatId]);

  useEffect(() => {
    if (chatMessages && localMessages.length === 0) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [chatMessages, localMessages.length, scrollToBottom]);

  const toggleWrap = useCallback(() => setIsWrapped((prev) => !prev), []);

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  const { speak, cancel, speaking, supported: ttsSupported, voices } = useSpeechSynthesis();
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!browserSupportsSpeechRecognition)
      toast.error("Your browser doesn't support speech recognition.");
  }, [browserSupportsSpeechRecognition]);

  useEffect(() => {
    if (ttsSupported && voices.length > 0)
      setSelectedVoice(voices.find((v) => v.default) ?? voices[0]!);
  }, [voices, ttsSupported]);

  useEffect(() => {
    if (listening) queryRef.current = transcript;
  }, [listening, transcript]);

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryRef.current.trim() || isLoading) return;
    setShowWelcome(false);
    const currentQuery = queryRef.current.trim();
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: currentQuery };
    const updatedMessages = [...messages, userMessage];
    queryRef.current = "";
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      if (isImageModel(model)) {
        void (async () => {
          await sendMessage(updatedMessages, chatId);
          void utils.chat.getAllChats.invalidate();
        })();
      } else {
        setTimeout(() => {
          void (async () => {
            try {
              await sendMessage(updatedMessages, chatId);
              void utils.chat.getAllChats.invalidate();
            } catch (error) {
              if ((error as Error).name !== "AbortError") console.error("Error:", error);
              setIsLoading(false);
            }
          })();
        }, 0);
      }
    } catch (error) {
      console.error("Error preparing request:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showWelcome && messages.length === 0 && modeOfChatting === "voice" && ttsSupported && selectedVoice && !welcomeSpokenRef.current) {
      welcomeSpokenRef.current = true;
      speak({ text: "Hello mate, how may I help you today?", voice: selectedVoice });
    }
  }, [showWelcome, messages.length, modeOfChatting, ttsSupported, selectedVoice, speak]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      await sendMessage(updatedMessages, chatId);
      void utils.chat.getAllChats.invalidate();
    } catch (error) {
      if ((error as Error).name !== "AbortError") console.error("Error:", error);
      setIsLoading(false);
    }
  };

  const handleStartListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true });
    toast.success("Listening...", { description: "Speak now...", duration: 5000 });
  };

  const toggleMode = () => {
    if (modeOfChatting === "voice" && speaking) cancel();
    const newMode = modeOfChatting === "text" ? "voice" : "text";
    if (newMode === "voice" && !ttsSupported) {
      toast.error("Text-to-speech not supported in your browser");
      return;
    }
    setModeOfChatting(newMode);
  };

  const handleCopy = async (content: string, id: string) => {
    try { await navigator.clipboard.writeText(content); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }
    catch (err) { console.error("Failed to copy: ", err); }
  };

  const handleFileInput = () => {
    const fi = document.createElement("input"); fi.type = "file"; fi.accept = "image/*";
    fi.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) attachmentsRef.current = [...attachmentsRef.current, f]; };
    fi.click();
  };

  const handleSpeak = useCallback(
    (text: string) => { if (ttsSupported && selectedVoice) speak({ text, voice: selectedVoice }); },
    [ttsSupported, selectedVoice, speak],
  );

  return (
    <div className="h-[96vh] w-full">
      <div className="relative flex h-full w-full flex-col">
        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-4 pb-40 md:px-4">
          <div className="mx-auto w-full max-w-4xl py-4">
            {messages.length === 0 && isQueryLoading ? (
              <div className="text-muted-foreground flex h-[50vh] items-center justify-center">
                <Loader2Icon className="animate-spin" />
              </div>
            ) : (
              <div className="no-scrollbar mt-6 flex h-full w-full flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-10 md:px-8">
                <div className="mx-auto h-full w-full max-w-4xl">
                  {messages.map((message) => (
                    <div key={message.id} className={`group mb-8 flex w-full flex-col ${message.role === "assistant" ? "items-start" : "items-end"} gap-2`}>
                      <div className={cn("prose dark:prose-invert max-w-none rounded-lg px-4 py-2", message.role === "user" ? "bg-accent/40 w-fit max-w-full font-medium" : "w-full p-0")}>
                        <MarkdownRenderer content={message.content} isWrapped={isWrapped} onToggleWrap={toggleWrap} copiedId={copiedId} onCopy={handleCopy} resolvedTheme={resolvedTheme} />
                      </div>
                      <div className="font-medium">
                        <MessageActions role={message.role} messageId={message.id} content={message.content} copiedId={copiedId} onCopy={handleCopy} modeOfChatting={modeOfChatting} speaking={speaking} onSpeak={handleSpeak} onCancelSpeak={cancel} />
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex h-5 items-start justify-start space-x-2">
                      <div className="bg-accent h-2.5 w-2.5 animate-bounce rounded-full [animation-delay:0s]" />
                      <div className="bg-accent h-2.5 w-2.5 animate-bounce rounded-full [animation-delay:0.2s] [animation-direction:reverse]" />
                      <div className="bg-accent h-2.5 w-2.5 animate-bounce rounded-full [animation-delay:0.4s]" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-muted border-border/20 absolute bottom-0 w-full rounded-xl border-t p-2">
          <div className="mx-auto w-full max-w-4xl">
            <form onSubmit={handleSubmit} className="bg-accent/30 flex w-full flex-col rounded-xl p-3 pb-3">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(e as unknown as React.FormEvent); } }} placeholder="Ask whatever you want to be" className="h-[2rem] resize-none rounded-none border-none bg-transparent px-0 py-1 shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent" disabled={isLoading} />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={toggleMode} className="text-xs">
                    {modeOfChatting === "text" ? "Switch to Voice" : "Switch to Text"}
                  </Button>
                  {modeOfChatting === "voice" && (
                    <div className="bg-accent flex size-8 items-center justify-center rounded-lg border">
                      <button type="button" aria-label="Toggle voice input" onClick={listening ? handleStopListening : handleStartListening} disabled={!browserSupportsSpeechRecognition}>
                        <MicrophoneIcon weight="bold" className={`text-foreground hover:text-primary size-4 cursor-pointer ${listening ? "animate-pulse text-red-500" : ""}`} />
                      </button>
                    </div>
                  )}
                  <ModelSelector value={model} onValueChange={setModel} disabled={isLoading} />
                  <Button variant="ghost" size="sm" className={`text-xs ${search ? "bg-primary/60 hover:bg-primary/70" : ""}`} onClick={() => setSearch(!search)}>
                    <Globe className="size-4" /> Search
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={handleFileInput}>
                    <Paperclip className="size-4" />
                  </Button>
                </div>
                <Button type="submit" className="w-fit" disabled={isLoading || !input.trim()}>
                  {isLoading ? <SpinnerGapIcon className="animate-spin" /> : "Send"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
