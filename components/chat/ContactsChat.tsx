"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, MessageSquare, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const EXAMPLES = [
  "¿Cuáles son los patrones comunes entre mis leads cerrados?",
  "¿Qué contactos debería priorizar esta semana y por qué?",
  "Resumime el estado general de mi pipeline.",
  "Hay industrias sin atender con perfil similar a mis mejores clientes?",
] as const;

export function ContactsChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || status === "streaming") return;
    setInput("");
    void sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center gap-3 border-b border-border-default pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <MessageSquare size={18} />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-semibold text-text-primary">
            Chat con tu base
          </h1>
          <p className="text-sm text-text-secondary">
            Preguntas en lenguaje natural sobre tus contactos. Razona sobre
            patrones, prioridades, gaps.
          </p>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto py-6"
      >
        {messages.length === 0 ? (
          <EmptyState
            onPick={(prompt) => {
              setInput(prompt);
            }}
          />
        ) : (
          messages.map((message) => (
            <Message key={message.id} role={message.role} parts={message.parts} />
          ))
        )}
        {status === "streaming" && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 size={12} className="animate-spin" />
            Pensando...
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-error/40 bg-error-subtle px-3 py-2 text-xs text-error">
            {error.message}
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border-default pt-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Escribí tu pregunta. Shift+Enter para nueva línea."
          className="min-h-[44px] flex-1 resize-none rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <Button
          type="button"
          onClick={submit}
          disabled={status === "streaming" || input.trim().length === 0}
          aria-label="Enviar"
        >
          {status === "streaming" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowUp size={14} />
          )}
        </Button>
      </div>
    </div>
  );
}

function Message({
  role,
  parts,
}: {
  role: string;
  parts: { type: string; text?: string }[];
}) {
  const isUser = role === "user";
  const text = parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          isUser
            ? "bg-bg-elevated text-text-secondary"
            : "bg-brand-subtle text-brand"
        }`}
      >
        {isUser ? <User size={13} /> : <Sparkles size={13} />}
      </div>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-brand text-primary-foreground"
            : "border border-border-default bg-bg-surface text-text-primary"
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-brand">
        <Sparkles size={22} />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Hacé una pregunta sobre tu base de contactos
        </h2>
        <p className="max-w-md text-sm text-text-secondary">
          El asistente embedea tu pregunta, recupera los contactos más
          relevantes vía similarity search en pgvector, y razona sobre ellos
          con GPT-4o-mini.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onPick(example)}
            className="rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
