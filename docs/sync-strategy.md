# Sync strategy

ContactShip's sync layer has three concerns: keep local data fresh from HubSpot, propagate local writes back to HubSpot, and make every decision the system makes observable.

## Inbound — HubSpot → app

HubSpot dispatches a webhook for every contact/note change. The flow:

1. **Receive.** `POST /api/hubspot/webhook` validates the HubSpot v3 HMAC signature using the app's client secret. Invalid signatures get a `401` and are not logged at info level (avoid leaking validation timing).
2. **Resolve.** For each event, the handler resolves the right `hubspot_connections` row by `portalId`, then constructs a per-user `HubspotClient`.
3. **Fetch.** The webhook payload only carries the object id — we fetch the full contact / note from HubSpot to get current property values.
4. **Loop check.** See "Loop prevention" below.
5. **Upsert.** Single `INSERT … ON CONFLICT … DO UPDATE` keyed on `(user_id, hubspot_id)`. `source = 'hubspot'`, `last_synced_at = now()`, `hubspot_updated_at = <from payload>`.
6. **Log.** Insert a `sync_logs` row with direction `inbound`, source `hubspot`, status `success | failed | skipped_loop`, latency in ms.
7. **Respond.** Return `200` to HubSpot.

The handler runs synchronously inside the route handler. HubSpot allows 5 seconds; our worst case is one fetch + one upsert + one insert, well under 1s.

If the handler crashes mid-flight, HubSpot's own retry mechanism (it re-delivers failed webhooks for hours) is our durability guarantee. We do not run a background worker. See `decisions/why-no-inngest.md`.

## Outbound — app / AI → HubSpot

A user mutation (or AI tool call) follows the same path:

1. **Local first.** Update the local row inside the route handler. Set `source = 'local'` (or `'ai'`), `last_synced_at = now()`. The UI's optimistic update is already in place, so users see the change instantly.
2. **Push to HubSpot.** Same route handler calls HubSpot. The `HubspotClient` does up to 3 retries with exponential backoff (250ms, 500ms, 1000ms) on 5xx / 429.
3. **Reconcile.** On HubSpot's response, update local with the canonical `hubspot_id` (for creates) and `hubspot_updated_at`.
4. **Log success.** Insert `sync_logs` with `direction = 'outbound'`.
5. **On failure:** Insert `sync_logs` with `status = 'failed'` and the error message. Return the error to the caller. The UI shows a red `SyncBadge` on the affected row and a global banner; the user can click "Retry" to invoke `/api/sync/retry?logId=…`, which replays the outbound write.

This puts the user in the loop for failures instead of hiding them behind silent retries. It is also defensible engineering: silent retry loops mask real problems.

## Loop prevention

When we push outbound, HubSpot will dispatch a webhook for our own write seconds later. Without protection, we'd ingest our own change, marking it `source = 'hubspot'`, which is wrong (it loses the provenance we just established) but more importantly creates an infinite ping-pong if any side-effect cascades.

Algorithm (implemented in `packages/shared/src/sync.ts:isSyncLoop`):

```
if local.source === 'hubspot':         no loop (we never wrote outbound)
elif !local.last_synced_at:            no loop (first write)
elif |inboundUpdatedAt - localLastSyncedAt| <= 10 s:
    LOOP — log skipped_loop, do not update
else:
    no loop, proceed
```

The 10-second window covers typical HubSpot webhook latency (1-3s under normal load, occasionally up to 8s). We deliberately do not require idempotency keys from HubSpot — that would need correlation IDs we don't control.

## Conflict resolution — latest-write-wins

When inbound and outbound writes race (rare in a single-user MVP, but the design admits it), we compare `inbound.hubspot_updated_at` vs local `updated_at`. The higher timestamp wins. The losing side is dropped, but the attempt is preserved in `sync_logs`.

This is documented in `decisions/latest-write-wins.md`. The alternative (operational transforms / three-way merge / per-field CRDTs) is overkill: HubSpot has no concept of granular concurrent edits, and a CRM record is not a collaborative document.

## Initial sync

Triggered after OAuth completion. The flow:

1. UI hits `POST /api/hubspot/sync/initial?cursor=...&limit=100` repeatedly until the response returns `done: true`.
2. Each call processes one page (100 contacts). The route handler stays within Vercel's free-tier 60s budget.
3. Progress is rendered live from the response (`syncedCount / totalEstimate`).
4. If the connection drops, the client resumes from the last `cursor`.

Notes are not initially synced; they're fetched on-demand when a contact detail page opens. This keeps initial sync fast and is fine for a MVP — notes are the largest dataset by row count and the least frequently read.

## Observability

Every sync action — successful, failed, or skipped — produces a `sync_logs` row. The `/app/sync` page surfaces:
- The last 100 events, with timing, direction, source, and status.
- A failed-syncs panel with retry buttons.
- A 24-hour summary chart (count by status).

The AI copilot exposes `get_sync_status()` and `get_failed_syncs()` as tools so an operator can ask "show me what's broken" and get a direct answer.
