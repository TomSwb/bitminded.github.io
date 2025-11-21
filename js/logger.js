/**
 * Logger Utility
 * Environment-aware logging system
 * Disables console.log, console.warn, console.debug, console.info in production
 * Keeps console.error always active for production debugging
 */

(function() {
    'use strict';
    
    // Check if we're in development mode
    // Use window.ENV_CONFIG if available, otherwise default to false (production)
    const DEBUG = window.ENV_CONFIG?.isDevelopment ?? false;
    
    /**
     * Logger object that wraps console methods
     * Only logs in development mode (except error, which always logs)
     */
    const logger = {
        /**
         * Log message (only in development)
         * @param {...any} args - Arguments to log
         */
        log: function(...args) {
            if (DEBUG) {
                console.log(...args);
            }
        },
        
        /**
         * Log warning (only in development)
         * @param {...any} args - Arguments to log
         */
        warn: function(...args) {
            if (DEBUG) {
                console.warn(...args);
            }
        },
        
        /**
         * Log debug message (only in development)
         * @param {...any} args - Arguments to log
         */
        debug: function(...args) {
            if (DEBUG) {
                console.debug(...args);
            }
        },
        
        /**
         * Log info message (only in development)
         * @param {...any} args - Arguments to log
         */
        info: function(...args) {
            if (DEBUG) {
                console.info(...args);
            }
        },
        
        /**
         * Log error (always active, even in production)
         * @param {...any} args - Arguments to log
         */
        error: function(...args) {
            console.error(...args);
        },
        
        /**
         * Group console messages (only in development)
         * @param {...any} args - Arguments for group label
         */
        group: function(...args) {
            if (DEBUG) {
                console.group(...args);
            }
        },
        
        /**
         * Group collapsed console messages (only in development)
         * @param {...any} args - Arguments for group label
         */
        groupCollapsed: function(...args) {
            if (DEBUG) {
                console.groupCollapsed(...args);
            }
        },
        
        /**
         * End console group (only in development)
         */
        groupEnd: function() {
            if (DEBUG) {
                console.groupEnd();
            }
        },
        
        /**
         * Log table (only in development)
         * @param {...any} args - Arguments to log as table
         */
        table: function(...args) {
            if (DEBUG) {
                console.table(...args);
            }
        },
        
        /**
         * Log time start (only in development)
         * @param {string} label - Timer label
         */
        time: function(label) {
            if (DEBUG) {
                console.time(label);
            }
        },
        
        /**
         * Log time end (only in development)
         * @param {string} label - Timer label
         */
        timeEnd: function(label) {
            if (DEBUG) {
                console.timeEnd(label);
            }
        },
        
        /**
         * Clear console (only in development)
         */
        clear: function() {
            if (DEBUG) {
                console.clear();
            }
        },
        
        /**
         * Log trace (only in development)
         * @param {...any} args - Arguments to log
         */
        trace: function(...args) {
            if (DEBUG) {
                console.trace(...args);
            }
        },
        
        /**
         * Log assertion (only in development)
         * @param {boolean} condition - Assertion condition
         * @param {...any} args - Arguments to log if assertion fails
         */
        assert: function(condition, ...args) {
            if (DEBUG) {
                console.assert(condition, ...args);
            }
        }
    };
    
    // Export logger globally
    window.logger = logger;
    
    // Also support ES6 module export if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = logger;
    }
})();

