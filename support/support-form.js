// Support request form integration with Supabase edge function
// Uses Resend for professional email delivery

document.addEventListener('DOMContentLoaded', async () => {
    const translate = (key, fallback) => {
        if (window.i18next?.t) {
            const translated = window.i18next.t(key);
            if (translated && translated !== key) {
                return translated;
            }
        }
        return fallback;
    };

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

    const languageRefreshers = [];

    const formsConfig = [
        {
            type: 'tech-help',
            sectionId: 'tech-help-form-section',
            formId: 'tech-help-form',
            statusId: 'tech-help-form-status',
            dropzoneId: 'tech-help-dropzone',
            attachmentsInputId: 'tech-help-attachments-input',
            attachmentsListId: 'tech-help-attachments-list',
            firstFieldSelector: '#tech-help-name',
            collectContext: ({ form, translate }) => {
                const topicSelect = form.querySelector('#tech-help-topic');
                const messageInput = form.querySelector('#tech-help-message');

                const topicValue = topicSelect?.value?.trim() ?? '';
                const topicLabel = topicSelect?.options?.[topicSelect.selectedIndex]?.textContent?.trim() ?? '';
                const message = messageInput?.value?.trim() ?? '';

                const errors = [];

                if (!topicValue) {
                    errors.push(translate('support-error-topic-required', 'Please choose a topic.'));
                }

                if (!message || message.length < 10) {
                    errors.push(translate('support-error-message-length', 'Message must be at least 10 characters'));
                }

                return {
                    message,
                    context: {
                        topic: topicValue,
                        topicLabel
                    },
                    errors
                };
            },
            onSuccess: ({ attachmentsController }) => {
                attachmentsController.clear();
            }
        },
        {
            type: 'bug',
            sectionId: 'bug-report-form-section',
            formId: 'bug-report-form',
            statusId: 'bug-form-status',
            dropzoneId: 'bug-dropzone',
            attachmentsInputId: 'bug-attachments-input',
            attachmentsListId: 'bug-attachments-list',
            firstFieldSelector: '#bug-name',
            collectContext: ({ form, translate, config }) => {
                const summaryInput = form.querySelector('#bug-summary');
                const deviceDetailsInput = form.querySelector('#bug-device-details');
                const notesInput = form.querySelector('#bug-notes');

                const summary = summaryInput?.value?.trim() ?? '';
                const deviceDetails = deviceDetailsInput?.value?.trim() ?? '';
                const notes = notesInput?.value?.trim() ?? '';
                const steps = config.stepsController ? config.stepsController.getSteps() : [];

                const formattedSteps = steps.map((step, index) => {
                    const template = translate('support-bug-step-label', `Step {{count}}`).replace('{{count}}', (index + 1).toString());
                    return `${template}: ${step}`;
                });

                const errors = [];

                if (!summary) {
                    errors.push(translate('support-error-summary-required', 'Issue summary is required.'));
                }

                if (!steps.length) {
                    errors.push(translate('support-error-steps-required', 'Add at least one step to reproduce.'));
                }

                if (!deviceDetails) {
                    errors.push(translate('support-error-device-required', 'Device details are required.'));
                }

                let message = summary;
                if (notes) {
                    message = `${summary}\n\n${translate('support-bug-notes-answer-label', 'Additional notes')}:\n${notes}`;
                }

                return {
                    message: message || summary,
                    context: {
                        summary,
                        steps: formattedSteps,
                        deviceDetails,
                        notes
                    },
                    errors
                };
            },
            extraSetup: ({ form, translate, config }) => {
                const stepsList = form.querySelector('#bug-steps-list');
                const addStepButton = document.getElementById('bug-add-step');

                if (!stepsList || !addStepButton) {
                    return;
                }

                const stepsController = initBugSteps({
                    listEl: stepsList,
                    addButton: addStepButton,
                    translate
                });

                config.stepsController = stepsController;

                languageRefreshers.push(() => {
                    stepsController.refreshLanguage();
                });
            },
            onSuccess: ({ attachmentsController, config }) => {
                attachmentsController.clear();
                config.stepsController?.reset();
            }
        },
        {
            type: 'account',
            sectionId: 'account-support-form-section',
            formId: 'account-support-form',
            statusId: 'account-form-status',
            dropzoneId: 'account-dropzone',
            attachmentsInputId: 'account-attachments-input',
            attachmentsListId: 'account-attachments-list',
            firstFieldSelector: '#account-name',
            collectContext: ({ form, translate }) => {
                const topicSelect = form.querySelector('#account-topic');
                const messageInput = form.querySelector('#account-message');

                const topicValue = topicSelect?.value?.trim() ?? '';
                const topicLabel = topicSelect?.options?.[topicSelect.selectedIndex]?.textContent?.trim() ?? '';
                const message = messageInput?.value?.trim() ?? '';

                const errors = [];

                if (!topicValue) {
                    errors.push(translate('support-error-topic-required', 'Please choose a topic.'));
                }

                if (!message || message.length < 10) {
                    errors.push(translate('support-error-message-length', 'Message must be at least 10 characters'));
                }

                return {
                    message,
                    context: {
                        topic: topicValue,
                        topicLabel
                    },
                    errors
                };
            },
            onSuccess: ({ attachmentsController }) => {
                attachmentsController.clear();
            }
        }
    ];

    const supportCards = document.querySelectorAll('.support-card');

    const formsByType = new Map();

    formsConfig.forEach((config) => {
        config.section = document.getElementById(config.sectionId);
        config.form = document.getElementById(config.formId);
        config.statusEl = document.getElementById(config.statusId);
        config.dropzone = document.getElementById(config.dropzoneId);
        config.attachmentsInput = document.getElementById(config.attachmentsInputId);
        config.attachmentsList = document.getElementById(config.attachmentsListId);
        config.firstField = config.firstFieldSelector ? document.querySelector(config.firstFieldSelector) : null;

        if (config.form) {
            config.submitButton = config.form.querySelector('button[type="submit"]');
            config.nameInput = config.form.querySelector('input[name="name"]');
            config.emailInput = config.form.querySelector('input[name="email"]');
            formsByType.set(config.type, config);
            setupForm(config);
        }
    });

    let supabaseUser = null;

    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user && user.email) {
            supabaseUser = user;
            formsConfig.forEach((config) => {
                if (!config.form || !config.emailInput) {
                    return;
                }
                config.emailInput.value = user.email;
                config.emailInput.disabled = true;
                config.emailInput.classList.add('support-form__input--locked');
                config.form.dataset.userId = user.id;
            });
        }
    } catch (error) {
        console.log('User not logged in, email fields remain editable');
    }

    const showSection = (type, { scroll = true } = {}) => {
        formsConfig.forEach((config) => {
            if (!config.section) {
                return;
            }
            const shouldShow = config.type === type;
            config.section.classList.toggle('support-form-section--hidden', !shouldShow);
            if (shouldShow && scroll) {
                config.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                window.requestAnimationFrame(() => {
                    config.firstField?.focus({ preventScroll: true });
                });
            }
        });
    };

    const hash = window.location.hash.replace('#', '');
    if (hash === 'bug' || hash === 'report-bug') {
        showSection('bug', { scroll: false });
    } else if (hash === 'account' || hash === 'account-support') {
        showSection('account', { scroll: false });
    } else {
        showSection('tech-help', { scroll: false });
    }

    supportCards.forEach((card) => {
        const type = card.dataset.supportType;
        card.addEventListener('click', (event) => {
            if (event.target.closest('a, button')) {
                return;
            }
            if (formsByType.has(type)) {
                showSection(type, { scroll: true });
            }
        });
    });

    const refreshDynamicTranslations = () => {
        formsConfig.forEach((config) => {
            if (config.submitButton && !config.submitButton.disabled) {
                config.submitButton.textContent = translate('support-submit-label', 'Send support request');
            }
        });
        languageRefreshers.forEach((fn) => fn());
    };

    window.addEventListener('languageChanged', () => {
        refreshDynamicTranslations();
    });

    document.addEventListener('supportTranslationsApplied', () => {
        refreshDynamicTranslations();
    });

    function setupForm(config) {
        const { form, statusEl, submitButton, nameInput, emailInput } = config;
        if (!form || !statusEl || !submitButton || !nameInput || !emailInput) {
            return;
        }

        const setStatus = (kind, message) => {
            statusEl.textContent = message ?? '';
            statusEl.className = 'support-form__status';
            if (!message) {
                return;
            }
            if (kind === 'success') {
                statusEl.classList.add('support-form__status--success');
            } else if (kind === 'error') {
                statusEl.classList.add('support-form__status--error');
            }
        };

        const attachmentsController = createAttachmentController({
            dropzone: config.dropzone,
            input: config.attachmentsInput,
            list: config.attachmentsList,
            translate,
            onError: (message) => setStatus('error', message)
        });

        config.attachmentsController = attachmentsController;

        if (typeof config.extraSetup === 'function') {
            config.extraSetup({ form, translate, config });
        }

        submitButton.textContent = translate('support-submit-label', submitButton.textContent ?? 'Send support request');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            submitButton.disabled = true;
            submitButton.textContent = translate('support-submit-sending', 'Sending...');
            setStatus(null, '');

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();

            const errors = [];

            if (!name) {
                errors.push(translate('support-error-missing-name', 'Name is required'));
            }

            if (!email) {
                errors.push(translate('support-error-missing-email', 'Email is required'));
            }

            const contextResult = config.collectContext
                ? config.collectContext({ form, translate, config })
                : { message: '', context: {}, errors: [] };

            if (contextResult?.errors?.length) {
                errors.push(...contextResult.errors);
            }

            const attachments = attachmentsController.getFiles();
            if (attachments.length > 5) {
                errors.push(translate('support-error-attachments-limit', 'Maximum of 5 attachments allowed.'));
            }

            if (errors.length) {
                setStatus('error', errors.join(' · '));
                resetSubmitButton(submitButton);
                return;
            }

            const requestBody = {
                name,
                email,
                type: config.type,
                message: contextResult.message ?? '',
                userId: form.dataset.userId || null,
                userAgent: navigator.userAgent,
                context: contextResult.context ?? {},
                attachments: attachments.map(({ name: fileName, type, size, dataUrl }) => ({
                    name: fileName,
                    type,
                    size,
                    dataUrl
                }))
            };

            try {
                const supabaseUrl = window.SUPABASE_CONFIG?.url;
                const supabaseKey = window.SUPABASE_CONFIG?.anonKey;
                if (!supabaseUrl || !supabaseKey) {
                    throw new Error('Missing Supabase configuration');
                }

                const response = await fetch(
                    `${supabaseUrl}/functions/v1/send-support-request`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${supabaseKey}`,
                            apikey: supabaseKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    }
                );

                const result = await response.json();

                if (response.ok && result.success) {
                    const ticketId = (result.ticket && (result.ticket.code || result.ticket.ticket_code)) || result.ticketId || '';
                    const successTemplate = translate('support-status-success', 'Support request submitted! Ticket {{ticketId}} is on its way—check your email for confirmation.');
                    const successMessage = ticketId
                        ? successTemplate.replace('{{ticketId}}', ticketId)
                        : successTemplate.replace('{{ticketId}}', '#');
                    setStatus('success', successMessage);

                    const lockedEmail = emailInput.disabled ? emailInput.value : '';
                    form.reset();
                    if (emailInput.disabled && lockedEmail) {
                        emailInput.value = lockedEmail;
                    }
                    if (supabaseUser?.email) {
                        form.dataset.userId = supabaseUser.id;
                    } else {
                        form.dataset.userId = '';
                    }
                    config.onSuccess?.({ form, attachmentsController, config });
                } else {
                    const errorMessage = result?.error || translate('support-status-error', 'Failed to send message. Please check your connection and try again.');
                    setStatus('error', errorMessage);
                }
            } catch (error) {
                console.error('Support form error:', error);
                setStatus('error', translate('support-status-error', 'Failed to send message. Please check your connection and try again.'));
            } finally {
                resetSubmitButton(submitButton);
            }
        });
    }

    function resetSubmitButton(button) {
        button.disabled = false;
        button.textContent = translate('support-submit-label', 'Send support request');
    }

    function createAttachmentController({ dropzone, input, list, translate, onError }) {
        const attachments = [];
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/log'];
        const maxFiles = 5;
        const maxSize = 5 * 1024 * 1024;

        const render = () => {
            if (!list) {
                return;
            }
            list.innerHTML = '';
            attachments.forEach((attachment, index) => {
                const item = document.createElement('li');
                item.className = 'support-form__attachment';

                const meta = document.createElement('div');
                meta.className = 'support-form__attachment-meta';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'support-form__attachment-name';
                nameSpan.textContent = attachment.name;

                const sizeSpan = document.createElement('span');
                sizeSpan.className = 'support-form__attachment-size';
                sizeSpan.textContent = bytesToReadable(attachment.size);

                meta.append(nameSpan, sizeSpan);

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'support-form__attachment-remove';
                removeButton.setAttribute('aria-label', 'Remove attachment');
                removeButton.textContent = '×';
                removeButton.addEventListener('click', () => {
                    attachments.splice(index, 1);
                    render();
                });

                item.append(meta, removeButton);
                list.appendChild(item);
            });
        };

        const addFiles = (fileList) => {
            const files = Array.from(fileList || []);
            for (const file of files) {
                if (attachments.length >= maxFiles) {
                    onError?.(translate('support-error-attachments-limit', 'Maximum of 5 attachments allowed.'));
                    break;
                }
                if (file.size > maxSize) {
                    onError?.(translate('support-error-attachment-size', 'Each attachment must be 5 MB or smaller.'));
                    continue;
                }
                if (!allowedTypes.includes(file.type)) {
                    onError?.(translate('support-error-attachment-type', 'Unsupported file type.'));
                    continue;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    attachments.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        dataUrl: event.target?.result ?? ''
                    });
                    render();
                };
                reader.readAsDataURL(file);
            }
        };

        render();

        if (dropzone && input) {
            dropzone.addEventListener('click', () => input.click());
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
            input.addEventListener('change', (event) => {
                if (event.target.files?.length) {
                    addFiles(event.target.files);
                    input.value = '';
                }
            });
        }

        return {
            getFiles: () => attachments.map((file) => ({ ...file })),
            clear: () => {
                attachments.length = 0;
                render();
            },
            render
        };
    }

    function initBugSteps({ listEl, addButton, translate }) {
        const createStep = (value = '') => {
            const item = document.createElement('li');
            item.className = 'support-bug-step';

            const header = document.createElement('div');
            header.className = 'support-bug-step__header';

            const label = document.createElement('span');
            label.dataset.stepLabel = 'true';

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'support-bug-step__remove';
            removeButton.dataset.stepRemove = 'true';

            removeButton.addEventListener('click', () => {
                if (listEl.children.length <= 1) {
                    return;
                }
                item.remove();
                refreshLanguage();
            });

            header.append(label, removeButton);

            const textarea = document.createElement('textarea');
            textarea.rows = 3;
            textarea.value = value;

            item.append(header, textarea);
            listEl.appendChild(item);
            refreshLanguage();
        };

        const refreshLanguage = () => {
            const items = Array.from(listEl.querySelectorAll('.support-bug-step'));
            items.forEach((item, index) => {
                const label = item.querySelector('[data-step-label]');
                const remove = item.querySelector('[data-step-remove]');
                const textarea = item.querySelector('textarea');

                const count = index + 1;
                if (label) {
                    label.textContent = translate('support-bug-step-label', `Step ${count}`).replace('{{count}}', count);
                }
                if (remove) {
                    remove.textContent = translate('support-bug-remove-step', 'Remove step');
                }
                if (textarea) {
                    textarea.placeholder = translate('support-bug-step-placeholder', 'Describe what happens in this step.');
                }
            });

            if (addButton) {
                addButton.textContent = translate('support-bug-add-step', 'Add another step');
            }
        };

        addButton?.addEventListener('click', () => {
            createStep('');
        });

        if (!listEl.children.length) {
            createStep('');
        } else {
            refreshLanguage();
        }

        return {
            getSteps: () => Array.from(listEl.querySelectorAll('textarea'))
                .map((textarea) => textarea.value.trim())
                .filter(Boolean),
            reset: () => {
                listEl.innerHTML = '';
                createStep('');
            },
            refreshLanguage
        };
    }
});
