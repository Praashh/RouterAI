import { type Model, ModelCapability, ModelProvider } from "./types";

export const MODELS: Model[] = [
  // === GROQ FREE TIER ===
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: ModelProvider.GROQ,
    description: "Meta's powerful open-source model via Groq - fast and free",
    maxTokens: 131072,
    pricePer1kTokens: 0,
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.FUNCTION_CALLING,
    ],
    isAvailable: true,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: ModelProvider.GROQ,
    description: "Lightning-fast small model for quick tasks - free",
    maxTokens: 131072,
    pricePer1kTokens: 0,
    capabilities: [ModelCapability.TEXT, ModelCapability.CODE],
    isAvailable: true,
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    provider: ModelProvider.GROQ,
    description: "Mistral's mixture-of-experts model via Groq - free",
    maxTokens: 32768,
    pricePer1kTokens: 0,
    capabilities: [ModelCapability.TEXT, ModelCapability.CODE],
    isAvailable: true,
  },
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B",
    provider: ModelProvider.GROQ,
    description: "Google's Gemma 2 model via Groq - free",
    maxTokens: 8192,
    pricePer1kTokens: 0,
    capabilities: [ModelCapability.TEXT, ModelCapability.CODE],
    isAvailable: true,
  },
  // === BYOK MODELS (require user API key) ===
  {
    id: "gpt-3.5-turbo",
    name: "GPT 3.5 Turbo",
    provider: ModelProvider.OPENAI,
    description: "Fast and efficient model for most tasks",
    maxTokens: 16385,
    pricePer1kTokens: 0.0015,
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.FUNCTION_CALLING,
    ],
    isAvailable: true,
    requiresApiKey: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT 4o Mini",
    provider: ModelProvider.OPENAI,
    description: "Compact version of GPT-4o with improved performance",
    maxTokens: 128000,
    pricePer1kTokens: 0.005,
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.FUNCTION_CALLING,
    ],
    isAvailable: true,
    requiresApiKey: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: ModelProvider.GOOGLE,
    description: "Google's fastest Gemini model for responsive applications",
    maxTokens: 32768,
    pricePer1kTokens: 0.0035,
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.FUNCTION_CALLING,
    ],
    isAvailable: true,
    requiresApiKey: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: ModelProvider.ANTHROPIC,
    description: "Latest Claude model with enhanced capabilities",
    maxTokens: 200000,
    pricePer1kTokens: 0.003,
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.FUNCTION_CALLING,
    ],
    isAvailable: true,
    requiresApiKey: true,
  },
  {
    id: "claude-3-sonnet-3.7",
    name: "Claude 3.7 Sonnet",
    provider: ModelProvider.ANTHROPIC,
    description: "Latest Claude 3.7 model with excellent performance",
    maxTokens: 200000,
    pricePer1kTokens: 0.003,
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.FUNCTION_CALLING,
    ],
    isAvailable: true,
    requiresApiKey: true,
  },
  {
    id: "claude-3.7",
    name: "Claude 3.7",
    provider: ModelProvider.ANTHROPIC,
    description: "Claude 3.7 flagship model",
    maxTokens: 200000,
    pricePer1kTokens: 0.015,
    capabilities: [
      ModelCapability.TEXT,
      ModelCapability.CODE,
      ModelCapability.FUNCTION_CALLING,
    ],
    isAvailable: true,
    requiresApiKey: true,
  },
  // === IMAGE GENERATION MODELS (require user API key) ===
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: ModelProvider.OPENAI,
    description: "OpenAI's most capable image generation model",
    maxTokens: 0,
    pricePer1kTokens: 0,
    capabilities: [ModelCapability.IMAGE_GENERATION],
    isAvailable: true,
    requiresApiKey: true,
  },
  {
    id: "gemini-2.0-flash-preview-image-generation",
    name: "Gemini Image Gen",
    provider: ModelProvider.GOOGLE,
    description: "Google's Gemini model with native image generation",
    maxTokens: 8192,
    pricePer1kTokens: 0,
    capabilities: [ModelCapability.IMAGE_GENERATION, ModelCapability.TEXT],
    isAvailable: true,
    requiresApiKey: true,
  },
];

export const DEFAULT_MODEL_ID = "llama-3.3-70b-versatile";

export const getModelById = (id: string): Model | undefined => {
  return MODELS.find((model) => model.id === id);
};

export const isImageModel = (id: string): boolean => {
  const model = getModelById(id);
  return model?.capabilities.includes(ModelCapability.IMAGE_GENERATION) ?? false;
};
