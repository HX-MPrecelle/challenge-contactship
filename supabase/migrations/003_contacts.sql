create table contacts (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  hubspot_id       text not null,

  -- Core fields promoted to typed columns
  email            text,
  first_name       text,
  last_name        text,
  phone            text,
  company          text,
  job_title        text,
  lifecycle_stage  text,
  lead_status      text,
  website          text,
  city             text,
  country          text,

  -- Custom / additional portal properties (flexible schema)
  properties       jsonb not null default '{}',

  -- Sync metadata
  hubspot_updated_at  timestamptz,
  local_updated_at    timestamptz not null default now(),
  sync_hash           text,
  sync_status         text not null default 'synced'
                        check (sync_status in ('synced', 'pending', 'conflict', 'error')),
  is_archived         boolean not null default false,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique(org_id, hubspot_id)
);

create index contacts_org_id_idx       on contacts(org_id);
create index contacts_email_idx        on contacts(org_id, email);
create index contacts_sync_status_idx  on contacts(org_id, sync_status);
create index contacts_is_archived_idx  on contacts(org_id, is_archived);
create index contacts_lifecycle_idx    on contacts(org_id, lifecycle_stage);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

alter table contacts enable row level security;

create policy "users manage own contacts"
  on contacts for all
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );

-- Enable Realtime so postgres_changes are pushed to subscribed clients.
alter publication supabase_realtime add table contacts;
