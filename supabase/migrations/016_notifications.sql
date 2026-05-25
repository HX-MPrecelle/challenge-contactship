create table public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  type       text        not null check (type in ('agent_run','conflict','hubspot_update','sync_error')),
  title      text        not null,
  body       text,
  link       text,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "org members can manage notifications"
  on public.notifications for all
  using ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id);

-- Fast unread count per org
create index notifications_org_unread_idx
  on public.notifications(org_id, created_at desc)
  where read = false;

-- Enable realtime so the bell updates instantly
alter publication supabase_realtime add table public.notifications;
