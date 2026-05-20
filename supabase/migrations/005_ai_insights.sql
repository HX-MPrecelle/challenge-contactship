create table ai_insights (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references contacts(id) on delete cascade,
  org_id         uuid not null references organizations(id) on delete cascade,

  insight_type   text not null check (insight_type in (
    'summary',
    'next_action',
    'risk_signal',
    'lead_score'
  )),

  content        text not null,
  model_version  text not null default 'gpt-4o-mini',
  generated_at   timestamptz not null default now(),
  expires_at     timestamptz not null,
  is_stale       boolean not null default false
);

create index ai_insights_contact_idx on ai_insights(contact_id, insight_type);
create index ai_insights_expires_idx on ai_insights(expires_at);

alter table ai_insights enable row level security;

create policy "users see own insights"
  on ai_insights for all
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
