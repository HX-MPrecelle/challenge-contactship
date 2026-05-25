"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Bot,
  Check,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  type AppNotification,
} from "@/actions/notifications";

const TYPE_ICON: Record<string, React.ReactNode> = {
  agent_run:      <Bot size={14} className="text-brand" />,
  conflict:       <AlertTriangle size={14} className="text-error" />,
  hubspot_update: <RefreshCw size={14} className="text-success" />,
  sync_error:     <Zap size={14} className="text-warning" />,
};

const TYPE_BG: Record<string, string> = {
  agent_run:      "bg-brand-subtle",
  conflict:       "bg-error-subtle",
  hubspot_update: "bg-success-subtle",
  sync_error:     "bg-warning-subtle",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export function NotificationBell({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  // Load on mount
  useEffect(() => {
    getNotifications().then(data => { setNotifications(data); setLoading(false); });
  }, []);

  // Realtime: new notifications appear instantly
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `org_id=eq.${orgId}` },
        (payload) => {
          setNotifications(prev => [payload.new as AppNotification, ...prev].slice(0, 20));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleClick(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={[
          "relative flex h-[34px] w-full items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors",
          open ? "bg-bg-subtle text-text-primary" : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
        ].join(" ")}
      >
        <Bell size={16} />
        <span>Notificaciones</span>
        {unread > 0 && (
          <span className="ml-auto flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-[320px] overflow-hidden rounded-xl border border-border-strong bg-bg-surface shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Notificaciones</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary"
                >
                  <Check size={11} /> Leer todas
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-border-default">
            {loading && (
              <li className="flex items-center justify-center py-8 text-sm text-text-muted">Cargando…</li>
            )}
            {!loading && notifications.length === 0 && (
              <li className="flex flex-col items-center gap-2 py-8 text-center">
                <Bell size={20} className="text-text-muted" />
                <p className="text-sm text-text-muted">Sin notificaciones</p>
              </li>
            )}
            {notifications.map(n => {
              const inner = (
                <div
                  className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle ${!n.read ? "bg-brand-subtle/20" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TYPE_BG[n.type] ?? "bg-bg-subtle"}`}>
                    {TYPE_ICON[n.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${!n.read ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="mt-0.5 text-[11px] text-text-muted line-clamp-2">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-text-muted" suppressHydrationWarning>
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                </div>
              );

              return (
                <li key={n.id} className="cursor-pointer">
                  {n.link ? <Link href={n.link}>{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
