import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  const hasMounted = useRef(false);

  // Derive model from modelId — no separate state needed
  const model = useMemo(() => getModelById(modelId), [modelId]);

  // Persist to localStorage when model changes (after initial mount)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

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
