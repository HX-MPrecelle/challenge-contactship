# AI architecture

The ContactShip copilot is not a chat wrapper — it's an operational interface to the CRM. The AI reads from the local mirror, writes through the same code paths a human would, and surfaces what it did.

## Stack

- **Vercel AI SDK** (`ai` v4.x) for `streamText`, tool definitions, and SSE streaming.
- **OpenAI** via `@ai-sdk/openai` with `gpt-4.1` (or `gpt-4o` as fallback).
- **Tool calling** with Zod-schema-validated arguments.
- **Persistence**: each user message + assistant message + tool call/result is stored in `ai_messages` for the conversation.

## Route handler

`POST /api/copilot`:

1. Auth check → resolve `userId`.
2. Resolve the user's HubSpot connection → build a `HubspotClient` with `onUnauthorized` wired to the token-refresh flow.
3. Build a `ToolContext` (`{ db, hubspot, userId, hubId }`).
4. Build the tool registry from `@contactship/ai` with that context.
5. Call `streamText({ model, system, messages, tools, maxSteps: 5 })`.
6. Stream the response back to the client as an AI SDK data stream. On finish, persist the new messages.

## Tools

Every tool has the signature `(args) → result | error`. Tools that mutate also enqueue an outbound HubSpot push (see `sync-strategy.md`).

| Tool | Reads / writes | Notes |
|---|---|---|
| `search_contacts(query, filters?)` | reads local DB | server-side ILIKE on email/name/company |
| `get_contact(id \| email \| hubspot_id)` | reads local DB | resolves any of three identifiers |
| `list_recent_contacts(since?, limit)` | reads local DB | sorted by `last_activity_at desc` |
| `create_contact(props)` | writes local DB → outbound HubSpot | optimistic local id; reconciles on push |
| `update_contact(id, patch)` | writes local DB → outbound HubSpot | partial update; latest-write-wins on conflict |
| `create_note(contactId, body)` | writes local DB → outbound HubSpot | associates note with contact in HubSpot |
| `generate_contact_summary(contactId)` | reads DB → calls OpenAI → writes `ai_summary` | second model call with the contact context |
| `get_sync_status()` | reads `sync_logs` | aggregate by status for last 24h |
| `get_failed_syncs(limit?)` | reads `sync_logs` | the most recent failures with error messages |

`source = 'ai'` is stamped on every row a tool writes. This makes "what did the AI touch?" a trivial query and supports the loop-prevention algorithm.

## Streaming UX

The client uses `useChat` from `ai/react`. The UI renders:
- **Text deltas** as they stream into the active assistant message.
- **Tool invocations** as `ToolCallCard` components showing status pills (`pending` / `streaming` / `success` / `error`), the JSON args, and (on success) a compact summary of the result.
- **Errors** as inline pill messages, not modal dialogs.

This is intentionally similar to Cursor / OpenAI Playground — the user is meant to understand what the AI is doing, not just what it said.

## Insights vs queries

We deliberately split "what's true" from "what's interesting":

- **Queries** (e.g., "contacts inactive > 45 days") are SQL, not AI. They feed the dashboard's `InsightCard`s directly. Deterministic, fast, defensible.
- **Narratives** (e.g., "summarize Ada Lovelace — why is she worth following up?") are AI. They get the contact + recent notes as context and produce a paragraph + a one-line "next best action".

The dashboard cards link to the copilot with the relevant prompt pre-populated, so a user can drill from a number ("5 leads need follow-up") into a conversation ("draft a follow-up note for each").

## Why this approach

- **Defensibility.** A pure-LLM dashboard can hallucinate; a SQL dashboard with LLM-narrated cards cannot.
- **Cost.** Background AI summarization on every contact change would be expensive without proportional value. On-demand keeps cost predictable.
- **MVP-ness.** Background summarization is a feature we can ship later. The on-demand summary already feels magical and is the right wedge.
