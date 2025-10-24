import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is admin
    const { data: adminCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { target_user_id, subject, body, signature_used, language_used, sender_email } = await req.json()

    // Validate required fields
    if (!target_user_id || !subject || !body || !sender_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: target_user_id, subject, body, and sender_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate sender email format
    const validSenders = ['legal@bitminded.ch', 'contact@bitminded.ch', 'support@bitminded.ch', 'noreply@bitminded.ch', 'dev@bitminded.ch']
    if (!validSenders.includes(sender_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid sender email. Must be one of: ' + validSenders.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify target user exists and get their email
    const { data: targetUser, error: targetUserError } = await supabaseClient
      .from('user_profiles')
      .select('id, username, email, language')
      .eq('id', target_user_id)
      .single()

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!targetUser.email) {
      return new Response(
        JSON.stringify({ error: 'Target user has no email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create email record in database (initially with 'sent' status)
    const { data: communication, error: communicationError } = await supabaseClient
      .from('user_communications')
      .insert({
        user_id: target_user_id,
        admin_id: user.id,
        type: 'email',
        subject: subject,
        body: body,
        signature_used: signature_used || null,
        language_used: language_used || targetUser.language || 'en',
        sender_email: sender_email,
        status: 'sent'
      })
      .select()
      .single()

    if (communicationError) {
      console.error('Database error:', communicationError)
      return new Response(
        JSON.stringify({ error: 'Failed to create email record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email via Resend
    try {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY not configured')
      }

      // Prepare email content with proper HTML styling
      const emailBody = `${body}\n\n${signature_used || 'Your BitMinded Team'}`
      
      // Shared email styles (matching official BitMinded email templates)
      const EMAIL_STYLES = `
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
        .message-body {
          font-size: 16px;
          line-height: 1.7;
          margin-bottom: 30px;
          white-space: pre-wrap;
        }
        .signature {
          border-top: 1px solid #eee;
          padding-top: 20px;
          font-size: 14px;
          color: #666;
          font-style: italic;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      `
      
      // Create styled HTML email matching BitMinded template
      const htmlEmail = `
        <!DOCTYPE html>
        <html lang="${language_used || 'en'}">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>${EMAIL_STYLES}</style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">BitMinded</div>
                <div class="tagline">Professional Digital Solutions</div>
              </div>
              <div class="content">
                <div class="message-body">${body.replace(/\n/g, '<br>')}</div>
                <div class="signature">${signature_used || 'Your BitMinded Team'}</div>
              </div>
              <div class="footer">
                <p>© 2024 BitMinded AG. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: sender_email,
          to: [targetUser.email],
          subject: subject,
          html: htmlEmail,
          text: emailBody,
        }),
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json()
        console.error('Resend API error:', errorData)
        
        // Update communication status to failed
        await supabaseClient
          .from('user_communications')
          .update({ status: 'failed' })
          .eq('id', communication.id)

        return new Response(
          JSON.stringify({ error: 'Failed to send email via Resend', details: errorData }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const emailData = await emailResponse.json()
      console.log('Email sent successfully:', emailData)

      // Update communication status to delivered
      await supabaseClient
        .from('user_communications')
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', communication.id)

    } catch (emailError) {
      console.error('Email sending error:', emailError)
      
      // Update communication status to failed
      await supabaseClient
        .from('user_communications')
        .update({ status: 'failed' })
        .eq('id', communication.id)

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log admin action
    const { error: logError } = await supabaseClient
      .from('admin_activity')
      .insert({
        admin_id: user.id,
        action: 'email_sent',
        details: `Sent email to user: ${targetUser.username}`,
        user_id: target_user_id
      })

    if (logError) {
      console.error('Failed to log admin action:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        communication_id: communication.id,
        message: 'Email sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
