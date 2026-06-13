-- WinStack: descoberta de catálogo — grupo de licença + facetas com contagem
-- (Fase 1 da spec 2026-06-13-catalog-discovery-editorial-redesign)

-- Grupo de licença agrupado (open-source / proprietary / unknown), preenchido
-- pelo classificador em scripts/sync-winget/classify.ts (sync + backfill).
alter table public.packages
  add column if not exists license_group text;

create index if not exists packages_license_group_idx
  on public.packages (license_group);

-- O índice GIN packages_categories_idx (em categories) já existe na migration 001;
-- não recriar aqui.

-- Facetas com contagem para a sidebar de filtros. Baratas e estáveis — a UI
-- pode exibir os números ao lado de cada categoria/grupo de licença.
create or replace function public.category_facets()
returns table (category text, count bigint)
language sql stable as $$
  select unnest(categories) as category, count(*)::bigint as count
  from public.packages
  group by 1
  order by count desc, category;
$$;

create or replace function public.license_group_facets()
returns table (license_group text, count bigint)
language sql stable as $$
  select coalesce(license_group, 'unknown') as license_group, count(*)::bigint as count
  from public.packages
  group by 1
  order by count desc, license_group;
$$;
