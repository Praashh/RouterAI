"use client";

import Link from "next/link";
import {
  BookmarkIcon,
  ShareFatIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

interface Chat {
  id: string;
  title: string | null;
  modelId: string | null;
  updatedAt: Date;
  isSaved: boolean;
  messages: { content: string }[];
}

function getChatDisplayTitle(chat: Chat) {
  if (chat.title)
    return chat.title.length > 30
      ? chat.title.slice(0, 30) + "..."
      : chat.title;
  if (chat.messages[0]?.content)
    return chat.messages[0].content.slice(0, 30) + "...";
  return "New Chat";
}

interface ChatListItemProps {
  chat: Chat;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSave?: (chatId: string) => void;
  onUnsave?: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

export function ChatListItem({
  chat,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onSave,
  onUnsave,
  onDelete,
}: ChatListItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="group hover:bg-primary/20 relative"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        asChild
      >
        <div className="flex w-full items-center justify-between">
          <Link href={`/ask/${chat.id}`}>
            <span className="z-[-1]">{getChatDisplayTitle(chat)}</span>
            <div
              className={`absolute top-0 right-0 z-[5] h-full w-12 rounded-r-md blur-[2em] ${isHovered ? "bg-primary" : ""}`}
            />
            <div
              className={`absolute top-1/2 -right-16 z-[10] flex h-full -translate-y-1/2 items-center justify-center gap-1.5 rounded-r-md bg-transparent px-1 backdrop-blur-xl transition-all duration-200 ease-in-out ${isHovered ? "group-hover:right-0" : ""}`}
            >
              <button
                type="button"
                aria-label={chat.isSaved ? "Remove bookmark" : "Save chat"}
                className="flex items-center justify-center rounded-md"
                onClick={(e) => {
                  e.preventDefault();
                  if (chat.isSaved) {
                    onUnsave?.(chat.id);
                  } else {
                    onSave?.(chat.id);
                  }
                }}
              >
                <BookmarkIcon
                  weight={chat.isSaved ? "fill" : "bold"}
                  className="hover:text-foreground size-4"
                />
              </button>
              <button
                type="button"
                aria-label="Copy share link"
                className="flex items-center justify-center rounded-md"
                onClick={(e) => {
                  e.preventDefault();
                  const shareLink =
                    process.env.NEXT_PUBLIC_APP_URL +
                    `/chat/share/${chat.id}`;
                  void navigator.clipboard.writeText(shareLink);
                  toast.success("Share link copied to clipboard");
                }}
              >
                <ShareFatIcon
                  weight="fill"
                  className="hover:text-foreground size-4"
                />
              </button>
              <button
                type="button"
                aria-label="Delete chat"
                className="flex items-center justify-center rounded-md"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(chat.id);
                }}
              >
                <TrashIcon
                  weight="bold"
                  className="hover:text-foreground size-4"
                />
              </button>
            </div>
          </Link>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
