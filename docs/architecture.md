# Architecture

ContactShip is a single Next.js application that maintains a realtime local mirror of a HubSpot CRM and exposes an AI copilot that can read and operate that mirror through tool calling.

## High-level diagram

```
┌─────────────────────────┐                ┌─────────────────────────┐
│      HubSpot CRM        │ ◀── REST ───── │  apps/web (Next.js 16)  │
│   contacts · notes      │ ───webhook──▶  │   App Router · Vercel   │
└─────────────────────────┘                │                         │
                                           │  ┌───────────────────┐  │
┌─────────────────────────┐                │  │  AI Copilot       │  │
│   Supabase Postgres     │ ◀── SQL ───── ◀┼─▶│  OpenAI · streaming│  │
│   contacts, notes,      │                │  │  tool calling      │  │
│   sync_logs, ai_msgs,   │                │  └───────────────────┘  │
│   ai_conversations      │                │                         │
└─────────────────────────┘                │  ┌───────────────────┐  │
            ▲                              │  │  Supabase Auth    │  │
            │  Realtime (postgres_changes) │  │  Google OAuth     │  │
            └──────────────────────────────┼─▶│                   │  │
                                           │  └───────────────────┘  │
                                           └─────────────────────────┘
```

## Components

### `apps/web`
Single Next.js 16 application (App Router, Turbopack default, React 19). Hosts:
- Server Components and Route Handlers for all app logic.
- The Supabase Auth flow (Google login).
- The HubSpot OAuth flow (`/api/hubspot/connect`, `/api/hubspot/callback`).
- The HubSpot webhook receiver (`/api/hubspot/webhook`).
- The AI copilot route (`/api/copilot`) using the Vercel AI SDK with streaming and tool calling.
- The full UI: dashboard, contacts table, contact detail, sync logs, copilot side panel.

### `packages/db`
Drizzle ORM schema + a single `postgres-js` client. Owns migrations (`drizzle/`) and the type-safe schema exports.

### `packages/hubspot`
Typed wrapper for the HubSpot REST API:
- OAuth (authorization URL builder, token exchange, token refresh).
- A small client with exponential-backoff retry and a 401-refresh hook.
- Contacts, notes, and webhook-signature helpers.

### `packages/ai`
- System prompt for the copilot.
- Tool factory that consumes a `ToolContext` (db, hubspot, userId) and produces AI-SDK-compatible tool definitions.
- Concrete tool implementations live in this package so they can be tested in isolation.

### `packages/shared`
Cross-cutting code with no external dependencies of its own beyond `zod`:
- Domain types (`SyncSource`, `SyncDirection`, etc.).
- Loop detection logic (`isSyncLoop`).
- AES-256-GCM encryption for HubSpot tokens at rest.
- Environment variable schemas + parsers.

## Local Mirror Architecture

We treat the local Postgres as the operational source of truth. HubSpot is the system of record but we serve every UI read from local data, and every write to a contact updates local first, then propagates outbound to HubSpot.

Why:
- **Latency.** UI feels instant — no waiting on HubSpot for reads.
- **AI enrichment.** Local rows can carry derived columns (`ai_score`, `ai_summary`) without polluting HubSpot's data model.
- **Resilience.** A HubSpot outage degrades writes, not reads.
- **Observability.** Every sync attempt produces a `sync_logs` row.

See `decisions/local-mirror-architecture.md` for the full reasoning.

## Realtime sync

See `sync-strategy.md`.

## AI architecture

See `ai-architecture.md`.

## Auth

Supabase Auth with Google OAuth. Server-side session via `@supabase/ssr`. A Next.js `proxy.ts` middleware gates everything under `/app/*` and redirects unauthenticated users to `/login`.

Row Level Security is enabled on every table; the canonical policy is `auth.uid() = user_id`.

## Deploy

Vercel for the Next.js app. Supabase for Postgres + Auth + Realtime. No other deploy targets — see `decisions/why-no-inngest.md` for why we removed the original Inngest dependency.
