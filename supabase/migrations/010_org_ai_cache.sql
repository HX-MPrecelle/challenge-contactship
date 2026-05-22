-- Org-level AI cache. Replaces the in-process Map that was used to cache
-- top_priorities per org — that approach doesn't survive Vercel deploys or
-- multi-instance setups. This table is the single source of truth.
create table public.org_ai_cache (
  id            uuid        primary key default gen_random_uuid(),
  org_id        uuid        not null references public.organizations(id) on delete cascade,
  cache_key     text        not null,
  content       jsonb       not null,
  generated_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  constraint uq_org_cache unique (org_id, cache_key)
);

alter table public.org_ai_cache enable row level security;

-- Only the service role (server-side) reads/writes this table.
-- User-facing reads go through Server Actions which use createServiceClient().
create policy "service role full access"
  on public.org_ai_cache
  using (auth.role() = 'service_role');
