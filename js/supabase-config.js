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
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in other scripts
window.supabase = supabaseClient;

// Log which environment we're using
if (window.ENV_CONFIG) {
    console.log('🔗 Supabase connected:', window.ENV_CONFIG.isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
}
