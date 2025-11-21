/**
 * Message Composition Utility
 * Handles message composition logic and validation
 */

class MessageComposition {
    constructor() {
        this.communicationType = 'notification'; // 'notification' or 'email'
        this.messageData = {
            subject: '',
            body: '',
            signature: '',
            senderEmail: ''
        };
    }

    /**
     * Set communication type
     * @param {string} type - 'notification' or 'email'
     */
    setCommunicationType(type) {
        if (!['notification', 'email'].includes(type)) {
            throw new Error('Invalid communication type. Must be "notification" or "email"');
        }
        
        this.communicationType = type;
        window.logger?.log('📧 Communication type set to:', type);
    }

    /**
     * Update message data
     * @param {Object} data - Message data to update
     */
    updateMessageData(data) {
        this.messageData = { ...this.messageData, ...data };
    }

    /**
     * Validate message data
     * @returns {Object} Validation result
     */
    validateMessage() {
        const errors = [];

        // Check message body
        if (!this.messageData.body || !this.messageData.body.trim()) {
            errors.push('Message body is required');
        }

        // Check email-specific fields
        if (this.communicationType === 'email') {
            if (!this.messageData.subject || !this.messageData.subject.trim()) {
                errors.push('Subject is required for emails');
            }
            
            if (!this.messageData.senderEmail) {
                errors.push('Sender email is required');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Prepare message for sending
     * @param {string} targetUserId - Target user ID
     * @param {string} languageUsed - Language used for the message
     * @returns {Object} Prepared message data
     */
    prepareMessage(targetUserId, languageUsed = 'en') {
        const validation = this.validateMessage();
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const messageData = {
            target_user_id: targetUserId,
            body: this.messageData.body.trim(),
            signature_used: this.messageData.signature || null,
            language_used: languageUsed
        };

        // Add email-specific fields
        if (this.communicationType === 'email') {
            messageData.subject = this.messageData.subject.trim();
            messageData.sender_email = this.messageData.senderEmail;
        }

        return messageData;
    }

    /**
     * Generate message preview
     * @param {string} greeting - Greeting text
     * @returns {string} Formatted message preview
     */
    generatePreview(greeting) {
        let preview = greeting + '\n\n';
        preview += this.messageData.body;
        
        if (this.messageData.signature) {
            preview += '\n\n' + this.messageData.signature;
        }
        
        return preview;
    }

    /**
     * Clear message data
     */
    clearMessage() {
        this.messageData = {
            subject: '',
            body: '',
            signature: '',
            senderEmail: ''
        };
    }

    /**
     * Get character count for message body
     * @returns {number} Character count
     */
    getCharacterCount() {
        return this.messageData.body ? this.messageData.body.length : 0;
    }

    /**
     * Check if message is empty
     * @returns {boolean} True if message is empty
     */
    isEmpty() {
        return !this.messageData.body || !this.messageData.body.trim();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MessageComposition = MessageComposition;
}
