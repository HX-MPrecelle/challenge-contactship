"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Check,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings2,
  Users,
} from "lucide-react";
import { signOut } from "@/app/(app)/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/contacts", label: "Contactos", Icon: Users },
  { href: "/conflicts", label: "Conflictos", Icon: AlertTriangle },
  { href: "/chat", label: "Chat", Icon: MessageSquare },
  { href: "/sync", label: "Sync", Icon: Activity },
  { href: "/settings", label: "Settings", Icon: Settings2 },
] as const;

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-border-default bg-bg-surface p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text-primary">
          <Check size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-semibold text-text-primary">
          ContactShip
        </span>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
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
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border-default pt-3">
        <div className="px-2 pb-1 text-xs text-text-muted">{userEmail}</div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-[34px] w-full items-center gap-2 rounded-md px-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
