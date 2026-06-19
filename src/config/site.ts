import type { Metadata } from "next";

const TITLE = "RouterAI - Chat with Multiple AI Models in One Place";
const DESCRIPTION =
  "RouterAI is an open-source AI chat app that lets you talk to multiple LLM providers like OpenAI, Google, and Anthropic — all from a single, fast, and customizable interface.";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

export const siteConfig: Metadata = {
  title: {
    default: TITLE,
    template: "%s | RouterAI",
  },
  description: DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
  },
  applicationName: "RouterAI",
  creator: "praash",
  category: "AI",
  alternates: {
    canonical: BASE_URL,
  },
  keywords: [
    "RouterAI",
    "AI chat",
    "multi-model AI",
    "LLM aggregator",
    "OpenAI",
    "Google AI",
    "Anthropic",
    "chat application",
    "open-source AI",
    "self-hosted AI chat",
  ],
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    siteName: "RouterAI",
    url: BASE_URL,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "RouterAI - Chat with Multiple AI Models",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  metadataBase: new URL(BASE_URL!),
};
