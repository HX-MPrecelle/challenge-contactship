import { describe, it, expect, vi, beforeEach } from "vitest";

// The cache freshness logic in getOrGenerateInsights decides whether to call
// the model or return cached rows. We test that decision boundary in isolation
// by extracting the pure predicate into a helper that mirrors the production code.

type InsightRow = {
  insight_type: string;
  content: string;
  generated_at: string;
  expires_at: string;
  is_stale: boolean;
};

const REQUIRED_TYPES = ["summary", "next_action", "risk_signal", "lead_score"] as const;

function areCacheRowsFresh(rows: InsightRow[]): boolean {
  const now = Date.now();
  const byType = new Map(rows.map((r) => [r.insight_type, r]));
  return REQUIRED_TYPES.every((t) => {
    const row = byType.get(t);
    if (!row) return false;
    if (row.is_stale) return false;
    if (new Date(row.expires_at).getTime() <= now) return false;
    return true;
  });
}

function makeFreshRows(overrides: Partial<InsightRow> = {}): InsightRow[] {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return REQUIRED_TYPES.map((t) => ({
    insight_type: t,
    content: t === "lead_score" ? "75" : `content for ${t}`,
    generated_at: new Date().toISOString(),
    expires_at: expires,
    is_stale: false,
    ...overrides,
  }));
}

describe("insights cache freshness", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("returns true when all 4 rows are present, unexpired, and not stale", () => {
    expect(areCacheRowsFresh(makeFreshRows())).toBe(true);
  });

  it("returns false when a row is missing (only 3 types present)", () => {
    const rows = makeFreshRows().filter((r) => r.insight_type !== "lead_score");
    expect(areCacheRowsFresh(rows)).toBe(false);
  });

  it("returns false when any row has is_stale=true", () => {
    const rows = makeFreshRows();
    const first = rows[0];
    if (first) first.is_stale = true;
    expect(areCacheRowsFresh(rows)).toBe(false);
  });

  it("returns false when any row is expired", () => {
    const rows = makeFreshRows();
    const second = rows[1];
    if (second) second.expires_at = new Date(Date.now() - 1000).toISOString();
    expect(areCacheRowsFresh(rows)).toBe(false);
  });

  it("returns false when rows array is empty", () => {
    expect(areCacheRowsFresh([])).toBe(false);
  });
});
