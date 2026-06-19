"use client";

import { useState, useCallback, useEffect } from "react";
import { ModelProvider } from "@/models/types";

const STORAGE_KEY = "routerai-api-keys";

type ProviderKeys = Partial<Record<ModelProvider, string>>;

export function useApiKeys() {
  const [keys, setKeys] = useState<ProviderKeys>({});

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setKeys(JSON.parse(stored) as ProviderKeys);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

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
