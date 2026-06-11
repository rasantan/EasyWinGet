-- EasyWinGet: row level security policies

-- packages: public read, writes via service role only
alter table public.packages enable row level security;

create policy "packages_public_read"
  on public.packages
  for select
  using (true);

-- profiles: own row select and update
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id);

-- favorites: own rows CRUD
alter table public.favorites enable row level security;

create policy "favorites_select_own"
  on public.favorites
  for select
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites
  for insert
  with check (auth.uid() = user_id);

create policy "favorites_update_own"
  on public.favorites
  for update
  using (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites
  for delete
  using (auth.uid() = user_id);

-- bundles: select own or public; insert/update/delete own
alter table public.bundles enable row level security;

create policy "bundles_select_own_or_public"
  on public.bundles
  for select
  using (auth.uid() = user_id or is_public = true);

create policy "bundles_insert_own"
  on public.bundles
  for insert
  with check (auth.uid() = user_id);

create policy "bundles_update_own"
  on public.bundles
  for update
  using (auth.uid() = user_id);

create policy "bundles_delete_own"
  on public.bundles
  for delete
  using (auth.uid() = user_id);

-- bundle_items: access via bundle ownership or public bundle
alter table public.bundle_items enable row level security;

create policy "bundle_items_select_via_bundle"
  on public.bundle_items
  for select
  using (
    exists (
      select 1
      from public.bundles
      where bundles.id = bundle_items.bundle_id
        and (bundles.user_id = auth.uid() or bundles.is_public = true)
    )
  );

create policy "bundle_items_insert_via_bundle_owner"
  on public.bundle_items
  for insert
  with check (
    exists (
      select 1
      from public.bundles
      where bundles.id = bundle_items.bundle_id
        and bundles.user_id = auth.uid()
    )
  );

create policy "bundle_items_update_via_bundle_owner"
  on public.bundle_items
  for update
  using (
    exists (
      select 1
      from public.bundles
      where bundles.id = bundle_items.bundle_id
        and bundles.user_id = auth.uid()
    )
  );

create policy "bundle_items_delete_via_bundle_owner"
  on public.bundle_items
  for delete
  using (
    exists (
      select 1
      from public.bundles
      where bundles.id = bundle_items.bundle_id
        and bundles.user_id = auth.uid()
    )
  );

-- download_history: own rows select and insert
alter table public.download_history enable row level security;

create policy "download_history_select_own"
  on public.download_history
  for select
  using (auth.uid() = user_id);

create policy "download_history_insert_own"
  on public.download_history
  for insert
  with check (auth.uid() = user_id);
