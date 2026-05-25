"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { correctVoiceInput } from "@/actions/ai";
import {
  PERSONAS,
  PERSONA_HINT,
  PERSONA_LABEL,
  type ChatPersona,
} from "@/lib/ai/persona";
import {
  getConversations,
  createConversation,
  getMessages,
  saveMessage,
  deleteConversation,
} from "@/actions/chat";
import type { ChatUIMessage, ContactCitation } from "@/types/chat";
import { useI18n } from "@/lib/i18n/context";

const PERSONA_STORAGE_KEY = "contactship.chat.persona";

type Conversation = { id: string; title: string; updated_at: string };

export function ContactsChat() {
  const { t } = useI18n();
  const [persona, setPersona] = useState<ChatPersona>("concise");
  const [convId, setConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isCorrectingVoice, setIsCorrectingVoice] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (stored && (PERSONAS as readonly string[]).includes(stored))
      setPersona(stored as ChatPersona);
  }, []);

  useEffect(() => {
    getConversations().then((r) => {
      setHistoryLoading(false);
      if (r.success) setConversations(r.data);
    });
  }, []);

  const personaRef = useRef<ChatPersona>(persona);
  useEffect(() => {
    personaRef.current = persona;
    window.localStorage.setItem(PERSONA_STORAGE_KEY, persona);
  }, [persona]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, persona: personaRef.current },
        }),
      }),
    []
  );

  const { messages, sendMessage, setMessages, status, error } =
    useChat<ChatUIMessage>({ transport });

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollerRef.current)
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages]);

  async function submit() {
    const text = input.trim();
    if (!text || status === "streaming") return;
    setInput("");

    let activeConvId = convId;
    if (!activeConvId) {
      const r = await createConversation(text);
      if (!r.success) { toast.error(r.error); return; }
      activeConvId = r.data.id;
      setConvId(activeConvId);
      setConversations((prev) => [r.data, ...prev]);
    }

    await saveMessage({ conversationId: activeConvId, role: "user", content: text });
    void sendMessage({ text });
  }

  // Save AI response when streaming finishes
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const was = prevStatusRef.current;
    prevStatusRef.current = status;
    if (was === "streaming" && status === "ready" && convId) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        const text = last.parts
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text).join("");
        const citations = last.parts
          .filter((p): p is { type: "data-citations"; data: { contacts: ContactCitation[] } } => p.type === "data-citations")
          .flatMap((p) => p.data.contacts);
        saveMessage({ conversationId: convId, role: "assistant", content: text, citations });
      }
    }
  }, [status, messages, convId]);

  async function loadConversation(id: string) {
    setConvId(id);
    const r = await getMessages(id);
    if (!r.success) { toast.error(r.error); return; }
    const loaded = r.data.map((m, i) => ({
      id: `hist-${i}`,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
    })) as ChatUIMessage[];
    setMessages(loaded);
  }

  function startNewConversation() {
    setConvId(null);
    setMessages([]);
    setInput("");
  }

  const [isDeletingId, startDeleting] = useTransition();
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    startDeleting(async () => {
      const r = await deleteConversation(id);
      if (!r.success) { toast.error(r.error); return; }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (convId === id) startNewConversation();
    });
  }

  const voice = useVoiceInput(async (raw) => {
    // Hold the raw text — show "Interpretando..." until AI corrects
    setIsCorrectingVoice(true);
    try {
      const { corrected } = await correctVoiceInput(raw);
      setInput((prev) => prev ? `${prev} ${corrected}` : corrected);
    } catch {
      // Fallback: show raw if AI correction fails
      setInput((prev) => prev ? `${prev} ${raw}` : raw);
    } finally {
      setIsCorrectingVoice(false);
    }
  });

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error]);

  const grouped = groupByDate(conversations);

  return (
    <div className="flex h-full w-full">
      {/* History rail — hidden on mobile, shown as overlay when toggled */}
      {showHistory && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}
      <aside className={[
        "flex w-[260px] shrink-0 flex-col border-r border-border-default bg-bg-surface",
        "md:relative md:translate-x-0 md:flex",
        showHistory
          ? "fixed inset-y-0 left-0 z-40 translate-x-0"
          : "hidden md:flex",
      ].join(" ")}>
        <div className="border-b border-border-default p-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={startNewConversation}
          >
            <Plus size={14} />
            {t("chat.new")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {historyLoading ? (
            <div className="flex flex-col gap-1 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-bg-subtle" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-2 pt-4 text-xs text-text-muted">
              {t("chat.history.none")}
            </p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-3">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {t(group as GroupKey)}
                </p>
                {items.map((c) => (
                  <div
                    key={c.id}
                    className={[
                      "group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                      c.id === convId
                        ? "bg-bg-subtle text-text-primary"
                        : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                    ].join(" ")}
                    onClick={() => loadConversation(c.id)}
                  >
                    <span className="flex-1 truncate text-xs">{c.title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(c.id, e)}
                      className="hidden shrink-0 text-text-muted group-hover:flex hover:text-error"
                      aria-label={t("chat.history.delete")}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Conversation panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border-default px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile: history toggle */}
            <button
              type="button"
              onClick={() => setShowHistory(v => !v)}
              className="md:hidden flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-subtle"
              aria-label="Historial"
            >
              <MessageSquare size={16} />
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
            >
              <ArrowLeft size={12} />
              {t("chat.back")}
            </Link>
            <div className="h-4 w-px bg-border-default" />
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-subtle">
              <MessageSquare size={16} className="text-brand-on-subtle" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-text-primary">
                {t("chat.title")}
              </h1>
              <p className="text-xs text-text-muted">
                {t("chat.subtitle")}
              </p>
            </div>
          </div>
          <PersonaToggle persona={persona} onChange={setPersona} />
        </header>

        {/* Messages */}
        <div
          ref={scrollerRef}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6"
        >
          {messages.length === 0 ? (
            <ChatEmptyState onPick={(p) => setInput(p)} />
          ) : (
            messages
              .filter((message) => {
                // Hide intermediate assistant messages that have no visible content
                // (tool call results only — no text, no citations). These appear
                // during multi-step tool calling and would cause double bouncing dots.
                if (message.role === "user") return true;
                const hasText = message.parts.some(
                  (p): p is { type: "text"; text: string } =>
                    p.type === "text" && (p as { type: "text"; text: string }).text.length > 0
                );
                const hasCitations = message.parts.some(
                  (p) => p.type === "data-citations"
                );
                return hasText || hasCitations;
              })
              .map((message) => (
                <Message key={message.id} role={message.role} parts={message.parts} />
              ))
          )}
          {/* Only show ThinkingDots when no assistant message with visible text is
              already streaming — prevents double bouncing during tool call rounds. */}
          {(status === "submitted" || status === "streaming") &&
            !messages.some(
              (m) =>
                m.role === "assistant" &&
                m.parts.some(
                  (p): p is { type: "text"; text: string } =>
                    p.type === "text" && (p as { type: "text"; text: string }).text.length > 0
                )
            ) && <ThinkingDots />}
          {error && (
            <div className="rounded-lg border border-error/40 bg-error-subtle px-3 py-2 text-xs text-error">
              {error.message}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border-default px-6 pb-6 pt-4">
          {(voice.listening || isCorrectingVoice) && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand/40 bg-brand-subtle px-3 py-2 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              <span className="text-brand-on-subtle">
                {isCorrectingVoice ? "Interpretando con IA…" : t("chat.voice.listening")}
              </span>
              {voice.listening && voice.interim && (
                <span className="truncate italic text-text-secondary">
                  &ldquo;{voice.interim}&rdquo;
                </span>
              )}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-border-strong bg-bg-surface p-2 shadow-cs-sm">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={2}
              placeholder={t("chat.placeholder")}
              className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <div className="flex shrink-0 items-center gap-1">
              {voice.supported && (
                <Button
                  type="button"
                  variant={voice.listening ? "secondary" : "ghost"}
                  size="sm"
                  onClick={voice.listening ? voice.stop : voice.start}
                  aria-label={voice.listening ? t("chat.voice.stop") : t("chat.voice.start")}
                >
                  {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => void submit()}
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
          <p className="mt-2 text-center text-[10px] text-text-muted">
            {t("chat.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PersonaToggle({
  persona,
  onChange,
}: {
  persona: ChatPersona;
  onChange: (next: ChatPersona) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
        {t("chat.persona.label")}
      </span>
      <div className="inline-flex rounded-lg border border-border-default bg-bg-surface p-0.5">
        {PERSONAS.map((p) => {
          const active = p === persona;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              title={PERSONA_HINT[p]}
              className={[
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "bg-brand text-primary-foreground"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              ].join(" ")}
            >
              {PERSONA_LABEL[p]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Message({
  role,
  parts,
}: {
  role: ChatUIMessage["role"];
  parts: ChatUIMessage["parts"];
}) {
  const isUser = role === "user";
  const text = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  // Deduplicate citations by id — onStepFinish emits after every tool round,
  // so the same contact can appear in multiple data-citations parts.
  const rawCitations = parts
    .filter(
      (p): p is { type: "data-citations"; id?: string; data: { contacts: ContactCitation[] } } =>
        p.type === "data-citations"
    )
    .flatMap((p) => p.data.contacts);
  const citations = Array.from(
    new Map(rawCitations.map((c) => [c.id, c])).values()
  );

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] rounded-xl rounded-tr-sm border border-border-default bg-bg-subtle px-4 py-2.5 text-sm leading-relaxed text-text-primary"
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-subtle">
        <Sparkles size={13} className="text-brand-on-subtle" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <MarkdownText text={text} className="text-text-primary" />
        {citations.length > 0 && <Citations contacts={citations} />}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-subtle">
        <Sparkles size={13} className="text-brand-on-subtle" />
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-text-muted"
            style={{
              animation: "bounce-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Citations({ contacts }: { contacts: ContactCitation[] }) {
  const { t } = useI18n();
  // contacts is already deduplicated in Message, but guard here too
  const unique = Array.from(new Map(contacts.map((c) => [c.id, c])).values());
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-text-muted">
        <Sparkles size={9} />
        {t("chat.citations.basedOn", { n: unique.length, plural: unique.length === 1 ? "" : "s" })}
      </span>
      <div className="flex flex-wrap gap-1">
        {unique.map((c) => (
          <Link
            key={c.id}
            href={`/contacts/${c.id}`}
            className="group inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-surface px-2 py-0.5 text-[10px] text-text-secondary transition-colors hover:border-brand/40 hover:bg-brand-subtle hover:text-text-primary"
            title={`Similarity: ${(c.similarity * 100).toFixed(0)}%`}
          >
            <span className="max-w-[120px] truncate">{c.name}</span>
            {c.company && <span className="text-text-muted">· {c.company}</span>}
            <ExternalLink
              size={8}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ChatEmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const { t } = useI18n();
  const examples = [
    t("chat.example.1"),
    t("chat.example.2"),
    t("chat.example.3"),
    t("chat.example.4"),
  ];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle">
        <Sparkles size={22} className="text-brand-on-subtle" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-text-primary">
          {t("chat.empty.title")}
        </h2>
        <p className="max-w-sm text-sm text-text-secondary">
          {t("chat.empty.desc")}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((example) => (
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

type GroupKey = "chat.history.today" | "chat.history.yesterday" | "chat.history.week" | "chat.history.older";

function groupByDate(convos: Conversation[]): Record<GroupKey, Conversation[]> {
  const now = Date.now();
  const DAY = 86400000;
  const groups: Partial<Record<GroupKey, Conversation[]>> = {};

  for (const c of convos) {
    const diff = now - new Date(c.updated_at).getTime();
    let group: GroupKey;
    if (diff < DAY) group = "chat.history.today";
    else if (diff < 2 * DAY) group = "chat.history.yesterday";
    else if (diff < 7 * DAY) group = "chat.history.week";
    else group = "chat.history.older";

    if (!groups[group]) groups[group] = [];
    (groups[group] as Conversation[]).push(c);
  }
  return groups as Record<GroupKey, Conversation[]>;
}
