// Qorong‘i/yorug‘ rejim. <head> ichida sinxron yuklanadi — sahifa “miltillamasligi” uchun.
(() => {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: light)');
  const stored = () => {
    try { return localStorage.getItem('theme'); } catch { return null; }
  };
  const resolve = () => {
    const t = stored();
    return t === 'light' || t === 'dark' ? t : media.matches ? 'light' : 'dark';
  };

  function apply(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#F4F7FD' : '#020B24');
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-label', theme === 'light' ? 'Qorong‘i rejimga o‘tish' : 'Yorug‘ rejimga o‘tish');
      b.title = b.getAttribute('aria-label');
    });
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }

  root.classList.add('js');
  apply(resolve());

  // Foydalanuvchi o‘zi tanlamagan bo‘lsa, tizim sozlamasiga ergashamiz
  media.addEventListener('change', () => { if (!stored()) apply(resolve()); });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-theme-toggle]')) return;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', next); } catch { /* maxfiy rejim — faqat shu sahifa uchun */ }
    apply(next);
  });
  document.addEventListener('DOMContentLoaded', () => apply(root.dataset.theme));
})();
