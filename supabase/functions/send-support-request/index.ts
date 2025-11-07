import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Send Support Request Email
 *
 * Handles Support Centre submissions and routes them through Resend.
 * Enriches payload with request type + metadata for faster triage.
 */

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { name, email, message, type = 'general', userId, userAgent } = await req.json()

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
    const safeMessage = sanitize(trimmedMessage)
    const safeUserAgent = normalizedUserAgent ? sanitize(normalizedUserAgent) : ''

    const typeLabels: Record<string, string> = {
      general: 'General question',
      bug: 'Bug or outage',
      billing: 'Billing',
      commission: 'Commission intake',
    }
    const typeLabel = typeLabels[type] ?? type

    // Validate input
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      throw new Error('Missing required fields: name, email, and message are required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format')
    }

    // Validate message length
    if (trimmedMessage.length < 10) {
      throw new Error('Message is too short (minimum 10 characters)')
    }

    if (trimmedMessage.length > 5000) {
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
          type,
          status: 'new',
          message: trimmedMessage,
          user_agent: normalizedUserAgent,
          metadata: { source: 'support-form' }
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

    // Format timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'full',
      timeStyle: 'long'
    })

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
              border-bottom: 2px solid #cfde67;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #cfde67;
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
              border-left: 3px solid #cfde67;
            }
            .message-box {
              padding: 20px;
              background: #f0f8ff;
              border-radius: 6px;
              border-left: 4px solid #cfde67;
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
              border-left: 4px solid #ffc107;
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
    const internalEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BitMinded Support <support@bitminded.ch>',
        to: 'support@bitminded.ch',
        reply_to: email,
        subject: `[Support:${ticketCode}] ${safeName}`,
        html: emailHtml
      })
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
              color: #6366f1;
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
              background: rgba(99,102,241,0.12);
              color: #4338ca;
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
              border-left: 4px solid #6366f1;
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
          updated_at: ticketRecord.updated_at
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

