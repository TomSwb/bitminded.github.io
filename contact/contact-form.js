// Contact form integration with Supabase edge function
// Using Resend for professional email delivery

document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('contact-form');
    const statusDiv = document.getElementById('form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const emailInput = form.querySelector('#email');

    // Check if user is logged in and pre-fill email
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        
        if (user && user.email) {
            // User is logged in - pre-fill and lock email field
            emailInput.value = user.email;
            emailInput.disabled = true;
            emailInput.classList.add('email-locked');
            
            console.log('✅ Auto-filled email for logged-in user:', user.email);
        }
    } catch (error) {
        console.log('User not logged in, email field remains editable');
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        statusDiv.textContent = '';
        statusDiv.className = '';

        const formData = {
            name: form.name.value.trim(),
            email: emailInput.value.trim(), // Use emailInput directly (works even when disabled)
            message: form.message.value.trim()
        };

        // Basic validation
        if (!formData.name || !formData.email || !formData.message) {
            showError('Please fill in all fields');
            resetButton();
            return;
        }

        if (formData.message.length < 10) {
            showError('Message is too short (minimum 10 characters)');
            resetButton();
            return;
        }

        try {
            // Call Supabase edge function
            const response = await fetch(
                'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/send-contact-email',
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
                showSuccess('Message sent successfully! We\'ll get back to you soon.');
                form.reset();
            } else {
                showError(result.error || 'Failed to send message. Please try again.');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            showError('Failed to send message. Please check your connection and try again.');
        } finally {
            resetButton();
        }
    });

    function showSuccess(message) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-success';
        statusDiv.style.color = '#10b981';
        statusDiv.style.padding = '12px';
        statusDiv.style.marginTop = '16px';
        statusDiv.style.borderRadius = '6px';
        statusDiv.style.backgroundColor = '#d1fae5';
    }

    function showError(message) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-error';
        statusDiv.style.color = '#ef4444';
        statusDiv.style.padding = '12px';
        statusDiv.style.marginTop = '16px';
        statusDiv.style.borderRadius = '6px';
        statusDiv.style.backgroundColor = '#fee2e2';
    }

    function resetButton() {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
    }
});
