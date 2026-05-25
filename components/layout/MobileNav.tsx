"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Locale } from "@/lib/i18n/index";

type Props = { userEmail: string; locale: Locale; orgId?: string };

export function MobileNav({ userEmail, locale, orgId }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="flex md:hidden items-center justify-between border-b border-border-default bg-bg-surface px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-text-primary">
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5">
              <path d="M2 10.5L7 3.5L12 10.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-text-primary">ContactShip</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-subtle"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 w-[260px] bg-bg-surface shadow-xl transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-border-default px-3 py-3">
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-text-primary">
              <svg viewBox="0 0 14 14" fill="none" className="h-4 w-4">
                <path d="M2 10.5L7 3.5L12 10.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-text-primary">ContactShip</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-subtle"
          >
            <X size={18} />
          </button>
        </div>
        <Sidebar userEmail={userEmail} locale={locale} orgId={orgId} />
      </div>
    </>
  );
}
