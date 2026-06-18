"use client";

import { useState, useEffect } from "react";
import { DEFAULT_MODEL_ID, MODELS, getModelById } from "@/models/constants";
import type { Model } from "@/models/types";
import { getModelProviderIcon } from "@/models/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircleIcon, CheckCircleIcon, KeyIcon } from "lucide-react";
import { useApiKeys } from "@/hooks/use-api-keys";

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
  const [selectedModel, setSelectedModel] = useState<string>(
    value ?? DEFAULT_MODEL_ID,
  );


  useEffect(() => {
    if (value && value !== selectedModel) {
      setSelectedModel(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setSelectedModel(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const selectedModelObj = getModelById(selectedModel);
  const { hasKey } = useApiKeys();

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
              <KeyIcon
                className={`h-4 w-4 ${hasProviderKey ? "text-green-500" : "text-yellow-500"}`}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {hasProviderKey
                  ? "Using your API key"
                  : "Requires API key — add in Settings"}
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
    <Select
      value={selectedModel}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="bg-accent max-h-8 active:ring-0">
        <SelectValue className="h-5" placeholder="Select Model">
          {selectedModelObj && (
            <div className="flex items-center gap-2">
              {showIcons && getModelProviderIcon(selectedModelObj)}
              <span>{selectedModelObj.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Models</SelectLabel>
          {MODELS.map((model) => {
            const isDisabled =
              model.isAvailable === false ||
              (model.requiresApiKey && !hasKey(model.provider));
            return (
              <SelectItem
                key={model.id}
                value={model.id}
                disabled={isDisabled}
                className={isDisabled ? "opacity-60" : ""}
              >
                <div className="flex items-center gap-2">
                  {showIcons && getModelProviderIcon(model)}
                  <span>{model.name}</span>
                  {getModelStatusIcon(model)}
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
