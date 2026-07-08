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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  KeyIcon,
  ChevronDownIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  Trash2Icon,
} from "lucide-react";
import { useApiKeys } from "@/hooks/use-api-keys";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  showIcons?: boolean;
}

function getProviderLabel(provider: ModelProvider): string {
  switch (provider) {
    case ModelProvider.OPENAI:
      return "OpenAI";
    case ModelProvider.GOOGLE:
      return "Google AI";
    case ModelProvider.ANTHROPIC:
      return "Anthropic";
    case ModelProvider.GROQ:
      return "Groq";
    default:
      return provider;
  }
}

function getApiKeyPlaceholder(provider: ModelProvider): string {
  switch (provider) {
    case ModelProvider.OPENAI:
      return "sk-...";
    case ModelProvider.GOOGLE:
      return "AIza...";
    case ModelProvider.ANTHROPIC:
      return "sk-ant-...";
    default:
      return "Enter API key";
  }
}

export function ModelSelector({
  value,
  onValueChange,
  disabled = false,
  showIcons = true,
}: ModelSelectorProps) {
  const selectedModel = value ?? DEFAULT_MODEL_ID;
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [dialogProvider, setDialogProvider] = useState<ModelProvider | null>(
    null,
  );
  const [showKey, setShowKey] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { hasKey, saveKey, removeKey } = useApiKeys();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (dialogProvider && inputRef.current) {
      inputRef.current.focus();
    }
  }, [dialogProvider]);

  const handleSelect = useCallback(
    (modelId: string) => {
      onValueChange?.(modelId);
      setIsOpen(false);
    },
    [onValueChange],
  );

  const handleSaveKey = useCallback(
    (provider: ModelProvider) => {
      if (!apiKeyInput.trim()) {
        toast.error("Please enter a valid API key");
        return;
      }
      saveKey(provider, apiKeyInput.trim());
      toast.success(`${getProviderLabel(provider)} API key saved`);
      setApiKeyInput("");
      setShowKey(false);
    },
    [apiKeyInput, saveKey],
  );

  const handleRemoveKey = useCallback(
    (provider: ModelProvider) => {
      removeKey(provider);
      toast.success(`${getProviderLabel(provider)} API key removed`);
      setApiKeyInput("");
      setShowKey(false);
    },
    [removeKey],
  );

  const openKeyDialog = useCallback(
    (e: React.MouseEvent, provider: ModelProvider) => {
      e.stopPropagation();
      setDialogProvider(provider);
      setApiKeyInput("");
      setShowKey(false);
    },
    [],
  );

  const closeKeyDialog = useCallback(() => {
    setDialogProvider(null);
    setApiKeyInput("");
    setShowKey(false);
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
            <TooltipContent>
              <p>Model unavailable</p>
            </TooltipContent>
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
                className={cn(
                  "rounded-md p-0.5 transition-colors hover:bg-white/10",
                )}
              >
                <KeyIcon
                  className={`h-4 w-4 ${hasProviderKey ? "text-green-500" : "text-yellow-500"}`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {hasProviderKey
                  ? "API key added — click to manage"
                  : "Click to add API key"}
              </p>
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
          <TooltipContent>
            <p>Free model powered by Groq</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <>
      <div className="relative min-w-[180px]" ref={dropdownRef}>
        {/* Trigger */}
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
            className={cn(
              "h-4 w-4 shrink-0 opacity-50 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              "bg-popover text-popover-foreground absolute bottom-full left-0 z-50 mb-1 min-w-[280px] overflow-hidden rounded-md border shadow-md",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
            )}
          >
            <div className="max-h-[22rem] overflow-y-auto p-1">
              <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                Models
              </div>
              {visibleModels.map((model) => {
                const needsKey =
                  model.requiresApiKey && !hasKey(model.provider);
                const isUnavailable = model.isAvailable === false;
                const isDisabled = isUnavailable;
                const isSelected = model.id === selectedModel;

                return (
                  <div
                    key={model.id}
                    className={cn(
                      "relative flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isDisabled && "pointer-events-none opacity-50",
                      isSelected && "bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      disabled={isDisabled || needsKey}
                      onClick={() =>
                        !isDisabled && !needsKey && handleSelect(model.id)
                      }
                      className={cn(
                        "flex flex-1 items-center gap-2",
                        needsKey && "opacity-50",
                      )}
                    >
                      {showIcons && getModelProviderIcon(model)}
                      <span className="truncate">{model.name}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {getModelStatusIcon(model)}
                      {isSelected && (
                        <CheckIcon className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* API Key Dialog */}
      <Dialog
        open={dialogProvider !== null}
        onOpenChange={(open) => {
          if (!open) closeKeyDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogProvider && getProviderLabel(dialogProvider)} API Key
            </DialogTitle>
            <DialogDescription>
              {dialogProvider && hasKey(dialogProvider)
                ? "Your API key is saved. You can update or remove it below."
                : `Add your ${dialogProvider ? getProviderLabel(dialogProvider) : ""} API key to unlock these models.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                ref={inputRef}
                type={showKey ? "text" : "password"}
                placeholder={
                  dialogProvider && hasKey(dialogProvider)
                    ? "••••••••••••"
                    : dialogProvider
                      ? getApiKeyPlaceholder(dialogProvider)
                      : ""
                }
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dialogProvider) {
                    handleSaveKey(dialogProvider);
                  }
                }}
                className={cn(
                  "border-input bg-background h-9 w-full rounded-md border px-3 pr-9 text-sm outline-none",
                  "focus:border-ring focus:ring-ring/50 focus:ring-1",
                )}
              />
              <button
                type="button"
                aria-label={showKey ? "Hide API key" : "Show API key"}
                onClick={() => setShowKey(!showKey)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors"
              >
                {showKey ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              {dialogProvider && hasKey(dialogProvider) ? (
                <button
                  type="button"
                  onClick={() => {
                    if (dialogProvider) handleRemoveKey(dialogProvider);
                  }}
                  className="text-destructive hover:text-destructive/80 flex items-center gap-1.5 text-sm transition-colors"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                  Remove key
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => {
                  if (dialogProvider) handleSaveKey(dialogProvider);
                }}
                disabled={!apiKeyInput.trim()}
                className={cn(
                  "h-9 rounded-md px-4 text-sm font-medium transition-colors",
                  apiKeyInput.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                Save
              </button>
            </div>

            {dialogProvider && hasKey(dialogProvider) && (
              <p className="text-xs text-green-500">
                Key saved — {getProviderLabel(dialogProvider)} models are
                available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
