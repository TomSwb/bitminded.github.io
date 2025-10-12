import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Send Notification Email Edge Function
 * 
 * Checks user preferences and sends email notifications
 * Supports: Security alerts, Account updates, Product updates, Marketing
 */

// Shared email styles matching BitMinded brand
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
  .button-container {
    text-align: center;
    margin: 20px 0;
  }
  .button {
    display: inline-block;
    background: #cfde67;
    color: #272b2e;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
  }
  .button:hover {
    background: #d286bd;
    color: white;
  }
  .highlight {
    background: #fff3cd;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #ffc107;
    margin: 20px 0;
  }
  .info-box {
    background: #f0f8ff;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #cfde67;
    margin: 20px 0;
  }
  .success-box {
    background: #d1fae5;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #10b981;
    margin: 20px 0;
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

// Email templates with BitMinded styling
const EMAIL_TEMPLATES = {
  password_changed: {
    subject: 'Password Changed - BitMinded',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded</div>
              <div class="tagline">Professional Digital Solutions</div>
            </div>
            <div class="content">
              <h2>🔒 Password Changed</h2>
              <p>Your password was successfully changed on <strong>${new Date().toLocaleString()}</strong>.</p>
              <div class="info-box">
                <strong>Change Details:</strong><br>
                📱 Device: ${data.device || 'Unknown device'}<br>
                🌍 Location: ${data.location || 'Unknown location'}
              </div>
              <div class="highlight">
                <strong>⚠️ Security Notice:</strong> If you didn't make this change, please reset your password immediately and contact our support team.
              </div>
              <div class="button-container">
                <a href="${data.resetUrl || 'https://bitminded.github.io/auth'}" class="button">Reset Password</a>
              </div>
            </div>
            <div class="footer">
              <p>This is a security notification from BitMinded<br>
              <a href="${data.preferencesUrl || 'https://bitminded.github.io/account?section=notifications'}">Manage notification preferences</a></p>
              <p>© 2024 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  email_changed: {
    subject: 'Email Address Changed - BitMinded',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded</div>
              <div class="tagline">Professional Digital Solutions</div>
            </div>
            <div class="content">
              <h2>📧 Email Address Changed</h2>
              <p>Your email address was changed on <strong>${new Date().toLocaleString()}</strong>.</p>
              <div class="info-box">
                <strong>Change Details:</strong><br>
                Previous: ${data.oldEmail || 'N/A'}<br>
                New: ${data.newEmail || 'N/A'}
              </div>
              <div class="highlight">
                <strong>⚠️ Important:</strong> If you didn't make this change, your account may be compromised. Please contact support immediately.
              </div>
            </div>
            <div class="footer">
              <p>This is a security notification from BitMinded<br>
              <a href="${data.preferencesUrl || 'https://bitminded.github.io/account?section=notifications'}">Manage notification preferences</a></p>
              <p>© 2024 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  two_fa_enabled: {
    subject: 'Two-Factor Authentication Enabled - BitMinded',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded</div>
              <div class="tagline">Professional Digital Solutions</div>
            </div>
            <div class="content">
              <h2>🛡️ Two-Factor Authentication Enabled</h2>
              <div class="success-box">
                <strong>✅ Great job!</strong> Your account is now more secure with two-factor authentication enabled.
              </div>
              <p>Two-factor authentication was enabled on <strong>${new Date().toLocaleString()}</strong>.</p>
              <p>From now on, you'll need your authentication app to log in. Make sure to keep your backup codes safe!</p>
              <div class="info-box">
                <strong>What this means:</strong>
                <ul style="margin: 10px 0;">
                  <li>Your account is significantly more secure</li>
                  <li>You'll need your authenticator app to sign in</li>
                  <li>Keep your backup codes in a safe place</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>This is a security notification from BitMinded<br>
              <a href="${data.preferencesUrl || 'https://bitminded.github.io/account?section=notifications'}">Manage notification preferences</a></p>
              <p>© 2024 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  two_fa_disabled: {
    subject: 'Two-Factor Authentication Disabled - BitMinded',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded</div>
              <div class="tagline">Professional Digital Solutions</div>
            </div>
            <div class="content">
              <h2>⚠️ Two-Factor Authentication Disabled</h2>
              <div class="highlight">
                <strong>Security Alert:</strong> Two-factor authentication was disabled on your account.
              </div>
              <p>2FA was disabled on <strong>${new Date().toLocaleString()}</strong>.</p>
              <p>Your account is now less secure. We strongly recommend re-enabling 2FA to protect your account from unauthorized access.</p>
              <div class="button-container">
                <a href="${data.securityUrl || 'https://bitminded.github.io/account?section=security'}" class="button">Re-enable 2FA</a>
              </div>
            </div>
            <div class="footer">
              <p>This is a security notification from BitMinded<br>
              <a href="${data.preferencesUrl || 'https://bitminded.github.io/account?section=notifications'}">Manage notification preferences</a></p>
              <p>© 2024 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  new_login: {
    subject: 'New Login Detected - BitMinded',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded</div>
              <div class="tagline">Professional Digital Solutions</div>
            </div>
            <div class="content">
              <h2>🔐 New Login Detected</h2>
              <p>We detected a new login to your account on <strong>${new Date().toLocaleString()}</strong>.</p>
              <div class="info-box">
                <strong>Login Details:</strong><br>
                📱 Device: ${data.device || 'Unknown device'}<br>
                🌍 Location: ${data.location || 'Unknown location'}<br>
                🌐 IP Address: ${data.ip || 'Unknown IP'}<br>
                🖥️ Browser: ${data.browser || 'Unknown browser'}
              </div>
              <p>If this was you, you can safely ignore this email.</p>
              <div class="highlight">
                <strong>⚠️ If you don't recognize this activity,</strong> please secure your account immediately.
              </div>
              <div class="button-container">
                <a href="${data.securityUrl || 'https://bitminded.github.io/account?section=security'}" class="button">Secure My Account</a>
              </div>
            </div>
            <div class="footer">
              <p>This is a security notification from BitMinded<br>
              <a href="${data.preferencesUrl || 'https://bitminded.github.io/account?section=notifications'}">Manage notification preferences</a></p>
              <p>© 2024 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  },
  
  username_changed: {
    subject: 'Username Updated - BitMinded',
    html: (data: any) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${EMAIL_STYLES}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">BitMinded</div>
              <div class="tagline">Professional Digital Solutions</div>
            </div>
            <div class="content">
              <h2>👤 Username Updated</h2>
              <p>Your username was successfully changed on <strong>${new Date().toLocaleString()}</strong>.</p>
              <div class="info-box">
                <strong>Change Details:</strong><br>
                Previous username: ${data.oldUsername || 'N/A'}<br>
                New username: ${data.newUsername || 'N/A'}
              </div>
              <p>If you didn't make this change, please contact our support team immediately.</p>
            </div>
            <div class="footer">
              <p>This is an account notification from BitMinded<br>
              <a href="${data.preferencesUrl || 'https://bitminded.github.io/account?section=notifications'}">Manage notification preferences</a></p>
              <p>© 2024 BitMinded. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }
}

// Map notification types to specific preference keys
const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  password_changed: 'password_changed',
  two_fa_enabled: 'two_fa',
  two_fa_disabled: 'two_fa',
  new_login: 'new_login',
  email_changed: 'email_changed',
  username_changed: 'username_changed',
}

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
    const { userId, type, data = {} } = await req.json()

    if (!userId || !type) {
      throw new Error('Missing required parameters: userId and type')
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message}`)
    }

    // Get user's notification preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('notification_preferences')
      .eq('user_id', userId)
      .single()

    if (prefsError) {
      console.log('⚠️ No preferences found, using defaults')
    }

    // Check if this notification type should be sent
    const preferenceKey = NOTIFICATION_TYPE_MAP[type]
    
    if (!preferenceKey) {
      throw new Error(`Unknown notification type: ${type}`)
    }

    const emailPrefs = prefs?.notification_preferences?.email || {}
    const shouldSend = emailPrefs[preferenceKey] !== false

    if (!shouldSend) {
      console.log(`⏭️ User disabled ${preferenceKey} notifications, skipping email`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: `User disabled ${preferenceKey} notifications` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get email template
    const template = EMAIL_TEMPLATES[type as keyof typeof EMAIL_TEMPLATES]
    
    if (!template) {
      throw new Error(`No email template found for type: ${type}`)
    }

    // Prepare email data
    const emailData = {
      to: user.email,
      subject: template.subject,
      html: template.html(data)
    }

    console.log(`📧 Sending email to: ${user.email}`)
    console.log(`📝 Subject: ${template.subject}`)
    console.log(`✅ Notification type: ${type}`)

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('❌ RESEND_API_KEY not set')
      throw new Error('Email service not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BitMinded <notifications@resend.dev>',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      })
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('❌ Resend API error:', emailResult)
      throw new Error(`Failed to send email: ${emailResult.message || 'Unknown error'}`)
    }

    console.log('✅ Email sent successfully via Resend')
    console.log('📬 Email ID:', emailResult.id)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email notification sent',
        type,
        sentTo: user.email,
        emailId: emailResult.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error sending notification:', error)
    
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
