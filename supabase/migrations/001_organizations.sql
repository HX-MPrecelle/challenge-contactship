create table organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email_domain text,
  created_at   timestamptz not null default now()
);

alter table organizations enable row level security;

create policy "users see own org"
  on organizations for select
  using (
    id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
