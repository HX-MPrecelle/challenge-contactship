-- Add vector embeddings to chat messages so the AI can retrieve semantically
-- related messages from past conversations and inject them as memory context.
alter table public.chat_messages
  add column if not exists embedding vector(1536);

-- IVFFlat index for approximate nearest-neighbor search over message history.
-- lists=50 is sized for tables up to ~500k rows.
create index if not exists chat_messages_embedding_idx
  on public.chat_messages
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- RPC to find past messages semantically similar to a query embedding.
-- Filters by org_id (via conversation join) and user_id for per-user memory.
create or replace function match_messages(
  query_embedding    vector(1536),
  match_user_id      uuid,
  match_org_id       uuid,
  match_threshold    float   default 0.6,
  match_count        int     default 4
)
returns table (
  id               uuid,
  role             text,
  content          text,
  conversation_id  uuid,
  created_at       timestamptz,
  similarity       float
)
language sql stable
as $$
  select
    m.id,
    m.role,
    m.content,
    m.conversation_id,
    m.created_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.chat_messages m
  join public.chat_conversations c on c.id = m.conversation_id
  where
    c.user_id  = match_user_id
    and c.org_id   = match_org_id
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
