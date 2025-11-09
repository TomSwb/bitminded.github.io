-- Migration: Add translation support for product categories and tags

alter table product_categories
    add column if not exists name_translations jsonb default '{}'::jsonb,
    add column if not exists description_translations jsonb default '{}'::jsonb;

update product_categories
set name_translations = coalesce(name_translations, '{}'::jsonb) || jsonb_build_object('en', name),
    description_translations = coalesce(description_translations, '{}'::jsonb) || jsonb_build_object('en', description)
where name is not null;

alter table products
    add column if not exists tag_translations jsonb default '{}'::jsonb;

update products
set tag_translations = coalesce(tag_translations, '{}'::jsonb) || jsonb_build_object(
    'en',
    case
        when array_length(tags, 1) is null then '[]'::jsonb
        else to_jsonb(tags)
    end
)
where tags is not null;

comment on column product_categories.name_translations is 'Localized category names keyed by language code.';
comment on column product_categories.description_translations is 'Localized category descriptions keyed by language code.';
comment on column products.tag_translations is 'Localized tag arrays keyed by language code.';

