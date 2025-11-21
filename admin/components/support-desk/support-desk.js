/**
 * Support Desk Component
 * Displays support tickets and enables admin triage workflows.
 */

if (typeof window.SupportDesk === 'undefined') {
class SupportDesk {
    constructor() {
        this.isInitialized = false;
        this.tickets = [];
        this.filteredTickets = [];
        this.selectedTicket = null;
        this.filters = {
            search: '',
            status: 'all',
            type: 'all',
            showArchived: false
        };
        this.elements = {};
        this.searchDebounce = null;
    }

    bytesToReadable(bytes) {
        if (!Number.isFinite(bytes)) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            this.cacheElements();
            this.setupEventListeners();
            await this.initializeTranslations();
            this.showTranslatableContent();

            await this.loadTickets();
            this.applyFilters();

            this.isInitialized = true;
        } catch (error) {
            window.logger?.error('❌ Support Desk: failed to initialize', error);
            this.showError(this.translate('Failed to load support tickets.', 'Failed to load support tickets.'));
        }
    }

    cacheElements() {
        const root = document.getElementById('support-desk');
        if (!root) {
            throw new Error('Support desk root element not found');
        }

        this.elements.root = root;
        this.elements.tableBody = document.getElementById('support-desk-table-body');
        this.elements.emptyState = document.getElementById('support-desk-empty');
        this.elements.detail = document.getElementById('support-desk-detail');
        this.elements.detailEmpty = document.getElementById('support-desk-detail-empty');
        this.elements.detailContent = document.getElementById('support-desk-detail-content');
        this.elements.statusFilter = document.getElementById('support-desk-status-filter');
        this.elements.typeFilter = document.getElementById('support-desk-type-filter');
        this.elements.archivedFilter = document.getElementById('support-desk-archived-filter');
        this.elements.search = document.getElementById('support-desk-search');
        this.elements.refreshButton = document.getElementById('support-desk-refresh');
        this.elements.loadingOverlay = document.getElementById('support-desk-loading');
        this.elements.detailCode = document.getElementById('support-desk-detail-code');
        this.elements.detailSubmitted = document.getElementById('support-desk-detail-submitted');
        this.elements.detailUpdated = document.getElementById('support-desk-detail-updated');
        this.elements.detailResolved = document.getElementById('support-desk-detail-resolved');
        this.elements.detailName = document.getElementById('support-desk-detail-name');
        this.elements.detailEmail = document.getElementById('support-desk-detail-email');
        this.elements.detailType = document.getElementById('support-desk-detail-type');
        this.elements.detailStatusText = document.getElementById('support-desk-detail-status-text');
        this.elements.detailStatusSelect = document.getElementById('support-desk-detail-status-select');
        this.elements.updateStatusButton = document.getElementById('support-desk-update-status');
        this.elements.archiveToggleButton = document.getElementById('support-desk-archive-toggle');
        this.elements.detailMessage = document.getElementById('support-desk-detail-message');
        this.elements.detailUserAgent = document.getElementById('support-desk-detail-user-agent');
        this.elements.detailAttachmentsCard = document.getElementById('support-desk-detail-attachments-card');
        this.elements.detailAttachmentsList = document.getElementById('support-desk-detail-attachments');
        this.elements.detailComment = document.getElementById('support-desk-detail-comment');
        this.elements.detailContextCard = document.getElementById('support-desk-detail-context-card');
        this.elements.detailContext = document.getElementById('support-desk-detail-context');
        this.elements.detailUpdatesCard = document.getElementById('support-desk-detail-updates-card');
        this.elements.detailUpdates = document.getElementById('support-desk-detail-updates');
        this.elements.archiveToggleButton = document.getElementById('support-desk-archive-toggle');

        Object.entries(this.elements).forEach(([key, el]) => {
            if (!el) {
                throw new Error(`Support desk missing element: ${key}`);
            }
        });
    }

    setupEventListeners() {
        this.elements.statusFilter.addEventListener('change', (event) => {
            this.filters.status = event.target.value;
            this.applyFilters();
        });

        this.elements.typeFilter.addEventListener('change', (event) => {
            this.filters.type = event.target.value;
            this.applyFilters();
        });

        if (this.elements.archivedFilter) {
            this.elements.archivedFilter.addEventListener('change', (event) => {
                this.filters.showArchived = Boolean(event.target.checked);
                this.applyFilters();
            });
        }

        this.elements.search.addEventListener('input', (event) => {
            clearTimeout(this.searchDebounce);
            const value = event.target.value;
            this.searchDebounce = setTimeout(() => {
                this.filters.search = value.trim().toLowerCase();
                this.applyFilters();
            }, 250);
        });

        this.elements.refreshButton.addEventListener('click', async () => {
            await this.loadTickets(true);
            this.applyFilters();
        });

        this.elements.updateStatusButton.addEventListener('click', async () => {
            if (!this.selectedTicket) {
                return;
            }
            const newStatus = this.elements.detailStatusSelect.value;
            if (newStatus === this.selectedTicket.status) {
                return;
            }
            await this.updateTicketStatus(this.selectedTicket, newStatus);
        });

        if (this.elements.archiveToggleButton) {
            this.elements.archiveToggleButton.addEventListener('click', async () => {
                await this.toggleArchiveTicket();
            });
        }

        window.addEventListener('languageChanged', () => {
            this.updateTranslations();
            this.renderTable();
            this.renderTicketDetail();
        });
    }

    async initializeTranslations() {
        if (window.supportDeskTranslations && !window.supportDeskTranslations.isInitialized) {
            await window.supportDeskTranslations.init();
        }
    }

    showTranslatableContent() {
        const translatableElements = this.elements.root.querySelectorAll('.translatable-content');
        translatableElements.forEach(element => {
            element.classList.add('loaded');
        });
    }

    setLoading(isLoading) {
        if (!this.elements.loadingOverlay) {
            return;
        }
        if (isLoading) {
            this.elements.loadingOverlay.classList.remove('hidden');
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    async loadTickets(force = false) {
        try {
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            if (force && window.adminLayout) {
                await window.adminLayout.logAdminAction('support_tickets_refreshed', {
                    reason: 'manual_refresh'
                });
            }

            this.setLoading(true);

            const { data, error } = await window.supabase
                .from('support_tickets')
                .select('id, ticket_code, name, email, type, status, message, user_agent, created_at, updated_at, resolved_at, metadata')
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            this.tickets = data || [];

            if (this.tickets.length === 0) {
                this.clearDetail();
            }

        } catch (error) {
            window.logger?.error('❌ Support Desk: failed to load tickets', error);
            this.showError(this.translate('Failed to load support tickets.', 'Failed to load support tickets.'));
        } finally {
            this.setLoading(false);
        }
    }

    applyFilters() {
        const searchTerm = this.filters.search;
        const statusFilter = this.filters.status;
        const typeFilter = this.filters.type;
        const includeArchived = this.filters.showArchived;

        this.filteredTickets = this.tickets.filter(ticket => {
            const matchesSearch = !searchTerm || [
                ticket.ticket_code,
                ticket.email,
                ticket.name
            ].some(value => value && value.toLowerCase().includes(searchTerm));

            const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
            const matchesType = typeFilter === 'all' || ticket.type === typeFilter;
            const matchesArchive = includeArchived || !this.isTicketArchived(ticket);

            return matchesSearch && matchesStatus && matchesType && matchesArchive;
        });

        if (this.elements.archivedFilter) {
            this.elements.archivedFilter.checked = includeArchived;
        }

        this.renderTable();
        this.renderEmptyState();

        if (this.selectedTicket) {
            const stillPresent = this.filteredTickets.find(ticket => ticket.id === this.selectedTicket.id);
            if (!stillPresent) {
                this.clearDetail();
            }
        }
    }

    renderTable() {
        if (!this.elements.tableBody) {
            return;
        }

        this.elements.tableBody.innerHTML = '';

        this.filteredTickets.forEach(ticket => {
            const safeCode = this.escapeHtml(ticket.ticket_code);
            const safeEmail = this.escapeHtml(ticket.email);
            const safeName = this.escapeHtml(ticket.name);
            const typeLabel = this.escapeHtml(this.getTypeLabel(ticket.type));
            const createdLabel = this.escapeHtml(this.formatDate(ticket.created_at));
            const relativeLabel = this.escapeHtml(this.formatRelativeDate(ticket.created_at));
            const statusBadge = this.renderStatusBadge(ticket.status);

            const row = document.createElement('tr');
            row.dataset.ticketId = ticket.id;

            if (this.selectedTicket && this.selectedTicket.id === ticket.id) {
                row.classList.add('active');
            }

            row.innerHTML = `
                <td>
                    <div class="support-desk__ticket-code">${safeCode}</div>
                    <div class="support-desk__ticket-subtext">${safeEmail}</div>
                </td>
                <td>
                    <div>${safeName}</div>
                    <div class="support-desk__ticket-subtext">${relativeLabel}</div>
                </td>
                <td>${typeLabel}</td>
                <td>${statusBadge}</td>
                <td>${createdLabel}</td>
            `;

            row.addEventListener('click', () => {
                this.selectTicket(ticket.id);
            });

            this.elements.tableBody.appendChild(row);
        });
    }

    renderEmptyState() {
        if (!this.elements.emptyState) {
            return;
        }

        if (this.filteredTickets.length === 0) {
            this.elements.emptyState.classList.add('active');
        } else {
            this.elements.emptyState.classList.remove('active');
        }
    }

    selectTicket(ticketId) {
        const ticket = this.tickets.find(item => item.id === ticketId);
        if (!ticket) {
            return;
        }

        this.selectedTicket = ticket;

        if (window.adminLayout) {
            window.adminLayout.logAdminAction('support_ticket_viewed', {
                ticket_code: ticket.ticket_code,
                status: ticket.status
            }).catch(() => {});
        }

        this.renderTicketDetail();
        this.renderTable();
    }

    renderTicketDetail() {
        if (!this.selectedTicket) {
            this.clearDetail();
            return;
        }

        const ticket = this.selectedTicket;

        this.elements.detailEmpty.classList.add('hidden');
        this.elements.detailContent.classList.remove('hidden');

        if (this.elements.detailComment) {
            this.elements.detailComment.value = '';
        }

        this.elements.detailCode.textContent = ticket.ticket_code;
        this.elements.detailSubmitted.textContent = `${this.translate('Submitted', 'Submitted')}: ${this.formatDate(ticket.created_at)}`;
        this.elements.detailUpdated.textContent = ticket.updated_at
            ? this.formatDate(ticket.updated_at)
            : this.translate('Not updated yet', 'Not updated yet');
        this.elements.detailResolved.textContent = ticket.resolved_at
            ? this.formatDate(ticket.resolved_at)
            : this.translate('Not resolved yet', 'Not resolved yet');
        this.elements.detailName.textContent = ticket.name;

        const mailLink = this.elements.detailEmail;
        mailLink.textContent = ticket.email;
        mailLink.href = `mailto:${ticket.email}`;

        this.elements.detailType.textContent = this.getTypeLabel(ticket.type);
        this.elements.detailStatusText.textContent = this.getStatusLabel(ticket.status);
        this.elements.detailStatusSelect.value = ticket.status;

        if (this.elements.archiveToggleButton) {
            const isArchived = this.isTicketArchived(ticket);
            const key = isArchived ? 'Restore ticket' : 'Archive ticket';
            this.elements.archiveToggleButton.textContent = this.translate(key, isArchived ? 'Restore ticket' : 'Archive ticket');
        }

        this.elements.detailMessage.textContent = ticket.message || this.translate('No message provided.', 'No message provided.');
        this.elements.detailUserAgent.textContent = ticket.user_agent || this.translate('Unknown device', 'Unknown device');

        const attachmentsCard = this.elements.detailAttachmentsCard;
        const attachmentsList = this.elements.detailAttachmentsList;
        if (attachmentsCard && attachmentsList) {
            const attachmentsMeta = Array.isArray(ticket.metadata?.attachments)
                ? ticket.metadata.attachments
                : Array.isArray(ticket.attachments)
                    ? ticket.attachments
                    : [];

            if (attachmentsMeta.length) {
                attachmentsCard.classList.remove('hidden');
                attachmentsList.innerHTML = '';
                attachmentsMeta.forEach((attachment) => {
                    const li = document.createElement('li');
                    li.innerHTML = `${this.escapeHtml(attachment.name)} <span class="support-desk__attachment-size">(${this.escapeHtml(this.bytesToReadable(attachment.size))})</span>`;
                    attachmentsList.appendChild(li);
                });
            } else {
                attachmentsCard.classList.add('hidden');
                attachmentsList.innerHTML = '';
            }
        }

        this.renderTicketContext(ticket);
        this.renderTicketUpdates(ticket);
    }

    clearDetail() {
        this.selectedTicket = null;
        this.elements.detailContent.classList.add('hidden');
        this.elements.detailEmpty.classList.remove('hidden');
    }

    async updateTicketStatus(ticket, newStatus) {
        try {
            const supabaseConfig = globalThis.SUPABASE_CONFIG || {};
            const supabaseUrl = supabaseConfig.url;
            const supabaseAnonKey = supabaseConfig.anonKey;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Missing Supabase configuration');
            }

            this.elements.updateStatusButton.disabled = true;
            this.elements.updateStatusButton.classList.add('is-loading');

            const commentValue = (this.elements.detailComment?.value || '').trim();

            const response = await fetch(`${supabaseUrl}/functions/v1/send-support-update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ticketId: ticket.id,
                    status: newStatus,
                    comment: commentValue,
                    notifyUser: true
                })
            });

            const result = await response.json();

            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'Failed to update ticket status.');
            }

            const updatedTicket = result.ticket;
            if (!updatedTicket) {
                throw new Error('Missing ticket data in response');
            }

            const ticketIndex = this.tickets.findIndex(item => item.id === ticket.id);
            if (ticketIndex !== -1) {
                this.tickets[ticketIndex] = {
                    ...this.tickets[ticketIndex],
                    ...updatedTicket
                };
                this.selectedTicket = this.tickets[ticketIndex];
            } else {
                this.tickets = [updatedTicket, ...this.tickets];
                this.selectedTicket = updatedTicket;
            }

            if (window.adminLayout) {
                window.adminLayout.logAdminAction('support_ticket_status_updated', {
                    ticket_code: ticket.ticket_code,
                    status: updatedTicket.status
                }).catch(() => {});
            }

            this.applyFilters();
            this.renderTicketDetail();

            if (this.elements.detailComment) {
                this.elements.detailComment.value = '';
            }

            this.showSuccess(this.translate('Status updated successfully.', 'Status updated successfully.'));
        } catch (error) {
            window.logger?.error('❌ Support Desk: failed to update ticket status', error);
            this.showError(this.translate('Failed to update ticket status.', 'Failed to update ticket status.'));
        } finally {
            this.elements.updateStatusButton.disabled = false;
            this.elements.updateStatusButton.classList.remove('is-loading');
        }
    }

    renderStatusBadge(status) {
        const badgeClass = `support-desk__status-badge support-desk__status-badge--${status}`;
        const label = this.escapeHtml(this.getStatusLabel(status));
        return `<span class="${badgeClass}">${label}</span>`;
    }

    getStatusLabel(status) {
        const keyMap = {
            new: 'Status: New',
            in_progress: 'Status: In Progress',
            resolved: 'Status: Resolved',
            closed: 'Status: Closed'
        };
        return this.translate(keyMap[status] || status, status.replace('_', ' '));
    }

    getTypeLabel(type) {
        const keyMap = {
            'tech-help': 'Type: Tech help',
            general: 'Type: General question',
            bug: 'Type: Bug or outage',
            account: 'Type: Account or billing help',
            billing: 'Type: Billing',
            commission: 'Type: Commission intake'
        };
        return this.translate(keyMap[type] || type, type);
    }

    formatDate(value) {
        if (!value) {
            return this.translate('Not available', 'Not available');
        }
        try {
            const date = new Date(value);
            return date.toLocaleString();
        } catch (error) {
            return value;
        }
    }

    formatRelativeDate(value) {
        if (!value) {
            return '';
        }
        try {
            const date = new Date(value);
            const diff = Date.now() - date.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));

            if (days <= 0) {
                return this.translate('Today', 'Today');
            }
            if (days === 1) {
                return this.translate('1 day ago', '1 day ago');
            }
            return this.translate('{{days}} days ago', `${days} days ago`).replace('{{days}}', days.toString());
        } catch (error) {
            return '';
        }
    }

    updateTranslations() {
        if (window.supportDeskTranslations) {
            window.supportDeskTranslations.updateTranslations();
        }
    }

    translate(key, fallback) {
        if (window.supportDeskTranslations) {
            return window.supportDeskTranslations.getTranslation(key) || fallback;
        }
        if (window.i18next && typeof window.i18next.t === 'function') {
            const translation = window.i18next.t(key);
            if (translation && translation !== key) {
                return translation;
            }
        }
        return fallback;
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    showError(message) {
        if (window.adminLayout) {
            window.adminLayout.showError(message);
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.adminLayout) {
            window.adminLayout.showSuccess(message);
        } else {
            window.logger?.log(message);
        }
    }

    renderTicketContext(ticket) {
        const contextCard = this.elements.detailContextCard;
        const contextContainer = this.elements.detailContext;
        if (!contextCard || !contextContainer) {
            return;
        }

        contextContainer.innerHTML = '';
        contextCard.classList.add('hidden');

        const entries = this.getContextEntries(ticket);

        if (!entries.length) {
            return;
        }

        entries.forEach((entry) => {
            const wrapper = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'support-desk__context-item-title';
            title.textContent = entry.label;
            wrapper.appendChild(title);

            if (entry.type === 'list') {
                const list = document.createElement('ol');
                list.className = 'support-desk__context-item-list';
                entry.value.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    list.appendChild(li);
                });
                wrapper.appendChild(list);
            } else {
                const paragraph = document.createElement('p');
                paragraph.className = 'support-desk__context-item-value';
                paragraph.textContent = entry.value;
                wrapper.appendChild(paragraph);
            }

            contextContainer.appendChild(wrapper);
        });

        contextCard.classList.remove('hidden');
    }

    getContextEntries(ticket) {
        const entries = [];

        const pushText = (labelKey, fallback, value) => {
            const trimmed = typeof value === 'string' ? value.trim() : '';
            if (!trimmed) {
                return;
            }
            entries.push({
                label: this.translate(labelKey, fallback),
                type: 'text',
                value: trimmed
            });
        };

        const pushList = (labelKey, fallback, values) => {
            if (!Array.isArray(values) || !values.length) {
                return;
            }
            const sanitized = values
                .map(item => (typeof item === 'string' ? item.trim() : ''))
                .filter(Boolean);
            if (!sanitized.length) {
                return;
            }
            entries.push({
                label: this.translate(labelKey, fallback),
                type: 'list',
                value: sanitized
            });
        };

        const context = ticket.metadata?.context;
        if (context && typeof context === 'object') {
            if (typeof context.topicLabel === 'string') {
                pushText('Context: Topic', 'Topic', context.topicLabel);
            }

            if (typeof context.summary === 'string') {
                pushText('Context: Summary', 'Summary', context.summary);
            }

            if (Array.isArray(context.steps)) {
                pushList('Context: Steps to reproduce', 'Steps to reproduce', context.steps);
            }

            if (typeof context.deviceDetails === 'string') {
                pushText('Context: Device details', 'Device details', context.deviceDetails);
            }

            if (typeof context.notes === 'string') {
                pushText('Context: Additional notes', 'Additional notes', context.notes);
            }
        }

        const archiveMeta = ticket.metadata?.archived;
        if (archiveMeta && typeof archiveMeta === 'object') {
            const isArchived = Boolean(archiveMeta.isArchived);
            const archivedAt = archiveMeta.archived_at
                ? this.formatDate(archiveMeta.archived_at)
                : this.translate('Not available', 'Not available');
            const state = isArchived
                ? this.translate('Archive state archived', `Archived on {{date}}`).replace('{{date}}', archivedAt)
                : this.translate('Archive state active', 'Active ticket');

            pushText('Context: Archive state', 'Archive state', state);
        }

        const archiveHistoryEntries = Array.isArray(ticket.metadata?.archive_history)
            ? ticket.metadata.archive_history
            : [];

        if (archiveHistoryEntries.length) {
            const formattedArchiveHistory = archiveHistoryEntries.map(entry => {
                const rawTimestamp = typeof entry.timestamp === 'string'
                    ? entry.timestamp
                    : typeof entry.archived_at === 'string'
                        ? entry.archived_at
                        : null;
                const timestamp = rawTimestamp
                    ? this.formatDate(rawTimestamp)
                    : this.translate('Not available', 'Not available');
                const rawAction = typeof entry.action === 'string'
                    ? entry.action
                    : entry.archived_at
                        ? 'archived'
                        : 'restored';
                const action = rawAction === 'archived'
                    ? this.translate('Archive history archived', 'Archived')
                    : this.translate('Archive history restored', 'Restored');
                return `${timestamp} · ${action}`;
            }).filter(Boolean);

            pushList('Context: Archive history', 'Archive history', formattedArchiveHistory);
        }

        return entries;
    }

    renderTicketUpdates(ticket) {
        const updatesCard = this.elements.detailUpdatesCard;
        const updatesContainer = this.elements.detailUpdates;
        if (!updatesCard || !updatesContainer) {
            return;
        }

        updatesContainer.innerHTML = '';

        const updates = Array.isArray(ticket.metadata?.updates)
            ? [...ticket.metadata.updates]
            : [];

        if (!updates.length) {
            updatesCard.classList.add('hidden');
            return;
        }

        updatesCard.classList.remove('hidden');

        updates
            .slice()
            .reverse()
            .forEach((entry) => {
                const item = document.createElement('div');
                item.className = 'support-desk__update';

                const header = document.createElement('div');
                header.className = 'support-desk__update-header';

                const statusEl = document.createElement('span');
                statusEl.className = 'support-desk__update-status';
                statusEl.textContent = this.getStatusLabel(entry.status || '');
                header.appendChild(statusEl);

                const timestampEl = document.createElement('span');
                timestampEl.className = 'support-desk__update-timestamp';
                timestampEl.textContent = typeof entry.created_at === 'string'
                    ? this.formatDate(entry.created_at)
                    : this.translate('Not available', 'Not available');
                header.appendChild(timestampEl);

                item.appendChild(header);

                const actorLabel = this.getUpdateActorLabel(entry.updated_by);
                if (actorLabel) {
                    const actorEl = document.createElement('div');
                    actorEl.className = 'support-desk__update-actor';
                    actorEl.textContent = actorLabel;
                    item.appendChild(actorEl);
                }

                const comment = typeof entry.comment === 'string' ? entry.comment.trim() : '';
                if (comment) {
                    const commentEl = document.createElement('p');
                    commentEl.className = 'support-desk__update-comment';
                    if (entry.updated_by && entry.updated_by.type === 'admin') {
                        commentEl.classList.add('support-desk__update-comment--team');
                    }
                    commentEl.textContent = comment;
                    item.appendChild(commentEl);
                }

                updatesContainer.appendChild(item);
            });
    }

    getUpdateActorLabel(actor) {
        if (!actor || typeof actor !== 'object') {
            return '';
        }
        if (actor.type === 'admin') {
            return this.translate('Support team update', 'Support team update');
        }
        if (actor.type === 'user') {
            return this.translate('Requester update', 'Requester update');
        }
        return '';
    }

    isTicketArchived(ticket) {
        const archivedMeta = ticket.metadata?.archived;
        if (!archivedMeta || typeof archivedMeta !== 'object') {
            return false;
        }
        return Boolean(archivedMeta.isArchived);
    }

    async toggleArchiveTicket() {
        if (!this.selectedTicket) {
            return;
        }

        try {
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            if (this.elements.archiveToggleButton) {
                this.elements.archiveToggleButton.disabled = true;
                this.elements.archiveToggleButton.classList.add('is-loading');
            }

            const nowIso = new Date().toISOString();
            const isArchived = this.isTicketArchived(this.selectedTicket);

            const existingMetadata = this.selectedTicket.metadata && typeof this.selectedTicket.metadata === 'object'
                ? { ...this.selectedTicket.metadata }
                : {};

            const archiveHistory = Array.isArray(existingMetadata.archive_history)
                ? existingMetadata.archive_history.slice(-24)
                : [];

            archiveHistory.push({
                action: isArchived ? 'restored' : 'archived',
                timestamp: nowIso,
                by: { type: 'admin' }
            });

            existingMetadata.archived = {
                isArchived: !isArchived,
                archived_at: !isArchived ? nowIso : null,
                archived_by: { type: 'admin' }
            };
            existingMetadata.archive_history = archiveHistory;

            const { data, error } = await window.supabase
                .from('support_tickets')
                .update({
                    metadata: existingMetadata,
                    updated_at: nowIso
                })
                .eq('id', this.selectedTicket.id)
                .select('id, metadata, updated_at')
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (window.adminLayout) {
                window.adminLayout.logAdminAction('support_ticket_archived_toggled', {
                    ticket_code: this.selectedTicket.ticket_code,
                    archived: !isArchived
                }).catch(() => {});
            }

            if (data) {
                const ticketIndex = this.tickets.findIndex(item => item.id === this.selectedTicket.id);
                if (ticketIndex !== -1) {
                    this.tickets[ticketIndex] = {
                        ...this.tickets[ticketIndex],
                        metadata: data.metadata,
                        updated_at: data.updated_at
                    };
                    this.selectedTicket = this.tickets[ticketIndex];
                } else {
                    this.selectedTicket = {
                        ...this.selectedTicket,
                        metadata: data.metadata,
                        updated_at: data.updated_at
                    };
                }

                this.applyFilters();
                this.renderTicketDetail();
                this.renderTable();

                const successKey = !isArchived ? 'Ticket archived.' : 'Ticket restored.';
                this.showSuccess(this.translate(successKey, successKey));
            }
        } catch (error) {
            window.logger?.error('❌ Support Desk: failed to toggle archive state', error);
            this.showError(this.translate('Failed to update archive state.', 'Failed to update archive state.'));
        } finally {
            if (this.elements.archiveToggleButton) {
                this.elements.archiveToggleButton.disabled = false;
                this.elements.archiveToggleButton.classList.remove('is-loading');
            }
        }
    }
}

window.SupportDesk = SupportDesk;
}

