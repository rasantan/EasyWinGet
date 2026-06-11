-- EasyWinGet: WinGet catalog table with full-text and trigram search indexes

create extension if not exists pg_trgm;

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  package_id text not null unique,
  name text not null,
  publisher text not null default '',
  description text not null default '',
  description_full text,
  version text not null default '',
  installer_type text,
  categories text[] not null default '{}',
  icon_url text,
  moniker text,
  search_vector tsvector,
  last_synced_at timestamptz not null default now()
);

create index packages_search_idx on public.packages using gin (search_vector);
create index packages_categories_idx on public.packages using gin (categories);
create index packages_name_trgm_idx on public.packages using gin (name gin_trgm_ops);

create or replace function public.packages_search_vector_update()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.publisher, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.moniker, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'C');
  return new;
end;
$$ language plpgsql;

create trigger packages_search_vector_trigger
  before insert or update on public.packages
  for each row execute function public.packages_search_vector_update();
