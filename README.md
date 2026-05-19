# ContactShip — AI CRM Copilot

**An AI-first workspace on top of HubSpot.** Realtime contact mirror, streaming AI copilot with real tool calling, and a sync layer you can actually see.

> Built as a technical challenge. Designed to feel like a production SaaS, not a prototype.

---

## What it is

ContactShip pulls your HubSpot contacts into a local mirror in realtime, gives you an operational dashboard, and runs an AI copilot that can **read and operate the CRM** through real tool calls — not a chat wrapper over an API.

- 🔄 **Realtime mirror.** Webhook → local Postgres → Supabase Realtime → UI, in under a second.
- 🤖 **AI Copilot.** Streaming responses with visible tool execution. Update contacts, create notes, surface failed syncs — by asking.
- 🔎 **Observable sync.** Every inbound, outbound, and skipped event lands in `sync_logs`. Failures surface in the UI with a manual retry CTA.
- 🌑 **Dark-mode-first UI.** Built with shadcn/ui + Tailwind v4 + Lucide + Motion. Inspired by Linear, Vercel, OpenAI Playground.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) · TypeScript strict |
| Styling | Tailwind v4 · shadcn/ui (new-york) · Lucide · Motion |
| Database | Supabase Postgres |
| ORM | Drizzle ORM ([ADR](./docs/decisions/drizzle-over-typeorm.md)) |
| Auth | Supabase Auth · Google OAuth |
| Integration | HubSpot Public App · OAuth 2.0 · v3 webhooks |
| AI | OpenAI (Responses API / Chat Completions) · Vercel AI SDK · streaming tool calls |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Deploy | Vercel |
| Testing | Vitest |

**Notable removals from the original brief** (with reasoning):
- TypeORM → Drizzle. [ADR](./docs/decisions/drizzle-over-typeorm.md)
- Inngest → synchronous handlers + in-process retry. [ADR](./docs/decisions/why-no-inngest.md)

## Architecture at a glance

```
HubSpot ──webhook──▶ /api/hubspot/webhook ──▶ loop check ──▶ Postgres ──Realtime──▶ UI
                                                                ▲
UI / AI tool ───────────────────────────────────────────────────┤
                                                                ▼
                                                       /api/contacts/[id]
                                                                │
                                                                ▼
                                                       PATCH HubSpot
                                                       (retry × 3, then log failure)
```

Full details in [`docs/architecture.md`](./docs/architecture.md). Sync strategy in [`docs/sync-strategy.md`](./docs/sync-strategy.md). AI design in [`docs/ai-architecture.md`](./docs/ai-architecture.md).

## Repo layout

```
apps/
  web/                 # Next.js 16 application — UI, API routes, AI copilot
packages/
  db/                  # Drizzle schema, client singleton, migrations
  hubspot/             # OAuth, REST client (retry + 401 refresh), webhook verification
  ai/                  # System prompt, tool factory, tool implementations
  shared/              # Types, sync utilities (loop detection), encryption, env parsing
docs/
  architecture.md
  sync-strategy.md
  ai-architecture.md
  design-system.md
  decisions/           # ADRs
SETUP.md               # Step-by-step external accounts setup (HubSpot, Supabase, etc.)
```

## Getting started

### Prerequisites

- Node.js ≥ 20.9
- pnpm ≥ 10
- A Supabase project, HubSpot Developer Account, and OpenAI API key — see [`SETUP.md`](./SETUP.md) for a step-by-step guide if you've never used these.

### Install

```bash
pnpm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in the values. See [`SETUP.md`](./SETUP.md) for where each value comes from.

### Database migrations

```bash
pnpm db:generate   # generates SQL from the Drizzle schema
pnpm db:migrate    # applies migrations to Supabase
```

### Run

```bash
pnpm dev
```

The app starts at <http://localhost:3000>.

## Engineering principles applied here

- **Defensible decisions over compliant ones.** Where the brief's stack didn't fit the actual problem (TypeORM, Inngest), we documented the deviation and chose the better tool. Each substitution has an ADR.
- **Don't sub-engineer for problems you don't have.** No queues, no microservices, no CQRS. The brief explicitly forbids these and we agree — see [`why-nextjs-monolith.md`](./docs/decisions/why-nextjs-monolith.md).
- **Make failures visible.** Silent retry loops are an anti-pattern. Failed outbound syncs surface in the UI; the AI copilot can answer "what's broken?" via the `get_failed_syncs` tool.
- **The AI is operational.** It calls real tools that write to real systems. There is no fake "AI assistant" widget here.

## Deploy

Vercel reads `apps/web` as the project root. All env vars from `.env.example` need to be set in Vercel's project settings. The HubSpot Public App's redirect URI and webhook target URL must point to the deployed Vercel URL.

Step-by-step in [`SETUP.md`](./SETUP.md) section 9–10.

## License

This repository was built as a technical challenge. No license is granted for redistribution.
