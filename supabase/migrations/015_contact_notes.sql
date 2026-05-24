-- Internal notes for contacts — ContactShip only, not synced to HubSpot.
-- Use case: team annotations like "called angry on Tuesday, handle with care".
create table public.contact_notes (
  id         uuid        primary key default gen_random_uuid(),
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  contact_id uuid        not null references public.contacts(id) on delete cascade,
  user_id    uuid        references auth.users(id) on delete set null,
  content    text        not null check (char_length(content) <= 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_notes enable row level security;

create policy "org members can manage notes"
  on public.contact_notes for all
  using ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id);

create index contact_notes_contact_idx
  on public.contact_notes(contact_id, created_at desc);
