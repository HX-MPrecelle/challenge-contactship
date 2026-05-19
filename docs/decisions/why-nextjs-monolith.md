# ADR: One Next.js monolith — no service boundaries

**Status:** Accepted · **Date:** 2026-05-19

## Context

The brief explicitly rules out microservices, CQRS, event sourcing, and Kafka. We agree, and this ADR records the positive form of that decision: every piece of the system lives in one Next.js app, with logic factored into workspace packages for clarity, not for deploy independence.

## Decision

A single deploy: `apps/web` on Vercel. The Next.js App Router hosts:

- **UI** — Server / Client components and pages.
- **Authentication** — Supabase Auth via `@supabase/ssr`, gated by a `proxy.ts` middleware.
- **OAuth flow** — `/api/hubspot/connect`, `/api/hubspot/callback`, server-side token storage.
- **Webhook receiver** — `/api/hubspot/webhook`, synchronous handler.
- **Sync API** — outbound writes go through `/api/contacts/[id]` route handlers (and the AI tool layer).
- **AI copilot** — `/api/copilot` streams `streamText` with tools.

Workspace packages (`@contactship/{db,hubspot,ai,shared}`) exist for **code organization**, not for service boundaries. They are TypeScript-only modules consumed by `apps/web`.

## Why a monolith here

- **One deploy unit.** Push to GitHub → Vercel builds → site is live. No coordination across services.
- **One auth context.** A request comes in already carrying a Supabase session. No service-to-service token plumbing.
- **One transaction boundary.** When the webhook handler upserts a contact + writes a sync_log, that's one Postgres transaction. With microservices it'd be a saga.
- **One language, one type system.** End-to-end TypeScript. Schema types from Drizzle flow into the AI tool definitions and into the UI without any boundary serialization.

## What we'd give up if we split

- **Independent deploy cadence per concern.** We don't need it.
- **Independent scaling per concern.** Vercel functions scale per-route already.
- **Failure isolation.** A buggy AI tool can't take down the webhook handler today either, because Vercel functions are isolated.

## When this would change

- **Team grows past ~5 engineers** with conflicting deploy cadences. Then maybe carve off the AI service.
- **A non-Next.js runtime is required** (e.g., a Rust service for sync throughput). Extract that subsystem, not the whole monolith.
- **A separate, customer-facing API** with its own SLA emerges. Then it becomes its own deploy.

For a 3-day MVP with one engineer, none of these apply.

## Consequences

**Positive.**
- Easy to ship, easy to defend, easy to debug.
- The brief's "Local Mirror Architecture" benefits land naturally.

**Negative.**
- All of `apps/web` redeploys when any line in it changes. Acceptable on Vercel where deploys take ~1 minute.
- A heavy operation in one route handler can use up the function's invocation budget. We don't have any such heavy operations.
