"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Geist } from "next/font/google";
import { Button } from "./button";
import { api } from "@/trpc/react";
import { useState } from "react";
import { useEffect } from "react";
import { Input } from "./input";
import {
  BookmarkIcon,
  DotsThreeVertical,
  MagnifyingGlassIcon,
  ShareFatIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Separator } from "./separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RouterAILogo } from "../svgs/t3chat";
import type { User } from "@prisma/client";
import { useSession } from "next-auth/react";
import { Share, ShareIcon } from "lucide-react";
import Image from "next/image";

const giest = Geist({
  display: "swap",
  subsets: ["latin"],
});

interface Chat {
  id: string;
  title: string | null;
  modelId: string | null;
  updatedAt: Date;
  isSaved: boolean;
  messages: {
    content: string;
  }[];
}

function getChatDisplayTitle(chat: Chat) {
  if (chat.title) return chat.title.length > 30 ? chat.title.slice(0, 30) + "..." : chat.title;
  if (chat.messages[0]?.content) return chat.messages[0].content.slice(0, 30) + "...";
  return "New Chat";
}

export function UIStructure() {
  const [hoverChatId, setHoverChatId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const queryInput = searchQuery ? { search: searchQuery } : {};
  const { data: chatsData, isLoading: chatsLoading } = api.chat.getAllChats.useQuery(
    queryInput,
    { refetchOnWindowFocus: true },
  );
  const saveChat = api.chat.saveChat.useMutation();
  const removeFromSaved = api.chat.removeFromSaved.useMutation();
  const deleteChat = api.chat.deleteChat.useMutation();
  const utils = api.useUtils();
  const router = useRouter();

  const chats = (chatsData?.chats ?? chatsData ?? []) as unknown as Chat[];

  const handleSaveChat = (chatId: string) => {
    saveChat.mutate({ chatId }, {
      onSuccess: () => {
        toast.success("Chat saved successfully");
        void utils.chat.getAllChats.invalidate();
      },
      onError: (error) => {
        console.error("Error saving chat:", error);
      },
    });
  };

  const handleRemoveFromSaved = (chatId: string) => {
    removeFromSaved.mutate({ chatId }, {
      onSuccess: () => {
        toast.success("Chat removed from saved successfully");
        void utils.chat.getAllChats.invalidate();
      },
      onError: (error) => {
        console.error("Error removing chat from saved:", error);
      },
    });
  };

  const handleDeleteChat = (chatId: string) => {
    deleteChat.mutate({ chatId }, {
      onSuccess: () => {
        toast.success("Chat deleted successfully");
        void utils.chat.getAllChats.invalidate();
      },
      onError: (error) => {
        console.error("Error deleting chat:", error);
      },
    });
  };

  const session = useSession();
  const user = session.data?.user;

  return (
    <Sidebar className={`border py-2 pl-2`}>
      <SidebarContent className="rounded-2xl">
        <SidebarGroup className="flex flex-col gap-8 pt-3">
          <SidebarGroupLabel className="h-fit p-0">
            <div className="flex h-12 w-full flex-col items-center gap-2 rounded-lg">
              <div className="flex w-full items-center gap-2 rounded-lg p-1 text-lg">
                <SidebarTrigger className="shrink-0" />
                <div className="text-secondary flex size-4 w-full flex-1 items-center justify-center rounded-lg ml-2">
                  <RouterAILogo />
                </div>
                <span className="size-6"></span>
              </div>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/ask");
                }}
                className="w-full text-secondary bg-primary"
              >
                New Chat
              </Button>
              {/* <SidebarTrigger /> */}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-4">
            <div className="mb-4 flex items-center gap-2 border-b">
              <MagnifyingGlassIcon className="text-foreground" weight="bold" />
              <Input
                placeholder="Search for chats"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-none border-none bg-transparent px-0 py-1 shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
            <SidebarGroupLabel className="p-0">
              <Badge
                variant="secondary"
                className="text-foreground flex items-center gap-2 rounded-lg"
              >
                <span className="font-semibold">Saved Chats</span>
              </Badge>
            </SidebarGroupLabel>
            <SidebarMenu className="mt-2 p-0">
              {chatsLoading
                ? // Skeleton loader while loading saved chats
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-primary/15 mb-2 h-7 w-full animate-pulse rounded-md"
                    />
                  ))
                : chats
                    ?.filter((chat: Chat) => chat.isSaved)
                    .map((chat: Chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton
                          className="group hover:bg-primary/20 relative"
                          onMouseEnter={() => setHoverChatId(chat.id)}
                          onMouseLeave={() => setHoverChatId("")}
                          asChild
                        >
                          <div className="flex w-full items-center justify-between">
                            <Link href={`/ask/${chat.id}`}>
                              <span className="z-[-1]">
                                {getChatDisplayTitle(chat)}
                              </span>
                              <div
                                className={`absolute top-0 right-0 z-[5] h-full w-12 rounded-r-md blur-[2em] ${chat.id === hoverChatId ? "bg-primary" : ""}`}
                              />
                              <div
                                className={`absolute top-1/2 -right-16 z-[10] flex h-full -translate-y-1/2 items-center justify-center gap-1.5 rounded-r-md bg-transparent px-1 backdrop-blur-xl transition-all duration-200 ease-in-out ${chat.id === hoverChatId ? "group-hover:right-0" : ""}`}
                              >
                                <button
                                  type="button"
                                  aria-label="Remove bookmark"
                                  className="flex items-center justify-center rounded-md"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleRemoveFromSaved(chat.id);
                                  }}
                                >
                                  <BookmarkIcon
                                    weight="fill"
                                    className="hover:text-foreground size-4"
                                  />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Copy share link"
                                  className="flex items-center justify-center rounded-md"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const shareLink = process.env.NEXT_PUBLIC_APP_URL + `/chat/share/${chat.id}`
                                    navigator.clipboard.writeText(shareLink)
                                    toast.success("Share link copied to clipboard")
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
                                    handleDeleteChat(chat.id);
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
                    ))}
            </SidebarMenu>

            <Separator className="my-2" />
            <SidebarGroupLabel className="p-0">
              <Badge
                variant="secondary"
                className="text-foreground flex items-center gap-2 rounded-lg"
              >
                <span className="font-semibold">Recent Chats</span>
              </Badge>
            </SidebarGroupLabel>

            <SidebarMenu className="mt-2 w-full p-0">
              {chatsLoading
                ? // Skeleton loader while loading saved chats
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-primary/15 mb-2 h-7 w-full animate-pulse rounded-md"
                    />
                  ))
                : chats
                    ?.filter((chat: Chat) => !chat.isSaved)
                    .map((chat: Chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton
                          className="group hover:bg-primary/20 relative"
                          onMouseEnter={() => setHoverChatId(chat.id)}
                          onMouseLeave={() => setHoverChatId("")}
                          asChild
                        >
                          <div className="flex w-full items-center justify-between">
                            <Link href={`/ask/${chat.id}`}>
                              <span className="z-[-1]">
                                {getChatDisplayTitle(chat)}
                              </span>
                              <div
                                className={`absolute top-0 right-0 z-[5] h-full w-12 rounded-r-md blur-[2em] ${chat.id === hoverChatId ? "bg-primary" : ""}`}
                              />
                              <div
                                className={`absolute top-1/2 -right-16 z-[10] flex h-full -translate-y-1/2 items-center justify-center gap-1.5 rounded-r-md bg-transparent px-1 backdrop-blur-xl transition-all duration-200 ease-in-out ${chat.id === hoverChatId ? "group-hover:right-0" : ""}`}
                              >
                                <button
                                  type="button"
                                  aria-label="Save chat"
                                  className="flex items-center justify-center rounded-md"
                                  onClick={() => handleSaveChat(chat.id)}
                                >
                                  <BookmarkIcon
                                    weight={"bold"}
                                    className="hover:text-foreground size-4"
                                  />
                                </button>

                                <button
                                  type="button"
                                  aria-label="Copy share link"
                                  className="flex items-center justify-center rounded-md"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const shareLink = process.env.NEXT_PUBLIC_APP_URL + `/chat/share/${chat.id}`
                                    navigator.clipboard.writeText(shareLink)
                                    toast.success("Share link copied to clipboard")
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
                                  onClick={() => handleDeleteChat(chat.id)}
                                >
                                  <TrashIcon
                                    weight={"bold"}
                                    className="hover:text-foreground size-4"
                                  />
                                </button>
                              </div>
                              {/* <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <DotsThreeVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleSaveChat(chat.id)}
                              >
                                Add to Saved
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteChat(chat.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu> */}
                            </Link>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarFooter className="bg-background absolute bottom-0 z-[70] h-20 w-full px-4 py-3">
          {user && (
            <div className="flex items-center space-x-3">
              <Image
                src={user.image ?? "/default-avatar.png"}
                alt={user.name ?? "User"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="flex flex-col text-sm text-white">
                <span className="font-medium">{user.name ?? "Anonymous"}</span>
                <span className="w-36 truncate text-xs text-gray-300">
                  {user.email ?? ""}
                </span>
              </div>
            </div>
          )}
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
