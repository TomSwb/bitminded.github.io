// Hero image theme sync
(function () {
  function setHeroForTheme(theme) {
    var el = document.getElementById('hero-image');
    if (!el) return;
    el.src = theme === 'light' ? 'icons/here-header-light.jpeg' : 'icons/here-header-dark.jpeg';
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


