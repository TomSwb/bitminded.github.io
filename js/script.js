// script.js
// Consolidated JavaScript for BitMinded website
// Handles menu toggle, theme toggle, and other interactive features

// ===== MENU FUNCTIONALITY =====

function toggleMenu() {
    const menu = document.querySelector('.menu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Close menu when clicking outside of it
document.addEventListener('click', function(event) {
    const menu = document.querySelector('.menu');
    const hamburger = document.querySelector('.hamburger');
    const langSwitcher = document.querySelector('.lang-switcher');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (menu && menu.classList.contains('active') && 
        !menu.contains(event.target) && 
        !hamburger.contains(event.target) &&
        !langSwitcher.contains(event.target) &&
        !themeToggle.contains(event.target)) {
        menu.classList.remove('active');
    }
});

// Close menu when clicking on a menu item (navigation)
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.pages');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const menu = document.querySelector('.menu');
            if (menu) {
                menu.classList.remove('active');
            }
        });
    });
});

// ===== THEME TOGGLE FUNCTIONALITY =====

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    const html = document.documentElement;

    // Apply saved theme on page load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        html.setAttribute('data-theme', 'light');
        if (icon) {
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" stroke="currentColor" stroke-width="2"/>
            `;
        }
    } else if (savedTheme === 'dark') {
        html.removeAttribute('data-theme');
        if (icon) {
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>
            `;
        }
    }

    if (!toggleBtn || !icon) {
        return;
    }

    toggleBtn.onclick = function() {
        if (html.getAttribute('data-theme') === 'light') {
            html.removeAttribute('data-theme');
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>
            `;
            localStorage.setItem('theme', 'dark');
        } else {
            html.setAttribute('data-theme', 'light');
            icon.innerHTML = `
                <circle cx="12" cy="12" r="5" fill="currentColor" />
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" stroke="currentColor" stroke-width="2"/>
            `;
            localStorage.setItem('theme', 'light');
        }
    };
});

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('BitMinded website initialized');
    
    // Any additional initialization code can go here
});
