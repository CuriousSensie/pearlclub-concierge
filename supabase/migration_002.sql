-- Run once in the Supabase SQL editor (safe to re-run).
-- 1) Curator details so cards can show the local who recommended each place.
alter table places add column if not exists curator_slug text;
alter table places add column if not exists curator_image text;
alter table places add column if not exists curator_type text;

-- 2) Vector search ("vibe" queries). 1536 dims = OpenAI text-embedding-3-small.
create extension if not exists vector with schema extensions;
alter table places add column if not exists embedding extensions.vector(1536);
create index if not exists places_embedding_idx
  on places using hnsw (embedding extensions.vector_cosine_ops);

create or replace function match_places(
  query_embedding extensions.vector(1536),
  p_city text,
  p_category text default null,
  p_price_max int default null,
  p_exclude text[] default '{}',
  match_count int default 60
)
returns table (id text, similarity double precision)
language sql
stable
set search_path = public, extensions
as $$
  select p.id, 1 - (p.embedding <=> query_embedding) as similarity
  from places p
  where p.embedding is not null
    and p.city_slug = p_city
    and (p_category is null or p.category = p_category)
    and (p_price_max is null or p.price_level <= p_price_max)
    and not (p.id = any(p_exclude))
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
