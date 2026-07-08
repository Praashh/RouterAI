"use client";

import { useState, useCallback } from "react";
import { ModelProvider } from "@/models/types";

const STORAGE_KEY = "routerai-api-keys:v1";

type ProviderKeys = Partial<Record<ModelProvider, string>>;

export function useApiKeys() {
  const [keys, setKeys] = useState<ProviderKeys>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as ProviderKeys;
    } catch {
      // ignore parse errors
    }
    return {};
  });

  const saveKey = useCallback((provider: ModelProvider, apiKey: string) => {
    setKeys((prev) => {
      const next = { ...prev, [provider]: apiKey };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeKey = useCallback((provider: ModelProvider) => {
    setKeys((prev) => {
      const next = { ...prev };
      delete next[provider];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getKey = useCallback(
    (provider: ModelProvider): string | undefined => {
      return keys[provider];
    },
    [keys],
  );

  const hasKey = useCallback(
    (provider: ModelProvider): boolean => {
      return !!keys[provider];
    },
    [keys],
  );

  return { keys, saveKey, removeKey, getKey, hasKey };
}
