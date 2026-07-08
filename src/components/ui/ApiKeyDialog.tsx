"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EyeIcon, EyeOffIcon, Trash2Icon } from "lucide-react";
import { type ModelProvider } from "@/models/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getProviderLabel(provider: ModelProvider): string {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "google":
      return "Google AI";
    case "anthropic":
      return "Anthropic";
    case "groq":
      return "Groq";
    default:
      return provider;
  }
}

function getApiKeyPlaceholder(provider: ModelProvider): string {
  switch (provider) {
    case "openai":
      return "sk-...";
    case "google":
      return "AIza...";
    case "anthropic":
      return "sk-ant-...";
    default:
      return "Enter API key";
  }
}

interface ApiKeyDialogProps {
  provider: ModelProvider | null;
  hasKey: (provider: ModelProvider) => boolean;
  onSaveKey: (provider: ModelProvider, key: string) => void;
  onRemoveKey: (provider: ModelProvider) => void;
  onClose: () => void;
}

export function ApiKeyDialog({
  provider,
  hasKey,
  onSaveKey,
  onRemoveKey,
  onClose,
}: ApiKeyDialogProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (provider && inputRef.current) {
      inputRef.current.focus();
    }
  }, [provider]);

  const handleSave = useCallback(() => {
    if (!provider || !apiKeyInput.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }
    onSaveKey(provider, apiKeyInput.trim());
    toast.success(`${getProviderLabel(provider)} API key saved`);
    setApiKeyInput("");
    setShowKey(false);
  }, [provider, apiKeyInput, onSaveKey]);

  const handleRemove = useCallback(() => {
    if (!provider) return;
    onRemoveKey(provider);
    toast.success(`${getProviderLabel(provider)} API key removed`);
    setApiKeyInput("");
    setShowKey(false);
  }, [provider, onRemoveKey]);

  const handleClose = useCallback(() => {
    setApiKeyInput("");
    setShowKey(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={provider !== null}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {provider && getProviderLabel(provider)} API Key
          </DialogTitle>
          <DialogDescription>
            {provider && hasKey(provider)
              ? "Your API key is saved. You can update or remove it below."
              : `Add your ${provider ? getProviderLabel(provider) : ""} API key to unlock these models.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={showKey ? "text" : "password"}
              placeholder={
                provider && hasKey(provider)
                  ? "••••••••••••"
                  : provider
                    ? getApiKeyPlaceholder(provider)
                    : ""
              }
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
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
            {provider && hasKey(provider) ? (
              <button
                type="button"
                onClick={handleRemove}
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
              onClick={handleSave}
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

          {provider && hasKey(provider) && (
            <p className="text-xs text-green-500">
              Key saved — {getProviderLabel(provider)} models are available
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
