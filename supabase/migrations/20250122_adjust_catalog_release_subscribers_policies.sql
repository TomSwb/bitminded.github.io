-- Migration: Adjust catalog release subscribers policies

alter table catalog_release_subscribers
  disable row level security;

alter table catalog_release_subscribers
  enable row level security;

drop policy if exists "Allow anonymous catalog subscriptions" on catalog_release_subscribers;
drop policy if exists "Service role full access" on catalog_release_subscribers;

create policy "Anyone can join catalog release list"
  on catalog_release_subscribers
  for insert
  with check (true);

create policy "Service role full access"
  on catalog_release_subscribers
  for all
  using (auth.role() = 'service_role');

grant insert on catalog_release_subscribers to anon;
grant insert on catalog_release_subscribers to authenticated;

