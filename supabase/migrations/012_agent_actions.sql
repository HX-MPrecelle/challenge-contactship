-- Stores autonomous agent recommendations. The agent runs daily, scans
-- at-risk contacts, and writes one action per contact. Users review and
-- approve/dismiss from the Agent Inbox page.
create table public.agent_actions (
  id           uuid        primary key default gen_random_uuid(),
  org_id       uuid        not null references public.organizations(id) on delete cascade,
  contact_id   uuid        references public.contacts(id) on delete set null,
  run_id       uuid        not null,
  action_type  text        not null
                           check (action_type in ('follow_up_email','re_engagement','risk_alert','opportunity')),
  title        text        not null,
  reasoning    text        not null,
  draft_subject text,
  draft_body   text,
  status       text        not null default 'pending'
                           check (status in ('pending','approved','dismissed','acted')),
  created_at   timestamptz not null default now(),
  acted_at     timestamptz
);

alter table public.agent_actions enable row level security;

-- Org members can read their own actions
create policy "org members can select"
  on public.agent_actions for select
  using ((auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid = org_id);

-- Org members can update status (approve/dismiss)
create policy "org members can update status"
  on public.agent_actions for update
  using ((auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid = org_id);

-- Only service role inserts (agent runs server-side)
create policy "service role full access"
  on public.agent_actions
  using (auth.role() = 'service_role');

-- Index for fast pending-count queries (used in sidebar badge)
create index agent_actions_org_status_idx
  on public.agent_actions (org_id, status)
  where status = 'pending';
