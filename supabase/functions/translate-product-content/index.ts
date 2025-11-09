/* supabase/functions/translate-product-content/index.ts
 * Generates localized product copy using OpenAI.
 *
 * Request body:
 * {
 *   "sourceLanguage": "en",
 *   "targetLanguages": ["es","fr","de"],
 *   "fields": {
 *     "name": "Fitness Timer",
 *     "summary": "Fitness",
 *     "description": "Choose your workout..."
 *   }
 * }
 *
 * Response:
 * {
 *   "translations": {
 *     "es": { "name": "...", "summary": "...", "description": "..." },
 *     ...
 *   }
 * }
 */

import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

type TranslationFields = {
  name?: string;
  summary?: string;
  description?: string;
};

interface TranslationRequest {
  sourceLanguage?: string;
  targetLanguages?: string[];
  fields: TranslationFields;
}

interface TranslationResponse {
  translations: Record<string, TranslationFields>;
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_BASE_URL = Deno.env.get("OPENAI_BASE_URL") ??
  "https://api.openai.com/v1";
const OPENAI_MODEL =
  Deno.env.get("OPENAI_TRANSLATION_MODEL") ?? "gpt-4o-mini";

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set.");
}

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let payload: TranslationRequest;

  try {
    payload = await request.json() as TranslationRequest;
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const {
    sourceLanguage = "en",
    targetLanguages = ["es", "fr", "de"],
    fields,
  } = payload;

  if (!fields || Object.keys(fields).length === 0) {
    return new Response(
      JSON.stringify({ error: "fields object is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const translations: TranslationResponse["translations"] = {};

  for (const targetLanguage of targetLanguages) {
    if (!targetLanguage || targetLanguage === sourceLanguage) {
      continue;
    }

    const prompt = buildPrompt(sourceLanguage, targetLanguage, fields);

    try {
      const translated = await callOpenAI(prompt);
      translations[targetLanguage] = translated;
    } catch (error) {
      console.error(
        `Translation failed for ${targetLanguage}:`,
        error,
      );
      return new Response(
        JSON.stringify({
          error: `Translation failed for ${targetLanguage}`,
          details: error instanceof Error ? error.message : String(error),
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(
    JSON.stringify({ translations }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

function buildPrompt(
  sourceLanguage: string,
  targetLanguage: string,
  fields: TranslationFields,
): string {
  const entries = Object.entries(fields)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([key, value]) => `${key}:\n${value}`)
    .join("\n\n");

  return `
You are translating product copy from ${sourceLanguage} to ${targetLanguage}.
Preserve the meaning, tone, and marketing intent. Return your answer as JSON with keys "name", "summary", "description". If a field is missing in the source, return an empty string for it.

Source content:
${entries}

JSON Response:`;
}

async function callOpenAI(prompt: string): Promise<TranslationFields> {
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a professional marketing translator. Respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI request failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI response missing content");
  }

  try {
    const parsed = JSON.parse(content);
    return {
      name: parsed.name ?? "",
      summary: parsed.summary ?? "",
      description: parsed.description ?? "",
    };
  } catch (_error) {
    throw new Error("Failed to parse OpenAI JSON response");
  }
}

