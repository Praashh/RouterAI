"use server";

import { cookies } from "next/headers";
import { type ModelProvider } from "@/models/types";
import { auth } from "@/server/auth";

const COOKIE_PREFIX = "routerai-apikey-";

export async function saveApiKeyCookie(
  provider: ModelProvider,
  apiKey: string,
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cookieStore = await cookies();
  cookieStore.set(`${COOKIE_PREFIX}${provider}`, apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year
  });
}

export async function removeApiKeyCookie(provider: ModelProvider) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const cookieStore = await cookies();
  cookieStore.delete(`${COOKIE_PREFIX}${provider}`);
}

export async function getApiKeyProviders(): Promise<ModelProvider[]> {
  const session = await auth();
  if (!session?.user) return [];

  const cookieStore = await cookies();
  const providers: ModelProvider[] = [];
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith(COOKIE_PREFIX) && cookie.value) {
      providers.push(
        cookie.name.slice(COOKIE_PREFIX.length) as ModelProvider,
      );
    }
  }
  return providers;
}
