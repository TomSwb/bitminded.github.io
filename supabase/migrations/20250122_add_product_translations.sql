-- Migration: add JSON translation columns to products

alter table products
    add column if not exists name_translations jsonb default '{}'::jsonb,
    add column if not exists summary_translations jsonb default '{}'::jsonb,
    add column if not exists description_translations jsonb default '{}'::jsonb;

update products
set name_translations = coalesce(name_translations, '{}'::jsonb) || jsonb_build_object('en', name),
    summary_translations = coalesce(summary_translations, '{}'::jsonb) || jsonb_build_object('en', short_description),
    description_translations = coalesce(description_translations, '{}'::jsonb) || jsonb_build_object('en', description);

comment on column products.name_translations is 'Localized product names keyed by language code.';
comment on column products.summary_translations is 'Localized short descriptions keyed by language code.';
comment on column products.description_translations is 'Localized long descriptions keyed by language code.';

