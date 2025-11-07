(function() {
    const FooterComponent = {
        async init() {
            this.currentLanguage = localStorage.getItem('language') || 'en';
            this.i18n = null;

            await this.loadTranslations();
            this.attachListeners();
        },

        async ensureI18next() {
            if (typeof i18next !== 'undefined') {
                return;
            }

            const existingScript = document.querySelector('script[src*="i18next"]');
            if (existingScript) {
                await new Promise((resolve, reject) => {
                    existingScript.addEventListener('load', resolve, { once: true });
                    existingScript.addEventListener('error', reject, { once: true });
                });
                return;
            }

            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/i18next/25.5.2/i18next.min.js';
                script.async = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },

        async loadTranslations() {
            try {
                await this.ensureI18next();

                const response = await fetch('/components/site-footer/locales/site-footer-locales.json');
                const resources = await response.json();

                this.i18n = this.i18n || i18next.createInstance();

                await this.i18n.init({
                    lng: this.currentLanguage,
                    debug: false,
                    resources
                });

                this.updateTranslations();
            } catch (error) {
                console.error('Footer translations failed to load:', error);
                this.showFallback();
            }
        },

        updateTranslations() {
            if (!this.i18n) {
                this.showFallback();
                return;
            }

            const elements = document.querySelectorAll('#site-footer [data-translate]');
            elements.forEach(element => {
                const key = element.getAttribute('data-translate');
                const translation = this.i18n.t(key);
                if (translation && translation !== key) {
                    element.textContent = translation;
                }
                element.classList.add('loaded');
            });

        },

        showFallback() {
            const elements = document.querySelectorAll('#site-footer .translatable-content');
            elements.forEach(element => element.classList.add('loaded'));
        },

        attachListeners() {
            window.addEventListener('languageChanged', (event) => {
                const { detail } = event;
                if (!detail || !detail.language) {
                    return;
                }
                const newLanguage = detail.language;
                if (newLanguage === this.currentLanguage) {
                    return;
                }
                this.currentLanguage = newLanguage;
                if (this.i18n) {
                    this.i18n.changeLanguage(newLanguage).then(() => {
                        this.updateTranslations();
                    });
                }
            });
        }
    };

    window['site-footer'] = FooterComponent;
})();

