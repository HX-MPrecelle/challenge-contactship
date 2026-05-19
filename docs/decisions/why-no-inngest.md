# ADR: No Inngest — synchronous handlers + in-process retry

**Status:** Accepted · **Date:** 2026-05-19

## Context

The challenge brief lists Inngest as the obligatory background job platform. Its value proposition is durable execution, automatic retries, concurrency limits, and observability for jobs.

## Problem

For ContactShip's MVP load profile, Inngest's guarantees are mostly redundant:
- **Webhook handling.** HubSpot already retries failed deliveries for hours. If our handler crashes, HubSpot redelivers. Our durability guarantee already exists upstream.
- **Outbound writes.** HubSpot tolerates synchronous writes. With 3 in-process retries (exponential backoff) we cover transient 5xx / 429 within a single request.
- **Initial sync.** Can be split into client-driven pages of 100 contacts each. Resumable from the cursor. No background worker needed.
- **Volume.** A demo workload has 10s of contacts, not 10k webhooks/hour. Inngest's concurrency limits and rate-limit primitives address problems we don't have.

Inngest also adds:
- A third deploy target (`inngest cloud`) on top of Vercel + Supabase.
- Three new env vars (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, dev server port).
- A separate service to monitor and explain in defense of the architecture.

## Decision

Do not use Inngest. Implement:
- Webhook handlers that process events synchronously in the route handler.
- A small `HubspotClient` with 3-retry exponential backoff and a 401-refresh hook.
- Client-driven pagination for initial sync.
- A manual "Retry" button in the UI for any `sync_logs.status = 'failed'` row.

Persist every sync attempt in `sync_logs` for observability — this replaces Inngest's dashboard with a domain-specific view we own.

## Alternatives considered

| Option | Why we didn't pick it |
|---|---|
| Inngest (brief default) | Above. |
| Vercel Cron + queue table | Adds a 1-minute floor on latency and a custom worker pattern. Synchronous is simpler and faster. |
| Supabase Queues (pgmq) | Native and durable, but still a worker pattern we don't need yet. Will revisit if we add delayed jobs. |
| `waitUntil()` for outbound | Loses the ability to return errors synchronously to the UI. We want the user in the loop when sync fails. |

## Consequences

**Positive.**
- Two deploy targets total (Vercel + Supabase). One mental model.
- Lower latency on webhook ingest (~200-400ms vs Inngest's enqueue + dispatch overhead).
- Failures are visible — `sync_logs.failed` rows surface in the UI with a retry CTA.

**Negative.**
- No delayed / scheduled jobs primitive. We don't need them for the MVP.
- No automatic concurrency throttle per tenant. Single-user demo workload makes this irrelevant.
- If a webhook handler crashes after writing to our DB but before responding 200, HubSpot will redeliver — and our loop-prevention logic will correctly skip the redelivery. Worst case: a sync log row says `success` for an event we then also redeliver-skipped.

## When to add Inngest back

- Volume crosses ~10k webhooks/day or contention emerges between users.
- Background AI batch jobs (e.g., nightly contact summaries) appear in scope.
- Delayed actions ("ping me about this lead in 7 days") become a product requirement.
