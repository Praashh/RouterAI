"use client";

import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  CopyIcon,
  CheckCircleIcon,
  ArrowsLeftRightIcon,
} from "@phosphor-icons/react";
import { WrapText } from "lucide-react";
import { geistMono } from "./fonts";

interface CodeBlockProps {
  code: string;
  language: string;
  isWrapped: boolean;
  onToggleWrap: () => void;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  resolvedTheme?: string;
}

export function CodeBlock({
  code,
  language,
  isWrapped,
  onToggleWrap,
  copiedId,
  onCopy,
  resolvedTheme,
}: CodeBlockProps) {
  return (
    <div className={`${geistMono.className} my-4 overflow-hidden rounded-md`}>
      <div className="bg-accent flex items-center justify-between px-4 py-2 text-sm">
        <div>{language}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleWrap}
            className="hover:bg-muted/40 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-all duration-200"
            aria-label="Toggle line wrapping"
          >
            {isWrapped ? (
              <ArrowsLeftRightIcon weight="bold" className="h-3 w-3" />
            ) : (
              <WrapText className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onCopy(code, code)}
            className="hover:bg-muted/40 sticky top-10 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-all duration-200"
            aria-label="Copy code"
          >
            {copiedId === code ? (
              <CheckCircleIcon weight="bold" className="size-4" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={atomOneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          backgroundColor: resolvedTheme === "dark" ? "#141414" : "#f5f5f5",
          color: resolvedTheme === "dark" ? "#e5e5e5" : "#171717",
          borderRadius: 0,
          borderBottomLeftRadius: "0.375rem",
          borderBottomRightRadius: "0.375rem",
          fontSize: "1.2rem",
          fontFamily: `var(--font-geist-mono), ${geistMono.style.fontFamily}`,
        }}
        wrapLongLines={isWrapped}
        codeTagProps={{
          style: {
            fontFamily: `var(--font-geist-mono), ${geistMono.style.fontFamily}`,
            fontSize: "0.85em",
            whiteSpace: isWrapped ? "pre-wrap" : "pre",
            overflowWrap: isWrapped ? "break-word" : "normal",
            wordBreak: isWrapped ? "break-word" : "keep-all",
          },
        }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
