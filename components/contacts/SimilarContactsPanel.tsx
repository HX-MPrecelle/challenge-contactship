"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { SkeletonRows } from "@/components/ui/skeleton";
import { findSimilarContacts, type SimilarContact } from "@/actions/ai";
import { useI18n } from "@/lib/i18n/context";

export function SimilarContactsPanel({ contactId }: { contactId: string }) {
  const { t } = useI18n();
  const [contacts, setContacts] = useState<SimilarContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    findSimilarContacts({ contactId, limit: 5 }).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result.success) { setError(result.error); return; }
      setContacts(result.data.contacts);
    });
    return () => { cancelled = true; };
  }, [contactId]);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-5">
      <header className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-subtle">
          <Sparkles size={14} className="text-brand-on-subtle" />
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {t("similar.title")}
        </h2>
      </header>

      {isLoading ? (
        <SkeletonRows count={3} />
      ) : error ? (
        <div className="rounded-lg border border-error/40 bg-error-subtle px-3 py-2 text-xs text-error">
          {error}
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <p className="text-xs text-text-muted">{t("similar.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {contacts.map((c) => {
            const fullName =
              [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
            return (
              <li key={c.id}>
                <Link
                  href={`/contacts/${c.id}`}
                  className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border-default hover:bg-bg-subtle"
                >
                  <Avatar size={28} name={fullName} className="shrink-0" />
                  <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-text-primary">
                      {fullName}
                    </span>
                    <span className="truncate text-xs text-text-secondary">
                      {[c.jobTitle, c.company, c.country]
                        .filter(Boolean)
                        .join(" · ") || t("similar.noMeta")}
                    </span>
                  </div>
                  <SimilarityBadge similarity={c.similarity} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="flex items-center gap-1.5 border-t border-border-default pt-3 text-[10px] font-mono text-text-muted">
        <Sparkles size={9} />
        vector similarity · pgvector
      </footer>
    </section>
  );
}

function SimilarityBadge({ similarity }: { similarity: number }) {
  const pct = Math.round(similarity * 100);
  const tone =
    pct >= 85
      ? "border-success/30 bg-success-subtle text-success"
      : pct >= 70
        ? "border-brand/30 bg-brand-subtle text-brand-on-subtle"
        : "border-border-default bg-bg-subtle text-text-secondary";
  return (
    <span
      className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[10px] ${tone}`}
      title={`Similarity: ${similarity.toFixed(3)}`}
    >
      {pct}%
    </span>
  );
}
