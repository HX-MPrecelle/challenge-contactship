"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import { createT, type Locale } from "@/lib/i18n/index";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  keywords?: string;
};

type Props = {
  locale: Locale;
};

export function CommandPalette({ locale }: Props) {
  const t = createT(locale);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const NAV: NavItem[] = [
    { href: "/dashboard",  label: t("nav.dashboard"),  icon: <LayoutDashboard size={15} />, keywords: "home inicio" },
    { href: "/contacts",   label: t("nav.contacts"),   icon: <Users size={15} />,           keywords: "contactos crm" },
    { href: "/agent",      label: t("nav.agent"),       icon: <Bot size={15} />,             keywords: "agente ia recomendaciones" },
    { href: "/conflicts",  label: t("nav.conflicts"),  icon: <AlertTriangle size={15} />,   keywords: "conflictos sync" },
    { href: "/insights",   label: t("nav.insights"),   icon: <BarChart3 size={15} />,       keywords: "pipeline analisis win loss" },
    { href: "/chat",       label: t("nav.chat"),       icon: <MessageSquare size={15} />,   keywords: "chat preguntar buscar" },
    { href: "/sync",       label: t("nav.sync"),       icon: <Activity size={15} />,        keywords: "sincronizacion hubspot" },
    { href: "/settings",   label: t("nav.settings"),   icon: <Settings2 size={15} />,       keywords: "configuracion preferencias" },
  ];

  const filtered = query.trim()
    ? NAV.filter((item) => {
        const needle = query.trim().toLowerCase();
        return (
          item.label.toLowerCase().includes(needle) ||
          item.href.includes(needle) ||
          (item.keywords ?? "").includes(needle)
        );
      })
    : NAV;

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[20vh] z-50 w-full max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-border-strong bg-bg-surface shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">{t("cmd.title")}</DialogPrimitive.Title>

          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
            <Search size={16} className="shrink-0 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("cmd.placeholder")}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0 && filtered[0]) {
                  navigate(filtered[0].href);
                }
                if (e.key === "Escape") setOpen(false);
              }}
            />
            <kbd className="hidden rounded border border-border-default px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline">
              ESC
            </kbd>
          </div>

          {/* Navigation items */}
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-muted">
                {t("cmd.noResults")}
              </li>
            )}
            {filtered.map((item) => (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-bg-subtle focus:bg-bg-subtle focus:outline-none"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-subtle text-text-secondary">
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto font-mono text-[10px] text-text-muted">{item.href}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Footer hint */}
          <div className="border-t border-border-default px-4 py-2 text-[10px] text-text-muted">
            <kbd className="rounded border border-border-default px-1 font-mono">⌘K</kbd>
            {" "}{t("cmd.hint")}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
