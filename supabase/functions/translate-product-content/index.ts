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

// @ts-nocheck

import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  windowMinutes: number
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS')
  const allowedOrigins = allowedOriginsEnv 
    ? allowedOriginsEnv.split(',').map(o => o.trim())
    : [
        'https://bitminded.ch',
        'https://www.bitminded.ch',
        'http://localhost',
        'http://127.0.0.1:5501',
        'https://*.github.io'
      ]
  
  let allowedOrigin = allowedOrigins[0]
  if (origin) {
    const matched = allowedOrigins.find(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$')
        return regex.test(origin)
      }
      if (pattern === 'https://bitminded.ch' || pattern === 'https://www.bitminded.ch') {
        return origin === pattern || origin.endsWith('.bitminded.ch')
      }
      return origin === pattern || origin.startsWith(pattern)
    })
    if (matched) {
      allowedOrigin = origin
    }
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

async function checkRateLimit(
  supabaseAdmin: any,
  identifier: string,
  identifierType: 'user' | 'ip',
  functionName: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  await supabaseAdmin
    .from('rate_limit_tracking')
    .delete()
    .lt('window_start', oneHourAgo.toISOString())
  
  const minuteWindowStart = new Date(now.getTime() - 60 * 1000)
  const { data: minuteWindow, error: minuteError } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .eq('function_name', functionName)
    .gte('window_start', minuteWindowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (minuteError) {
    console.error('Rate limit check error (minute):', minuteError)
    return { allowed: true }
  }
  
  const minuteCount = minuteWindow?.request_count || 0
  if (minuteCount >= config.requestsPerMinute) {
    const windowEnd = minuteWindow ? new Date(minuteWindow.window_start) : now
    windowEnd.setSeconds(windowEnd.getSeconds() + 60)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  const hourWindowStart = new Date(now.getTime() - 60 * 60 * 1000)
  const { data: hourWindow, error: hourError } = await supabaseAdmin
    .from('rate_limit_tracking')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('identifier_type', identifierType)
    .eq('function_name', functionName)
    .gte('window_start', hourWindowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (hourError) {
    console.error('Rate limit check error (hour):', hourError)
    return { allowed: true }
  }
  
  const hourCount = hourWindow?.request_count || 0
  if (hourCount >= config.requestsPerHour) {
    const windowEnd = hourWindow ? new Date(hourWindow.window_start) : now
    windowEnd.setHours(windowEnd.getHours() + 1)
    const retryAfter = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
    return { allowed: false, retryAfter }
  }
  
  const currentMinuteStart = new Date(now)
  currentMinuteStart.setSeconds(0, 0)
  const currentHourStart = new Date(now)
  currentHourStart.setMinutes(0, 0, 0)
  
  if (minuteWindow && minuteWindow.window_start === currentMinuteStart.toISOString()) {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .update({ 
        request_count: minuteCount + 1,
        updated_at: now.toISOString()
      })
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('function_name', functionName)
      .eq('window_start', minuteWindow.window_start)
  } else {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .insert({
        identifier,
        identifier_type: identifierType,
        function_name: functionName,
        request_count: 1,
        window_start: currentMinuteStart.toISOString()
      })
  }
  
  if (hourWindow && hourWindow.window_start === currentHourStart.toISOString()) {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .update({ 
        request_count: hourCount + 1,
        updated_at: now.toISOString()
      })
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('function_name', functionName)
      .eq('window_start', hourWindow.window_start)
  } else {
    await supabaseAdmin
      .from('rate_limit_tracking')
      .insert({
        identifier,
        identifier_type: identifierType,
        function_name: functionName,
        request_count: 1,
        window_start: currentHourStart.toISOString()
      })
  }
  
  return { allowed: true }
}

type TranslationFields = {
  name?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  category?: {
    name?: string;
    description?: string;
  };
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
  const origin = request.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Get IP address for rate limiting
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                    request.headers.get('cf-connecting-ip') ||
                    request.headers.get('x-real-ip') ||
                    'unknown'

  // Rate limiting: IP-based for translation - 20/min, 300/hour (AI generation is expensive)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (supabaseUrl && supabaseServiceKey) {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      ipAddress,
      'ip',
      'translate-product-content',
      { requestsPerMinute: 20, requestsPerHour: 300, windowMinutes: 60 }
    )
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', retry_after: rateLimitResult.retryAfter }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60)
          } 
        }
      )
    }
  }

  let payload: TranslationRequest;

  try {
    payload = await request.json() as TranslationRequest;
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const translations: TranslationResponse["translations"] = {};
  const errors: Record<string, string> = {};

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
      // Continue processing other languages instead of failing immediately
      errors[targetLanguage] = error instanceof Error ? error.message : String(error);
    }
  }

  // Return partial results if we have any successful translations
  // If all translations failed, return an error
  if (Object.keys(translations).length === 0 && Object.keys(errors).length > 0) {
    return new Response(
      JSON.stringify({
        error: "All translations failed",
        details: errors,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Return successful translations, with errors included if any occurred
  const response: any = { translations };
  if (Object.keys(errors).length > 0) {
    response.errors = errors;
    response.warning = "Some translations failed, but partial results are included";
  }

  return new Response(
    JSON.stringify(response),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

function buildPrompt(
  sourceLanguage: string,
  targetLanguage: string,
  fields: TranslationFields,
): string {
  const sections: string[] = [];

  if (fields.name) {
    sections.push(`name:\n${fields.name}`);
  }
  if (fields.summary) {
    sections.push(`summary:\n${fields.summary}`);
  }
  if (fields.description) {
    sections.push(`description:\n${fields.description}`);
  }
  if (Array.isArray(fields.tags) && fields.tags.length > 0) {
    sections.push(`tags:\n${fields.tags.join(", ")}`);
  }
  if (fields.category) {
    const categoryLines: string[] = [];
    if (fields.category.name) {
      categoryLines.push(`name:\n${fields.category.name}`);
    }
    if (fields.category.description) {
      categoryLines.push(`description:\n${fields.category.description}`);
    }
    if (categoryLines.length > 0) {
      sections.push(`category:\n${categoryLines.join("\n")}`);
    }
  }

  const entries = sections.join("\n\n");

  return `
You are translating product copy from ${sourceLanguage} to ${targetLanguage}.
Preserve the meaning, tone, and marketing intent. Return your answer as JSON with keys "name", "summary", "description", "tags", and "category".
- Use empty strings (or empty arrays for tags) when the source is missing a value.
- "tags" must be an array of translated tag strings in the same order as the source.
- "category" must be an object with optional "name" and "description" string fields.

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
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((tag: unknown) =>
          typeof tag === "string" ? tag.trim() : "",
        ).filter((tag: string) => tag.length > 0)
        : [],
      category: parsed.category && typeof parsed.category === "object"
        ? {
          name: typeof parsed.category.name === "string"
            ? parsed.category.name
            : "",
          description: typeof parsed.category.description === "string"
            ? parsed.category.description
            : "",
        }
        : undefined,
    };
  } catch (_error) {
    throw new Error("Failed to parse OpenAI JSON response");
  }
}

