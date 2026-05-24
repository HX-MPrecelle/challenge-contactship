-- 3-way merge conflict detection.
--
-- Adds base_state: a snapshot of the 6 conflict-tracked fields at the time
-- of last successful sync. This becomes the "common ancestor" that makes
-- 3-way diff possible:
--
--   base → local  = what the user changed locally
--   base → hubspot = what HubSpot changed on their side
--   overlap       = true conflict (same field, both sides changed)
--   no overlap    = auto-merge (only one side changed each field)
--
-- Without base_state the system could only do a 2-way "pick one side"
-- comparison. With base_state it can auto-merge non-conflicting changes
-- and only ask the user to resolve fields where BOTH sides diverged.

alter table public.contacts
  add column if not exists base_state jsonb;

comment on column public.contacts.base_state is
  'Snapshot of {first_name,last_name,email,phone,company,job_title} at last
   successful sync — used as the common ancestor for 3-way merge conflict detection.';

-- Backfill: set base_state = current local values for all synced contacts.
-- Assumes synced contacts are up to date (no pending conflicts).
update public.contacts
set base_state = jsonb_build_object(
  'first_name', first_name,
  'last_name',  last_name,
  'email',      email,
  'phone',      phone,
  'company',    company,
  'job_title',  job_title
)
where base_state is null
  and sync_status = 'synced';
