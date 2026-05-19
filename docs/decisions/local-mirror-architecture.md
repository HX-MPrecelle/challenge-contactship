# ADR: Local Mirror Architecture

**Status:** Accepted · **Date:** 2026-05-19

## Context

ContactShip is a workspace on top of HubSpot. Two extreme designs exist:

1. **Pass-through.** Every UI read calls HubSpot. Every mutation calls HubSpot. We hold nothing locally.
2. **Local mirror.** We maintain a local copy of HubSpot's contacts/notes. Reads come from local. Writes go to local first and then propagate.

## Problem with pass-through

- HubSpot's REST API has rate limits (~100 req / 10s for a free portal). A contacts table with 50 rows × 6 columns of derived data would burn through that on a single page load.
- Latency is HubSpot's worst case (200ms-2s), not ours.
- AI enrichments (scores, summaries) have nowhere to live without polluting HubSpot's data model.
- Outages in HubSpot become outages for us.

## Problem with local mirror

- Two systems can disagree. We need a sync strategy and a conflict policy.
- We carry the operational burden of keeping the mirror fresh.
- We must reason about loops (we write outbound → HubSpot webhooks our own write back).

## Decision

Adopt the local mirror. The local Postgres is the operational source of truth for reads; HubSpot is the system of record. Sync is bidirectional, conflict policy is latest-write-wins, every attempt is logged.

This is essentially the architecture every "X built on top of Y" SaaS (Attio, Folk, Clay, etc.) uses. It's not novel — but it's the right answer here.

## Why this beats the alternatives for our use case

- **AI score / AI summary** columns are native, not bolted on.
- **Realtime UI** via Supabase Realtime is straightforward — clients subscribe to changes on `contacts`.
- **Search / filter / sort** are SQL, fast and complete.
- **Insights** ("contacts inactive > 45 days") are a `WHERE` clause, not an API call.

## Concrete sync strategy

Implemented separately in `sync-strategy.md`:
- Inbound: webhook → fetch → loop check → upsert → log.
- Outbound: local write → push (with retry) → reconcile → log. On failure, surface a retry CTA.
- Conflict: latest-write-wins, all decisions logged in `sync_logs`.
- Loop prevention: `source` + `last_synced_at` + a 10s window.

## Consequences

**Positive.**
- Fast UI. Cheap reads. AI-friendly.
- All sync activity is visible and auditable.
- Survives HubSpot brownouts for reads.

**Negative.**
- We carry the loop prevention and conflict reasoning. Documented and tested.
- Eventual consistency: when HubSpot is touched outside our app, there is a webhook-latency window where local and remote disagree. Acceptable for a CRM.
