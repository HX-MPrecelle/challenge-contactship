# ContactShip

AI-first CRM workspace that mirrors HubSpot in real time, enriches contacts with vector embeddings, and surfaces autonomous AI recommendations on top of your data.

Built as a technical challenge for a Lead Engineer position.

## Features

- **Bidirectional HubSpot sync** — webhook-driven with hourly cron fallback, conflict detection and field-level resolution
- **Agentic chat** — multi-turn AI assistant with 4 tools (semantic search, structured filters, aggregations, contact detail), streaming responses
- **RAG pipeline** — contacts indexed with `text-embedding-3-small` + pgvector cosine search
- **Cross-session memory** — user messages embedded and retrieved semantically across conversations
- **Autonomous agent** — daily cron scans at-risk contacts, generates personalized email drafts, surfaces them in an inbox with approve/dismiss workflow
- **AI insights** — per-contact summary, next action, risk signal, lead score, and confidence level (cached 24h, invalidated on edit)
- **Duplicate detection** — cosine similarity ≥ 0.88 identifies duplicate contacts, merge with one click
- **Natural language search** — AI parses queries into structured filters applied client-side
- **Conflict inbox** — real-time Supabase subscription, field-by-field diff and resolution
- **Command palette** — `Cmd+K` global search and navigation
- **i18n** — ES/EN with 481 keys, auto-detected from browser, dialect-aware prompts (rioplatense)

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 (App Router, Server Components, Server Actions) |
| Database | Supabase (Postgres 14 + pgvector + Realtime) |
| AI | Vercel AI SDK v6 — `gpt-4o-mini` + `text-embedding-3-small` |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | Supabase SSR (session cookies, RLS) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Deploy | Vercel (crons via `vercel.json`) |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system diagrams, the HubSpot sync pipeline, RAG flow, autonomous agent flow, and key technical decisions.

## Local setup

**Prerequisites:** Node 20+, pnpm, a Supabase project with pgvector enabled, a HubSpot developer app, and an OpenAI API key.

```bash
pnpm install
cp .env.example .env.local
# fill in .env.local
pnpm dev
```

Apply migrations in order:

```bash
# Supabase dashboard → SQL Editor, or via CLI:
supabase db push
```

## Environment variables

See [`.env.example`](./.env.example) for the full list with descriptions. Required for production:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, bypasses RLS) |
| `HUBSPOT_CLIENT_ID` | HubSpot OAuth app client ID |
| `HUBSPOT_CLIENT_SECRET` | HubSpot OAuth app secret (also used as webhook HMAC key) |
| `HUBSPOT_REDIRECT_URI` | OAuth callback URL — must match HubSpot app config |
| `OPENAI_API_KEY` | OpenAI API key |
| `NEXT_PUBLIC_APP_URL` | Production URL, no trailing slash |
| `CRON_SECRET` | Bearer token verified by `/api/cron/*` routes |
| `OPENAI_MODEL` | *(optional)* Override model ID, defaults to `gpt-4o-mini` |

## Cron jobs

Configured in `vercel.json`:

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/sync` | Every hour | Delta sync from HubSpot for all connected orgs |
| `/api/cron/agent` | Daily 09:00 UTC | Autonomous follow-up agent — scans at-risk contacts |

## Testing

```bash
pnpm test          # Vitest unit tests (18 tests)
pnpm test:e2e      # Playwright E2E (requires running dev server)
pnpm typecheck     # TypeScript — zero errors
```
