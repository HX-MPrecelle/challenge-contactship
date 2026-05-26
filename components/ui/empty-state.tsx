"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
            <Button size="sm" onClick={primaryAction.onClick}>
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {meta && (
        <p className="font-mono text-[10px] text-text-muted">{meta}</p>
      )}
    </div>
  );
}
