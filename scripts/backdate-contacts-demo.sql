-- Backdate local_updated_at for a subset of contacts to simulate
-- real-world usage where deals have been idle for weeks/months.
-- This makes the Autonomous Agent find at-risk contacts on first run.
--
-- Run this ONCE after the initial seed. Safe to re-run (uses CTEs).

-- Customers idle 65+ days → churn risk signal
with targets as (
  select id from public.contacts
  where is_archived = false
    and lifecycle_stage = 'customer'
  order by random()
  limit 18
)
update public.contacts
set local_updated_at = now() - interval '65 days'
where id in (select id from targets);

-- SQLs idle 20+ days → stalling conversation
with targets as (
  select id from public.contacts
  where is_archived = false
    and lifecycle_stage = 'salesqualifiedlead'
    and lead_status in ('IN_PROGRESS', 'OPEN', 'CONNECTED')
  order by random()
  limit 20
)
update public.contacts
set local_updated_at = now() - interval '20 days'
where id in (select id from targets);

-- Opportunities idle 35+ days → deal going cold
with targets as (
  select id from public.contacts
  where is_archived = false
    and lifecycle_stage = 'opportunity'
    and lead_status in ('IN_PROGRESS', 'CONNECTED', 'ATTEMPTED_TO_CONTACT')
  order by random()
  limit 15
)
update public.contacts
set local_updated_at = now() - interval '35 days'
where id in (select id from targets);

-- New leads unworked 10+ days → unworked pipeline
with targets as (
  select id from public.contacts
  where is_archived = false
    and lead_status = 'NEW'
  order by random()
  limit 12
)
update public.contacts
set local_updated_at = now() - interval '10 days'
where id in (select id from targets);
