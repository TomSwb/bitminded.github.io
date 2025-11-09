(function initCatalogNewsletter() {
  if (window.catalogNewsletterInitialized) {
    return;
  }

  window.catalogNewsletterInitialized = true;

  const STATUS_KEYS = {
    idle: '',
    joining: 'catalog-newsletter-status-joining',
    success: 'catalog-newsletter-status-success',
    duplicate: 'catalog-newsletter-status-duplicate',
    invalid: 'catalog-newsletter-status-invalid',
    error: 'catalog-newsletter-status-error'
  };

  const STATUS_FALLBACKS = {
    [STATUS_KEYS.joining]: 'Adding you to the release list…',
    [STATUS_KEYS.success]: 'You’re on the list! We’ll keep you posted.',
    [STATUS_KEYS.duplicate]: 'Looks like you’re already subscribed.',
    [STATUS_KEYS.invalid]: 'Please enter a valid email address.',
    [STATUS_KEYS.error]: 'Something went wrong. Please try again in a moment.'
  };

  let lastStatusKey = STATUS_KEYS.idle;

  function translate(key, fallback) {
    if (typeof i18next !== 'undefined' && i18next.t) {
      const result = i18next.t(key, { defaultValue: fallback });
      if (result && result !== key) {
        return result;
      }
    }
    return fallback;
  }

  function updateStatus(statusEl, key) {
    lastStatusKey = key;
    if (!statusEl) return;

    if (key === STATUS_KEYS.idle) {
      statusEl.textContent = '';
      statusEl.removeAttribute('data-status');
      return;
    }

    const message = translate(key, STATUS_FALLBACKS[key] || '');
    statusEl.textContent = message;
    statusEl.setAttribute('data-status', key === STATUS_KEYS.success ? 'success' : key);
  }

  function validateEmail(value) {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function getPreferredLanguage() {
    if (typeof i18next !== 'undefined' && i18next.language) {
      return i18next.language;
    }
    return localStorage.getItem('language') || 'en';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('catalog-newsletter-form');
    if (!form) {
      return;
    }

    const emailInput = document.getElementById('catalog-newsletter-email');
    const submitButton = form.querySelector('.catalog-newsletter__submit');
    const statusEl = document.getElementById('catalog-newsletter-status');

    function setBusy(isBusy) {
      if (!submitButton || !emailInput) return;
      submitButton.disabled = isBusy;
      emailInput.disabled = isBusy;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!window.supabase) {
        updateStatus(statusEl, STATUS_KEYS.error);
        return;
      }

      const email = (emailInput?.value || '').trim();
      if (!validateEmail(email)) {
        updateStatus(statusEl, STATUS_KEYS.invalid);
        return;
      }

      updateStatus(statusEl, STATUS_KEYS.joining);
      setBusy(true);

      try {
        const { error } = await window.supabase
          .from('catalog_release_subscribers')
          .insert({
            email,
            language: getPreferredLanguage(),
            source: 'catalog_page'
          });

        if (error) {
          if (error.code === '23505') {
            updateStatus(statusEl, STATUS_KEYS.duplicate);
          } else {
            console.error('Catalog newsletter subscription error:', error);
            updateStatus(statusEl, STATUS_KEYS.error);
          }
        } else {
          updateStatus(statusEl, STATUS_KEYS.success);
          form.reset();
        }
      } catch (err) {
        console.error('Catalog newsletter subscription error:', err);
        updateStatus(statusEl, STATUS_KEYS.error);
      } finally {
        setBusy(false);
      }
    });

    window.addEventListener('languageChanged', () => {
      if (lastStatusKey && lastStatusKey !== STATUS_KEYS.idle) {
        updateStatus(statusEl, lastStatusKey);
      }
    });
  });
})();

