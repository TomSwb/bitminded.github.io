// @ts-nocheck
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
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

type TicketRecord = {
  id: string
  ticket_code: string
  name: string
  email: string | null
  type: string
  status: string
  message: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  user_id: string | null
}

const allowedStatuses = new Set(['new', 'in_progress', 'resolved', 'closed'])

const statusLabels: Record<string, string> = {
  new: 'New',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed'
}

const sanitize = (value?: string | null) => (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .trim()

const buildUpdatedMetadata = (
  metadata: Record<string, unknown> | null,
  status: string,
  comment: string,
  timestamp: string,
  actor: { type: 'admin' | 'user'; id?: string | null }
) => {
  const base = metadata && typeof metadata === 'object' ? { ...metadata } : {}
  const updatesHistory = Array.isArray(base.updates) ? base.updates.slice(-24) : []

  const entry: Record<string, unknown> = {
    status,
    created_at: timestamp,
    updated_by: actor
  }

  if (comment) {
    entry.comment = comment
  }

  updatesHistory.push(entry)

  return {
    ...base,
    updates: updatesHistory
  }
}

const applyArchiveState = (
  metadata: Record<string, unknown>,
  status: string,
  actor: { type: 'admin' | 'user'; id?: string | null },
  timestamp: string
) => {
  const next = { ...metadata }
  const history = Array.isArray(next.archive_history)
    ? next.archive_history.slice(-24)
    : []
  const currentlyArchived = Boolean(next.archived?.isArchived)

  if (status === 'closed' && !currentlyArchived) {
    history.push({
      action: 'archived',
      timestamp,
      by: actor
    })
    next.archived = {
      isArchived: true,
      archived_at: timestamp,
      archived_by: actor
    }
  } else if (status !== 'closed' && currentlyArchived) {
    history.push({
      action: 'restored',
      timestamp,
      by: actor
    })
    next.archived = {
      isArchived: false,
      archived_at: null,
      archived_by: actor
    }
  }

  if (history.length) {
    next.archive_history = history
  }

  return next
}

const buildEmailHtml = (
  ticketCode: string,
  name: string,
  statusLabel: string,
  safeComment: string,
  timestamp: string,
  closerLabel?: string
) => `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 620px;
                margin: 0 auto;
                padding: 32px 24px;
                background: #f9fafb;
              }
              .container {
                background: #ffffff;
                border-radius: 16px;
                padding: 32px;
                border: 1px solid #e5e7eb;
              }
              .badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                border-radius: 999px;
                font-weight: 600;
                font-size: 13px;
                background: #f3e8ff;
                color: #7c3aed;
                text-transform: uppercase;
                letter-spacing: 0.04em;
              }
              .section {
                margin-top: 24px;
              }
              .section h3 {
                margin: 0 0 12px;
                font-size: 17px;
                color: #111827;
              }
              .section p {
                margin: 0;
                color: #374151;
              }
              .meta {
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
                font-size: 13px;
                color: #6b7280;
              }
              .comment {
                margin-top: 16px;
                padding: 16px;
                border-radius: 12px;
                background: #f1f5f9;
                border-left: 4px solid #7c3aed;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="badge">Ticket ${ticketCode}</div>
              <div class="section">
                <h3>Status update: ${statusLabel}</h3>
                <p>Hi ${name},</p>
                <p>Your support ticket has been updated to <strong>${statusLabel}</strong>.</p>
                ${closerLabel ? `<p>${closerLabel}</p>` : ''}
              </div>
              ${safeComment ? `
                <div class="section">
                  <h3>Notes from the desk</h3>
                  <div class="comment">${safeComment}</div>
                </div>
              ` : ''}
              <div class="meta">
                Sent ${new Date(timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · Ticket ${ticketCode}
              </div>
            </div>
          </body>
        </html>
      `

const buildEmailText = (
  name: string,
  ticketCode: string,
  statusLabel: string,
  comment: string,
  closerLabel?: string
) => `Hi ${name},

Your support ticket ${ticketCode} has been updated to: ${statusLabel}.
${closerLabel ? `${closerLabel}\n` : ''}
${comment ? `\nNotes from the support desk:\n${comment}\n` : ''}
`

const sendStatusEmail = async (
  resendApiKey: string,
  ticket: TicketRecord,
  status: string,
  comment: string,
  timestamp: string,
  closerLabel?: string
) => {
  const statusLabel = sanitize(statusLabels[status] || status)
  const safeTicketCode = sanitize(ticket.ticket_code)
  const safeName = sanitize(ticket.name)
  const safeComment = sanitize(comment)

  const emailPayload: Record<string, unknown> = {
    from: 'BitMinded Support <support@bitminded.ch>',
    to: ticket.email,
    subject: `[Support:${ticket.ticket_code}] Status update: ${statusLabel}`,
    html: buildEmailHtml(safeTicketCode, safeName, statusLabel, safeComment, timestamp, closerLabel),
    text: buildEmailText(ticket.name, ticket.ticket_code, statusLabel, comment, closerLabel)
  }

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    }
  , body: JSON.stringify(emailPayload)
  })

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text()
    console.error('❌ send-support-update: Failed to send email', errorText)
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                      req.headers.get('cf-connecting-ip') ||
                      req.headers.get('x-real-ip') ||
                      'unknown'

    const { ticketId, ticketCode, status, comment = '', notifyUser = true } = await req.json()

    if (!ticketId && !ticketCode) {
      throw new Error('Ticket identifier is required')
    }

    if (typeof status !== 'string' || !status.trim()) {
      throw new Error('Status is required')
    }

    if (!allowedStatuses.has(status)) {
      throw new Error('Invalid status provided')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ send-support-update: Missing Supabase configuration')
      throw new Error('Service not configured')
    }

    if (!resendApiKey) {
      console.error('❌ send-support-update: RESEND_API_KEY not set')
      throw new Error('Email service not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const ticketQuery = supabase
      .from('support_tickets')
      .select('id, ticket_code, name, email, type, status, message, user_agent, metadata, created_at, updated_at, resolved_at, user_id')
      .maybeSingle()

    if (ticketId) {
      ticketQuery.eq('id', ticketId)
    } else if (ticketCode) {
      ticketQuery.eq('ticket_code', ticketCode)
    }

    const { data: ticket, error: ticketError } = await ticketQuery

    if (ticketError) {
      console.error('❌ send-support-update: Failed to fetch ticket', ticketError)
      throw new Error('Failed to load ticket')
    }

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const trimmedComment = typeof comment === 'string' ? comment.trim() : ''
    const nowIso = new Date().toISOString()

    const authHeader = req.headers.get('Authorization') || ''
    let actingUser: { type: 'admin' | 'user'; id?: string | null } = { type: 'admin' }
    let userIdForRateLimit: string | null = null

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
        if (!authError && authData?.user) {
          // Verify session exists in user_sessions table (prevent use of revoked tokens)
          const { data: sessionData, error: sessionError } = await supabaseAdmin
            .from('user_sessions')
            .select('session_token')
            .eq('session_token', token)
            .maybeSingle()

          if (!sessionError && sessionData) {
          actingUser = { type: 'user', id: authData.user.id }
          userIdForRateLimit = authData.user.id
          if (ticket.user_id && ticket.user_id !== authData.user.id) {
            throw new Error('You can only update your own tickets')
          }
          const allowedUserStatuses = new Set(['in_progress', 'resolved', 'closed', ticket.status])
          if (!allowedUserStatuses.has(status)) {
            throw new Error('Unsupported status transition for end user')
            }
          }
        }
      }
    }

    // Rate limiting: IP-based if no auth, user-based if authenticated - 30/min, 500/hour
    const rateLimitIdentifier = userIdForRateLimit || ipAddress
    const rateLimitType: 'user' | 'ip' = userIdForRateLimit ? 'user' : 'ip'
    const rateLimitResult = await checkRateLimit(
      supabase,
      rateLimitIdentifier,
      rateLimitType,
      'send-support-update',
      { requestsPerMinute: 30, requestsPerHour: 500, windowMinutes: 60 }
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

    const metadataWithUpdate = buildUpdatedMetadata(ticket.metadata, status, trimmedComment, nowIso, actingUser)
    const metadata = applyArchiveState(metadataWithUpdate, status, actingUser, nowIso)
    const resolvedAt = (status === 'resolved' || status === 'closed') ? nowIso : null

    const { data: updatedTicket, error: updateError } = await supabase
      .from('support_tickets')
      .update({
        status,
        resolved_at: resolvedAt,
        metadata,
        updated_at: nowIso
      })
      .eq('id', ticket.id)
      .select('id, ticket_code, name, email, type, status, message, user_agent, metadata, created_at, updated_at, resolved_at')
      .maybeSingle()

    if (updateError) {
      console.error('❌ send-support-update: Failed to update ticket', updateError)
      throw new Error('Failed to update ticket')
    }

    if (!updatedTicket) {
      throw new Error('Ticket update did not return data')
    }

    let closerLabel: string | undefined
    if (status === 'closed') {
      closerLabel = actingUser.type === 'user'
        ? 'You marked this ticket as closed.'
        : 'Our team marked this ticket as closed.'
    } else if (actingUser.type === 'user' && status === 'resolved') {
      closerLabel = 'You marked this ticket as resolved.'
    }

    // Check if ticket creator is admin - skip email sending for admin users
    const adminEmails = ['thomasschwab@bitminded.ch']
    const ticketEmail = ticket.email?.toLowerCase() || ''
    const isAdminEmail = adminEmails.includes(ticketEmail)
    
    let isAdminUser = false
    if (ticket.user_id) {
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ticket.user_id)
        .eq('role', 'admin')
        .maybeSingle()
      
      isAdminUser = !!adminRole
    }

    const shouldSkipEmail = isAdminEmail || isAdminUser

    if (notifyUser && updatedTicket.email && !shouldSkipEmail) {
      await sendStatusEmail(resendApiKey, updatedTicket, status, trimmedComment, nowIso, closerLabel)
    } else if (shouldSkipEmail) {
      console.log(`⏭️ Skipping email sending for admin user ticket: ${ticket.email || ticket.user_id}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket: updatedTicket
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('❌ send-support-update error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error occurred'
    return new Response(
      JSON.stringify({
        success: false,
        error: message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

