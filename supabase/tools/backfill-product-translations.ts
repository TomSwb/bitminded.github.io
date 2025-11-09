/**
 * Backfill catalog product translations using the translate-product-content edge function.
 *
 * Usage:
 *  deno run --allow-net --allow-env supabase/tools/backfill-product-translations.ts
 *
 * Required environment variables:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *
 * The script fetches all products, determines which target languages (es, fr, de)
 * are missing translations for name, summary, or description, and invokes the
 * translate-product-content edge function to populate them. Only non-empty
 * English source fields are translated. Existing manual overrides are preserved.
 */

// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0?dts';

type ProductRecord = {
  id: string;
  name: string | null;
  short_description: string | null;
  description: string | null;
  tags: string[] | null;
  name_translations: Record<string, string> | null;
  summary_translations: Record<string, string> | null;
  description_translations: Record<string, string> | null;
  tag_translations: Record<string, string[]> | null;
};

type ProductTranslationMap = {
  name: Record<string, string>;
  summary: Record<string, string>;
  description: Record<string, string>;
  tags: Record<string, string[]>;
};

type CategoryRecord = {
  id: string;
  name: string | null;
  description: string | null;
  name_translations: Record<string, string> | null;
  description_translations: Record<string, string> | null;
};

type CategoryTranslationMap = {
  name: Record<string, string>;
  description: Record<string, string>;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const TARGET_LANGUAGES = ['es', 'fr', 'de'] as const;
const hasValue = (value?: string | null) => typeof value === 'string' && value.trim().length > 0;
const hasArrayContent = (values?: string[] | null) => Array.isArray(values) && values.some(hasValue);

async function main() {
  console.info('🔄 Fetching products for translation backfill…');

  const { data: products, error } = await supabase
    .from('products')
    .select(
      'id, name, short_description, description, tags, name_translations, summary_translations, description_translations, tag_translations'
    );

  if (error) {
    console.error('Failed to fetch products:', error);
    Deno.exit(1);
  }

  if (!products || products.length === 0) {
    console.info('No products found. Exiting.');
    return;
  }

  let productTranslatedCount = 0;
  let productSkippedCount = 0;

  for (const product of products as ProductRecord[]) {
    const source = {
      name: product.name ?? '',
      summary: product.short_description ?? '',
      description: product.description ?? '',
      tags: Array.isArray(product.tags) ? product.tags.filter(hasValue) : []
    };

    if (
      !hasValue(source.name) &&
      !hasValue(source.summary) &&
      !hasValue(source.description) &&
      source.tags.length === 0
    ) {
      productSkippedCount += 1;
      continue;
    }

    const existing: ProductTranslationMap = {
      name: { ...(product.name_translations ?? {}) },
      summary: { ...(product.summary_translations ?? {}) },
      description: { ...(product.description_translations ?? {}) },
      tags: { ...(product.tag_translations ?? {}) }
    };

    const languagesToTranslate = TARGET_LANGUAGES.filter((lang) => {
      const needsName = hasValue(source.name) && !hasValue(existing.name[lang]);
      const needsSummary = hasValue(source.summary) && !hasValue(existing.summary[lang]);
      const needsDescription = hasValue(source.description) && !hasValue(existing.description[lang]);
      const needsTags = source.tags.length > 0 && !Array.isArray(existing.tags[lang]);
      return needsName || needsSummary || needsDescription || needsTags;
    });

    if (languagesToTranslate.length === 0) {
      // Ensure English baseline exists even if we skip translations.
      existing.name.en = source.name;
      existing.summary.en = source.summary;
      existing.description.en = source.description;
      existing.tags.en = source.tags;
      await persistProductTranslations(product.id, existing, product);
      productSkippedCount += 1;
      continue;
    }

    console.info(
      `🌐 Translating product ${product.id} (${product.name ?? 'Unnamed'}) for languages: ${languagesToTranslate.join(', ')}`
    );

    try {
      const { data, error: translationError } = await supabase.functions.invoke('translate-product-content', {
        body: {
          sourceLanguage: 'en',
          targetLanguages: languagesToTranslate,
          fields: source
        }
      });

      if (translationError) {
        throw translationError;
      }

      const translations = data?.translations ?? {};

      for (const lang of languagesToTranslate) {
        const translated = translations[lang];
        if (!translated) {
          continue;
        }

        if (hasValue(translated.name)) {
          existing.name[lang] = translated.name.trim();
        }
        if (hasValue(translated.summary)) {
          existing.summary[lang] = translated.summary.trim();
        }
        if (hasValue(translated.description)) {
          existing.description[lang] = translated.description.trim();
        }
        if (Array.isArray(translated.tags) && translated.tags.length > 0) {
          existing.tags[lang] = translated.tags
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0);
        }
      }

      existing.name.en = source.name;
      existing.summary.en = source.summary;
      existing.description.en = source.description;
      existing.tags.en = source.tags;

      const updated = await persistProductTranslations(product.id, existing, product);
      if (updated) {
        productTranslatedCount += 1;
      } else {
        productSkippedCount += 1;
      }

      // Gentle delay to avoid hitting rate limits
      await delay(400);
    } catch (err) {
      console.error(`❌ Failed to translate product ${product.id}:`, err);
      productSkippedCount += 1;
    }
  }

  console.info(`✅ Product translation backfill complete. Updated ${productTranslatedCount} products. Skipped ${productSkippedCount}.`);

  await backfillCategories();
}

