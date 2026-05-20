create extension if not exists vector;

-- text-embedding-3-small produces 1536-dimensional vectors.
alter table contacts
  add column embedding vector(1536);

-- IVFFlat index with cosine distance. lists=100 is sized for ~1M rows; the
-- 50-contact MVP runs fine on any value but we keep it ready to scale.
create index contacts_embedding_idx
  on contacts
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Similarity search helper. Called from lib/ai/chat.ts as supabase.rpc.
-- RLS is enforced by `where org_id = match_org_id` inside the function plus
-- the regular contacts policy when called via the user-scoped client.
create or replace function match_contacts(
  query_embedding  vector(1536),
  match_org_id     uuid,
  match_threshold  float default 0.5,
  match_count      int   default 20
)
returns table (
  id              uuid,
  first_name      text,
  last_name       text,
  email           text,
  company         text,
  job_title       text,
  lifecycle_stage text,
  lead_status     text,
  country         text,
  local_updated_at timestamptz,
  sync_status     text,
  similarity      float
)
language sql stable
as $$
  select
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.company,
    c.job_title,
    c.lifecycle_stage,
    c.lead_status,
    c.country,
    c.local_updated_at,
    c.sync_status,
    1 - (c.embedding <=> query_embedding) as similarity
  from contacts c
  where
    c.org_id = match_org_id
    and c.is_archived = false
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
