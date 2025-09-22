// lang-loader.js - Loads locales and initializes translation system

// Load locales data
fetch('lang-2fa/locales-2fa.json')
    .then(response => response.json())
    .then(data => {
        window.locales2FA = data;
        // Load the language script after data is available
        const script = document.createElement('script');
        script.src = 'lang-2fa/lang-2fa.js';
        document.head.appendChild(script);
    })
    .catch(error => {
        console.error('Error loading locales:', error);
        // Fallback: create empty locales object
        window.locales2FA = { en: {}, fr: {} };
        const script = document.createElement('script');
        script.src = 'lang-2fa/lang-2fa.js';
        document.head.appendChild(script);
    });
