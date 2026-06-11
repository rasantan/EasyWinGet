-- EasyWinGet: user profiles, favorites, bundles, and download history

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id uuid not null references public.packages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, package_id)
);

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  slug text not null unique,
  is_public boolean not null default false,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bundle_items (
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  package_id uuid not null references public.packages (id) on delete cascade,
  sort_order int not null default 0,
  primary key (bundle_id, package_id)
);

create table public.download_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bundle_id uuid references public.bundles (id) on delete set null,
  package_ids uuid[] not null default '{}',
  script_hash text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bundles_set_updated_at
  before update on public.bundles
  for each row execute function public.set_updated_at();
