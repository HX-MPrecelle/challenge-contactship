import type { ReactNode } from "react";

type Action = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
};

type Props = {
  glyph?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  meta?: string;
};

export function EmptyState({
  glyph,
  title,
  description,
  primaryAction,
  secondaryAction,
  meta,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      {glyph && <div>{glyph}</div>}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="max-w-xs text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
      {meta && (
        <p className="font-mono text-[10px] text-text-muted">{meta}</p>
      )}
    </div>
  );
}
