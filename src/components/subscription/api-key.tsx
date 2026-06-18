"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApiKeys } from "@/hooks/use-api-keys";
import { ModelProvider } from "@/models/types";
import { CheckCircleIcon, EyeIcon, EyeOffIcon, TrashIcon } from "lucide-react";

const PROVIDERS = [
  {
    provider: ModelProvider.OPENAI,
    label: "OpenAI",
    placeholder: "sk-...",
    description: "Required for GPT-3.5 Turbo, GPT-4o Mini",
  },
  {
    provider: ModelProvider.GOOGLE,
    label: "Google AI",
    placeholder: "AIza...",
    description: "Required for Gemini 2.0 Flash",
  },
  {
    provider: ModelProvider.ANTHROPIC,
    label: "Anthropic",
    placeholder: "sk-ant-...",
    description: "Required for Claude 3.5 Sonnet, Claude 3.7",
  },
];

const APIKeysPage = () => {
  const { saveKey, removeKey, hasKey } = useApiKeys();
  const [drafts, setDrafts] = useState<Partial<Record<ModelProvider, string>>>(
    {},
  );
  const [visible, setVisible] = useState<Partial<Record<ModelProvider, boolean>>>(
    {},
  );

  const handleSave = (provider: ModelProvider) => {
    const value = drafts[provider]?.trim();
    if (!value) return;
    saveKey(provider, value);
    setDrafts((prev) => ({ ...prev, [provider]: "" }));
  };

  const handleRemove = (provider: ModelProvider) => {
    removeKey(provider);
  };

  const toggleVisibility = (provider: ModelProvider) => {
    setVisible((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="bg-background mx-auto w-full">
      <div className="mt-5 mb-8">
        <h1 className="text-xl font-bold">API Keys</h1>
        <p className="text-muted-foreground text-sm font-semibold">
          Bring your own API keys to use premium models. Keys are stored locally
          in your browser.
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map(({ provider, label, placeholder, description }) => (
          <Card
            key={provider}
            className="border-border/50 border py-4"
          >
            <CardContent className="space-y-3 px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <p className="text-muted-foreground text-xs">{description}</p>
                </div>
                {hasKey(provider) && (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    Connected
                  </span>
                )}
              </div>

              {hasKey(provider) ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value="••••••••••••••••"
                    disabled
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(provider)}
                    className="text-destructive hover:text-destructive h-9 w-9 shrink-0"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={visible[provider] ? "text" : "password"}
                      placeholder={placeholder}
                      value={drafts[provider] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [provider]: e.target.value,
                        }))
                      }
                      className="pr-9 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(provider)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                    >
                      {visible[provider] ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="t3"
                    size="sm"
                    onClick={() => handleSave(provider)}
                    disabled={!drafts[provider]?.trim()}
                    className="shrink-0"
                  >
                    Save
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground mt-6 text-xs">
        Your API keys are stored only in your browser&apos;s local storage and
        are never sent to our servers. They are passed directly to the provider
        APIs when you use a BYOK model.
      </p>
    </div>
  );
};

export default APIKeysPage;
