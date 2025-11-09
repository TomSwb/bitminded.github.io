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
  name_translations: Record<string, string> | null;
  summary_translations: Record<string, string> | null;
  description_translations: Record<string, string> | null;
};

type TranslationMap = {
  name: Record<string, string>;
  summary: Record<string, string>;
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

async function main() {
  console.info('🔄 Fetching products for translation backfill…');

  const { data: products, error } = await supabase
    .from('products')
    .select(
      'id, name, short_description, description, name_translations, summary_translations, description_translations'
    );

  if (error) {
    console.error('Failed to fetch products:', error);
    Deno.exit(1);
  }

  if (!products || products.length === 0) {
    console.info('No products found. Exiting.');
    return;
  }

  let translatedCount = 0;
  let skippedCount = 0;

  for (const product of products as ProductRecord[]) {
    const source = {
      name: product.name ?? '',
      summary: product.short_description ?? '',
      description: product.description ?? ''
    };

    if (!hasValue(source.name) && !hasValue(source.summary) && !hasValue(source.description)) {
      skippedCount += 1;
      continue;
    }

    const existing: TranslationMap = {
      name: { ...(product.name_translations ?? {}) },
      summary: { ...(product.summary_translations ?? {}) },
      description: { ...(product.description_translations ?? {}) }
    };

    const languagesToTranslate = TARGET_LANGUAGES.filter((lang) => {
      const needsName = hasValue(source.name) && !hasValue(existing.name[lang]);
      const needsSummary = hasValue(source.summary) && !hasValue(existing.summary[lang]);
      const needsDescription = hasValue(source.description) && !hasValue(existing.description[lang]);
      return needsName || needsSummary || needsDescription;
    });

    if (languagesToTranslate.length === 0) {
      // Ensure English baseline exists even if we skip translations.
      existing.name.en = source.name;
      existing.summary.en = source.summary;
      existing.description.en = source.description;
      await persistTranslations(product.id, existing, product);
      skippedCount += 1;
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
      }

      existing.name.en = source.name;
      existing.summary.en = source.summary;
      existing.description.en = source.description;

      const updated = await persistTranslations(product.id, existing, product);
      if (updated) {
        translatedCount += 1;
      } else {
        skippedCount += 1;
      }

      // Gentle delay to avoid hitting rate limits
      await delay(400);
    } catch (err) {
      console.error(`❌ Failed to translate product ${product.id}:`, err);
      skippedCount += 1;
    }
  }

  console.info(`✅ Backfill complete. Updated ${translatedCount} products. Skipped ${skippedCount}.`);
}

async function persistTranslations(
  productId: string,
  translations: TranslationMap,
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();

