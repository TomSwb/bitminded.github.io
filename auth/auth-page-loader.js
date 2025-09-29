/**
 * Auth Page Component Loader
 * Handles loading authentication components on the auth page
 */

class AuthPageLoader {
    constructor() {
        this.isInitialized = false;
        this.loadedComponents = new Map();
    }

    /**
     * Initialize the auth page loader
     */
    async init() {
        if (this.isInitialized) {
            console.log('Auth page loader already initialized');
            return;
        }


        try {
            // Load auth toggle first
            await this.loadAuthToggle();
            
            // Determine which form to show based on URL parameters or referrer
            const authAction = this.detectAuthAction();
            
            if (authAction === 'login') {
                await this.loadLoginForm();
            } else if (authAction === 'forgot-password') {
                await this.loadForgotPasswordForm();
            } else {
                // Default to signup form
                await this.loadSignupForm();
            }
            
            // Auth toggle will now handle its own initialization based on URL parameters
            // No need to manually sync since it reads the URL during initialization
            
            // Listen for form switch events
            this.bindFormSwitchEvents();
            
            this.isInitialized = true;
            console.log('✅ Auth page loader initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize auth page loader:', error);
        }
    }

    /**
     * Detect which auth action was clicked
     * @returns {string} 'login', 'signup', or 'forgot-password'
     */
    detectAuthAction() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action === 'login' || action === 'signup' || action === 'forgot-password') {
            return action;
        }

        // Check if we can detect from referrer (less reliable)
        if (document.referrer) {
            const referrer = new URL(document.referrer);
            if (referrer.pathname === '/' || referrer.pathname === '/index.html') {
                // If coming from home page, default to signup
                return 'signup';
            }
        }

        // Default to signup
        return 'signup';
    }

    /**
     * Load auth toggle component
     */
    async loadAuthToggle() {
        try {

            // Load HTML
            const htmlResponse = await fetch('components/auth-toggle/auth-toggle.html');
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load auth toggle HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/auth-toggle/auth-toggle.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load auth toggle CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();

            // Create and inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            styleElement.setAttribute('data-component', 'auth-toggle');
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('auth-toggle-container');
            if (container) {
                container.innerHTML = htmlContent;
            } else {
                throw new Error('Auth toggle container not found');
            }

            // Load JavaScript
            const scriptElement = document.createElement('script');
            scriptElement.src = 'components/auth-toggle/auth-toggle.js';
            scriptElement.setAttribute('data-component', 'auth-toggle');
            document.head.appendChild(scriptElement);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                scriptElement.onload = resolve;
                scriptElement.onerror = reject;
            });

            this.loadedComponents.set('auth-toggle', true);
            this.triggerLanguageChange();

        } catch (error) {
            console.error('❌ Failed to load auth toggle component:', error);
            throw error;
        }
    }

    /**
     * Load signup form component
     */
    async loadSignupForm() {
        try {
            console.log('🔄 Loading signup form component...');

            // Load HTML
            console.log('🔍 Fetching signup form HTML from: components/signup-form/signup-form.html');
            const htmlResponse = await fetch(`components/signup-form/signup-form.html?t=${Date.now()}`);
            console.log('🔍 HTML response status:', htmlResponse.status, htmlResponse.ok);
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load signup form HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/signup-form/signup-form.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load signup form CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();

            // Create and inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            styleElement.setAttribute('data-component', 'signup-form');
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('signup-form-container');
            if (container) {
                container.innerHTML = htmlContent;
                container.classList.remove('hidden');
                console.log('✅ Signup form HTML loaded');
            } else {
                throw new Error('Signup form container not found');
            }

            // Load JavaScript
            const scriptElement = document.createElement('script');
            scriptElement.src = 'components/signup-form/signup-form.js';
            scriptElement.setAttribute('data-component', 'signup-form');
            document.head.appendChild(scriptElement);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                scriptElement.onload = resolve;
                scriptElement.onerror = reject;
            });

            // Initialize the signup form after HTML is loaded
            if (window.signupForm && !window.signupForm.isInitialized) {
                await window.signupForm.init();
            }

            // Load terms checkbox component
            await this.loadTermsCheckbox();

            // Load CAPTCHA component for signup
            await this.loadCaptcha();

            // Show CAPTCHA container for signup
            const captchaContainer = document.getElementById('captcha-container');
            if (captchaContainer) {
                captchaContainer.classList.remove('hidden');
            }

            this.loadedComponents.set('signup-form', true);
            console.log('✅ Signup form component loaded successfully');
            
            // Trigger language change event for the loaded component
            this.triggerLanguageChange();

        } catch (error) {
            console.error('❌ Failed to load signup form component:', error);
            throw error;
        }
    }

    /**
     * Load terms checkbox component
     */
    async loadTermsCheckbox() {
        try {
            console.log('🔄 Loading terms checkbox component...');

            // Load HTML
            const htmlResponse = await fetch('components/signup-form/component/terms-checkbox.html');
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load terms checkbox HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/signup-form/component/terms-checkbox.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load terms checkbox CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();

            // Create and inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            styleElement.setAttribute('data-component', 'terms-checkbox');
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('terms-checkbox-container');
            if (container) {
                container.innerHTML = htmlContent;
                container.classList.remove('hidden');
                console.log('✅ Terms checkbox HTML loaded');
            } else {
                throw new Error('Terms checkbox container not found');
            }

            // Load JavaScript
            const scriptElement = document.createElement('script');
            scriptElement.src = 'components/signup-form/component/terms-checkbox.js';
            scriptElement.setAttribute('data-component', 'terms-checkbox');
            document.head.appendChild(scriptElement);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                scriptElement.onload = resolve;
                scriptElement.onerror = reject;
            });

            // Initialize the terms checkbox after HTML is loaded
            if (window.termsCheckbox && !window.termsCheckbox.isInitialized) {
                await window.termsCheckbox.init();
            }

            this.loadedComponents.set('terms-checkbox', true);
            console.log('✅ Terms checkbox component loaded successfully');

        } catch (error) {
            console.error('❌ Failed to load terms checkbox component:', error);
            throw error;
        }
    }

    /**
     * Load forgot password form component
     */
    async loadForgotPasswordForm() {
        try {
            console.log('🔄 Loading forgot password form component...');

            // Load HTML
            const htmlResponse = await fetch('components/forgot-password/forgot-password.html');
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load forgot password form HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/forgot-password/forgot-password.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load forgot password form CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();


            // Inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('forgot-password-form-container');
            if (container) {
                container.innerHTML = htmlContent;
                container.classList.remove('hidden');
            } else {
                throw new Error('Forgot password form container not found');
            }

            // Load JavaScript (only if not already loaded)
            const existingScript = document.querySelector('script[data-component="forgot-password-form"]');
            if (!existingScript) {
                const scriptElement = document.createElement('script');
                scriptElement.src = 'components/forgot-password/forgot-password.js';
                scriptElement.setAttribute('data-component', 'forgot-password-form');
                document.head.appendChild(scriptElement);

                // Wait for script to load
                await new Promise((resolve, reject) => {
                    scriptElement.onload = resolve;
                    scriptElement.onerror = reject;
                });
            }

            // Initialize the forgot password form after HTML is loaded
            if (window.forgotPasswordForm && !window.forgotPasswordForm.isInitialized) {
                await window.forgotPasswordForm.init();
            }

            // Mark as loaded
            this.loadedComponents.set('forgot-password-form', true);

            console.log('✅ Forgot password form component loaded successfully');
            
            // Trigger language change event for the loaded component
            this.triggerLanguageChange();
        } catch (error) {
            console.error('❌ Failed to load forgot password form component:', error);
            throw error;
        }
    }

    /**
     * Load login form component
     */
    async loadLoginForm() {
        try {
            console.log('🔄 Loading login form component...');

            // Load HTML
            const htmlResponse = await fetch('components/login-form/login-form.html');
            if (!htmlResponse.ok) {
                throw new Error(`Failed to load login form HTML: ${htmlResponse.status}`);
            }
            const htmlContent = await htmlResponse.text();

            // Load CSS
            const cssResponse = await fetch('components/login-form/login-form.css');
            if (!cssResponse.ok) {
                throw new Error(`Failed to load login form CSS: ${cssResponse.status}`);
            }
            const cssContent = await cssResponse.text();

            // Create and inject CSS
            const styleElement = document.createElement('style');
            styleElement.textContent = cssContent;
            styleElement.setAttribute('data-component', 'login-form');
            document.head.appendChild(styleElement);

            // Inject HTML into container
            const container = document.getElementById('login-form-container');
            if (container) {
                container.innerHTML = htmlContent;
                container.classList.remove('hidden');
                console.log('✅ Login form HTML loaded');
            } else {
                throw new Error('Login form container not found');
            }

            // Load JavaScript (only if not already loaded)
            const existingScript = document.querySelector('script[data-component="login-form"]');
            if (!existingScript) {
                const scriptElement = document.createElement('script');
                scriptElement.src = 'components/login-form/login-form.js';
                scriptElement.setAttribute('data-component', 'login-form');
                document.head.appendChild(scriptElement);

                // Wait for script to load
                await new Promise((resolve, reject) => {
                    scriptElement.onload = resolve;
                    scriptElement.onerror = reject;
                });
            }

            // Initialize the login form after HTML is loaded
            if (window.loginForm && !window.loginForm.isInitialized) {
                await window.loginForm.init();
            }

            this.loadedComponents.set('login-form', true);
            console.log('✅ Login form component loaded successfully');
            
            // Trigger language change event for the loaded component
            this.triggerLanguageChange();

        } catch (error) {
            console.error('❌ Failed to load login form component:', error);
            throw error;
        }
    }

    /**
     * Load CAPTCHA component
     */
    async loadCaptcha() {
        try {
            // Check if CAPTCHA is already loaded
            if (this.loadedComponents.has('captcha')) {
                console.log('🔄 CAPTCHA component already loaded, skipping...');
                return;
            }

            console.log('🔄 Loading CAPTCHA component...');

            // Initialize CAPTCHA component
            if (window.CaptchaComponent && !window.captcha) {
                window.captcha = new window.CaptchaComponent({
                    siteKey: '0x4AAAAAAB3ePnQXAhy39NwT',
                    theme: 'auto',
                    size: 'normal',
                    callback: (token) => {
                        console.log('✅ CAPTCHA verified:', token);
                    },
                    errorCallback: (error) => {
                        console.error('❌ CAPTCHA error:', error);
                    }
                });
                
                // Initialize the component
                if (window.captcha && !window.captcha.isInitialized) {
                    await window.captcha.init();
                }
            }

            this.loadedComponents.set('captcha', true);
            console.log('✅ CAPTCHA component loaded successfully');

        } catch (error) {
            console.error('❌ Failed to load CAPTCHA component:', error);
            throw error;
        }
    }

    /**
     * Trigger language change event for loaded components
     */
    triggerLanguageChange() {
        const currentLanguage = localStorage.getItem('language') || 'en';
        const languageChangedEvent = new CustomEvent('languageChanged', {
            detail: { language: currentLanguage }
        });
        window.dispatchEvent(languageChangedEvent);
    }

    /**
     * Switch to signup form
     */
    async showSignupForm() {
        // Hide login form
        const loginContainer = document.getElementById('login-form-container');
        if (loginContainer) {
            loginContainer.classList.add('hidden');
        }

        // Show signup form
        const signupContainer = document.getElementById('signup-form-container');
        if (signupContainer) {
            signupContainer.classList.remove('hidden');
            
            // Load signup form if not already loaded
            if (!this.loadedComponents.has('signup-form')) {
                await this.loadSignupForm();
            }
        }

        // Show terms checkbox
        const termsContainer = document.getElementById('terms-checkbox-container');
        if (termsContainer) {
            termsContainer.classList.remove('hidden');
            
            // Load terms checkbox if not already loaded
            if (!this.loadedComponents.has('terms-checkbox')) {
                await this.loadTermsCheckbox();
            }
        }

        // Show CAPTCHA for signup
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            captchaContainer.classList.remove('hidden');
            
            // Load CAPTCHA if not already loaded
            if (!this.loadedComponents.has('captcha')) {
                await this.loadCaptcha();
            }
        }

        // Update auth toggle state
        if (window.authToggle) {
            window.authToggle.setMode('signup');
            console.log('🔄 Auth toggle updated to signup mode');
        }
    }

    /**
     * Switch to login form
     */
    async showLoginForm() {
        // Hide signup form
        const signupContainer = document.getElementById('signup-form-container');
        if (signupContainer) {
            signupContainer.classList.add('hidden');
        }

        // Hide terms checkbox
        const termsContainer = document.getElementById('terms-checkbox-container');
        if (termsContainer) {
            termsContainer.classList.add('hidden');
        }

        // Check if CAPTCHA is needed for login (due to failed attempts)
        const captchaContainer = document.getElementById('captcha-container');
        if (captchaContainer) {
            // Only hide if login form doesn't require CAPTCHA
            if (window.loginForm && !window.loginForm.requiresCaptcha()) {
                captchaContainer.classList.add('hidden');
            } else if (window.loginForm && window.loginForm.requiresCaptcha()) {
                captchaContainer.classList.remove('hidden');
            }
        }

        // Show login form
        const loginContainer = document.getElementById('login-form-container');
        if (loginContainer) {
            loginContainer.classList.remove('hidden');
            
            // Load login form if not already loaded
            if (!this.loadedComponents.has('login-form')) {
                await this.loadLoginForm();
            }
        }

        // Update auth toggle state
        if (window.authToggle) {
            window.authToggle.setMode('login');
            console.log('🔄 Auth toggle updated to login mode');
        }
    }

    /**
     * Bind form switch event listeners
     */
    bindFormSwitchEvents() {
        window.addEventListener('authFormSwitch', async (e) => {
            const { form } = e.detail;
            console.log(`🔄 Switching to ${form} form`);
            
            try {
                if (form === 'login') {
                    await this.switchToLoginForm();
                } else if (form === 'signup') {
                    await this.switchToSignupForm();
                } else if (form === 'forgot-password') {
                    await this.switchToForgotPasswordForm();
                }
            } catch (error) {
                console.error(`❌ Failed to switch to ${form} form:`, error);
            }
        });
    }

    /**
     * Switch to login form
     */
    async switchToLoginForm() {
        // Hide other form containers
        const forgotPasswordContainer = document.getElementById('forgot-password-form-container');
        if (forgotPasswordContainer) {
            forgotPasswordContainer.classList.add('hidden');
        }

        // Load login form if not already loaded
        if (!this.loadedComponents.has('login-form')) {
            await this.loadLoginForm();
        } else {
            // If already loaded, just inject the HTML
            const htmlResponse = await fetch('components/login-form/login-form.html');
            if (htmlResponse.ok) {
                const htmlContent = await htmlResponse.text();
                const container = document.getElementById('login-form-container');
                if (container) {
                    container.innerHTML = htmlContent;
                    container.classList.remove('hidden');
                    
                    // Re-initialize the login form after HTML injection
                    if (window.loginForm) {
                        await window.loginForm.reinit();
                    }
                }
            }
        }

        // Update auth toggle state
        if (window.authToggle) {
            window.authToggle.setMode('login');
            console.log('🔄 Auth toggle updated to login mode');
        }
    }

    /**
     * Switch to signup form
     */
    async switchToSignupForm() {
        // Hide other form containers
        const forgotPasswordContainer = document.getElementById('forgot-password-form-container');
        if (forgotPasswordContainer) {
            forgotPasswordContainer.classList.add('hidden');
        }

        // Load signup form if not already loaded
        if (!this.loadedComponents.has('signup-form')) {
            await this.loadSignupForm();
        } else {
            // If already loaded, just inject the HTML
            const htmlResponse = await fetch('components/signup-form/signup-form.html');
            if (htmlResponse.ok) {
                const htmlContent = await htmlResponse.text();
                const container = document.getElementById('signup-form-container');
                if (container) {
                    container.innerHTML = htmlContent;
                    container.classList.remove('hidden');
                }
            }
        }

        // Update auth toggle state
        if (window.authToggle) {
            window.authToggle.setMode('signup');
            console.log('🔄 Auth toggle updated to signup mode');
        }
    }

    /**
     * Switch to forgot password form
     */
    async switchToForgotPasswordForm() {
        // Hide other form containers
        const loginContainer = document.getElementById('login-form-container');
        if (loginContainer) {
            loginContainer.classList.add('hidden');
        }
        const signupContainer = document.getElementById('signup-form-container');
        if (signupContainer) {
            signupContainer.classList.add('hidden');
        }

        // Load forgot password form if not already loaded
        if (!this.loadedComponents.has('forgot-password-form')) {
            await this.loadForgotPasswordForm();
        } else {
            // If already loaded, just inject the HTML
            const htmlResponse = await fetch('components/forgot-password/forgot-password.html');
            if (htmlResponse.ok) {
                const htmlContent = await htmlResponse.text();
                const container = document.getElementById('forgot-password-form-container');
                if (container) {
                    container.innerHTML = htmlContent;
                    container.classList.remove('hidden');
                    
                    // Re-initialize the forgot password form after HTML injection
                    if (window.forgotPasswordForm) {
                        await window.forgotPasswordForm.reinit();
                    }
                }
            }
        }

        // Update auth toggle state
        if (window.authToggle) {
            window.authToggle.setMode('forgot-password');
            console.log('🔄 Auth toggle updated to forgot-password mode');
        }
    }
}

// Create global instance
window.authPageLoader = new AuthPageLoader();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure other components are loaded
    setTimeout(() => {
        if (window.authPageLoader && !window.authPageLoader.isInitialized) {
            window.authPageLoader.init();
        }
    }, 200);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthPageLoader;
}
