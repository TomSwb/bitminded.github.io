import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

/**
 * Send Support Request Email
 * 
 * Handles Support Centre submissions and routes them through Resend.
 * Enriches payload with request type + metadata for faster triage.
 */

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    // Rate limiting: IP-based for public support requests - 10/min, 50/hour
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
        'send-support-request',
        { requestsPerMinute: 10, requestsPerHour: 50, windowMinutes: 60 }
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
    // Parse request body
    const {
      name,
      email,
      message,
      type = 'tech-help',
      userId,
      userAgent,
      attachments: attachmentsRaw = [],
      context: contextRaw = {}
    } = await req.json()

    const trimmedName = String(name ?? '').trim()
    const trimmedEmail = String(email ?? '').trim()
    const trimmedMessage = String(message ?? '').trim()
    const normalizedUserAgent = typeof userAgent === 'string' && userAgent.length > 0
      ? userAgent.slice(0, 512)
      : null

    const sanitize = (value: string) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .trim()

    const safeName = sanitize(trimmedName)
    const safeEmail = sanitize(trimmedEmail)
    let effectiveMessage = trimmedMessage
    const safeUserAgent = normalizedUserAgent ? sanitize(normalizedUserAgent) : ''

    const attachmentEntries = Array.isArray(attachmentsRaw) ? attachmentsRaw : []
    const allowedMimeTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/log'
    ])
    const maxAttachmentCount = 5
    const maxAttachmentSize = 5 * 1024 * 1024 // 5 MB

    const attachmentsForStore: Array<{ name: string; type: string; size: number }> = []
    const attachmentsForEmail: Array<{ filename: string; content: string; type: string }> = []

    const formatSize = (size: number) => {
      if (!Number.isFinite(size)) return ''
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
      return `${(size / (1024 * 1024)).toFixed(1)} MB`
    }

    const parseDataUrl = (dataUrl: string) => {
      if (!dataUrl.startsWith('data:')) return null
      const commaIndex = dataUrl.indexOf(',')
      if (commaIndex === -1) return null
      const meta = dataUrl.substring(5, commaIndex) // remove 'data:'
      const base64Content = dataUrl.substring(commaIndex + 1)
      if (!meta.includes(';base64')) return null
      return base64Content
    }

    for (const entry of attachmentEntries.slice(0, maxAttachmentCount)) {
      const fileName = typeof entry?.name === 'string' ? entry.name.trim().slice(0, 120) : ''
      const fileType = typeof entry?.type === 'string' ? entry.type.toLowerCase() : ''
      const fileSize = typeof entry?.size === 'number' ? entry.size : Number(entry?.size)
      const dataUrl = typeof entry?.dataUrl === 'string' ? entry.dataUrl : ''

      if (!fileName || !fileType || !Number.isFinite(fileSize) || fileSize <= 0 || !dataUrl) {
        continue
      }

      if (fileSize > maxAttachmentSize || !allowedMimeTypes.has(fileType)) {
        continue
      }

      const base64Content = parseDataUrl(dataUrl)
      if (!base64Content) {
        continue
      }

      attachmentsForStore.push({
        name: fileName,
        type: fileType,
        size: fileSize
      })

      const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, '_') || 'attachment'

      attachmentsForEmail.push({
        filename: safeFileName,
        content: base64Content,
        type: fileType
      })
    }

    const sanitizeContextValue = (value: unknown, depth = 0): string | string[] | undefined => {
      if (depth > 3 || value === null || typeof value === 'undefined') {
        return undefined
      }

      if (Array.isArray(value)) {
        const sanitizedArray = value
          .slice(0, 10)
          .map((item) => sanitizeContextValue(item, depth + 1))
          .filter((item): item is string => typeof item === 'string' && item.length > 0)
        return sanitizedArray.length ? sanitizedArray : undefined
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
          .slice(0, 10)
          .map(([key, val]) => {
            const sanitizedVal = sanitizeContextValue(val, depth + 1)
            if (!sanitizedVal) return ''
            const sanitizedKey = sanitize(key)
            if (Array.isArray(sanitizedVal)) {
              return `${sanitizedKey}: ${sanitizedVal.join(', ')}`
            }
            return `${sanitizedKey}: ${sanitizedVal}`
          })
          .filter(Boolean)
        if (!entries.length) return undefined
        return entries.join(', ')
      }

      const stringValue = sanitize(String(value)).slice(0, 500)
      return stringValue.length ? stringValue : undefined
    }

    const safeContext: Record<string, string | string[]> = {}
    if (contextRaw && typeof contextRaw === 'object' && !Array.isArray(contextRaw)) {
      for (const [entryKey, entryValue] of Object.entries(contextRaw as Record<string, unknown>).slice(0, 25)) {
        const trimmedKey = entryKey.trim()
        if (!trimmedKey) continue
        const sanitizedValue = sanitizeContextValue(entryValue)
        if (!sanitizedValue) continue
        safeContext[trimmedKey] = sanitizedValue
      }
    }

    if (typeof safeContext.topicLabel === 'string' && typeof safeContext.topic === 'string') {
      delete safeContext.topic
    }

    const formatList = (items: string[], ordered = false) => {
      if (!items.length) return ''
      const tag = ordered ? 'ol' : 'ul'
      return `<${tag} style="margin:0;padding-left:18px;">${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`
    }

    const renderContextHtml = (_requestType: string, context: Record<string, string | string[]>): string => {
      if (!context || Object.keys(context).length === 0) {
        return ''
      }

      const workingContext: Record<string, string | string[]> = { ...context }
      const sections: Array<{ label: string; valueHtml: string }> = []

      const contextLabelMap: Record<string, string> = {
        topicLabel: 'Topic',
        summary: 'Summary',
        steps: 'Steps to reproduce',
        deviceDetails: 'Device details',
        notes: 'Additional notes'
      }

      const addSection = (label: string, valueHtml: string) => {
        const trimmedValue = valueHtml.trim()
        if (!trimmedValue) return
        sections.push({
          label: sanitize(label),
          valueHtml: trimmedValue
        })
      }

      if (typeof workingContext.topicLabel === 'string') {
        const topicLabel = workingContext.topicLabel
        delete workingContext.topicLabel
        if (topicLabel) {
          addSection(contextLabelMap.topicLabel || 'Topic', topicLabel)
        }
      }

      if (typeof workingContext.summary === 'string') {
        const summary = workingContext.summary
        delete workingContext.summary
        if (summary) {
          addSection(contextLabelMap.summary || 'Summary', summary)
        }
      }

      if (Array.isArray(workingContext.steps)) {
        const steps = workingContext.steps as string[]
        delete workingContext.steps
        if (steps.length) {
          addSection(contextLabelMap.steps || 'Steps to reproduce', formatList(steps, true))
        }
      }

      if (typeof workingContext.deviceDetails === 'string') {
        const deviceDetails = workingContext.deviceDetails
        delete workingContext.deviceDetails
        if (deviceDetails) {
          addSection(contextLabelMap.deviceDetails || 'Device details', deviceDetails)
        }
      }

      if (typeof workingContext.notes === 'string') {
        const notes = workingContext.notes
        delete workingContext.notes
        if (notes) {
          addSection(contextLabelMap.notes || 'Additional notes', notes)
        }
      }

      for (const [key, value] of Object.entries(workingContext)) {
        if (!value) continue
        const prettyKey = key
          .replace(/[_-]+/g, ' ')
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/\s+/g, ' ')
          .trim()
        const label = contextLabelMap[key] || (prettyKey
          ? prettyKey.replace(/\b\w/g, (char) => char.toUpperCase())
          : 'Detail'
        )
        if (Array.isArray(value)) {
          if (value.length) {
            addSection(label, formatList(value))
          }
          continue
        }
        addSection(label, value as string)
      }

      if (!sections.length) {
        return ''
      }

      return sections.map((section) => `
              <div class="field">
                <div class="field-label">${section.label}</div>
                <div class="field-value">${section.valueHtml}</div>
              </div>
            `).join('')
    }

    if (!effectiveMessage && typeof safeContext.summary === 'string' && safeContext.summary.length > 0) {
      effectiveMessage = safeContext.summary
    }

    const safeMessage = sanitize(effectiveMessage)

    const allowedTypes = new Set(['tech-help', 'bug', 'account', 'billing', 'general', 'commission'])
    const normalizedType = allowedTypes.has(type) ? type : 'tech-help'

    const typeLabels: Record<string, string> = {
      'tech-help': 'Request tech help',
      bug: 'Bug or outage',
      account: 'Account or billing help',
      billing: 'Billing',
      general: 'General question',
      commission: 'Commission intake',
    }
    const typeLabel = typeLabels[normalizedType] ?? normalizedType

    // Validate input
    if (!trimmedName || !trimmedEmail) {
      throw new Error('Missing required fields: name and email are required')
    }

    if (!effectiveMessage) {
      throw new Error('Missing required fields: message is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format')
    }

    // Validate message length
    const minMessageLength = normalizedType === 'bug' ? 5 : 10
    if (effectiveMessage.length < minMessageLength) {
      throw new Error(`Message is too short (minimum ${minMessageLength} characters)`)
    }

    if (effectiveMessage.length > 5000) {
      throw new Error('Message is too long (maximum 5000 characters)')
    }

    console.log(`📧 Support request from: ${trimmedEmail} [${typeLabel}]${userId ? ` (user:${userId})` : ''}`)

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not set')
      throw new Error('Email service not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
      throw new Error('Database connection not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const isValidUuid = (value: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
    const dbUserId = typeof userId === 'string' && isValidUuid(userId) ? userId : null
    const safeUserId = dbUserId ? sanitize(dbUserId) : ''

    let ticketRecord: {
      id: string
      ticket_code: string
      status: string
      created_at: string
      updated_at: string
    } | null = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const generatedTicketCode = `SUP-${crypto.randomUUID().split('-')[0].toUpperCase()}`

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_code: generatedTicketCode,
          user_id: dbUserId,
          email: trimmedEmail,
          name: trimmedName,
          type: normalizedType,
          status: 'new',
          message: effectiveMessage,
          user_agent: normalizedUserAgent,
          metadata: {
            source: 'support-form',
            attachments: attachmentsForStore,
            context: safeContext
          }
        })
        .select('id, ticket_code, status, created_at, updated_at')
        .single()

      if (!error && data) {
        ticketRecord = data
        break
      }

      if (error?.code === '23505') {
        console.warn('⚠️ Ticket code collision detected, retrying…')
        continue
      }

      console.error('❌ Failed to insert support ticket:', error)
      throw new Error(`Failed to create support ticket: ${error?.message || 'Unknown error'}`)
    }

    if (!ticketRecord) {
      throw new Error('Failed to create support ticket after multiple attempts')
    }

    const ticketCode = ticketRecord.ticket_code
    const safeTicketCode = sanitize(ticketCode)
    const safeTypeLabel = sanitize(typeLabel)

    // Check if user is admin - skip email sending for admin users
    const adminEmails = ['thomasschwab@bitminded.ch']
    const isAdminEmail = adminEmails.includes(trimmedEmail.toLowerCase())
    
    let isAdminUser = false
    if (dbUserId) {
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', dbUserId)
        .eq('role', 'admin')
        .maybeSingle()
      
      isAdminUser = !!adminRole
    }

    const shouldSkipEmails = isAdminEmail || isAdminUser

    if (shouldSkipEmails) {
      console.log(`⏭️ Skipping email sending for admin user: ${trimmedEmail}`)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Support ticket created successfully (emails skipped for admin user)',
          ticketId: ticketCode,
          ticket: {
            id: ticketRecord.id,
            code: ticketCode,
            status: ticketRecord.status,
            created_at: ticketRecord.created_at,
            updated_at: ticketRecord.updated_at,
            attachments: attachmentsForStore
          },
          emailsSkipped: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Format timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'long'
    })

    const contextHtml = renderContextHtml(normalizedType, safeContext)

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #d286bd;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #d286bd;
              margin-bottom: 10px;
            }
            .tagline {
              color: #666;
              font-size: 14px;
            }
            .content {
              margin-bottom: 30px;
            }
            .field {
              margin-bottom: 20px;
            }
            .field-label {
              font-weight: 600;
              color: #555;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            .field-value {
              padding: 12px;
              background: #f8f9fa;
              border-radius: 6px;
              border-left: 3px solid #d286bd;
            }
            .message-box {
              padding: 20px;
              background: #f0f8ff;
              border-radius: 6px;
              border-left: 4px solid #d286bd;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .reply-to {
              margin-top: 20px;
              padding: 15px;
              background: #fff3cd;
              border-radius: 6px;
              border-left: 4px solid #d286bd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded</div>
              <div class="tagline">Support Centre Intake</div>
            </div>
            
            <div class="content">
              <h2 style="margin-top: 0; color: #333;">New Support Request</h2>
              
              <div class="field">
                <div class="field-label">From</div>
                <div class="field-value">
                  <strong>${safeName}</strong><br>
                  <a href="mailto:${safeEmail}" style="color: #cfde67; text-decoration: none;">${safeEmail}</a>
                </div>
              </div>
              
              <div class="field-grid" style="display:grid; gap:16px;">
                <div class="field">
                  <div class="field-label">Ticket ID</div>
                  <div class="field-value">${safeTicketCode}</div>
                </div>
              <div class="field">
                <div class="field-label">Received</div>
                <div class="field-value">${timestamp}</div>
                </div>
                <div class="field">
                  <div class="field-label">Request Type</div>
                  <div class="field-value">${safeTypeLabel}</div>
                </div>
                ${safeUserId ? `
                  <div class="field">
                    <div class="field-label">User ID</div>
                    <div class="field-value">${safeUserId}</div>
                  </div>` : ''}
                ${safeUserAgent ? `
                  <div class="field">
                    <div class="field-label">User Agent</div>
                    <div class="field-value" style="font-size: 12px; line-height: 1.4;">${safeUserAgent}</div>
                  </div>` : ''}
              </div>
              
              <div class="field">
                <div class="field-label">Message</div>
                <div class="message-box">${safeMessage}</div>
              </div>
              ${contextHtml}
              ${attachmentsForStore.length ? `
              <div class="field">
                <div class="field-label">Attachments</div>
                <div class="field-value">
                  <ul style="margin:0;padding-left:16px;">
                    ${attachmentsForStore.map(att => `<li>${sanitize(att.name)} (${formatSize(att.size)})</li>`).join('')}
                  </ul>
                </div>
              </div>` : ''}
              
              <div class="reply-to">
                <strong>💡 To Reply:</strong> Simply reply to this email to respond directly to ${safeEmail}
              </div>
            </div>
            
            <div class="footer">
              <p>This message was sent via the BitMinded Support Centre</p>
              <p>© 2025 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Resend
    const internalEmailPayload: Record<string, unknown> = {
      from: 'BitMinded Support <support@bitminded.ch>',
      to: 'support@bitminded.ch',
      reply_to: email,
      subject: `[Support:${ticketCode}] ${safeName}`,
      html: emailHtml
    }

    if (attachmentsForEmail.length) {
      internalEmailPayload.attachments = attachmentsForEmail.map(att => ({
        filename: att.filename,
        content: att.content,
        type: att.type
      }))
    }

    const internalEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(internalEmailPayload)
    })

    const internalEmailResult = await internalEmailResponse.json()

    if (!internalEmailResponse.ok) {
      console.error('❌ Resend API error (internal):', internalEmailResult)
      throw new Error(`Failed to send support email: ${internalEmailResult.message || 'Unknown error'}`)
    }

    const userEmailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #0f172a;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8fafc;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 16px 40px -20px rgba(15,23,42,0.35);
              border: 1px solid rgba(99,102,241,0.12);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: 700;
              color: #d286bd;
              letter-spacing: 0.05em;
              text-transform: uppercase;
            }
            .tagline {
              color: #475569;
              font-size: 14px;
              margin-top: 4px;
            }
            .ticket-chip {
              display: inline-block;
              background: rgba(210,134,189,0.18);
              color: #c26aa1;
              padding: 6px 14px;
              border-radius: 999px;
              font-weight: 600;
              letter-spacing: 0.05em;
              margin: 12px 0 24px;
            }
            .content h2 {
              margin: 0 0 12px;
              color: #111827;
              font-size: 22px;
            }
            .content p {
              color: #1e293b;
              margin-bottom: 16px;
            }
            .summary {
              margin: 30px 0;
              background: #f1f5f9;
              border-radius: 12px;
              padding: 24px;
              border-left: 4px solid #d286bd;
            }
            .summary h3 {
              margin-top: 0;
              margin-bottom: 12px;
              color: #1e293b;
              font-size: 16px;
              letter-spacing: 0.02em;
            }
            .summary div {
              margin-bottom: 10px;
            }
            .summary span {
              display: block;
            }
            .footer {
              margin-top: 32px;
              font-size: 13px;
              color: #64748b;
              text-align: center;
              line-height: 1.5;
            }
            .footer a {
              color: #4c51bf;
              text-decoration: none;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded Support</div>
              <div class="tagline">Professional Digital Solutions</div>
              <span class="ticket-chip">Ticket ${safeTicketCode}</span>
            </div>
            <div class="content">
              <h2>We received your request</h2>
              <p>Hi ${safeName || 'there'},</p>
              <p>Thanks for reaching out. Your support request is in our queue and one of our specialists will get back to you within 24 business hours.</p>
              <div class="summary">
                <h3>Request summary</h3>
                <div>
                  <strong>Submitted:</strong>
                  <span>${timestamp}</span>
                </div>
                <div>
                  <strong>Type:</strong>
                  <span>${safeTypeLabel}</span>
                </div>
                <div>
                  <strong>Message:</strong>
                  <span style="white-space: pre-wrap;">${safeMessage}</span>
                </div>
                ${attachmentsForStore.length ? `
                <div>
                  <strong>Attachments:</strong>
                  <span>${attachmentsForStore.map(att => `${sanitize(att.name)} (${formatSize(att.size)})`).join(', ')}</span>
                </div>` : ''}
              </div>
              <p>If you need to add more context, simply reply to this email and it will attach to your ticket.</p>
            </div>
            <div class="footer">
              <p>BitMinded Support · Ticket ${safeTicketCode}</p>
              <p>This confirmation was sent to ${safeEmail}. If this wasn’t you, forward it to <a href="mailto:security@bitminded.ch">security@bitminded.ch</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const userEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BitMinded Support <support@bitminded.ch>',
        to: email,
        reply_to: 'support@bitminded.ch',
        subject: `We received your support request (${ticketCode})`,
        html: userEmailHtml
      })
    })

    const userEmailResult = await userEmailResponse.json()

    if (!userEmailResponse.ok) {
      console.error('❌ Resend API error (confirmation):', userEmailResult)
      throw new Error(`Failed to send confirmation email: ${userEmailResult.message || 'Unknown error'}`)
    }

    console.log('✅ Support emails sent successfully via Resend')
    console.log('🎫 Ticket created:', ticketCode, ticketRecord.id)
    console.log('📎 Attachments included:', attachmentsForStore.length)
    console.log('📬 Internal Email ID:', internalEmailResult.id)
    console.log('📬 Confirmation Email ID:', userEmailResult.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Support request email sent successfully',
        emailId: internalEmailResult.id,
        ticketId: ticketCode,
        ticket: {
          id: ticketRecord.id,
          code: ticketCode,
          status: ticketRecord.status,
          created_at: ticketRecord.created_at,
          updated_at: ticketRecord.updated_at,
          attachments: attachmentsForStore
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error sending support email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

