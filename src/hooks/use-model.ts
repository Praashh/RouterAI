import { useState, useCallback, useEffect, useRef } from "react";
import { DEFAULT_MODEL_ID, getModelById } from "@/models/constants";
import type { Model } from "@/models/types";

interface UseModelOptions {
  initialModel?: string;
  storageKey?: string;
  persistToLocalStorage?: boolean;
}

export function useModel({
  initialModel = DEFAULT_MODEL_ID,
  storageKey = "preferredModel",
  persistToLocalStorage = true,
}: UseModelOptions = {}) {
  // Always start with the default to match SSR
  const [modelId, setModelId] = useState<string>(initialModel);
  const [model, setModel] = useState<Model | undefined>(() =>
    getModelById(initialModel),
  );
  const hasMounted = useRef(false);

  // Hydrate from localStorage after mount (client-only)
  useEffect(() => {
    if (!persistToLocalStorage) return;

    const storedModel = localStorage.getItem(storageKey);
    if (storedModel) {
      const found = getModelById(storedModel);
      if (found) {
        setModelId(storedModel);
        setModel(found);
      }
    }
    hasMounted.current = true;
  }, [persistToLocalStorage, storageKey]);

  // Persist to localStorage when model changes (after initial mount)
  useEffect(() => {
    if (!hasMounted.current) return;

    setModel(getModelById(modelId));

    if (persistToLocalStorage) {
      localStorage.setItem(storageKey, modelId);
    }
  }, [modelId, persistToLocalStorage, storageKey]);

  const setModelById = useCallback((id: string) => {
    setModelId(id);
  }, []);

  return {
    modelId,
    model,
    setModelId: setModelById,
  };
}
