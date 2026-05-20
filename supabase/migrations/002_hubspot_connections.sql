create table hubspot_connections (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations(id) on delete cascade,
  portal_id            text not null,
  portal_name          text,
  access_token_secret  uuid,
  refresh_token_secret uuid,
  token_expires_at     timestamptz,
  scopes               text[],
  connected_by         uuid references auth.users(id),
  connected_at         timestamptz not null default now(),
  last_synced_at       timestamptz,
  needs_reconnect      boolean not null default false,

  unique(org_id)
);

alter table hubspot_connections enable row level security;

create policy "users manage own connection"
  on hubspot_connections for all
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
