import { useState, useCallback, useMemo } from "react";
import { DEFAULT_MODEL_ID, getModelById } from "@/models/constants";

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
  const [modelId, setModelId] = useState<string>(() => {
    if (!persistToLocalStorage || typeof window === "undefined") return initialModel;
    const stored = localStorage.getItem(storageKey);
    if (stored && getModelById(stored)) return stored;
    return initialModel;
  });

  // Derive model from modelId — no separate state needed
  const model = useMemo(() => getModelById(modelId), [modelId]);

  const setModelById = useCallback((id: string) => {
    setModelId(id);
    if (persistToLocalStorage) {
      localStorage.setItem(storageKey, id);
    }
  }, [persistToLocalStorage, storageKey]);

  return {
    modelId,
    model,
    setModelId: setModelById,
  };
}
