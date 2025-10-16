/**
 * Environment Configuration
 * Automatically detects environment and configures Supabase accordingly
 */

(function() {
    // Detect environment based on hostname
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Environment detection
    const isDevelopment = hostname === 'localhost' || 
                         hostname === '127.0.0.1' || 
                         port === '5500' || 
                         port === '5501' ||
                         port === '8080';
    
    const isProduction = hostname === 'bitminded.ch' || 
                        hostname === 'www.bitminded.ch';
    
    const isStaging = hostname.includes('github.io') && !isProduction;
    
    // Supabase configuration per environment
    const SUPABASE_CONFIGS = {
        production: {
            url: 'https://dynxqnrkmjcvgzsugxtm.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bnhxbnJrbWpjdmd6c3VneHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjgzNDMsImV4cCI6MjA3NDE0NDM0M30.-HAyQJV9SjJa0DrT-n3dCkHR44BQrdMTP-8qX3SADDY'
        },
        development: {
            url: 'https://eygpejbljuqpxwwoawkn.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Z3BlamJsanVxcHh3d29hd2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MTYyMjgsImV4cCI6MjA3NjA5MjIyOH0.hOqcc6QX5lhsOIiN3snA-psoGuNP-MGeNVdE7yDVFi8'
        }
    };
    
    // Select configuration based on environment
    let config;
    if (isProduction) {
        config = SUPABASE_CONFIGS.production;
        console.log('🌐 Environment: PRODUCTION');
    } else if (isDevelopment) {
        config = SUPABASE_CONFIGS.development;
        console.log('💻 Environment: DEVELOPMENT');
    } else {
        // Fallback to production for staging/unknown
        config = SUPABASE_CONFIGS.production;
        console.log('🔄 Environment: STAGING (using production config)');
    }
    
    // Export configuration globally
    window.ENV_CONFIG = {
        isDevelopment,
        isProduction,
        isStaging,
        hostname,
        supabase: config
    };
    
    // Also export as SUPABASE_CONFIG for backward compatibility
    window.SUPABASE_CONFIG = config;
    
    console.log('✅ Environment config loaded:', {
        environment: isProduction ? 'production' : isDevelopment ? 'development' : 'staging',
        supabaseUrl: config.url
    });
    
    // Signal loading screen that environment config is ready
    // Use a small delay to ensure loading screen is initialized
    const setEnvReady = () => {
        if (window.loadingScreen) {
            window.loadingScreen.setReadyFlag('environment', true);
        } else {
            // If loading screen not ready yet, try again shortly
            setTimeout(setEnvReady, 50);
        }
    };
    setEnvReady();
})();

