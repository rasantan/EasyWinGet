-- WinStack: metadados oficiais, URLs, popularidade e destaque

alter table public.packages
  add column if not exists homepage text,
  add column if not exists publisher_url text,
  add column if not exists publisher_support_url text,
  add column if not exists license text,
  add column if not exists release_date date,
  add column if not exists tags text[] not null default '{}',
  add column if not exists popularity int not null default 0,
  add column if not exists is_featured boolean not null default false;

create index if not exists packages_popularity_idx
  on public.packages (popularity desc);

-- Recalcula popularidade a partir do uso interno (downloads + favoritos)
create or replace function public.recalc_package_popularity()
returns void as $$
begin
  update public.packages p
  set popularity = coalesce(d.cnt, 0) + coalesce(f.cnt, 0)
  from (
    select pid as package_uuid, count(*) as cnt
    from public.download_history dh, unnest(dh.package_ids) as pid
    group by pid
  ) d
  full outer join (
    select package_id as package_uuid, count(*) as cnt
    from public.favorites
    group by package_id
  ) f on f.package_uuid = d.package_uuid
  where p.id = coalesce(d.package_uuid, f.package_uuid);
end;
$$ language plpgsql;
