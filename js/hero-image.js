// Hero image theme sync
(function () {
  function preloadImage(src) {
    var link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
  
  function setHeroForTheme(theme) {
    var el = document.getElementById('hero-image');
    if (!el) return;
    var newSrc = theme === 'light' ? 'icons/here-header-light.jpeg' : 'icons/here-header-dark.jpeg';
    
    // Preload the other image when theme changes for faster future swaps
    if (el.src !== newSrc) {
      var otherSrc = theme === 'light' ? 'icons/here-header-dark.jpeg' : 'icons/here-header-light.jpeg';
      preloadImage(otherSrc);
    }
    
    el.src = newSrc;
  }
  function getTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    return t === 'light' ? 'light' : 'dark';
  }
  document.addEventListener('DOMContentLoaded', function () {
    setHeroForTheme(getTheme());
  });
  window.addEventListener('themeChanged', function (e) {
    setHeroForTheme(e.detail && e.detail.theme ? e.detail.theme : getTheme());
  });
})();


