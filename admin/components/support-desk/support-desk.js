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
            type: 'all'
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
            console.error('❌ Support Desk: failed to initialize', error);
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
        this.elements.detailMessage = document.getElementById('support-desk-detail-message');
        this.elements.detailUserAgent = document.getElementById('support-desk-detail-user-agent');
        this.elements.detailAttachmentsCard = document.getElementById('support-desk-detail-attachments-card');
        this.elements.detailAttachmentsList = document.getElementById('support-desk-detail-attachments');

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
            console.error('❌ Support Desk: failed to load tickets', error);
            this.showError(this.translate('Failed to load support tickets.', 'Failed to load support tickets.'));
        } finally {
            this.setLoading(false);
        }
    }

    applyFilters() {
        const searchTerm = this.filters.search;
        const statusFilter = this.filters.status;
        const typeFilter = this.filters.type;

        this.filteredTickets = this.tickets.filter(ticket => {
            const matchesSearch = !searchTerm || [
                ticket.ticket_code,
                ticket.email,
                ticket.name
            ].some(value => value && value.toLowerCase().includes(searchTerm));

            const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
            const matchesType = typeFilter === 'all' || ticket.type === typeFilter;

            return matchesSearch && matchesStatus && matchesType;
        });

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
    }

    clearDetail() {
        this.selectedTicket = null;
        this.elements.detailContent.classList.add('hidden');
        this.elements.detailEmpty.classList.remove('hidden');
    }

    async updateTicketStatus(ticket, newStatus) {
        try {
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }

            this.elements.updateStatusButton.disabled = true;
            this.elements.updateStatusButton.classList.add('is-loading');

            const updatePayload = {
                status: newStatus,
                resolved_at: (newStatus === 'resolved' || newStatus === 'closed') ? new Date().toISOString() : null
            };

            const { data, error } = await window.supabase
                .from('support_tickets')
                .update(updatePayload)
                .eq('id', ticket.id)
            .select('id, ticket_code, status, resolved_at, updated_at, metadata')
                .maybeSingle();

            if (error) {
                throw error;
            }

            if (data) {
                const ticketIndex = this.tickets.findIndex(item => item.id === ticket.id);
                if (ticketIndex !== -1) {
                    this.tickets[ticketIndex] = {
                        ...this.tickets[ticketIndex],
                        status: data.status,
                        resolved_at: data.resolved_at,
                        updated_at: data.updated_at,
                        metadata: data.metadata ?? this.tickets[ticketIndex].metadata
                    };
                    this.selectedTicket = this.tickets[ticketIndex];
                } else {
                    const updatedTicket = {
                        ...ticket,
                        status: data.status,
                        resolved_at: data.resolved_at,
                        updated_at: data.updated_at,
                        metadata: data.metadata ?? ticket.metadata
                    };
                    this.tickets = [updatedTicket, ...this.tickets];
                    this.selectedTicket = updatedTicket;
                }
                this.applyFilters();
                this.renderTicketDetail();

                if (window.adminLayout) {
                    window.adminLayout.showSuccess(this.translate('Status updated successfully.', 'Status updated successfully.'));
                    window.adminLayout.logAdminAction('support_ticket_status_updated', {
                        ticket_code: ticket.ticket_code,
                        status: data.status
                    }).catch(() => {});
                }
            }

        } catch (error) {
            console.error('❌ Support Desk: failed to update ticket status', error);
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
            general: 'Type: General question',
            bug: 'Type: Bug or outage',
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
}

window.SupportDesk = SupportDesk;
}

