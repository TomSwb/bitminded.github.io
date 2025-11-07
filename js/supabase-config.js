/**
 * Supabase Client Configuration
 * Uses environment-aware configuration from env-config.js
 * Make sure env-config.js is loaded BEFORE this file!
 */

// Get configuration from environment config (set by env-config.js)
// Fallback to production config if env-config.js not loaded
const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {
    url: 'https://dynxqnrkmjcvgzsugxtm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bnhxbnJrbWpjdmd6c3VneHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNDMsImV4cCI6MjA3NDE0NDM0M30.-HAyQJV9SjJa0DrT-n3dCkHR44BQrdMTP-8qX3SADDY'
};

// Initialize Supabase client with optimized auth settings
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});

// Sync localStorage token to cookies for subdomain sharing
async function syncAuthToCookies() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.access_token) {
    // Set cookie with domain=.bitminded.ch for subdomain access
    const cookieDomain = window.location.hostname.includes('bitminded.ch') ? '.bitminded.ch' : '';
    document.cookie = `sb-access-token=${session.access_token}; domain=${cookieDomain}; path=/; secure; samesite=lax; max-age=${60 * 60 * 24 * 7}`; // 7 days
  }
}

// Listen for auth changes and sync to cookies
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session?.access_token) {
    syncAuthToCookies();
  } else if (event === 'SIGNED_OUT') {
    // Clear cookie on sign out
    const cookieDomain = window.location.hostname.includes('bitminded.ch') ? '.bitminded.ch' : '';
    document.cookie = `sb-access-token=; domain=${cookieDomain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
});

// Initial sync
syncAuthToCookies();

// Export for use in other scripts
window.supabase = supabaseClient;

// Supabase connected silently (reduce console noise)
