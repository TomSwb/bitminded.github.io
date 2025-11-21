/**
 * Support Tickets Component
 * Allows signed-in customers to review and update their support tickets
 */

if (typeof window.SupportTickets === 'undefined') {
class SupportTickets {
    constructor() {
        this.isInitialized = false;
        this.tickets = [];
        this.selectedTicketId = null;
        this.includeArchived = false;
        this.currentLanguage = localStorage.getItem('language') || 'en';
        this.translations = null;
        this.sessionToken = null;
        this.currentUserId = null;
        this.functionsUrl = null;
        this.elements = {};
    }

    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
            if (sessionError) {
                throw sessionError;
            }

            if (!session) {
                throw new Error('User session not found');
            }

            this.sessionToken = session.access_token;
            this.currentUserId = session.user?.id || null;

            await this.loadTranslations();
            this.initializeElements();
            this.showTranslatableContent();

            await this.loadTickets();

            window.addEventListener('languageChanged', (event) => {
                const language = event?.detail?.language || localStorage.getItem('language') || 'en';
                this.currentLanguage = language;
                this.showTranslatableContent();
                this.renderList();
                this.renderDetail();
            });

            if (this.elements.toggleArchived) {
                this.elements.toggleArchived.addEventListener('change', (event) => {
                    this.includeArchived = Boolean(event.target.checked);
                    this.renderList();
                    this.renderDetail();
                });
            }

            this.isInitialized = true;
        } catch (error) {
            window.logger?.error('❌ SupportTickets: failed to initialize', error);
            this.showError(this.translate('support-tickets-load-error', 'Failed to load your support tickets.'));
        }
    }

    initializeElements() {
        this.elements = {
            list: document.getElementById('support-tickets-list'),
            detail: document.getElementById('support-tickets-detail'),
            loading: document.getElementById('support-tickets-loading'),
            empty: document.getElementById('support-tickets-empty'),
            error: document.getElementById('support-tickets-error'),
            errorText: document.getElementById('support-tickets-error-text'),
            toggleArchived: document.getElementById('support-tickets-toggle-archived')
        };
    }

    async loadTranslations() {
        try {
            const response = await fetch('/account/components/support-tickets/locales/support-tickets-locales.json');
            if (!response.ok) {
                throw new Error(`Failed to load translations: ${response.status}`);
            }
            this.translations = await response.json();

            if (window.i18next && typeof window.i18next.addResourceBundle === 'function') {
                Object.keys(this.translations).forEach(lang => {
                    const bundle = this.translations[lang]?.translation;
                    if (bundle) {
                        window.i18next.addResourceBundle(lang, 'translation', bundle, true, true);
                    }
                });
            }
        } catch (error) {
            window.logger?.warn('⚠️ SupportTickets: translation load failed', error);
            this.translations = {};
        }
    }

    translate(key, fallback) {
        if (window.i18next && typeof window.i18next.t === 'function') {
            const translation = window.i18next.t(key);
            if (translation && translation !== key) {
                return translation;
            }
        }

        if (this.translations &&
            this.translations[this.currentLanguage] &&
            this.translations[this.currentLanguage].translation &&
            this.translations[this.currentLanguage].translation[key]) {
            return this.translations[this.currentLanguage].translation[key];
        }

        return fallback ?? key;
    }

    showTranslatableContent() {
        const container = document.getElementById('support-tickets');
        if (!container) return;

        const nodes = container.querySelectorAll('.translatable-content[data-translation-key]');
        nodes.forEach(node => {
            const key = node.getAttribute('data-translation-key');
            if (!key) return;

            const text = this.translate(key, node.textContent);
            if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
                node.placeholder = text;
            } else {
                node.textContent = text;
            }
            node.classList.add('loaded');
        });
    }

    async loadTickets() {
        try {
            this.setLoading(true);
            const { data, error } = await window.supabase
                .from('support_tickets')
                .select('id, ticket_code, status, type, message, created_at, updated_at, resolved_at, metadata, archived:metadata->archived')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            this.tickets = (data || []).map(ticket => ({
                ...ticket,
                metadata: ticket.metadata || {}
            }));

            this.renderList();
            this.renderDetail();
        } catch (error) {
            window.logger?.error('❌ SupportTickets: failed to load tickets', error);
            this.showError(this.translate('support-tickets-load-error', 'Failed to load your support tickets.'));
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        if (this.elements.loading) {
            this.elements.loading.style.display = isLoading ? 'flex' : 'none';
        }
        if (this.elements.list) {
            this.elements.list.classList.toggle('support-tickets__list--loading', isLoading);
        }
    }

    renderList() {
        if (!this.elements.list) return;

        const list = this.elements.list;
        list.querySelectorAll('.support-tickets__item').forEach(node => node.remove());

        const visibleTickets = this.tickets.filter(ticket => {
            const isArchived = Boolean(ticket.metadata?.archived?.isArchived);
            return this.includeArchived || !isArchived;
        });

        list.classList.toggle('support-tickets__list--empty', visibleTickets.length === 0);

        if (!visibleTickets.length) {
            if (this.elements.empty) {
                this.elements.empty.classList.add('loaded');
                this.elements.empty.style.display = 'block';
            }
        } else if (this.elements.empty) {
            this.elements.empty.style.display = 'none';
        }

        visibleTickets.forEach(ticket => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'support-tickets__item';
            if (ticket.id === this.selectedTicketId) {
                item.classList.add('support-tickets__item--active');
            }

            const code = document.createElement('span');
            code.className = 'support-tickets__item-code';
            code.textContent = ticket.ticket_code;
            item.appendChild(code);

            const meta = document.createElement('div');
            meta.className = 'support-tickets__item-meta';

            const statusBadge = document.createElement('span');
            statusBadge.className = 'support-tickets__status-badge';
            const isClosed = ticket.status === 'closed';
            if (isClosed) {
                statusBadge.classList.add('support-tickets__status-badge--closed');
            }
            if (ticket.metadata?.archived?.isArchived) {
                statusBadge.classList.add('support-tickets__status-badge--archived');
            }
            statusBadge.textContent = this.getStatusLabel(ticket.status);
            meta.appendChild(statusBadge);

            const updatedAt = ticket.updated_at || ticket.created_at;
            const dateMeta = document.createElement('span');
            dateMeta.textContent = this.translate('support-tickets-updated-at', 'Updated {{date}}')
                .replace('{{date}}', this.formatRelative(updatedAt));
            meta.appendChild(dateMeta);

            item.appendChild(meta);

            item.addEventListener('click', () => {
                this.selectedTicketId = ticket.id;
                this.renderList();
                this.renderDetail();
            });

            list.appendChild(item);
        });
    }

    renderDetail() {
        if (!this.elements.detail) return;

        const container = this.elements.detail;
        container.innerHTML = '';

        if (!this.selectedTicketId) {
            const empty = document.createElement('div');
            empty.className = 'support-tickets__detail-empty';
            empty.textContent = this.translate('support-tickets-select-placeholder', 'Select a ticket to view its details.');
            container.appendChild(empty);
            return;
        }

        const ticket = this.tickets.find(t => t.id === this.selectedTicketId);
        if (!ticket) {
            const empty = document.createElement('div');
            empty.className = 'support-tickets__detail-empty';
            empty.textContent = this.translate('support-tickets-missing', 'This ticket could not be found.');
            container.appendChild(empty);
            return;
        }

        const header = document.createElement('div');
        header.className = 'support-tickets__detail-header';

        const title = document.createElement('h3');
        title.className = 'support-tickets__detail-title';
        title.textContent = ticket.ticket_code;

        if (ticket.metadata?.archived?.isArchived) {
            const badge = document.createElement('span');
            badge.className = 'support-tickets__badge';
            badge.textContent = this.translate('support-tickets-archived-badge', 'Archived');
            title.appendChild(badge);
        }

        header.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'support-tickets__detail-meta';
        meta.innerHTML = `
            <span>${this.translate('support-tickets-created-at', 'Opened {{date}}').replace('{{date}}', this.formatDate(ticket.created_at))}</span>
            <span>${this.translate('support-tickets-updated-at', 'Updated {{date}}').replace('{{date}}', this.formatDate(ticket.updated_at || ticket.created_at))}</span>
        `;
        if (ticket.resolved_at) {
            const resolved = document.createElement('span');
            resolved.textContent = this.translate('support-tickets-resolved-at', 'Resolved {{date}}').replace('{{date}}', this.formatDate(ticket.resolved_at));
            meta.appendChild(resolved);
        }
        header.appendChild(meta);

        container.appendChild(header);

        const detailGrid = document.createElement('div');
        detailGrid.className = 'support-tickets__detail-grid';

        const messageCard = document.createElement('div');
        messageCard.className = 'support-tickets__card';
        messageCard.innerHTML = `
            <h4>${this.translate('support-tickets-message-title', 'Your message')}</h4>
            <p>${ticket.message ? this.escapeHtml(ticket.message) : this.translate('support-tickets-no-message', 'No message provided.')}</p>
        `;
        detailGrid.appendChild(messageCard);

        const contextCard = document.createElement('div');
        contextCard.className = 'support-tickets__card';
        contextCard.innerHTML = `<h4>${this.translate('support-tickets-context-title', 'Ticket details')}</h4>`;

        const contextList = document.createElement('div');
        contextList.className = 'support-tickets__context';
        const context = ticket.metadata?.context || {};

        this.appendContextRow(contextList, this.translate('Context: Topic', 'Topic'), context.topicLabel || context.topic);
        this.appendContextRow(contextList, this.translate('Context: Summary', 'Summary'), context.summary);
        if (Array.isArray(context.steps) && context.steps.length) {
            const steps = document.createElement('div');
            steps.innerHTML = `<strong>${this.translate('Context: Steps to reproduce', 'Steps to reproduce')}</strong>`;
            const list = document.createElement('ol');
            context.steps.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                list.appendChild(li);
            });
            steps.appendChild(list);
            contextList.appendChild(steps);
        }
        this.appendContextRow(contextList, this.translate('Context: Device details', 'Device details'), context.deviceDetails);
        this.appendContextRow(contextList, this.translate('Context: Additional notes', 'Additional notes'), context.notes);

        if (ticket.metadata?.archived) {
            const archiveMeta = ticket.metadata.archived;
            const state = archiveMeta.isArchived
                ? this.translate('Archive state archived', `Archived on {{date}}`).replace('{{date}}', this.formatDate(archiveMeta.archived_at || ticket.updated_at || ticket.created_at))
                : this.translate('Archive state active', 'Active ticket');
            this.appendContextRow(contextList, this.translate('Context: Archive state', 'Archive state'), state);
        }

        if (Array.isArray(ticket.metadata?.archive_history) && ticket.metadata.archive_history.length) {
            const historyLines = ticket.metadata.archive_history.map(entry => {
                const rawTimestamp = entry.timestamp || entry.archived_at;
                const timestamp = rawTimestamp ? this.formatDate(rawTimestamp) : this.translate('support-tickets-not-available', 'Not available');
                const rawAction = entry.action || (entry.archived_at ? 'archived' : 'restored');
                const actionLabel = rawAction === 'archived'
                    ? this.translate('Archive history archived', 'Archived')
                    : this.translate('Archive history restored', 'Restored');
                return `${timestamp} · ${actionLabel}`;
            }).reverse();
            this.appendContextRow(contextList, this.translate('Context: Archive history', 'Archive history'), historyLines.join('\n'));
        }

        if (Array.isArray(ticket.metadata?.attachments) && ticket.metadata.attachments.length) {
            const attachmentsCard = document.createElement('div');
            attachmentsCard.className = 'support-tickets__card';
            attachmentsCard.innerHTML = `<h4>${this.translate('support-tickets-attachments-title', 'Attachments')}</h4>`;
            const list = document.createElement('ul');
            list.className = 'support-tickets__attachments';
            ticket.metadata.attachments.forEach(file => {
                const li = document.createElement('li');
                const size = this.formatFileSize(file.size);
                li.textContent = `${file.name || 'attachment'} (${size})`;
                list.appendChild(li);
            });
            attachmentsCard.appendChild(list);
            detailGrid.appendChild(attachmentsCard);
        }

        contextCard.appendChild(contextList);
        detailGrid.appendChild(contextCard);

        container.appendChild(detailGrid);

        const updatesCard = document.createElement('div');
        updatesCard.className = 'support-tickets__card';
        updatesCard.innerHTML = `<h4>${this.translate('support-tickets-updates-title', 'Updates')}</h4>`;
        updatesCard.appendChild(this.renderUpdates(ticket));
        container.appendChild(updatesCard);

        container.appendChild(this.renderForm(ticket));
    }

    appendContextRow(container, label, value) {
        if (!value) return;
        const row = document.createElement('p');
        row.innerHTML = `<strong>${label}:</strong> ${this.escapeHtml(String(value))}`;
        container.appendChild(row);
    }

    renderUpdates(ticket) {
        const wrapper = document.createElement('div');
        wrapper.className = 'support-tickets__updates';

        const updates = Array.isArray(ticket.metadata?.updates)
            ? [...ticket.metadata.updates].reverse()
            : [];

        if (!updates.length) {
            const empty = document.createElement('p');
            empty.textContent = this.translate('support-tickets-no-updates', 'No updates yet.');
            wrapper.appendChild(empty);
            return wrapper;
        }

        updates.forEach(update => {
            const item = document.createElement('div');
            item.className = 'support-tickets__update';

            const meta = document.createElement('div');
            meta.className = 'support-tickets__update-meta';
            const statusLabel = this.getStatusLabel(update.status);
            meta.innerHTML = `
                <span><strong>${statusLabel}</strong></span>
                <span>${this.formatDate(update.created_at)}</span>
            `;
            item.appendChild(meta);

            const actorLabel = this.describeActor(update.updated_by);
            if (actorLabel) {
                const actor = document.createElement('div');
                actor.className = 'support-tickets__update-meta';
                actor.textContent = actorLabel;
                item.appendChild(actor);
            }

            if (update.comment) {
                const body = document.createElement('p');
                body.textContent = update.comment;
                item.appendChild(body);
            }

            wrapper.appendChild(item);
        });

        return wrapper;
    }

    renderForm(ticket) {
        const formCard = document.createElement('div');
        formCard.className = 'support-tickets__card';

        const isClosed = ticket.status === 'closed';

        const form = document.createElement('form');
        form.className = 'support-tickets__form';
        form.innerHTML = `
            <label for="support-ticket-comment">${this.translate('support-tickets-comment-label', 'Share an update')}</label>
            <textarea id="support-ticket-comment" placeholder="${this.translate('support-tickets-comment-placeholder', 'Add context, share progress, or ask a question')}" rows="4"></textarea>
            <label for="support-ticket-status">${this.translate('support-tickets-status-label', 'Status')}</label>
            <select id="support-ticket-status"></select>
        `;

        const statusSelect = form.querySelector('#support-ticket-status');
        const statusOptions = this.getStatusOptions(ticket.status);
        statusOptions.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = this.getStatusLabel(value);
            statusSelect.appendChild(option);
        });
        statusSelect.value = ticket.status;

        const actions = document.createElement('div');
        actions.className = 'support-tickets__form-actions';

        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'support-tickets__submit';
        submit.textContent = this.translate('support-tickets-submit', 'Send update');

        actions.appendChild(submit);

        if (!isClosed) {
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'support-tickets__close';
            closeButton.textContent = this.translate('support-tickets-close', 'Close ticket');
            closeButton.addEventListener('click', () => {
                statusSelect.value = 'closed';
                form.dispatchEvent(new Event('submit', { cancelable: true }));
            });
            actions.appendChild(closeButton);
        } else {
            const note = document.createElement('p');
            note.className = 'support-tickets__note';
            note.textContent = this.translate('support-tickets-closed-note', 'This ticket is closed. You can reopen it by sending a new update with a different status.');
            formCard.appendChild(note);
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.submitUpdate(ticket, form, submit);
        });

        form.appendChild(actions);
        formCard.appendChild(form);

        return formCard;
    }

    async submitUpdate(ticket, form, submitButton) {
        if (!this.sessionToken) {
            this.showError(this.translate('support-tickets-session-missing', 'You need to sign in again to update this ticket.'));
            return;
        }

        const comment = form.querySelector('#support-ticket-comment')?.value.trim() || '';
        const status = form.querySelector('#support-ticket-status')?.value || ticket.status;

        if (!this.functionsUrl) {
            const supabaseUrl = window.SUPABASE_CONFIG?.url;
            if (!supabaseUrl) {
                this.showError(this.translate('support-tickets-config-missing', 'Missing Supabase configuration.'));
                return;
            }
            this.functionsUrl = supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
        }

        submitButton.disabled = true;
        this.clearError();

        try {
            const response = await fetch(`${this.functionsUrl}/send-support-update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_CONFIG?.anonKey || ''
                },
                body: JSON.stringify({
                    ticketId: ticket.id,
                    status,
                    comment,
                    notifyUser: true
                })
            });

            const result = await response.json();

            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'Unknown error');
            }

            if (result.ticket) {
                const index = this.tickets.findIndex(t => t.id === ticket.id);
                if (index !== -1) {
                    this.tickets[index] = {
                        ...result.ticket,
                        metadata: result.ticket.metadata || {}
                    };
                }
                this.selectedTicketId = result.ticket.id;
            }

            form.reset();
            this.renderList();
            this.renderDetail();
            this.showSuccess(this.translate('support-tickets-update-success', 'Ticket updated successfully.'));
        } catch (error) {
            window.logger?.error('❌ SupportTickets: update failed', error);
            this.showError(this.translate('support-tickets-update-error', 'Failed to update the ticket. Please try again.'));
        } finally {
            submitButton.disabled = false;
        }
    }

    getStatusLabel(status) {
        return this.translate(`support-ticket-status-${status}`, status);
    }

    getStatusOptions(currentStatus) {
        const options = ['new', 'in_progress', 'resolved', 'closed'];
        if (!options.includes(currentStatus)) {
            options.unshift(currentStatus);
        }
        return Array.from(new Set(options));
    }

    formatDate(value) {
        try {
            const date = new Date(value);
            return date.toLocaleString();
        } catch (error) {
            return value;
        }
    }

    formatRelative(value) {
        try {
            const date = new Date(value);
            const diff = Date.now() - date.getTime();
            const minutes = Math.floor(diff / 60000);
            if (minutes < 1) return this.translate('support-tickets-relative-now', 'Just now');
            if (minutes < 60) return this.translate('support-tickets-relative-minutes', '{{count}} minutes ago').replace('{{count}}', minutes);
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return this.translate('support-tickets-relative-hours', '{{count}} hours ago').replace('{{count}}', hours);
            const days = Math.floor(hours / 24);
            if (days === 1) return this.translate('support-tickets-relative-day', '1 day ago');
            return this.translate('support-tickets-relative-days', '{{count}} days ago').replace('{{count}}', days);
        } catch (error) {
            return value;
        }
    }

    formatFileSize(bytes) {
        if (!Number.isFinite(bytes)) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    describeActor(actor) {
        if (!actor || typeof actor !== 'object') {
            return null;
        }
        if (actor.type === 'user') {
            if (actor.id && this.currentUserId && actor.id === this.currentUserId) {
                return this.translate('support-tickets-update-by-you', 'You');
            }
            return this.translate('support-tickets-update-by-user', 'Customer');
        }
        return this.translate('support-tickets-update-by-support', 'Support team');
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    showError(message) {
        if (this.elements.error && this.elements.errorText) {
            this.elements.error.hidden = false;
            this.elements.errorText.textContent = message;
        } else {
            window.logger?.error(message);
        }
    }

    showSuccess(message) {
        if (window.accountPageLoader?.showSuccess) {
            window.accountPageLoader.showSuccess(message);
        } else {
            window.logger?.log(message);
        }
    }

    clearError() {
        if (this.elements.error) {
            this.elements.error.hidden = true;
        }
    }
}

const initSupportTickets = () => {
    if (document.getElementById('support-tickets')) {
        window.supportTickets = new SupportTickets();
        window.supportTickets.init();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportTickets);
} else {
    initSupportTickets();
}

window.SupportTickets = SupportTickets;
}

