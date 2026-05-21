"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Mail, RefreshCw, Send, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateEmailDraftAction } from "@/actions/ai";
import { useI18n } from "@/lib/i18n/context";

type Draft = {
  subject: string;
  body: string;
  rationale: string;
  to: string | null;
};

type Tone = "warm" | "concise" | "direct";

export function EmailDraftDialog({ contactId }: { contactId: string }) {
  const { t } = useI18n();
  const TONES: { value: Tone; label: string; hint: string }[] = [
    { value: "warm", label: t("email.tone.warm"), hint: t("email.tone.warm.hint") },
    { value: "concise", label: t("email.tone.concise"), hint: t("email.tone.concise.hint") },
    { value: "direct", label: t("email.tone.direct"), hint: t("email.tone.direct.hint") },
  ];
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState(t("email.default.goal"));
  const [tone, setTone] = useState<Tone>("warm");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setDraft(null);
    setSubject("");
    setBody("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Clear state when the dialog closes so reopening is a fresh slate —
      // but only after the close animation, otherwise the content disappears
      // mid-transition.
      setTimeout(reset, 200);
    }
  }

  function runGenerate() {
    if (!goal.trim()) {
      toast.error("Escribí un objetivo para el email");
      return;
    }
    startTransition(async () => {
      const result = await generateEmailDraftAction({
        contactId,
        goal: goal.trim(),
        tone,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setDraft(result.data);
      setSubject(result.data.subject);
      setBody(result.data.body);
    });
  }

  async function copyToClipboard() {
    const text = `${t("email.subject.label")}: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("email.copied"));
    } catch {
      toast.error(t("email.error.copyFailed"));
    }
  }

  function openGmail() {
    if (!draft?.to) {
      toast.error(t("email.noEmail"));
      return;
    }
    const url =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(draft.to)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openMailto() {
    if (!draft?.to) {
      toast.error(t("email.noEmail"));
      return;
    }
    const url = `mailto:${encodeURIComponent(draft.to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full justify-center">
          <Mail size={12} />
          <span>{t("contact.email.button")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-subtle">
              <Sparkles size={15} className="text-brand-on-subtle" />
            </div>
            {t("email.title")}
          </DialogTitle>
          <DialogDescription>
            {t("email.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal" className="text-xs font-medium text-text-secondary">
              {t("email.goal.label")}
            </Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t("email.goal.placeholder")}
              maxLength={400}
              disabled={isPending}
              className="h-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-text-secondary">
              {t("email.tone.label")}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((opt) => {
                const active = tone === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTone(opt.value)}
                    disabled={isPending}
                    className={[
                      "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50",
                      active
                        ? "border-brand bg-brand-subtle"
                        : "border-border-default bg-bg-elevated hover:border-border-strong",
                    ].join(" ")}
                  >
                    <span className="text-xs font-medium text-text-primary">
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {!draft && (
            <Button
              type="button"
              onClick={runGenerate}
              disabled={isPending}
              className="self-end"
            >
              {isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>{t("email.generating")}</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  <span>{t("email.generate")}</span>
                </>
              )}
            </Button>
          )}

          {draft && (
            <div className="flex flex-col gap-3">
              {/* Compact summary of tone+goal when draft is shown */}
              <div className="flex items-center justify-between rounded-md bg-bg-subtle px-3 py-2 text-xs text-text-secondary">
                <span>
                  {t("email.summary", { tone: TONES.find((to) => to.value === tone)?.label ?? tone, goal: goal.slice(0, 50) + (goal.length > 50 ? "…" : "") })}
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="text-text-muted hover:text-text-primary"
                >
                  {t("email.change")}
                </button>
              </div>
              <div className="rounded-lg border border-brand/40 bg-brand-subtle px-3 py-2.5 text-xs">
                <span className="font-medium text-brand-on-subtle">{t("email.rationale")} </span>
                <span className="text-text-secondary">{draft.rationale}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subject" className="text-xs font-medium text-text-secondary">
                  {t("email.subject.label")}
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                  className="h-9"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="body" className="text-xs font-medium text-text-secondary">
                  {t("email.body.label")}
                </Label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={14}
                  className="min-h-[280px] w-full resize-y rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {draft.to && (
                <p className="text-[10px] text-text-muted">
                  Destinatario:{" "}
                  <span className="font-mono text-text-secondary">{draft.to}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {draft && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={runGenerate}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                <span>{t("email.regenerate")}</span>
              </Button>
              <Button type="button" variant="secondary" onClick={copyToClipboard}>
                <Copy size={12} />
                <span>{t("email.copy")}</span>
              </Button>
              <Button type="button" variant="secondary" onClick={openGmail} disabled={!draft.to}>
                <ExternalLink size={12} />
                <span>{t("email.gmail")}</span>
              </Button>
              <Button type="button" onClick={openMailto} disabled={!draft.to}>
                <Send size={12} />
                <span>{t("email.mailto")}</span>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
