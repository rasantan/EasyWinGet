-- Facetas distintas para filtros da loja (evita varrer todas as linhas no app)

create or replace function public.distinct_categories()
returns table (category text)
language sql stable as $$
  select distinct unnest(categories) as category
  from public.packages
  order by 1;
$$;

create or replace function public.distinct_publishers(max_rows int default 500)
returns table (publisher text)
language sql stable as $$
  select publisher
  from public.packages
  where coalesce(publisher, '') <> ''
  group by publisher
  order by count(*) desc
  limit max_rows;
$$;
