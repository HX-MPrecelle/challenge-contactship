-- Security fix: replace user_metadata with app_metadata in all RLS policies.
--
-- user_metadata is writable by the authenticated user via supabase.auth.updateUser(),
-- which means a malicious user could set their own org_id and read any org's data.
-- app_metadata is only writable by the service role (server-side), making it safe
-- for use in security-critical RLS policies.
--
-- This migration drops and recreates every policy that previously referenced
-- auth.jwt() -> 'user_metadata' ->> 'org_id'.
-- The application code (lib/auth/org.ts) is updated in the same commit to write
-- org_id into app_metadata instead of user_metadata.

-- ── organizations ────────────────────────────────────────────────────────────
drop policy if exists "users see own org" on public.organizations;
create policy "users see own org"
  on public.organizations for select
  using (id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ── hubspot_connections ──────────────────────────────────────────────────────
drop policy if exists "users manage own connection" on public.hubspot_connections;
create policy "users manage own connection"
  on public.hubspot_connections for all
  using (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ── contacts ─────────────────────────────────────────────────────────────────
drop policy if exists "users manage own contacts" on public.contacts;
create policy "users manage own contacts"
  on public.contacts for all
  using (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ── sync_events ──────────────────────────────────────────────────────────────
drop policy if exists "users read own sync events" on public.sync_events;
create policy "users read own sync events"
  on public.sync_events for select
  using (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ── ai_insights ──────────────────────────────────────────────────────────────
drop policy if exists "users see own insights" on public.ai_insights;
create policy "users see own insights"
  on public.ai_insights for all
  using (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- ── agent_actions ─────────────────────────────────────────────────────────────
drop policy if exists "org members can select" on public.agent_actions;
create policy "org members can select"
  on public.agent_actions for select
  using ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id);

drop policy if exists "org members can update status" on public.agent_actions;
create policy "org members can update status"
  on public.agent_actions for update
  using ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id);

-- ── org_ai_cache ─────────────────────────────────────────────────────────────
-- (service role only — no user-facing policy needed, no change required)

-- ── chat_conversations & chat_messages ───────────────────────────────────────
-- These tables use user_id (not org_id) for isolation — no change required.
