"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { summarizeFilteredContacts } from "@/actions/ai";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  filters: { field: string; operator: string; value: string }[];
};

export function FilterSummaryDialog({
  open,
  onOpenChange,
  query,
  filters,
}: Props) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<string | null>(null);
  const [stats, setStats] = useState<{ analyzed: number; total: number } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      // Clear after the close animation so a re-open is a clean slate.
      const t = setTimeout(() => {
        setSummary(null);
        setStats(null);
      }, 200);
      return () => clearTimeout(t);
    }
    // Auto-run on open.
    startTransition(async () => {
      const result = await summarizeFilteredContacts({
        query,
        filters: filters as never,
      });
      if (!result.success) {
        toast.error(result.error);
        onOpenChange(false);
        return;
      }
      setSummary(result.data.summary);
      setStats({ analyzed: result.data.analyzed, total: result.data.total });
    });
    return undefined;
  // We intentionally only re-run when open flips to true; query/filters can
  // change without forcing a re-fetch (the parent unmounts/mounts as needed).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-subtle">
              <Sparkles size={15} className="text-brand-on-subtle" />
            </div>
            {t("filterSummary.title")}
          </DialogTitle>
          <DialogDescription>
            &ldquo;{query}&rdquo; — patrones, gaps y próximos pasos.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 size={24} className="animate-spin text-brand" />
            <p className="text-xs text-text-secondary">
              {t("filterSummary.analyzing")}
            </p>
          </div>
        ) : summary ? (
          <div className="flex flex-col gap-3">
            {stats && (
              <div className="flex items-center justify-between rounded-lg border border-border-default bg-bg-subtle px-3 py-2 text-xs">
                <span className="text-text-secondary">
                  {t("filterSummary.stats", { analyzed: stats.analyzed, total: stats.total })}
                </span>
                {stats.total > stats.analyzed ? (
                  <span className="inline-flex items-center gap-1.5 text-warning">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    {t("filterSummary.partial")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {t("filterSummary.full")}
                  </span>
                )}
              </div>
            )}
            <div className="max-h-[400px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-sm leading-relaxed text-text-primary">
              {summary}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
