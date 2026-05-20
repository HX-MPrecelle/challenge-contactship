-- Wrappers around Supabase Vault for HubSpot token storage. The vault schema
-- is only accessible via SECURITY DEFINER functions, so we expose three
-- minimal ones in public/ that the service-role client can call via rpc().
-- Execute permission is locked down to the service role exclusively — anon
-- and authenticated users have no way to read or rotate tokens.

create or replace function public.create_hubspot_token_secret(
  token text,
  label text
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret_id uuid;
begin
  secret_id := vault.create_secret(token, label, 'HubSpot OAuth token');
  return secret_id;
end;
$$;

create or replace function public.update_hubspot_token_secret(
  secret_id uuid,
  new_token text
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  perform vault.update_secret(secret_id, new_token);
end;
$$;

create or replace function public.get_hubspot_token_secret(
  secret_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  token text;
begin
  select decrypted_secret into token
  from vault.decrypted_secrets
  where id = secret_id;
  return token;
end;
$$;

revoke execute on function public.create_hubspot_token_secret(text, text) from public, anon, authenticated;
revoke execute on function public.update_hubspot_token_secret(uuid, text) from public, anon, authenticated;
revoke execute on function public.get_hubspot_token_secret(uuid)       from public, anon, authenticated;
