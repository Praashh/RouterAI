"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChatCircleDotsIcon, MicrophoneIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/client";
import TabsSuggestion from "@/components/ui/tabs-suggestion";
import { ModelSelector } from "@/components/ui/model-selector";
import { useModel } from "@/hooks/use-model";
import { useStreamChat } from "@/hooks/use-stream-chat";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useSpeechSynthesis } from "react-speech-kit";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Globe, Paperclip } from "lucide-react";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { MessageActions } from "@/components/chat/MessageActions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function handleStopListening() {
  SpeechRecognition.stopListening();
  toast.success("Stopped listening", { description: "Processing your voice input..." });
}

const UIInput = () => {
  const session = useSession();
  const { modelId: model, setModelId: setModel } = useModel();
  const [modeOfChatting, setModeOfChatting] = useState<"text" | "voice">("text");
  const [query, setQuery] = useState("");
  const attachmentsRef = useRef<File[]>([]);
  const [search, setSearch] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentChatIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeSpokenRef = useRef(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const { resolvedTheme } = useTheme();
  const utils = api.useUtils();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const { sendMessage } = useStreamChat({
    model,
    setMessages,
    setIsLoading,
    onScroll: scrollToBottom,
  });

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
    if (listening) setQuery(transcript);
  }, [listening, transcript]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (showWelcome && messages.length === 0 && modeOfChatting === "voice" && ttsSupported && selectedVoice && !welcomeSpokenRef.current) {
      welcomeSpokenRef.current = true;
      speak({ text: "Hello mate, how may I help you today?", voice: selectedVoice });
    }
  }, [showWelcome, messages.length, modeOfChatting, ttsSupported, selectedVoice, speak]);

  const createChat = api.chat.createChat.useMutation({
    onError: (error) => console.error("Error saving chat:", error),
  });

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setShowWelcome(false);
    const currentQuery = query.trim();
    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: currentQuery };
    setQuery("");
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let chatId = currentChatIdRef.current;
      if (!chatId) {
        const result = await createChat.mutateAsync();
        chatId = result.chatId!;
        currentChatIdRef.current = chatId;
        // Update URL immediately without triggering navigation or component remount
        window.history.replaceState(null, "", `/ask/${chatId}`);
      }

      const allMessages = [...messages, userMessage];

      void (async () => {
        try {
          const content = await sendMessage(allMessages, chatId!);
          void utils.chat.getAllChats.invalidate();
          if (modeOfChatting === "voice" && ttsSupported && selectedVoice && content) {
            speak({ text: content, voice: selectedVoice });
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") console.error("Error:", error);
          setIsLoading(false);
        }
      })();
    } catch (error) {
      console.error("Error preparing request:", error);
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
    <div className="flex h-[96vh] w-full overflow-hidden">
      <div className="relative flex h-full w-full flex-col">
        {!query && showWelcome && messages.length === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <div className="drop-shadow-primary/60 bg-primary relative mb-6 size-[4.5rem] overflow-hidden rounded-xl drop-shadow-2xl">
              <div className="bg-foreground absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
                <ChatCircleDotsIcon className="text-background text-2xl" />
              </div>
            </div>
            <h1 className="text-2xl">
              Hello{" "}
              <span className="font-semibold">
                {session.status === "loading" ? (
                  <span className="bg-muted inline-block h-5 w-24 animate-pulse rounded" />
                ) : (
                  `${session.data?.user.name?.split(" ")[0]},`
                )}
              </span>
            </h1>
            <p className="text-3xl">How may I help you today?</p>
            <TabsSuggestion suggestedInput={query} setSuggestedInput={setQuery} />
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

        <div className="bg-muted border-border/20 w-full rounded-2xl border-t p-2">
          <div className="mx-auto w-full max-w-4xl">
            <form onSubmit={handleCreateChat} className="bg-accent/30 flex w-full flex-col rounded-xl p-3 pb-3">
              <Textarea value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleCreateChat(e as unknown as React.FormEvent); } }} placeholder={modeOfChatting === "voice" ? "Or type here..." : "Ask whatever you want to be"} className="h-[2rem] resize-none rounded-none border-none bg-transparent px-0 py-1 shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent" disabled={isLoading} />
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
                <Button type="submit" className="w-fit" disabled={isLoading || !query.trim()}>
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

export default UIInput;
