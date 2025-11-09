-- Migration: Create catalog release subscribers table
-- Purpose: Store email sign-ups for catalog release notifications

create table if not exists catalog_release_subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    language text default 'en',
    source text default 'catalog_page',
    consent boolean default true,
    created_at timestamptz default now(),
    confirmed_at timestamptz
);

create unique index if not exists idx_catalog_release_subscribers_email
    on catalog_release_subscribers ((lower(email)));

comment on table catalog_release_subscribers is
    'Newsletter signups for catalog release announcements.';
comment on column catalog_release_subscribers.email is
    'Subscriber email address (unique, case-insensitive).';
comment on column catalog_release_subscribers.language is
    'Preferred language code captured at signup.';
comment on column catalog_release_subscribers.source is
    'Source of signup (e.g., catalog_page).';

alter table catalog_release_subscribers enable row level security;

-- Allow anonymous inserts so anyone can join the list
create policy "Allow anonymous catalog subscriptions"
    on catalog_release_subscribers
    for insert
    with check (auth.role() = 'anon');

-- Allow service role (e.g. admin tooling) full access
create policy "Service role full access"
    on catalog_release_subscribers
    for all
    using (auth.role() = 'service_role');

