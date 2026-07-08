"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { geistMono } from "./fonts";

interface MarkdownRendererProps {
  content: string;
  isWrapped: boolean;
  onToggleWrap: () => void;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  resolvedTheme?: string;
}

export function MarkdownRenderer({
  content,
  isWrapped,
  onToggleWrap,
  copiedId,
  onCopy,
  resolvedTheme,
}: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className ?? "");
          const isInline = !match;
          const codeContent = Array.isArray(children)
            ? children.join("")
            : typeof children === "string"
              ? children
              : "";

          return isInline ? (
            <code
              className={cn(
                "bg-accent rounded-sm px-1 py-0.5 text-sm",
                geistMono.className,
              )}
              {...rest}
            >
              {children}
            </code>
          ) : (
            <CodeBlock
              code={codeContent}
              language={match ? match[1]! : "text"}
              isWrapped={isWrapped}
              onToggleWrap={onToggleWrap}
              copiedId={copiedId}
              onCopy={onCopy}
              resolvedTheme={resolvedTheme}
            />
          );
        },
        strong: (props) => (
          <span className="font-bold">{props.children}</span>
        ),
        a: (props) => (
          <a className="text-primary underline" href={props.href}>
            {props.children}
          </a>
        ),
        h1: (props) => (
          <h1 className="my-4 text-2xl font-bold">{props.children}</h1>
        ),
        h2: (props) => (
          <h2 className="my-3 text-xl font-bold">{props.children}</h2>
        ),
        h3: (props) => (
          <h3 className="my-2 text-lg font-bold">{props.children}</h3>
        ),
        img: (props) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.src}
            alt={props.alt ?? "Generated image"}
            className="my-4 max-w-full rounded-lg border shadow-md"
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
