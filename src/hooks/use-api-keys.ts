"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { type ModelProvider } from "@/models/types";
import {
  saveApiKeyCookie,
  removeApiKeyCookie,
  getApiKeyProviders,
} from "@/actions/api-keys";

export function useApiKeys() {
  const [providers, setProviders] = useState<Set<ModelProvider>>(new Set());
  const [, startTransition] = useTransition();

  useEffect(() => {
    void getApiKeyProviders().then((ps) => setProviders(new Set(ps)));
  }, []);

  const saveKey = useCallback((provider: ModelProvider, apiKey: string) => {
    setProviders((prev) => new Set(prev).add(provider));
    startTransition(() => {
      void saveApiKeyCookie(provider, apiKey);
    });
  }, []);

  const removeKey = useCallback((provider: ModelProvider) => {
    setProviders((prev) => {
      const next = new Set(prev);
      next.delete(provider);
      return next;
    });
    startTransition(() => {
      void removeApiKeyCookie(provider);
    });
  }, []);

  const hasKey = useCallback(
    (provider: ModelProvider): boolean => providers.has(provider),
    [providers],
  );

  return { saveKey, removeKey, hasKey };
}
