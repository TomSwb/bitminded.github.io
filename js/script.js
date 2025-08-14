function toggleMenu() {
    document.querySelector('.menu').classList.toggle('active');
}

// Close menu when clicking outside of it
document.addEventListener('click', function(event) {
    const menu = document.querySelector('.menu');
    const hamburger = document.querySelector('.hamburger');
    
    // If menu is open and click is outside menu and hamburger
    if (menu.classList.contains('active') && 
        !menu.contains(event.target) && 
        !hamburger.contains(event.target)) {
        menu.classList.remove('active');
    }
});

// Close menu when clicking on a menu item (navigation)
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.pages');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            document.querySelector('.menu').classList.remove('active');
        });
    });
});