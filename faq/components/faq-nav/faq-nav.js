/**
 * FAQ Navigation Component
 * Handles active state highlighting based on current page
 */
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.faq-nav__link');
    
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        if (currentPath === linkPath || currentPath.startsWith(linkPath + '/')) {
            link.setAttribute('aria-current', 'page');
        }
    });
});

