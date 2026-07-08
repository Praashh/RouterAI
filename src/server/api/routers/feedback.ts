import { z } from "zod";
import { env } from "@/env";
import {
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";

const contentTemplate = `
Gm Gm, I am the feedback bot.

I have received a new feedback from **{name}**

Message: **{message}**

Thank you for your feedback!
`;

export const feedbackRouter = createTRPCRouter({
  createFeedback: publicProcedure.input(z.object({ name: z.string().max(100), message: z.string().max(2000) })).mutation(async ({  input }) => {
    const sanitize = (s: string) => s.replace(/[*_~`@]/g, "");

    await fetch(env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: contentTemplate.replace("{name}", sanitize(input.name)).replace("{message}", sanitize(input.message)),
      }),
    });


    return {
      success: true,
    };
  }),
});
