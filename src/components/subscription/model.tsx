"use client";

import React, { useState, useEffect } from "react";
import { Code, MessageSquare, Eye, Zap, KeyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MODELS } from "@/models/constants";
import type { Model } from "@/models/types";
import { ModelCapability, ModelProvider } from "@/models/types";
import { getModelProviderIcon } from "@/models/utils";
import { useApiKeys } from "@/hooks/use-api-keys";

const STORAGE_KEY = "routerai-enabled-models:v1";

function getEnabledModels(): Set<string> {
  if (typeof window === "undefined") return new Set(MODELS.map((m) => m.id));
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return new Set(JSON.parse(stored) as string[]);
    } catch {
      return new Set(MODELS.map((m) => m.id));
    }
  }
  return new Set(MODELS.map((m) => m.id));
}

function saveEnabledModels(models: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...models]));
}

const capabilityIcon: Record<string, React.ReactNode> = {
  [ModelCapability.TEXT]: <MessageSquare className="h-3 w-3" />,
  [ModelCapability.CODE]: <Code className="h-3 w-3" />,
  [ModelCapability.VISION]: <Eye className="h-3 w-3" />,
  [ModelCapability.FUNCTION_CALLING]: <Zap className="h-3 w-3" />,
};

const capabilityLabel: Record<string, string> = {
  [ModelCapability.TEXT]: "Text",
  [ModelCapability.CODE]: "Code",
  [ModelCapability.VISION]: "Vision",
  [ModelCapability.FUNCTION_CALLING]: "Functions",
};

const ModelCard = ({
  model,
  enabled,
  onToggle,
  hasApiKey,
}: {
  model: Model;
  enabled: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  hasApiKey: boolean;
}) => {
  const switchId = `model-toggle-${model.id}`;

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center">
              {getModelProviderIcon(model)}
            </div>
            <div>
              <h3 className="text-sm font-semibold md:text-base">
                {model.name}
              </h3>
              <span className="text-muted-foreground text-xs capitalize">
                {model.provider}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {model.requiresApiKey && (
              <Badge
                variant={hasApiKey ? "default" : "secondary"}
                className="text-xs"
              >
                <KeyIcon className="mr-1 h-3 w-3" />
                {hasApiKey ? "Key Added" : "BYOK"}
              </Badge>
            )}
            {!model.requiresApiKey && (
              <Badge variant="default" className="text-xs">
                Free
              </Badge>
            )}
            <Switch
              id={switchId}
              checked={enabled}
              onCheckedChange={(checked) => onToggle(model.id, checked)}
            />
            <Label htmlFor={switchId} className="sr-only">
              Enable {model.name}
            </Label>
          </div>
        </div>

        <p className="text-muted-foreground mb-3 text-xs">
          {model.description}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {model.capabilities.map((cap) => (
              <Badge
                key={cap}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {capabilityIcon[cap]}
                <span className="text-xs">{capabilityLabel[cap]}</span>
              </Badge>
            ))}
          </div>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span>{(model.maxTokens / 1000).toFixed(0)}K tokens</span>
            {model.pricePer1kTokens > 0 && (
              <span>${model.pricePer1kTokens}/1K tokens</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Models = () => {
  const [enabledModels, setEnabledModels] = useState<Set<string>>(getEnabledModels);
  const [filterCapability, setFilterCapability] = useState<string | null>(null);
  const { hasKey } = useApiKeys();

  const handleToggle = (modelId: string, enabled: boolean) => {
    const next = new Set(enabledModels);
    if (enabled) {
      next.add(modelId);
    } else {
      next.delete(modelId);
    }
    setEnabledModels(next);
    saveEnabledModels(next);
  };

  const handleSelectRecommended = () => {
    const recommended = new Set<string>();
    for (const m of MODELS) {
      if (!m.requiresApiKey || hasKey(m.provider)) {
        recommended.add(m.id);
      }
    }
    setEnabledModels(recommended);
    saveEnabledModels(recommended);
  };

  const handleUnselectAll = () => {
    const empty = new Set<string>();
    setEnabledModels(empty);
    saveEnabledModels(empty);
  };

  const filteredModels = filterCapability
    ? MODELS.filter((m) =>
        m.capabilities.includes(filterCapability as ModelCapability),
      )
    : MODELS;

  // Group by provider in one pass
  const groupedModels: { provider: ModelProvider; models: typeof filteredModels }[] = [];
  for (const provider of Object.values(ModelProvider)) {
    const models = filteredModels.filter((m) => m.provider === provider);
    if (models.length > 0) {
      groupedModels.push({ provider, models });
    }
  }

  return (
    <div className="bg-background mx-auto w-full max-w-4xl">
      <div className="my-8">
        <h1 className="text-xl font-bold">Available Models</h1>
        <p className="text-muted-foreground">
          Choose which models appear in your model selector. This won{"'"}t
          affect existing conversations.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-7 text-xs"
            variant={filterCapability === null ? "default" : "outline"}
            onClick={() => setFilterCapability(null)}
          >
            All
          </Button>
          {Object.values(ModelCapability).map((cap) => (
            <Button
              key={cap}
              className="h-7 text-xs"
              variant={filterCapability === cap ? "default" : "outline"}
              onClick={() =>
                setFilterCapability(filterCapability === cap ? null : cap)
              }
            >
              {capabilityLabel[cap]}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="hidden h-7 text-xs md:block"
            variant="outline"
            onClick={handleSelectRecommended}
          >
            Select Recommended
          </Button>
          <Button
            className="h-7 text-xs"
            variant="outline"
            onClick={handleUnselectAll}
          >
            Unselect All
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {groupedModels.map(({ provider, models }) => (
          <div key={provider}>
            <h2 className="text-muted-foreground mb-3 text-sm font-semibold uppercase">
              {provider}
            </h2>
            <div className="space-y-3">
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  enabled={enabledModels.has(model.id)}
                  onToggle={handleToggle}
                  hasApiKey={hasKey(model.provider)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Models;
