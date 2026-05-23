"use client";

import type { ReactNode } from "react";

/** Renders a subset of Markdown as React elements without any dependencies.
 *  Handles: **bold**, *italic*, `inline code`, - bullet lists, blank line spacing. */
export function MarkdownText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} className="my-1.5 flex flex-col gap-0.5 pl-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  lines.forEach((line, idx) => {
    const stripped = line.replace(/^[-•*]\s+/, "");
    const isBullet = stripped !== line && line.match(/^[-•*]\s/);

    if (isBullet) {
      listBuffer.push(stripped);
    } else {
      flushList();
      if (line.trim() === "") {
        // Blank line — only add space if not the first element
        if (elements.length > 0) {
          elements.push(<div key={`sp-${idx}`} className="h-1.5" />);
        }
      } else {
        elements.push(
          <span key={idx} className="block">
            {renderInline(line)}
          </span>
        );
      }
    }
  });

  flushList();

  return (
    <div className={`text-sm leading-relaxed ${className ?? ""}`}>
      {elements}
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  // Split on **bold**, *italic*, `code` — in that order of precedence
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-bg-subtle px-1 py-0.5 font-mono text-[0.82em] text-text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
