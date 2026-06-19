import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { z } from "zod";

export const chatRouter = createTRPCRouter({
  createChat: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      modelId: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return {
          message: "Unauthorised access",
          success: false,
        };
      }

      try {
        const newChat = await db.chat.create({
          data:{
            userId: ctx.session.user.id,
            title: input?.title,
            modelId: input?.modelId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        return {
          message: "Chat created successfully",
          success: true,
          chatId: newChat.id,
        };
      } catch (error) {
        console.log(error);
        return {
          message: "Something went wrong. Please try again.",
          success: false,
        };
      }
    }),

  getAllChats: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return {
          message: "Unauthorised access",
          success: false,
          chats: [],
        };
      }

      const limit = input?.limit ?? 50;

      const chats = await db.chat.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input?.search ? {
            OR: [
              { title: { contains: input.search, mode: "insensitive" as const } },
              { messages: { some: { content: { contains: input.search, mode: "insensitive" as const } } } },
            ],
          } : {}),
        },
        select: {
          id: true,
          title: true,
          modelId: true,
          messages: {
            select: {
              content: true,
            },
            take: 1,
            orderBy: {
              createdAt: "asc",
            },
          },
          isSaved: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: limit + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (chats.length > limit) {
        const nextItem = chats.pop();
        nextCursor = nextItem?.id;
      }

      return {
        chats,
        nextCursor,
      };
    }),

  getChatMessages: protectedProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return {
          message: "Unauthorised access",
          success: false,
          messages: [],
        };
      }

      try {
        // Verify the chat belongs to the user
        const chat = await db.chat.findFirst({
          where: {
            id: input.chatId,
            userId: ctx.session.user.id,
          },
          include: {
            messages: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        if (!chat) {
          return {
            message: "Chat not found or access denied",
            success: false,
            messages: [],
          };
        }

        return {
          message: "Messages retrieved successfully",
          success: true,
          messages: chat.messages.map((message) => ({
            id: message.id,
            content: message.content,
            role: message.role,
            createdAt: message.createdAt,
          })),
        };
      } catch (error) {
        console.error("Error getting messages:", error);
        return {
          message: "Something went wrong. Please try again.",
          success: false,
          messages: [],
        };
      }
    }),
    getChatById: publicProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .query(async ({ input }) => {

      try {
        // Verify the chat belongs to the user
        const chat = await db.chat.findFirst({
          where: {
            id: input.chatId,
          },
          include: {
            messages: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

        if (!chat) {
          return {
            message: "Chat not found or access denied",
            success: false,
            messages: [],
          };
        }

        return {
          message: "Messages retrieved successfully",
          success: true,
          messages: chat.messages.map((message) => ({
            id: message.id,
            content: message.content,
            role: message.role,
            createdAt: message.createdAt,
          })),
        };
      } catch (error) {
        console.error("Error getting messages:", error);
        return {
          message: "Something went wrong. Please try again.",
          success: false,
          messages: [],
        };
      }
    }),

  saveMessage: protectedProcedure
    .input(z.object({
      chatId: z.string(),
      content: z.string(),
      role: z.enum(["USER", "ASSISTANT"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return {
          message: "Unauthorised access",
          success: false,
        };
      }

      try {
        // Verify the chat belongs to the user
        const chat = await db.chat.findFirst({
          where: {
            id: input.chatId,
            userId: ctx.session.user.id,
          },
        });

        if (!chat) {
          return {
            message: "Chat not found or access denied",
            success: false,
          };
        }

        const message = await db.message.create({
          data: {
            chatId: input.chatId,
            content: input.content,
            role: input.role,
          },
        });

        // Update chat's updatedAt timestamp
        await db.chat.update({
          where: { id: input.chatId },
          data: { updatedAt: new Date() },
        });

        return {
          message: "Message saved successfully",
          success: true,
          messageId: message.id,
        };
      } catch (error) {
        console.error("Error saving message:", error);
        return {
          message: "Something went wrong. Please try again.",
          success: false,
        };
      }
    }),
    saveChat: protectedProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return {
          message: "Unauthorised access", 
        }
      }

      try {
        const chat = await db.chat.findFirst({
          where: {
            id: input.chatId,
            userId: ctx.session.user.id,
          },
        });

        console.log(chat);

        if (!chat) {
          return {
            message: "Chat not found or access denied",
            success: false,
          };
        }

        await db.chat.update({
          where: { id: input.chatId },
          data: { isSaved: true },
        });

        return {
          message: "Chat saved successfully",
          success: true,
        };
      } catch (error) {
        console.error("Error saving chat:", error);
        return {  
          message: "Something went wrong. Please try again.",
          success: false,
        };
      }
    }),
    removeFromSaved: protectedProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return {
          message: "Unauthorised access",
          success: false,
        }
      }

      try {
        const chat = await db.chat.findFirst({
          where: {
            id: input.chatId,
            userId: ctx.session.user.id,
          },
        });

        if (!chat) {
          return {
            message: "Chat not found or access denied",
            success: false,
          };
        }

        await db.chat.update({
          where: { id: input.chatId },
          data: { isSaved: false },
        });

        return {
          message: "Chat removed from saved successfully",
          success: true,
        };
      } catch (error) {
        console.error("Error removing chat from saved:", error);
        return {
          message: "Something went wrong. Please try again.",
          success: false,
        };
      }
    }),
    deleteChat: protectedProcedure
    .input(z.object({
      chatId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return {
          message: "Unauthorised access",
          success: false,
        }
      }

      try {
        const chat = await db.chat.findFirst({
          where: {
            id: input.chatId,
            userId: ctx.session.user.id,
          },
        });

        if (!chat) {
          return {
            message: "Chat not found or access denied",
            success: false,
          };
        }

        await db.chat.delete({
          where: { id: input.chatId },
        });

        return {
          message: "Chat deleted successfully",
          success: true,
        };
      } catch (error) {
        console.error("Error deleting chat:", error);
        return {
          message: "Something went wrong. Please try again.",
          success: false,
        };
      }
    }),
});