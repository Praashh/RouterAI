"use client";

import React, { createContext, use, useState, useEffect, useMemo, useCallback } from "react";

type FontContextType = {
  selectedFont: string;
  setSelectedFont: (font: string) => void;
};

const FontContext = createContext<FontContextType | undefined>(undefined);

const FONT_STORAGE_KEY = "routerai-font-preference";

const FONT_CLASSES = [
  "font-proxima",
  "font-inter",
  "font-geist",
  "font-playfair",
  "font-roboto",
];

function applyFontToDocument(font: string) {
  if (typeof document !== "undefined") {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove(...FONT_CLASSES);
    htmlElement.classList.add(`font-${font}`);
    document.body.classList.remove(...FONT_CLASSES);
    document.body.classList.add(`font-${font}`);
  }
}

export const FontProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedFont, setSelectedFontState] = useState<string>(() => {
    if (typeof window === "undefined") return "proxima";
    return localStorage.getItem(FONT_STORAGE_KEY) || "proxima";
  });

  // Apply font to document on mount and when selectedFont changes
  useEffect(() => {
    applyFontToDocument(selectedFont);
    localStorage.setItem(FONT_STORAGE_KEY, selectedFont);
  }, [selectedFont]);

  // Handle localStorage changes and cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FONT_STORAGE_KEY && e.newValue) {
        setSelectedFontState(e.newValue);
        applyFontToDocument(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setSelectedFont = useCallback((font: string) => {
    setSelectedFontState(font);
  }, []);

  const value = useMemo(() => ({ selectedFont, setSelectedFont }), [selectedFont, setSelectedFont]);

  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  );
};

export const useFont = () => {
  const context = use(FontContext);
  if (context === undefined) {
    throw new Error("useFont must be used within a FontProvider");
  }
  return context;
};
