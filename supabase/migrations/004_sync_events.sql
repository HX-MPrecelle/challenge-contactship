-- Immutable audit log of every sync operation. Drives the timeline view and
-- the sync health panel; never mutated after insert.
create table sync_events (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  contact_id   uuid references contacts(id) on delete set null,
  hubspot_id   text,

  direction    text not null check (direction in ('hubspot_to_local', 'local_to_hubspot')),
  event_type   text not null check (event_type in ('create', 'update', 'delete', 'conflict', 'skip')),

  before_state jsonb,
  after_state  jsonb,

  error_message text,
  created_at   timestamptz not null default now()
);

create index sync_events_org_contact_idx on sync_events(org_id, contact_id);
create index sync_events_created_at_idx  on sync_events(created_at desc);

alter table sync_events enable row level security;

create policy "users read own sync events"
  on sync_events for select
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
