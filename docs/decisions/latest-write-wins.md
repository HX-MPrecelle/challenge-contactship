# ADR: Latest-write-wins conflict resolution

**Status:** Accepted · **Date:** 2026-05-19

## Context

With a bidirectional sync between our local mirror and HubSpot, two writes to the same contact can race:

- The user edits a contact's `email` locally.
- Meanwhile, a HubSpot user / automation edits the same contact's `phone`.
- Both produce sync events that arrive in some order.

We need a deterministic policy for which side "wins" when they disagree on a field.

## Decision

**Latest-write-wins by timestamp.**

On any incoming write (inbound or outbound):
1. Compare the new write's timestamp with the current row's `updated_at`.
2. If new timestamp > current, apply the write.
3. If new timestamp ≤ current, discard the write but log the attempt.

`updated_at` is set automatically by Postgres on every UPDATE. For inbound writes, we use `hubspot_updated_at` from the payload as the comparison key.

## Why not something more sophisticated

| Alternative | Why not |
|---|---|
| Field-level CRDTs (e.g., LWW per column) | HubSpot has no concept of granular per-field timestamps; we'd have to invent them, and they'd be lies. |
| Operational transforms | Designed for collaborative documents with character-level edits, not 1-row-per-contact CRUD. Massive overhead for no benefit. |
| Three-way merge with manual review | A CRM operator doesn't want to resolve "did email or phone win" dialogs. They want it to just work. |
| Vector clocks | Same as CRDTs: solving a problem we don't have. |

## How conflicts manifest in practice

The realistic scenarios on a CRM:
- **Two updates within 10 seconds**: rare. If both come from different sources we keep the later one. The loop-prevention window already handles same-source echoes.
- **Out-of-order webhook delivery**: HubSpot can deliver webhooks slightly out of order. Latest-write-wins is robust to this — we compare timestamps, not arrival order.
- **HubSpot batch updates** (e.g., a workflow runs and changes many fields): each is a separate timestamped event; we converge correctly.

## Observability

The losing side is **not silently dropped.** Every write that gets discarded as stale produces a `sync_logs` row with `status = 'success'` but a payload diff showing what would have changed. This means a confused operator can ask the AI copilot "did my edit go through?" and get a real answer.

Failed writes (network errors, 4xx from HubSpot, etc.) are separate — they get `status = 'failed'` and surface in the UI with a retry CTA.

## Consequences

**Positive.**
- Trivial to reason about, trivial to implement.
- Deterministic given a clock — testable with synthetic timestamps.
- Audit trail intact.

**Negative.**
- A user's careful local edit can be silently overwritten by an automation in HubSpot that touched the same field a moment later. Mitigation: we surface this via the AI ("your edit to `email` was overridden 12 minutes later by HubSpot — open the sync log?").
- Relies on clock sanity. HubSpot's timestamps are trustworthy; our local clocks come from Postgres which is also fine.
