"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { DEFAULT_MODEL_ID, MODELS, getModelById } from "@/models/constants";
import type { Model } from "@/models/types";
import { ModelProvider } from "@/models/types";
import { getModelProviderIcon } from "@/models/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  KeyIcon,
  ChevronDownIcon,
  CheckIcon,
} from "lucide-react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { cn } from "@/lib/utils";
import { ApiKeyDialog } from "./ApiKeyDialog";

interface ModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  showIcons?: boolean;
}

export function ModelSelector({
  value,
  onValueChange,
  disabled = false,
  showIcons = true,
}: ModelSelectorProps) {
  const selectedModel = value ?? DEFAULT_MODEL_ID;
  const [isOpen, setIsOpen] = useState(false);
  const [dialogProvider, setDialogProvider] = useState<ModelProvider | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { hasKey, saveKey, removeKey } = useApiKeys();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = useCallback(
    (modelId: string) => {
      onValueChange?.(modelId);
      setIsOpen(false);
    },
    [onValueChange],
  );

  const openKeyDialog = useCallback((e: React.MouseEvent, provider: ModelProvider) => {
    e.stopPropagation();
    setDialogProvider(provider);
  }, []);

  const selectedModelObj = getModelById(selectedModel);

  const enabledModelIds = useMemo(() => {
    if (typeof window === "undefined") return new Set(MODELS.map((m) => m.id));
    const stored = localStorage.getItem("routerai-enabled-models");
    if (stored) {
      try {
        return new Set(JSON.parse(stored) as string[]);
      } catch {
        return new Set(MODELS.map((m) => m.id));
      }
    }
    return new Set(MODELS.map((m) => m.id));
  }, []);

  const visibleModels = MODELS.filter((m) => enabledModelIds.has(m.id));

  const getModelStatusIcon = (model: Model) => {
    if (model.isAvailable === false) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircleIcon className="h-4 w-4 text-red-500" />
            </TooltipTrigger>
            <TooltipContent><p>Model unavailable</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (model.requiresApiKey) {
      const hasProviderKey = hasKey(model.provider);
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Manage API key"
                onClick={(e) => openKeyDialog(e, model.provider)}
                className="rounded-md p-0.5 transition-colors hover:bg-white/10"
              >
                <KeyIcon className={`h-4 w-4 ${hasProviderKey ? "text-green-500" : "text-yellow-500"}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{hasProviderKey ? "API key added — click to manage" : "Click to add API key"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </TooltipTrigger>
          <TooltipContent><p>Free model powered by Groq</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      <div className="relative min-w-[180px]" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "bg-accent flex max-h-8 w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm",
            "hover:bg-accent/80 transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          {selectedModelObj && (
            <div className="flex items-center gap-2">
              {showIcons && getModelProviderIcon(selectedModelObj)}
              <span className="truncate">{selectedModelObj.name}</span>
            </div>
          )}
          <ChevronDownIcon
            className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", isOpen && "rotate-180")}
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              "bg-popover text-popover-foreground absolute bottom-full left-0 z-50 mb-1 min-w-[280px] overflow-hidden rounded-md border shadow-md",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
            )}
          >
            <div className="max-h-[22rem] overflow-y-auto p-1">
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Models</div>
              {visibleModels.map((model) => {
                const needsKey = model.requiresApiKey && !hasKey(model.provider);
                const isUnavailable = model.isAvailable === false;
                const isSelected = model.id === selectedModel;

                return (
                  <div
                    key={model.id}
                    className={cn(
                      "relative flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isUnavailable && "pointer-events-none opacity-50",
                      isSelected && "bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      disabled={isUnavailable || needsKey}
                      onClick={() => !isUnavailable && !needsKey && handleSelect(model.id)}
                      className={cn("flex flex-1 items-center gap-2", needsKey && "opacity-50")}
                    >
                      {showIcons && getModelProviderIcon(model)}
                      <span className="truncate">{model.name}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {getModelStatusIcon(model)}
                      {isSelected && <CheckIcon className="h-4 w-4 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ApiKeyDialog
        provider={dialogProvider}
        hasKey={hasKey}
        onSaveKey={saveKey}
        onRemoveKey={removeKey}
        onClose={() => setDialogProvider(null)}
      />
    </>
  );
}
