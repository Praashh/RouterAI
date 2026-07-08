import { auth } from "@/server/auth";
import { getModelById } from "@/models/constants";
import { ModelProvider } from "@/models/types";
import { db } from "@/server/db";
import { getApiKeyFromCookies } from "@/lib/api-key-cookies";

interface ImagePayload {
  prompt: string;
  model: string;
  chatId: string;
}

interface DallEResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: { message: string };
}

async function generateWithDallE(
  prompt: string,
  apiKey: string,
): Promise<{ imageUrl: string; revisedPrompt?: string }> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DALL-E API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as DallEResponse;
  const result = data.data[0];

  if (!result?.url) {
    throw new Error("No image URL returned from DALL-E");
  }

  return {
    imageUrl: result.url,
    revisedPrompt: result.revised_prompt,
  };
}

async function generateWithGemini(
  prompt: string,
  apiKey: string,
): Promise<{ imageUrl: string; text?: string }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as GeminiResponse;

  if (data.error) {
    throw new Error(`Gemini error: ${data.error.message}`);
  }

  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("No content returned from Gemini");
  }

  let imageUrl = "";
  let text = "";

  for (const part of parts) {
    if (part.inlineData) {
      imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    if (part.text) {
      text += part.text;
    }
  }

  if (!imageUrl) {
    throw new Error("No image returned from Gemini");
  }

  return { imageUrl, text: text || undefined };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const authResult = await auth();
    if (!authResult?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { prompt, model, chatId } =
      (await req.json()) as ImagePayload;

    if (!prompt?.trim()) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const modelInfo = getModelById(model);
    if (!modelInfo) {
      return Response.json(
        { error: `Model ${model} not found` },
        { status: 400 },
      );
    }

    // Read user API key from HttpOnly cookie
    const userApiKey = await getApiKeyFromCookies(modelInfo.provider);
    if (!userApiKey) {
      return Response.json(
        { error: "API key is required for image generation. Please add your key in the model selector." },
        { status: 400 },
      );
    }

    // Save user message
    await db.message.create({
      data: { chatId, content: prompt, role: "USER" },
    });

    // Auto-generate title
    const chat = await db.chat.findUnique({
      where: { id: chatId },
      select: { title: true },
    });
    if (!chat?.title) {
      await db.chat.update({
        where: { id: chatId },
        data: { title: prompt.slice(0, 100) },
      });
    }

    let result: { imageUrl: string; revisedPrompt?: string; text?: string };

    if (modelInfo.provider === ModelProvider.OPENAI) {
      result = await generateWithDallE(prompt, userApiKey);
    } else if (modelInfo.provider === ModelProvider.GOOGLE) {
      result = await generateWithGemini(prompt, userApiKey);
    } else {
      return Response.json(
        { error: `Image generation not supported for ${modelInfo.provider}` },
        { status: 400 },
      );
    }

    // Build assistant message content with the image
    let assistantContent = `![Generated Image](${result.imageUrl})`;
    if (result.revisedPrompt) {
      assistantContent += `\n\n*Revised prompt: ${result.revisedPrompt}*`;
    }
    if (result.text) {
      assistantContent += `\n\n${result.text}`;
    }

    // Save assistant message
    await db.message.create({
      data: { chatId, content: assistantContent, role: "ASSISTANT" },
    });

    await db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return Response.json({
      content: assistantContent,
      imageUrl: result.imageUrl,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    const message =
      error instanceof Error ? error.message : "Image generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
