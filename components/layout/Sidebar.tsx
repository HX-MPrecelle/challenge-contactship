"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings2,
  Users,
} from "lucide-react";
import Image from "next/image";
import { signOut } from "@/app/(app)/actions";
import { createT, type Locale } from "@/lib/i18n/index";

type Props = {
  userEmail: string;
  locale: Locale;
};

export function Sidebar({ userEmail, locale }: Props) {
  const t = createT(locale);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") ?? "general";
  const onSettings = pathname.startsWith("/settings");

  const NAV = [
    { href: "/dashboard", label: t("nav.dashboard"), Icon: LayoutDashboard },
    { href: "/contacts", label: t("nav.contacts"), Icon: Users },
    { href: "/conflicts", label: t("nav.conflicts"), Icon: AlertTriangle },
    { href: "/chat", label: t("nav.chat"), Icon: MessageSquare },
    { href: "/sync", label: t("nav.sync"), Icon: Activity },
  ] as const;

  const SETTINGS_SECTIONS = [
    { id: "general",      label: t("nav.settings.general") },
    { id: "hubspot",      label: t("nav.settings.hubspot") },
    { id: "sync",         label: t("nav.settings.sync") },
    { id: "ai",           label: t("nav.settings.ai") },
    { id: "preferences",  label: t("nav.settings.preferences") },
  ] as const;

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border-default bg-bg-surface p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <Image
          src="/logo.png"
          alt="ContactShip"
          width={28}
          height={28}
          className="shrink-0 rounded-md"
          priority
        />
        <span className="text-sm font-semibold text-text-primary">
          ContactShip
        </span>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex h-[34px] items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-bg-subtle text-text-primary"
                  : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              ].join(" ")}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Settings with inline sub-menu */}
        <div className="flex flex-col gap-0.5">
          <Link
            href="/settings"
            className={[
              "flex h-[34px] items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors",
              onSettings
                ? "bg-bg-subtle text-text-primary"
                : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
            ].join(" ")}
          >
            <Settings2 size={16} />
            <span className="flex-1">{t("nav.settings")}</span>
            <ChevronDown
              size={13}
              className={`text-text-muted transition-transform ${onSettings ? "rotate-180" : ""}`}
            />
          </Link>

          {onSettings && (
            <div className="ml-6 flex flex-col gap-0.5 py-0.5">
              {SETTINGS_SECTIONS.map((s) => {
                const isActive = activeSection === s.id;
                return (
                  <Link
                    key={s.id}
                    href={`/settings?section=${s.id}`}
                    className={[
                      "flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-brand-subtle text-brand-on-subtle"
                        : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
                    ].join(" ")}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border-default pt-3">
        <div className="px-2 pb-1 text-xs text-text-muted">{userEmail}</div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-[34px] w-full items-center gap-2 rounded-md px-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            <LogOut size={16} />
            <span>{t("nav.logout")}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
