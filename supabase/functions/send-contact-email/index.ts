import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

/**
 * Send Contact Form Email
 * 
 * Handles contact form submissions and sends emails via Resend
 * Replaces EmailJS for better consistency and server-side processing
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
    const { name, email, message } = await req.json()

    // Validate input
    if (!name || !email || !message) {
      throw new Error('Missing required fields: name, email, and message are required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate message length
    if (message.length < 10) {
      throw new Error('Message is too short (minimum 10 characters)')
    }

    if (message.length > 5000) {
      throw new Error('Message is too long (maximum 5000 characters)')
    }

    console.log(`📧 Contact form submission from: ${email}`)

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not set')
      throw new Error('Email service not configured')
    }

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
              <div class="tagline">Contact Form Submission</div>
            </div>
            
            <div class="content">
              <h2 style="margin-top: 0; color: #333;">New Contact Message</h2>
              
              <div class="field">
                <div class="field-label">From</div>
                <div class="field-value">
                  <strong>${name}</strong><br>
                  <a href="mailto:${email}" style="color: #cfde67; text-decoration: none;">${email}</a>
                </div>
              </div>
              
              <div class="field">
                <div class="field-label">Received</div>
                <div class="field-value">${timestamp}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Message</div>
                <div class="message-box">${message}</div>
              </div>
              
              <div class="reply-to">
                <strong>💡 To Reply:</strong> Simply reply to this email to respond directly to ${email}
              </div>
            </div>
            
            <div class="footer">
              <p>This message was sent via the BitMinded contact form</p>
              <p>© 2024 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BitMinded Contact Form <contact@bitminded.ch>',
        to: 'support@bitminded.ch', // Your email to receive contact form submissions
        reply_to: email, // User's email as reply-to
        subject: `Contact Form: ${name}`,
        html: emailHtml
      })
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('❌ Resend API error:', emailResult)
      throw new Error(`Failed to send email: ${emailResult.message || 'Unknown error'}`)
    }

    console.log('✅ Contact email sent successfully via Resend')
    console.log('📬 Email ID:', emailResult.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Contact email sent successfully',
        emailId: emailResult.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error sending contact email:', error)
    
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

