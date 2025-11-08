// Support request form integration with Supabase edge function
// Uses Resend for professional email delivery

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('support-request-form');
    if (!form) {
        console.error('Support form element missing.');
        return;
    }

    const formSection = document.getElementById('support-form');
    const statusDiv = document.getElementById('support-form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const nameInput = document.getElementById('support-name');
    const emailInput = document.getElementById('support-email');
    const typeSelect = document.getElementById('support-type');
    const messageInput = document.getElementById('support-message');
    const dropzone = document.getElementById('support-dropzone');
    const attachmentsInput = document.getElementById('support-attachments-input');
    const attachmentsList = document.getElementById('support-attachments-list');
    if (!submitButton || !nameInput || !emailInput || !typeSelect || !messageInput) {
        console.error('Support form inputs missing.');
        return;
    }
    const quickPrefillButtons = document.querySelectorAll('.support-card__link--prefill');
    const supportCards = document.querySelectorAll('.support-card');
    const attachments = [];
    supportCards.forEach(card => {
        const type = card.dataset.supportType;
        card.addEventListener('click', (event) => {
            // ignore clicks on actual anchors/buttons inside the card (they keep existing behaviour)
            if (event.target.closest('a, button')) {
                return;
            }
            if (typeSelect && type) {
                typeSelect.value = type;
            }
            if (type === 'bug') {
                if (formSection.classList.contains('support-form-section--hidden')) {
                    revealFormSection({ scroll: true });
                    nameInput?.focus({ preventScroll: true });
                } else {
                    formSection.classList.add('support-form-section--hidden');
                }
            }
        });
    });

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

    const bytesToReadable = (bytes) => {
        if (!Number.isFinite(bytes)) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
            value /= 1024;
            unit += 1;
        }
        return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
    };

    const renderAttachments = () => {
        if (!attachmentsList) return;
        attachmentsList.innerHTML = '';
        attachments.forEach((attachment, index) => {
            const item = document.createElement('li');
            item.className = 'support-form__attachment';
            item.innerHTML = `
                <div class="support-form__attachment-meta">
                    <span class="support-form__attachment-name">${attachment.name}</span>
                    <span class="support-form__attachment-size">${bytesToReadable(attachment.size)}</span>
                </div>
                <button type="button" class="support-form__attachment-remove" aria-label="Remove attachment">&times;</button>
            `;
            item.querySelector('button').addEventListener('click', () => {
                attachments.splice(index, 1);
                renderAttachments();
            });
            attachmentsList.appendChild(item);
        });
    };

    const addFiles = (fileList) => {
        const maxFiles = 5;
        const maxSize = 5 * 1024 * 1024; // 5 MB
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/log'];

        const files = Array.from(fileList || []);
        for (const file of files) {
            if (attachments.length >= maxFiles) {
                showError(translate('support-error-attachments-limit', 'Maximum of 5 attachments allowed.'));
                break;
            }
            if (file.size > maxSize) {
                showError(translate('support-error-attachment-size', 'Each attachment must be 5 MB or smaller.'));
                continue;
            }
            if (!allowedTypes.includes(file.type)) {
                showError(translate('support-error-attachment-type', 'Unsupported file type.'));
                continue;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                attachments.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: event.target.result
                });
                renderAttachments();
            };
            reader.readAsDataURL(file);
        }
    };

    renderAttachments();

    if (dropzone && attachmentsInput) {
        dropzone.addEventListener('click', () => attachmentsInput.click());

        dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropzone.classList.remove('dragover');
            if (event.dataTransfer?.files?.length) {
                addFiles(event.dataTransfer.files);
            }
        });

        dropzone.addEventListener('paste', (event) => {
            const clipboardFiles = event.clipboardData?.files;
            if (clipboardFiles?.length) {
                addFiles(clipboardFiles);
            }
        });

        attachmentsInput.addEventListener('change', (event) => {
            if (event.target.files?.length) {
                addFiles(event.target.files);
                attachmentsInput.value = '';
            }
        });
    }

    const revealFormSection = ({ scroll = true } = {}) => {
        if (!formSection) {
            return;
        }
        const wasHidden = formSection.classList.contains('support-form-section--hidden');
        formSection.classList.remove('support-form-section--hidden');
        if (scroll && wasHidden) {
            formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (window.location.hash === '#support-form') {
        revealFormSection({ scroll: false });
    }

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

                if (prefill === 'bug') {
                    revealFormSection({ scroll: true });
                    nameInput?.focus({ preventScroll: true });
                }
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
            userAgent: navigator.userAgent,
            attachments: attachments.map(({ name, type, size, dataUrl }) => ({ name, type, size, dataUrl }))
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
        if (attachments.length > 5) {
            validationErrors.push(translate('support-error-attachments-limit', 'Maximum of 5 attachments allowed.'));
        }

        if (validationErrors.length) {
            showError(validationErrors.join(' · '));
            resetButton();
            return;
        }

        try {
            // Call Supabase edge function
            const supabaseUrl = window.SUPABASE_CONFIG?.url;
            if (!supabaseUrl) {
                throw new Error('Missing Supabase configuration');
            }

            const response = await fetch(
                `${supabaseUrl}/functions/v1/send-support-request`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'apikey': SUPABASE_CONFIG.anonKey,
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
                attachments.length = 0;
                renderAttachments();
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
