import { cookies } from "next/headers";
import { type ModelProvider } from "@/models/types";

const COOKIE_PREFIX = "routerai-apikey-";

export async function getApiKeyFromCookies(
  provider: ModelProvider,
): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(`${COOKIE_PREFIX}${provider}`)?.value;
}
