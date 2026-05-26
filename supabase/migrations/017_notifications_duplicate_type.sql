-- Add 'duplicate' to the allowed notification types
alter table public.notifications
  drop constraint notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('agent_run', 'conflict', 'duplicate', 'hubspot_update', 'sync_error'));
