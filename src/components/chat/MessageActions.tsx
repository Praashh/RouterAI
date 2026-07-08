"use client";

import {
  CopyIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  SpeakerHighIcon,
  SpeakerXIcon,
  CheckIcon,
} from "@phosphor-icons/react";

interface MessageActionsProps {
  role: "user" | "assistant";
  messageId: string;
  content: string;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  modeOfChatting?: "text" | "voice";
  speaking?: boolean;
  onSpeak?: (text: string) => void;
  onCancelSpeak?: () => void;
}

export function MessageActions({
  role,
  messageId,
  content,
  copiedId,
  onCopy,
  modeOfChatting = "text",
  speaking = false,
  onSpeak,
  onCancelSpeak,
}: MessageActionsProps) {
  if (role === "user") {
    return (
      <button
        type="button"
        aria-label="Copy message"
        onClick={() => onCopy(content, messageId)}
        className="hover:bg-accent flex size-7 items-center justify-center rounded-lg"
      >
        {copiedId !== messageId ? (
          <CopyIcon weight="bold" />
        ) : (
          <CheckIcon weight="bold" />
        )}
      </button>
    );
  }

  return (
    <div className="invisible flex w-fit items-center gap-2 text-base font-semibold group-hover:visible">
      <button
        type="button"
        aria-label="Like response"
        className="hover:bg-accent flex size-7 items-center justify-center rounded-lg"
      >
        <ThumbsUpIcon weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Dislike response"
        className="hover:bg-accent flex size-7 items-center justify-center rounded-lg"
      >
        <ThumbsDownIcon weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Copy message"
        onClick={() => onCopy(content, messageId)}
        className="hover:bg-accent flex size-7 items-center justify-center rounded-lg"
      >
        {copiedId !== messageId ? (
          <CopyIcon weight="bold" />
        ) : (
          <CheckIcon weight="bold" />
        )}
      </button>
      {modeOfChatting === "voice" && onSpeak && onCancelSpeak && (
        <button
          type="button"
          aria-label={speaking ? "Stop reading" : "Read aloud"}
          className="hover:bg-accent flex size-7 items-center justify-center rounded-lg"
          onClick={() => {
            if (speaking) {
              onCancelSpeak();
            } else {
              onSpeak(content);
            }
          }}
        >
          {speaking ? (
            <SpeakerXIcon weight="bold" />
          ) : (
            <SpeakerHighIcon weight="bold" />
          )}
        </button>
      )}
    </div>
  );
}
