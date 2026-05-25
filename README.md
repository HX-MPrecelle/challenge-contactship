# ContactShip

**AI-first CRM workspace** that mirrors HubSpot in real time, enriches contacts with vector embeddings, and surfaces autonomous AI recommendations on top of your data.

Built as a **Lead Engineer technical challenge** for ContactShip AI.

🔗 **Live app:** [challenge-contactship.vercel.app](https://challenge-contactship.vercel.app)
📁 **Repository:** [github.com/HX-MPrecelle/challenge-contactship](https://github.com/HX-MPrecelle/challenge-contactship)

---

## What this solves

> *"A client uses HubSpot as their main CRM. They want to manage contacts from our platform without leaving it, and keep everything synchronized with HubSpot. They also want AI to provide real value on each contact."*

ContactShip solves this by building a **local mirror architecture**: a full CRM workspace on top of HubSpot, with AI that operates on the enriched local copy and syncs back bidirectionally.

---

## Core features

### HubSpot Integration
- **Webhook-driven realtime sync** — changes in HubSpot appear in the UI in ~1.5 seconds
- **Bidirectional edits** — changes in ContactShip push back to HubSpot
- **3-way merge conflict resolution** — uses `base_state` as common ancestor; auto-merges non-overlapping changes, only flags true conflicts (same field changed on both sides)
- **Pre-flight conflict check** — before saving, fetches live HubSpot state and warns if concurrent edits detected
- **Daily cron fallback** — delta sync catches any missed webhooks

### AI that adds real value (not decorative)
- **Autonomous agent** — daily scans at-risk contacts (customers inactive 60d, stalling SQLs, cold deals), generates personalized email drafts with full context. Learns from approve/dismiss history.
- **RAG chat** — multi-turn assistant with 4 tools: semantic search, structured SQL filters, aggregations, contact details. Streaming responses.
- **Cross-session memory** — user messages embedded and retrieved semantically across conversations
- **Per-contact insights** — summary, next action, risk signal, lead score (0-100), confidence level. Cached 24h, invalidated on edit.
- **Pipeline health alerts** — AI analyzes CRM metrics and generates actionable alerts with severity levels
- **Win/Loss analysis** — extracts patterns from closed vs lost deals
- **Competitive intelligence** — scans CRM notes for competitor mentions with win/loss context
- **Duplicate detection** — cosine similarity ≥ 0.88 identifies duplicates; one-click merge

### Product quality
- **In-app notifications** — real-time bell with Supabase Realtime for HubSpot updates, conflicts, and agent runs
- **Internal notes** — private team annotations per contact (not synced to HubSpot)
- **Dynamic JSONB properties** — all HubSpot portal fields rendered automatically, adapts to any customer's custom fields
- **Responsive design** — full mobile support with hamburger drawer nav
- **Command palette** — `Cmd+K` global navigation
- **i18n** — ES/EN with 481+ keys, dialect-aware AI prompts (rioplatense)

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15.5 (App Router) | Server Components + Server Actions = no separate API layer needed |
| Database | Supabase (Postgres + pgvector + Realtime) | Vector search, realtime, RLS, and Vault in one service |
| AI | Vercel AI SDK v6 — `gpt-4o-mini` + `text-embedding-3-small` | Tool calling, streaming, structured output. gpt-4o-mini is 15× cheaper with equivalent quality for CRM tasks |
| Auth | Supabase SSR + `app_metadata` for org isolation | `user_metadata` is user-editable — RLS must use `app_metadata` |
| Testing | Vitest (unit) + Playwright (E2E) | Fast unit feedback, real browser E2E |
| Deploy | Vercel (crons via `vercel.json`) | Native Next.js, auto-deploys, cron support |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for diagrams, sync pipeline, RAG flow, agent flow, and all ADRs.

---

## Local setup

**Prerequisites:** Node 22+, pnpm 10+, Supabase project with pgvector, HubSpot developer app, OpenAI API key.

```bash
pnpm install
cp .env.example .env.local
# fill in .env.local with your credentials
pnpm dev
```

Apply all 16 migrations in Supabase SQL Editor (in order `001` → `016`).

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server only, bypasses RLS |
| `HUBSPOT_CLIENT_ID` | HubSpot OAuth app client ID |
| `HUBSPOT_CLIENT_SECRET` | OAuth app secret (also HMAC key for webhook verification) |
| `HUBSPOT_REDIRECT_URI` | OAuth callback URL — must match HubSpot app config |
| `OPENAI_API_KEY` | OpenAI API key |
| `NEXT_PUBLIC_APP_URL` | Production URL, no trailing slash |
| `CRON_SECRET` | Bearer token for `/api/cron/*` routes |
| `OPENAI_MODEL` | *(optional)* Model override, defaults to `gpt-4o-mini` |

## Cron jobs

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/sync` | Daily 03:00 UTC | Delta sync fallback for all connected orgs |
| `/api/cron/agent` | Daily 09:00 UTC | Autonomous follow-up agent |

## Testing

```bash
pnpm test          # Vitest unit tests (36 tests across 5 suites)
pnpm test:watch    # Watch mode
pnpm typecheck     # TypeScript — zero errors
pnpm test:e2e      # Playwright E2E (requires dev server + credentials in .env.local)
```

**Unit test coverage:**
- `contact-filters` — `matchesFilter` pure function (8 cases)
- `insights-cache` — cache freshness logic: TTL, stale flag, missing rows (5 cases)
- `conflict-merge` — field selection: local vs hubspot wins, fallback (5 cases)
- `3way-merge` — `getChangedFields` and `analyzeThreeWayMerge` including convergence edge case (12 cases)
- `pipeline-filter-paths` — Zod enum rejects invalid AI-generated paths (7 cases)
