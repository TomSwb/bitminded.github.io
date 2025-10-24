/**
 * Signature Selector Utility
 * Handles signature management and selection
 */

class SignatureSelector {
    constructor() {
        this.signatures = [];
        this.defaultSignature = null;
    }

    /**
     * Load signatures from database
     * @param {Object} supabaseClient - Supabase client instance
     * @param {string} adminId - Admin user ID
     */
    async loadSignatures(supabaseClient, adminId) {
        try {
            const { data: signatures, error } = await supabaseClient
                .from('communication_signatures')
                .select('id, name, content, is_default')
                .eq('admin_id', adminId)
                .order('is_default', { ascending: false });

            if (error) {
                throw new Error(`Failed to load signatures: ${error.message}`);
            }

            this.signatures = signatures || [];
            this.defaultSignature = this.signatures.find(sig => sig.is_default) || null;
            
            console.log('📝 Signatures loaded:', this.signatures);
            return this.signatures;

        } catch (error) {
            console.error('❌ Failed to load signatures:', error);
            this.signatures = [];
            this.defaultSignature = null;
            return [];
        }
    }

    /**
     * Populate signature dropdown
     * @param {HTMLElement} selectElement - Select element to populate
     */
    populateDropdown(selectElement) {
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '';

        // Add default "No signature" option
        const noSignatureOption = document.createElement('option');
        noSignatureOption.value = '';
        noSignatureOption.textContent = 'No signature';
        selectElement.appendChild(noSignatureOption);

        // Add signature options
        this.signatures.forEach(signature => {
            const option = document.createElement('option');
            option.value = signature.content;
            option.textContent = signature.name;
            if (signature.is_default) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    /**
     * Get signature by ID
     * @param {string} signatureId - Signature ID
     * @returns {Object|null} Signature object or null
     */
    getSignatureById(signatureId) {
        return this.signatures.find(sig => sig.id === signatureId) || null;
    }

    /**
     * Get default signature
     * @returns {Object|null} Default signature or null
     */
    getDefaultSignature() {
        return this.defaultSignature;
    }

    /**
     * Create a new signature
     * @param {Object} supabaseClient - Supabase client instance
     * @param {string} adminId - Admin user ID
     * @param {string} name - Signature name
     * @param {string} content - Signature content
     * @param {boolean} isDefault - Whether this is the default signature
     */
    async createSignature(supabaseClient, adminId, name, content, isDefault = false) {
        try {
            // If this is set as default, unset other defaults
            if (isDefault) {
                await supabaseClient
                    .from('communication_signatures')
                    .update({ is_default: false })
                    .eq('admin_id', adminId);
            }

            const { data, error } = await supabaseClient
                .from('communication_signatures')
                .insert({
                    admin_id: adminId,
                    name: name,
                    content: content,
                    is_default: isDefault
                })
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to create signature: ${error.message}`);
            }

            // Reload signatures
            await this.loadSignatures(supabaseClient, adminId);
            
            return data;

        } catch (error) {
            console.error('❌ Failed to create signature:', error);
            throw error;
        }
    }

    /**
     * Update signature
     * @param {Object} supabaseClient - Supabase client instance
     * @param {string} signatureId - Signature ID
     * @param {Object} updates - Updates to apply
     */
    async updateSignature(supabaseClient, signatureId, updates) {
        try {
            const { data, error } = await supabaseClient
                .from('communication_signatures')
                .update(updates)
                .eq('id', signatureId)
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to update signature: ${error.message}`);
            }

            return data;

        } catch (error) {
            console.error('❌ Failed to update signature:', error);
            throw error;
        }
    }

    /**
     * Delete signature
     * @param {Object} supabaseClient - Supabase client instance
     * @param {string} signatureId - Signature ID
     */
    async deleteSignature(supabaseClient, signatureId) {
        try {
            const { error } = await supabaseClient
                .from('communication_signatures')
                .delete()
                .eq('id', signatureId);

            if (error) {
                throw new Error(`Failed to delete signature: ${error.message}`);
            }

        } catch (error) {
            console.error('❌ Failed to delete signature:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SignatureSelector = SignatureSelector;
}
