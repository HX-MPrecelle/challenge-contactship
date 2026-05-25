"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Bell, Bot, RefreshCw, Trash2, X, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  clearAllRead,
  type AppNotification,
} from "@/actions/notifications";

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; dot: string }> = {
  agent_run:      { icon: <Bot size={13} />,           color: "bg-brand-subtle text-brand",       dot: "bg-brand" },
  conflict:       { icon: <AlertTriangle size={13} />, color: "bg-error-subtle text-error",        dot: "bg-error" },
  hubspot_update: { icon: <RefreshCw size={13} />,     color: "bg-success-subtle text-success",   dot: "bg-success" },
  sync_error:     { icon: <Zap size={13} />,           color: "bg-warning-subtle text-warning",   dot: "bg-warning" },
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
  const instanceId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;
  const hasRead = notifications.some(n => n.read);

  useEffect(() => {
    getNotifications().then(data => { setNotifications(data); setLoading(false); });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${orgId}-${instanceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `org_id=eq.${orgId}` },
        (payload) => setNotifications(prev => [payload.new as AppNotification, ...prev].slice(0, 20))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, instanceId]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
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

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function handleMarkAll() {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handleClearRead() {
    await clearAllRead();
    setNotifications(prev => prev.filter(n => !n.read));
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
          <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-bold text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 w-[340px] overflow-hidden rounded-2xl border border-border-strong bg-bg-surface shadow-2xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Notificaciones</span>
              {unread > 0 && (
                <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">{unread} nueva{unread > 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {unread > 0 && (
                <button type="button" onClick={handleMarkAll}
                  className="rounded-md px-2 py-1 text-[10px] font-medium text-text-muted hover:bg-bg-subtle hover:text-text-primary transition-colors">
                  Leer todas
                </button>
              )}
              {hasRead && (
                <button type="button" onClick={handleClearRead}
                  className="rounded-md px-2 py-1 text-[10px] font-medium text-text-muted hover:bg-bg-subtle hover:text-error transition-colors">
                  Limpiar leídas
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="max-h-[380px] overflow-y-auto divide-y divide-border-default">
            {loading && (
              <li className="flex items-center justify-center py-10 text-sm text-text-muted">
                <span className="animate-pulse">Cargando…</span>
              </li>
            )}
            {!loading && notifications.length === 0 && (
              <li className="flex flex-col items-center gap-3 py-10 text-center px-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-subtle">
                  <Bell size={18} className="text-text-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Todo tranquilo</p>
                  <p className="text-xs text-text-muted mt-0.5">Las notificaciones aparecen aquí cuando hay actividad.</p>
                </div>
              </li>
            )}
            {notifications.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.sync_error!;
              const inner = (
                <div
                  className={`group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-bg-subtle ${!n.read ? "bg-brand-subtle/10" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  {/* Type icon */}
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pr-6">
                    <p className={`text-xs leading-snug ${!n.read ? "font-semibold text-text-primary" : "text-text-secondary"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-[11px] text-text-muted line-clamp-2 leading-relaxed">{n.body}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${!n.read ? "opacity-100" : "opacity-0"}`} />
                      <span className="text-[10px] text-text-muted" suppressHydrationWarning>
                        {relativeTime(n.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Delete button — visible on hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(n.id, e)}
                    className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-md text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-error-subtle hover:text-error"
                    title="Eliminar notificación"
                  >
                    <Trash2 size={11} />
                  </button>
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
