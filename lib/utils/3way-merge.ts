/**
 * Pure 3-way merge utilities for conflict detection.
 * Extracted from lib/hubspot/sync.ts so they can be unit-tested without
 * any Supabase/HubSpot dependencies.
 */

export const MERGE_FIELDS = [
  "first_name", "last_name", "email", "phone", "company", "job_title",
] as const;

export type MergeField = typeof MERGE_FIELDS[number];
export type MergeState = Record<MergeField, string | null>;

/** Returns the set of fields that differ between base and current. */
export function getChangedFields(
  base: MergeState,
  current: MergeState
): Set<MergeField> {
  const changed = new Set<MergeField>();
  for (const f of MERGE_FIELDS) {
    if ((base[f] ?? null) !== (current[f] ?? null)) changed.add(f);
  }
  return changed;
}

export type MergeAnalysis = {
  trueConflicts:   Set<MergeField>; // both sides changed the same field
  autoFromHubspot: Set<MergeField>; // only HubSpot changed
  autoFromLocal:   Set<MergeField>; // only local changed
  hasConflict:     boolean;
};

/**
 * Given the three states, compute what each side changed and whether
 * there are any true conflicts (same field modified on both sides).
 */
export function analyzeThreeWayMerge(
  base:    MergeState,
  local:   MergeState,
  hubspot: MergeState
): MergeAnalysis {
  const localChanged   = getChangedFields(base, local);
  const hubspotChanged = getChangedFields(base, hubspot);

  // A true conflict requires BOTH sides to have changed AND to disagree.
  // If both changed to the same value they've converged — no conflict.
  const trueConflicts = new Set(
    [...localChanged].filter(
      f => hubspotChanged.has(f) && (local[f] ?? null) !== (hubspot[f] ?? null)
    )
  );
  const autoFromHubspot = new Set([...hubspotChanged].filter(f => !localChanged.has(f)));
  const autoFromLocal   = new Set([...localChanged].filter(f => !hubspotChanged.has(f)));

  return {
    trueConflicts,
    autoFromHubspot,
    autoFromLocal,
    hasConflict: trueConflicts.size > 0,
  };
}
