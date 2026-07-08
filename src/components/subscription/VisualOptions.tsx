"use client";

import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fonts = [
  { value: "proxima", label: "Proxima Vara" },
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "playfair", label: "Playfair Display" },
  { value: "roboto", label: "Roboto" },
] as const;

interface VisualOptionsProps {
  selectedFont: string;
  onFontChange: (font: string) => void;
  isBoringTheme: boolean;
  onBoringThemeChange: (value: boolean) => void;
  isBlurred: boolean;
  onBlurChange: (value: boolean) => void;
}

export function VisualOptions({
  selectedFont,
  onFontChange,
  isBoringTheme,
  onBoringThemeChange,
  isBlurred,
  onBlurChange,
}: VisualOptionsProps) {
  return (
    <div className="border-border mt-12">
      <h2 className="text-foreground text-xl font-semibold">Visual Options</h2>

      <div className="mt-6 flex flex-col gap-8">
        {/* Font Selection */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-foreground text-base font-semibold">
              Font Family
            </div>
            <div className="text-muted-foreground text-sm">
              Choose your preferred font for the application.
            </div>
          </div>
          <Select value={selectedFont} onValueChange={onFontChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select font">
                <span className={`font-${selectedFont}`}>
                  {fonts.find((f) => f.value === selectedFont)?.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {fonts.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span className={`font-${font.value}`}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Boring Theme Switch */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-foreground text-base font-semibold">
              Boring Theme
            </div>
            <div className="text-muted-foreground text-sm">
              If you think the pink is too much, turn this on to tone it down.
            </div>
          </div>
          <Switch checked={isBoringTheme} onCheckedChange={onBoringThemeChange} />
        </div>

        {/* Hide Personal Information Switch */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-foreground text-base font-semibold">
              Hide Personal Information
            </div>
            <div className="text-muted-foreground text-sm">
              Hides your name and email from the UI.
            </div>
          </div>
          <Switch
            checked={isBlurred}
            onCheckedChange={onBlurChange}
          />
        </div>
      </div>
    </div>
  );
}
