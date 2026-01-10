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

/**
 * Helper function to invoke Edge Functions with automatic session refresh
 * Ensures fresh tokens are used and retries on 401 errors
 * 
 * @param {string} functionName - Name of the Edge Function to invoke
 * @param {object} options - Options object (body, headers, etc.)
 * @returns {Promise<any>} - Response data from the Edge Function
 */
window.invokeEdgeFunction = async function(functionName, options = {}) {
    if (!window.supabase) {
        throw new Error('Supabase client not available');
    }

    // Get fresh session - this triggers auto-refresh if token is expired/expiring
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    
    if (sessionError || !session) {
        throw new Error('Not authenticated. Please log in again.');
    }

    // Ensure Authorization header is set with fresh token
    const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        ...(options.headers || {})
    };

    // Call the function with fresh token
    const { data, error } = await window.supabase.functions.invoke(functionName, {
        ...options,
        headers
    });

    if (error) {
        // Log error details for debugging
        console.error(`❌ Edge Function ${functionName} error:`, error);
        window.logger?.error(`❌ Edge Function ${functionName} error:`, {
            message: error.message,
            status: error.status,
            context: error.context,
            name: error.name,
            stack: error.stack
        });
        
        // Try to extract error message from Response object
        let errorMessage = error.message || 'Unknown error occurred';
        if (error.context) {
            try {
                // If context is a Response object, read it
                if (error.context instanceof Response || (error.context && typeof error.context.text === 'function')) {
                    const errorText = await error.context.clone().text();
                    console.error(`📄 Error response body:`, errorText);
                    window.logger?.error(`📄 Error response body:`, errorText);
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.error || errorJson.message || errorMessage;
                    } catch (e) {
                        // If not JSON, use the text as error message
                        errorMessage = errorText || errorMessage;
                    }
                } else if (typeof error.context === 'object') {
                    // If context is an object, check for error/message
                    errorMessage = error.context.error || error.context.message || errorMessage;
                }
            } catch (e) {
                console.error(`❌ Could not read error response:`, e);
                window.logger?.error(`❌ Could not read error response:`, e);
            }
        }
        
        // Check if data contains error response (sometimes error response is in data)
        if (data && data.error) {
            errorMessage = data.error;
        }
        
        // If we get a 401, try refreshing once more
        if (error.status === 401 || error.message?.includes('401') || errorMessage?.includes('401')) {
            window.logger?.log('🔄 Got 401, refreshing session and retrying...');
            const { data: { session: refreshedSession }, error: refreshError } = await window.supabase.auth.getSession();
            
            if (refreshError || !refreshedSession) {
                throw new Error('Session expired. Please log in again.');
            }

            // Retry with refreshed token
            const retryHeaders = {
                'Authorization': `Bearer ${refreshedSession.access_token}`,
                ...(options.headers || {})
            };

            const { data: retryData, error: retryError } = await window.supabase.functions.invoke(functionName, {
                ...options,
                headers: retryHeaders
            });

            if (retryError) {
                // Try to extract error from retry response
                let retryErrorMessage = retryError.message || 'Unknown error occurred';
                if (retryError.context && retryError.context instanceof Response) {
                    try {
                        const retryErrorText = await retryError.context.clone().text();
                        try {
                            const retryErrorJson = JSON.parse(retryErrorText);
                            retryErrorMessage = retryErrorJson.error || retryErrorJson.message || retryErrorMessage;
                        } catch (e) {
                            retryErrorMessage = retryErrorText || retryErrorMessage;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
                const enhancedError = new Error(retryErrorMessage);
                enhancedError.status = retryError.status;
                enhancedError.context = retryError.context || retryData;
                throw enhancedError;
            }

            return retryData;
        }
        
        // Create enhanced error with extracted message
        const enhancedError = new Error(errorMessage);
        enhancedError.status = error.status;
        enhancedError.context = error.context || data;
        throw enhancedError;
    }

    return data;
};

// Supabase connected silently (reduce console noise)
