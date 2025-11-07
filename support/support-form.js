// Support request form integration with Supabase edge function
// Uses Resend for professional email delivery

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('support-request-form');
    if (!form) {
        console.error('Support form element missing.');
        return;
    }

    const statusDiv = document.getElementById('support-form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const nameInput = document.getElementById('support-name');
    const emailInput = document.getElementById('support-email');
    const typeSelect = document.getElementById('support-type');
    const messageInput = document.getElementById('support-message');
    if (!submitButton || !nameInput || !emailInput || !typeSelect || !messageInput) {
        console.error('Support form inputs missing.');
        return;
    }
    const quickPrefillButtons = document.querySelectorAll('.support-card__link--prefill');

    const translate = (key, fallback) => {
        if (window.i18next?.t) {
            const translated = window.i18next.t(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return fallback;
    };

    submitButton.textContent = translate('support-submit-label', submitButton.textContent ?? 'Send support request');

    // Check if user is logged in and pre-fill email
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        
        if (user && user.email) {
            emailInput.value = user.email;
            emailInput.disabled = true;
            emailInput.classList.add('support-form__input--locked');
            form.dataset.userId = user.id;
            console.log('✅ Auto-filled email for logged-in user:', user.email);
        }
    } catch (error) {
        console.log('User not logged in, email field remains editable');
    }

    // Prefill support type + focus form from quick help cards
    if (quickPrefillButtons?.length) {
        quickPrefillButtons.forEach(button => {
            button.addEventListener('click', () => {
                const { prefill } = button.dataset;
                if (prefill && typeSelect) {
                    typeSelect.value = prefill;
                }
                document.getElementById('support-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                nameInput?.focus({ preventScroll: true });
            });
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!submitButton) {
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = translate('support-submit-sending', 'Sending...');
        statusDiv.textContent = '';
        statusDiv.className = 'support-form__status';

        const formData = {
            name: nameInput?.value.trim() ?? '',
            email: emailInput?.value.trim() ?? '',
            type: typeSelect?.value ?? 'general',
            message: messageInput?.value.trim() ?? '',
            userId: form.dataset.userId || null,
            userAgent: navigator.userAgent
        };

        const validationErrors = [];

        if (!formData.name) {
            validationErrors.push(translate('support-error-missing-name', 'Name is required'));
        }
        if (!formData.email) {
            validationErrors.push(translate('support-error-missing-email', 'Email is required'));
        }
        if (!formData.message || formData.message.length < 10) {
            validationErrors.push(translate('support-error-message-length', 'Message must be at least 10 characters'));
        }

        if (validationErrors.length) {
            showError(validationErrors.join(' · '));
            resetButton();
            return;
        }

        try {
            // Call Supabase edge function
            const response = await fetch(
                'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/send-support-request',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                const ticketId = (result.ticket && (result.ticket.code || result.ticket.ticket_code)) || result.ticketId || '';
                const successTemplate = translate('support-status-success', 'Support request submitted! Ticket {{ticketId}} created. Check your email for confirmation.');
                const successMessage = ticketId
                    ? successTemplate.replace('{{ticketId}}', ticketId)
                    : successTemplate.replace('{{ticketId}}', '#');
                showSuccess(successMessage);
                const lockedEmail = emailInput.disabled ? emailInput.value : '';
                form.reset();
                if (emailInput.disabled && lockedEmail) {
                    emailInput.value = lockedEmail;
                }
            } else {
                showError(result.error || translate('support-status-error', 'Failed to send message. Please try again.'));
            }
        } catch (error) {
            console.error('Support form error:', error);
            showError(translate('support-status-error', 'Failed to send message. Please check your connection and try again.'));
        } finally {
            resetButton();
        }
    });

    function showSuccess(message) {
        statusDiv.textContent = message;
        statusDiv.className = 'support-form__status support-form__status--success';
    }

    function showError(message) {
        statusDiv.textContent = message;
        statusDiv.className = 'support-form__status support-form__status--error';
    }

    function resetButton() {
        submitButton.disabled = false;
        submitButton.textContent = translate('support-submit-label', 'Send support request');
    }

    window.addEventListener('languageChanged', () => {
        if (!submitButton.disabled) {
            submitButton.textContent = translate('support-submit-label', 'Send support request');
        }
    });
});
