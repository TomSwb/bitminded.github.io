// EmailJS contact form integration
// Replace the following with your actual EmailJS values:
const EMAILJS_USER_ID = 'PMThQQhGg_pKJ-OIc';
const EMAILJS_SERVICE_ID = 'service_bitmindedcontact';
const EMAILJS_TEMPLATE_ID = 'contact_us_bitminded';

document.addEventListener('DOMContentLoaded', function () {
    emailjs.init(EMAILJS_USER_ID);

    const form = document.getElementById('contact-form');
    const statusDiv = document.getElementById('form-status');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = {
            name: form.name.value,
            email: form.email.value,
            message: form.message.value,
            title: 'Contact Form Submission',
            time: new Date().toLocaleString()
        };

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, formData)
            .then(function () {
                statusDiv.textContent = 'Message sent successfully!';
                form.reset();
            }, function (error) {
                statusDiv.textContent = 'Failed to send message. Please try again.';
            });
    });
});