async function persistProductTranslations(
  productId: string,
  translations: ProductTranslationMap,
  original: ProductRecord
): Promise<boolean> {
  const updates: Partial<ProductRecord> = {};

  if (JSON.stringify(translations.name) !== JSON.stringify(original.name_translations ?? {})) {
    updates.name_translations = translations.name;
  }
  if (JSON.stringify(translations.summary) !== JSON.stringify(original.summary_translations ?? {})) {
    updates.summary_translations = translations.summary;
  }
  if (JSON.stringify(translations.description) !== JSON.stringify(original.description_translations ?? {})) {
    updates.description_translations = translations.description;
  }
  if (JSON.stringify(translations.tags) !== JSON.stringify(original.tag_translations ?? {})) {
    updates.tag_translations = translations.tags;
  }

  if (Object.keys(updates).length === 0) {
    return false;
  }

  const { error } = await supabase.from('products').update(updates).eq('id', productId);
  if (error) {
    console.error(`Failed to update product ${productId}:`, error);
    return false;
  }

  return true;
}

async function backfillCategories() {
  console.info('🔄 Fetching categories for translation backfill…');

  const { data: categories, error } = await supabase
    .from('product_categories')
    .select('id, name, description, name_translations, description_translations');

  if (error) {
    console.error('Failed to fetch categories:', error);
    return;
  }

  if (!categories || categories.length === 0) {
    console.info('No categories found. Skipping category backfill.');
    return;
  }

  let translatedCount = 0;
  let skippedCount = 0;

  for (const category of categories as CategoryRecord[]) {
    const source = {
      name: category.name ?? '',
      description: category.description ?? ''
    };

    if (!hasValue(source.name) && !hasValue(source.description)) {
      skippedCount += 1;
      continue;
    }

    const existing: CategoryTranslationMap = {
      name: { ...(category.name_translations ?? {}) },
      description: { ...(category.description_translations ?? {}) }
    };

    const languagesToTranslate = TARGET_LANGUAGES.filter((lang) => {
      const needsName = hasValue(source.name) && !hasValue(existing.name[lang]);
      const needsDescription = hasValue(source.description) && !hasValue(existing.description[lang]);
      return needsName || needsDescription;
    });

    if (languagesToTranslate.length === 0) {
      existing.name.en = source.name;
      existing.description.en = source.description;
      await persistCategoryTranslations(category.id, existing, category);
      skippedCount += 1;
      continue;
    }

    console.info(
      `🌐 Translating category ${category.id} (${category.name ?? 'Unnamed'}) for languages: ${languagesToTranslate.join(', ')}`
    );

    try {
      const { data, error: translationError } = await supabase.functions.invoke('translate-product-content', {
        body: {
          sourceLanguage: 'en',
          targetLanguages: languagesToTranslate,
          fields: {
            category: source
          }
        }
      });

      if (translationError) {
        throw translationError;
      }

      const translations = data?.translations ?? {};

      for (const lang of languagesToTranslate) {
        const translated = translations[lang];
        if (!translated) {
          continue;
        }

        if (hasValue(translated.category?.name)) {
          existing.name[lang] = translated.category.name.trim();
        }
        if (hasValue(translated.category?.description)) {
          existing.description[lang] = translated.category.description.trim();
        }
      }

      existing.name.en = source.name;
      existing.description.en = source.description;

      const updated = await persistCategoryTranslations(category.id, existing, category);
      if (updated) {
        translatedCount += 1;
      } else {
        skippedCount += 1;
      }

      await delay(400);
    } catch (err) {
      console.error(`❌ Failed to translate category ${category.id}:`, err);
      skippedCount += 1;
    }
  }

  console.info(`✅ Category translation backfill complete. Updated ${translatedCount} categories. Skipped ${skippedCount}.`);
}

async function persistCategoryTranslations(
  categoryId: string,
  translations: CategoryTranslationMap,
  original: CategoryRecord
): Promise<boolean> {
  const updates: Partial<CategoryRecord> = {};

  if (JSON.stringify(translations.name) !== JSON.stringify(original.name_translations ?? {})) {
    updates.name_translations = translations.name;
  }
  if (JSON.stringify(translations.description) !== JSON.stringify(original.description_translations ?? {})) {
    updates.description_translations = translations.description;
  }

  if (Object.keys(updates).length === 0) {
    return false;
  }

  const { error } = await supabase.from('product_categories').update(updates).eq('id', categoryId);
  if (error) {
    console.error(`Failed to update category ${categoryId}:`, error);
    return false;
  }

  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();

