import { esc, formatMoney, formatDate, phoneHref, youtubeId } from './util.js';
import { TIME_OPTIONS, FORMAT_OPTIONS } from './resources.js';
import { ASSET_VERSION, SITE_URL } from './config.js';

const v = (url) => `${url}?v=${ASSET_VERSION}`;


const NAV = [
  ['/', 'Bosh sahifa'],
  ['/kurslar', 'Kurslar'],
  ['/ustozlar', 'Ustozlar'],
  ['/natijalar', 'Natijalar'],
  ['/biz-haqimizda', 'Biz haqimizda'],
  ['/aloqa', 'Aloqa'],
];

/* ---------- Belgilar (SVG sprite) ---------- */

const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFBB0"/><stop offset=".45" stop-color="#FFF000"/><stop offset="1" stop-color="#E0A800"/>
  </linearGradient>
</defs>
<symbol id="i-globe" viewBox="0 0 48 48"><g fill="none" stroke="url(#g-gold)" stroke-width="3.2" stroke-linecap="round"><circle cx="24" cy="24" r="15"/><path d="M9 24h30M24 9c5 4.5 6.5 9.5 6.5 15S29 34.5 24 39c-5-4.5-6.5-9.5-6.5-15S19 13.5 24 9z"/></g></symbol>
<symbol id="i-award" viewBox="0 0 48 48"><g fill="none" stroke="url(#g-gold)" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"><circle cx="24" cy="19" r="10"/><path d="M17.5 27 14 41l10-5 10 5-3.5-14"/></g><path fill="url(#g-gold)" d="m24 13.5 1.8 3.6 4 .6-2.9 2.8.7 4L24 22.6l-3.6 1.9.7-4-2.9-2.8 4-.6z"/></symbol>
<symbol id="i-cap" viewBox="0 0 48 48"><path fill="url(#g-gold)" d="M24 9 3 19l21 10 21-10z"/><path fill="none" stroke="url(#g-gold)" stroke-width="3.2" stroke-linecap="round" d="M12 24v9c3.5 3.5 8 5 12 5s8.5-1.5 12-5v-9M41 20.5V31"/></symbol>
<symbol id="i-pi" viewBox="0 0 48 48"><path fill="none" stroke="url(#g-gold)" stroke-width="4" stroke-linecap="round" d="M10 15c2-2.5 4.5-3 8-3h20M19 13v24M30 13v18c0 4 2 6 6 5"/></symbol>
<symbol id="i-book" viewBox="0 0 48 48"><g fill="none" stroke="url(#g-gold)" stroke-width="3.2" stroke-linejoin="round"><path d="M24 14c-4-3-9.5-4-16-3.5V37c6.5-.5 12 .5 16 3.5 4-3 9.5-4 16-3.5V10.5c-6.5-.5-12 .5-16 3.5z"/><path d="M24 14v26.5"/></g></symbol>
<symbol id="i-atom" viewBox="0 0 48 48"><g fill="none" stroke="url(#g-gold)" stroke-width="2.8"><ellipse cx="24" cy="24" rx="17" ry="7"/><ellipse cx="24" cy="24" rx="17" ry="7" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="17" ry="7" transform="rotate(-60 24 24)"/></g><circle cx="24" cy="24" r="3.5" fill="url(#g-gold)"/></symbol>
<symbol id="i-code" viewBox="0 0 48 48"><path fill="none" stroke="url(#g-gold)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" d="M17 15 8 24l9 9M31 15l9 9-9 9M27 11l-6 26"/></symbol>
<symbol id="i-pen" viewBox="0 0 48 48"><path fill="none" stroke="url(#g-gold)" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" d="M31 9 39 17 18 38H10v-8zM27 13l8 8"/></symbol>
<symbol id="i-spark" viewBox="0 0 48 48"><path fill="url(#g-gold)" d="M24 6c1.5 9 4 12 13 14-9 2-11.5 5-13 14-1.5-9-4-12-13-14 9-2 11.5-5 13-14z"/><path fill="url(#g-gold)" d="M37 29c.6 3.5 1.6 4.6 5 5.3-3.4.7-4.4 1.8-5 5.3-.6-3.5-1.6-4.6-5-5.3 3.4-.7 4.4-1.8 5-5.3z"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g></symbol>
<symbol id="i-wallet" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12.5h2M3 9h18"/></g></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></g></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></g></symbol>
<symbol id="i-telegram" viewBox="0 0 24 24"><path fill="currentColor" d="M21.4 4.3 2.9 11.4c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5zM9.7 14.3l8.6-5.4c.4-.3.8-.1.5.2l-7.3 6.6-.3 3.1z"/></symbol>
<symbol id="i-instagram" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></symbol>
<symbol id="i-facebook" viewBox="0 0 24 24"><path fill="currentColor" d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z"/></symbol>
<symbol id="i-youtube" viewBox="0 0 24 24"><path fill="currentColor" d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.3.4-2.5.4-3.8s-.1-2.5-.4-3.8zM10 15V9l5.2 3z"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></g></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></symbol>
<symbol id="i-dcheck" viewBox="0 0 28 20"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m2 10.5 5 5L17 4"/><path d="m10 10.5 5 5L25 4" opacity=".45"/></g></symbol>
<symbol id="i-sparkle" viewBox="0 0 24 24"><path fill="currentColor" d="M10 4c.7 4.4 2.1 5.8 6.5 6.5C12.1 11.2 10.7 12.6 10 17c-.7-4.4-2.1-5.8-6.5-6.5C7.9 9.8 9.3 8.4 10 4zm8-2c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5z"/></symbol>
<symbol id="i-laptop" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/></g></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.8 2.7 2.5 3 5.2"/></g></symbol>
<symbol id="i-calendar" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></g><path fill="currentColor" d="m12 12.6.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></symbol>
</svg>`;

const icon = (name, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
/** Rangli gradient doira ichidagi oq belgi (kurs kartalaridagi uslub). */
const toneIcon = (name, tone, size = '') => `<span class="tone-icon tone-${tone}${size ? ` tone-icon-${size}` : ''}" aria-hidden="true">${icon(name)}</span>`;

/* ---------- Umumiy qismlar ---------- */

export const DEFAULT_LOGO = { dark: '/assets/brand/logo-dark.png', light: '/assets/brand/logo-light.png' };

/** Qorong‘i va yorug‘ fon uchun logotiplar; qaysi biri ko‘rinishini CSS hal qiladi. */
export function logoSources(s) {
  const dark = s.logo || DEFAULT_LOGO.dark;
  const light = s.logo_light || (s.logo ? s.logo : DEFAULT_LOGO.light);
  return { dark, light };
}

function logoImg(s, cls = 'brand-logo') {
  const { dark, light } = logoSources(s);
  const src = (u) => esc(u.startsWith('/assets/') ? v(u) : u);
  return `<img class="${cls} logo-on-dark" src="${src(dark)}" alt="${esc(s.site_name)}" height="44" decoding="async">`
    + `<img class="${cls} logo-on-light" src="${src(light)}" alt="${esc(s.site_name)}" height="44" decoding="async">`;
}

const themeToggle = () => `<button class="theme-toggle" type="button" data-theme-toggle aria-label="Rejimni almashtirish">${icon('sun', 'ico i-sun')}${icon('moon', 'ico i-moon')}</button>`;

function header(path, s) {
  const links = NAV.map(([href, label]) => {
    const active = href === '/' ? path === '/' : path.startsWith(href);
    return `<li><a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a></li>`;
  }).join('');
  return `<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${esc(s.site_name)} — bosh sahifa">${logoImg(s)}</a>
    <nav class="main-nav" id="main-nav" aria-label="Asosiy menyu"><ul>${links}</ul>
      <button class="btn btn-gold nav-cta" type="button" data-enroll>Kursga yozilish</button>
    </nav>
    <div class="header-actions">
      ${themeToggle()}
      <button class="btn btn-gold btn-sm header-cta" type="button" data-enroll>Kursga yozilish</button>
      <button class="nav-toggle" type="button" aria-controls="main-nav" aria-expanded="false" aria-label="Menyuni ochish"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;
}

function socials(s, cls = 'socials') {
  const items = [
    ['telegram', 'Telegram'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'],
  ].filter(([k]) => s[k]);
  if (!items.length) return '';
  return `<ul class="${cls}">${items.map(([k, label]) => `<li><a href="${esc(s[k])}" target="_blank" rel="noopener" aria-label="${label}">${icon(k)}</a></li>`).join('')}</ul>`;
}

function footer(s) {
  const year = new Date().getFullYear();
  const contacts = [
    s.phone && `<li>${toneIcon('phone', 'blue', 'sm')}<a href="${phoneHref(s.phone)}">${esc(s.phone)}</a></li>`,
    s.phone2 && `<li>${toneIcon('phone', 'blue', 'sm')}<a href="${phoneHref(s.phone2)}">${esc(s.phone2)}</a></li>`,
    s.email && `<li>${toneIcon('mail', 'orange', 'sm')}<a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>`,
    s.address && `<li>${toneIcon('pin', 'green', 'sm')}<span>${esc(s.address)}</span></li>`,
  ].filter(Boolean).join('');
  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a href="/" class="brand" aria-label="${esc(s.site_name)}">${logoImg(s)}</a>
      <p>${esc(s.hero_subtitle)}</p>
      ${socials(s)}
    </div>
    <nav aria-label="Sayt bo‘limlari"><h2 class="footer-title">Bo‘limlar</h2><ul class="footer-links">${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></nav>
    <div><h2 class="footer-title">Aloqa</h2>${contacts ? `<ul class="footer-contacts">${contacts}</ul>` : '<p class="muted">Aloqa ma’lumotlari tez orada joylanadi.</p>'}
      <button class="btn btn-gold btn-sm" type="button" data-enroll style="margin-top:18px">Kursga yozilish</button></div>
  </div>
  <div class="container footer-bottom">
    <p>© ${year} ${esc(s.site_name)}. Barcha huquqlar himoyalangan.</p>
    <p><a href="/kabinet">O‘quvchi kabineti</a></p>
  </div>
</footer>`;
}

export function enrollForm(courses, { id = 'enroll', inline = false } = {}) {
  const options = courses.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
  const times = TIME_OPTIONS.map((t) => `<option value="${t.value}">${esc(t.label)}</option>`).join('');
  return `<form class="enroll-form${inline ? ' is-inline' : ''}" data-enroll-form novalidate>
  <div class="field"><label for="${id}-name">Ism va familiya</label>
    <input id="${id}-name" name="full_name" autocomplete="name" maxlength="120" required placeholder="Masalan: Aziza Karimova">
    <p class="field-error" data-error="full_name"></p></div>
  <div class="field"><label for="${id}-phone">Telefon raqami</label>
    <input id="${id}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+998 90 123 45 67" data-phone>
    <p class="field-error" data-error="phone"></p></div>
  <div class="field-row">
    <div class="field"><label for="${id}-course">Tanlangan kurs</label>
      <select id="${id}-course" name="course" required>
        <option value="" disabled selected>Kursni tanlang</option>${options}
        <option value="consult">Bepul maslahat kerak</option>
      </select>
      <p class="field-error" data-error="course"></p></div>
    <div class="field"><label for="${id}-time">Qulay vaqt</label>
      <select id="${id}-time" name="preferred_time" required>
        <option value="" disabled selected>Vaqtni tanlang</option>${times}
      </select>
      <p class="field-error" data-error="preferred_time"></p></div>
  </div>
  <fieldset class="field format-field"><legend>O‘qish formati <span class="muted">(ixtiyoriy)</span></legend>
    <div class="format-options">${FORMAT_OPTIONS.map((f) => `<label class="format-chip"><input type="radio" name="study_format" value="${f.value}"><span>${esc(f.label)}</span></label>`).join('')}</div>
  </fieldset>
  <div class="field"><label for="${id}-comment">Qo‘shimcha izoh <span class="muted">(ixtiyoriy)</span></label>
    <textarea id="${id}-comment" name="comment" rows="3" maxlength="1000" placeholder="Darajangiz, maqsadingiz yoki savollaringiz"></textarea>
    <p class="field-error" data-error="comment"></p></div>
  <div class="hp" aria-hidden="true"><label>Veb-sayt <input name="website" tabindex="-1" autocomplete="off"></label></div>
  <p class="form-alert" role="alert" data-form-alert hidden></p>
  <button class="btn btn-gold btn-block" type="submit"><span>Ariza yuborish</span></button>
  <p class="form-note">Tugmani bosish orqali siz bilan bog‘lanishimizga rozilik bildirasiz.</p>
</form>`;
}

function enrollDialog(courses) {
  return `<dialog class="modal" id="enroll-dialog" aria-labelledby="enroll-title">
  <div class="modal-card">
    <button class="modal-close" type="button" data-close aria-label="Yopish">×</button>
    <div data-form-view>
      <p class="eyebrow">Ariza</p>
      <h2 id="enroll-title" class="modal-title">Kursga yozilish</h2>
      <p class="modal-lead">Ma’lumotlaringizni qoldiring — mutaxassislarimiz tez orada siz bilan bog‘lanishadi.</p>
      ${enrollForm(courses)}
    </div>
    <div class="success-view" data-success-view hidden>
      <div class="success-badge">${icon('check')}</div>
      <h2 class="modal-title">Rahmat!</h2>
      <p class="modal-lead" data-success-text>Arizangiz qabul qilindi.</p>
      <button class="btn btn-ghost" type="button" data-close>Yopish</button>
    </div>
  </div>
</dialog>`;
}

export function layout({ path, title, description, body, s, courses, jsonLd, noindex = false, hero3d = false }) {
  const pageTitle = title ? `${title} — ${s.site_name}` : `${s.site_name} — ${s.hero_title}`;
  const desc = description || s.seo_description;
  const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
  const ogImage = `${SITE_URL}${s.logo || DEFAULT_LOGO.light}`;
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script src="${v('/js/theme.js')}"></script>
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#020B24">
<meta property="og:type" content="website">
<meta property="og:locale" content="uz_UZ">
<meta property="og:site_name" content="${esc(s.site_name)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${v('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap">
<link rel="stylesheet" href="${v('/css/site.css')}">
<script src="${v('/js/site.js')}" defer${hero3d ? ` data-hero3d="${v('/js/hero3d.js')}"` : ''}></script>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
${SPRITE}
<a class="skip-link" href="#main">Asosiy mazmunga o‘tish</a>
<div class="bg-glow" aria-hidden="true"></div>
${header(path, s)}
<main id="main">
${body}
</main>
${footer(s)}
${enrollDialog(courses)}
</body>
</html>`;
}

/* ---------- Bo‘lak komponentlar ---------- */

function sectionHead({ eyebrow, title, lead, link, h = 'h2' }) {
  return `<div class="section-head" data-reveal>
    <div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<${h} class="section-title">${title}</${h}>${lead ? `<p class="section-lead">${lead}</p>` : ''}</div>
    ${link ? `<a class="link-more" href="${link[0]}">${link[1]} ${icon('arrow')}</a>` : ''}
  </div>`;
}

function emptyState(text) {
  return `<div class="empty-state" data-reveal>${toneIcon('spark', 'blue', 'lg')}<p>${text}</p></div>`;
}

const COURSE_PALETTE = ['blue', 'orange', 'green', 'dark', 'purple', 'cyan'];

/** Kartadagi ro‘yxat: admin kiritgan bandlar yoki qisqa tavsif + davomiylik + narx. */
function courseFeatures(c) {
  const lines = String(c.features || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (lines.length) return lines.map(esc);
  return [
    c.short_desc && esc(c.short_desc),
    c.duration && `Davomiyligi: ${esc(c.duration)}`,
    c.price != null ? `Narxi: ${formatMoney(c.price)} / oy` : 'Narx bo‘yicha bepul maslahat oling',
  ].filter(Boolean);
}

function courseTone(c, courses) {
  if (c.color && c.color !== 'auto') return c.color;
  const i = Math.max(0, courses.findIndex((x) => x.id === c.id));
  return COURSE_PALETTE[i % COURSE_PALETTE.length];
}

function courseCard(c, all) {
  const color = courseTone(c, all);
  return `<article class="course-card tone-${color}" data-reveal>
  <header class="course-head">
    <span class="course-icon">${icon(c.icon || 'book', 'course-icon-svg')}</span>
    <h3 class="course-title"><a href="/kurslar/${esc(c.slug)}">${esc(c.title)}</a></h3>
  </header>
  <ul class="course-features">
    ${courseFeatures(c).map((f) => `<li>${icon('dcheck', 'dcheck')}<span>${f}</span></li>`).join('')}
  </ul>
  <button class="btn course-cta" type="button" data-enroll="${c.id}">Birinchi darsga yoziling ${icon('sparkle', 'ico')}</button>
</article>`;
}

// all — barcha kurslar ro‘yxati: kurs qaysi sahifada chiqmasin, rangi bir xil bo‘lsin
function coursesGrid(courses, all = courses) {
  return courses.length
    ? `<div class="course-grid">${courses.map((c) => courseCard(c, all)).join('')}</div>`
    : emptyState('Kurslar ro‘yxati tez orada e’lon qilinadi.');
}

const WHY = [
  ['Tajribali ustozlar', 'Darslarni o‘z fanini chuqur biladigan va natijaga yo‘naltirilgan mutaxassislar olib boradi.', 'cap'],
  ['Zamonaviy ta’lim usullari', 'Interaktiv mashg‘ulotlar, amaliy topshiriqlar va zamonaviy o‘quv materiallaridan foydalanamiz.', 'atom'],
  ['Individual yondashuv', 'Har bir o‘quvchining darajasi va maqsadi hisobga olinib, o‘quv rejasi tuziladi.', 'spark'],
  ['O‘quvchilar natijalari', 'O‘quvchilarimizning yutuqlari va imtihon natijalarini ochiq ko‘rsatib boramiz.', 'award'],
  ['Qulay dars jadvali', 'Dars vaqtini o‘qish yoki ish jadvalingizga moslab tanlashingiz mumkin.', 'book'],
];

const WHY_ICONS = ['cap', 'atom', 'spark', 'award', 'book', 'globe', 'pen'];

/** "chap | o‘ng" qatorlaridan iborat matnni juftliklarga ajratadi. */
function pairs(text) {
  return String(text || '').split('\n').map((line) => line.split('|').map((x) => x.trim()))
    .filter(([a, b]) => a && b !== undefined);
}

// Band sarlavhasidagi kalit so‘z bo‘yicha mos belgi
const WHY_KEYWORDS = [
  [/coworking|mustaqil/i, 'laptop'], [/ustoz|o‘qituvchi|o'qituvchi/i, 'users'], [/yakshanba|tadbir/i, 'calendar'],
  [/joylash|lokatsiya|manzil|filial/i, 'pin'], [/dastur|kitob|oxford/i, 'book'], [/natija|sertifikat/i, 'award'],
  [/jadval|vaqt/i, 'clock'], [/usul|zamonaviy/i, 'atom'], [/yondashuv|individual/i, 'spark'],
];
const whyIcon = (title, i) => WHY_KEYWORDS.find(([re]) => re.test(title))?.[1] ?? WHY_ICONS[i % WHY_ICONS.length];

function whySection(s) {
  const custom = pairs(s.why_items).map(([t, d], i) => [esc(t), esc(d), whyIcon(t, i)]);
  const items = custom.length ? custom : WHY;
  return `<section class="section" id="afzalliklar">
  <div class="container">
    ${sectionHead({ eyebrow: 'Afzalliklarimiz', title: 'Nega bizni tanlashadi?', lead: 'Sifatli ta’lim — aniq tizim, kuchli jamoa va har bir o‘quvchiga e’tibor demakdir.' })}
    <div class="why-grid${items.length === 5 ? '' : ' auto'}">
      ${items.map(([t, d, ic], i) => `<article class="why-card tone-${COURSE_PALETTE[i % COURSE_PALETTE.length]}" data-reveal style="--d:${i * 70}ms">
        <header class="course-head"><span class="course-icon">${icon(ic, 'course-icon-svg')}</span><h3 class="why-title">${t}</h3></header>
        <p class="card-text">${d}</p></article>`).join('')}
    </div>
  </div>
</section>`;
}

function statsStrip(s) {
  const items = pairs(s.stats);
  if (!items.length) return '';
  return `<section class="stats-strip" aria-label="Raqamlarda"><div class="container"><ul class="stats-grid">
    ${items.map(([value, label], i) => `<li class="tone-${COURSE_PALETTE[i % COURSE_PALETTE.length]}" data-reveal style="--d:${i * 60}ms"><strong>${esc(value)}</strong><span>${esc(label)}</span></li>`).join('')}
  </ul></div></section>`;
}

function faqSection(faqs, { head = true } = {}) {
  if (!faqs.length) return '';
  return `<section class="section" id="savollar"><div class="container faq-wrap">
    ${head ? sectionHead({ eyebrow: 'Savol-javob', title: 'Ko‘p so‘raladigan savollar' }) : ''}
    <div class="faq-list">
      ${faqs.map((f) => `<details class="faq-item" data-reveal><summary>${esc(f.question)}</summary><div class="faq-answer">${esc(f.answer).replace(/\n/g, '<br>')}</div></details>`).join('')}
    </div>
  </div></section>`;
}

export function faqLd(faqs) {
  return faqs.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  } : null;
}

function resultCard(r) {
  return `<article class="result-card" data-reveal>
  ${r.image ? `<a class="result-media" href="${esc(r.image)}" target="_blank" rel="noopener"><img src="${esc(r.image)}" alt="${esc(r.student_name)} — ${esc(r.exam)} sertifikati" loading="lazy" decoding="async"></a>` : ''}
  <div class="result-body">
    <div class="result-top"><span class="result-exam">${esc(r.exam)}</span>${r.score ? `<span class="result-score">${esc(r.score)}</span>` : ''}</div>
    <h3 class="card-title">${esc(r.student_name)}</h3>
    ${r.description ? `<p class="card-text">${esc(r.description)}</p>` : ''}
    ${r.achieved_at ? `<p class="result-date">${formatDate(r.achieved_at)}</p>` : ''}
  </div>
</article>`;
}

function resultsGrid(results) {
  return results.length
    ? `<div class="grid grid-3">${results.map(resultCard).join('')}</div>`
    : emptyState('O‘quvchilarimizning haqiqiy natijalari va sertifikatlari tez orada shu yerda e’lon qilinadi.');
}

function initials(name) {
  return esc(String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase());
}

function teacherCard(t) {
  const achievements = String(t.achievements || '').split('\n').map((x) => x.trim()).filter(Boolean);
  return `<article class="teacher-card" data-reveal>
  <div class="teacher-photo">${t.photo ? `<img src="${esc(t.photo)}" alt="${esc(t.full_name)}" loading="lazy" decoding="async">` : `<span class="avatar">${initials(t.full_name)}</span>`}</div>
  <div class="teacher-body">
    <h3 class="card-title">${esc(t.full_name)}</h3>
    ${t.specialty ? `<p class="teacher-role">${esc(t.specialty)}</p>` : ''}
    ${t.experience ? `<p class="teacher-exp">${toneIcon('clock', 'purple', 'xs')} Tajribasi: ${esc(t.experience)}</p>` : ''}
    ${achievements.length ? `<ul class="check-list">${achievements.map((a) => `<li>${icon('dcheck', 'dcheck')}<span>${esc(a)}</span></li>`).join('')}</ul>` : ''}
  </div>
</article>`;
}

function teachersGrid(teachers) {
  return teachers.length
    ? `<div class="grid grid-4">${teachers.map(teacherCard).join('')}</div>`
    : emptyState('Ustozlarimiz haqidagi ma’lumotlar tez orada joylanadi.');
}

function testimonialCard(t) {
  const vid = t.video_url ? youtubeId(t.video_url) : null;
  return `<article class="quote-card" data-reveal>
  ${vid ? `<button class="video-facade" type="button" data-youtube="${vid}" aria-label="${esc(t.author)} videosini ko‘rish">
      <img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" alt="" loading="lazy" decoding="async"><span class="play">${icon('play')}</span></button>` : ''}
  ${t.text ? `<blockquote><p>${esc(t.text)}</p></blockquote>` : ''}
  <footer class="quote-author">
    ${t.photo ? `<img src="${esc(t.photo)}" alt="" loading="lazy" width="44" height="44">` : `<span class="avatar avatar-sm">${initials(t.author)}</span>`}
    <div><strong>${esc(t.author)}</strong>${t.role_text ? `<span>${esc(t.role_text)}</span>` : ''}</div>
  </footer>
</article>`;
}

function testimonialsSection(items, { head = true } = {}) {
  return `<section class="section" id="fikrlar"><div class="container">
    ${head ? sectionHead({ eyebrow: 'Fikrlar', title: 'O‘quvchilar fikrlari', lead: 'O‘quvchilarimiz va ularning ota-onalari biz haqimizda nima deyishadi.' }) : ''}
    ${items.length ? `<div class="grid grid-3 masonry">${items.map(testimonialCard).join('')}</div>` : emptyState('O‘quvchilarimizning fikrlari va video-sharhlari tez orada shu yerda paydo bo‘ladi.')}
  </div></section>`;
}

function ctaBand() {
  return `<section class="section"><div class="container">
  <div class="cta-band" data-reveal>
    <div><h2 class="section-title">Birinchi qadamni bugun qo‘ying</h2>
    <p class="section-lead">Darajangizni aniqlab, maqsadingizga mos kursni birgalikda tanlaymiz. Maslahat bepul.</p></div>
    <div class="cta-actions"><button class="btn btn-gold btn-lg" type="button" data-enroll="consult">Bepul maslahat olish</button>
    <a class="btn btn-ghost btn-lg" href="/kurslar">Kurslarni ko‘rish</a></div>
  </div></div></section>`;
}

function contactBlock(s, branches) {
  const info = [
    s.phone && `<li>${toneIcon('phone', 'blue')}<div><span>Telefon</span><a href="${phoneHref(s.phone)}">${esc(s.phone)}</a></div></li>`,
    s.phone2 && `<li>${toneIcon('phone', 'blue')}<div><span>Qo‘shimcha telefon</span><a href="${phoneHref(s.phone2)}">${esc(s.phone2)}</a></div></li>`,
    s.telegram && `<li>${toneIcon('telegram', 'cyan')}<div><span>Telegram</span><a href="${esc(s.telegram)}" target="_blank" rel="noopener">Telegram orqali yozish</a></div></li>`,
    s.email && `<li>${toneIcon('mail', 'orange')}<div><span>Elektron pochta</span><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></div></li>`,
    s.address && `<li>${toneIcon('pin', 'green')}<div><span>Manzil</span><p>${esc(s.address)}</p></div></li>`,
    s.work_hours && `<li>${toneIcon('clock', 'purple')}<div><span>Ish vaqti</span><p>${esc(s.work_hours)}</p></div></li>`,
  ].filter(Boolean).join('');
  const branchCards = branches.map((b) => `<article class="branch-card" data-reveal>
    ${b.map_url ? `<div class="map-wrap"><iframe src="${esc(b.map_url)}" title="${esc(b.name)} xaritada" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>` : ''}
    <div class="branch-body"><h3 class="card-title">${esc(b.name)}</h3>
      <ul class="contact-list compact">
        <li>${toneIcon('pin', 'green', 'sm')}<p>${esc(b.address)}</p></li>
        ${b.phone ? `<li>${toneIcon('phone', 'blue', 'sm')}<a href="${phoneHref(b.phone)}">${esc(b.phone)}</a></li>` : ''}
        ${b.hours ? `<li>${toneIcon('clock', 'purple', 'sm')}<p>${esc(b.hours)}</p></li>` : ''}
      </ul></div></article>`).join('');
  return { info, branchCards };
}

/* ---------- Sahifalar ---------- */

function heroTitle(title) {
  // “bilim” so‘zini oltin rangda ajratib ko‘rsatamiz
  return esc(title).replace(/(bilim)/i, '<span class="hl">$1</span>');
}

export function homePage(d) {
  const { s, courses, results, teachers, testimonials, branches, faqs } = d;
  const { info } = contactBlock(s, branches);
  return `
<section class="hero">
  <div class="container hero-grid">
    <div class="hero-copy">
      ${s.hero_badge ? `<p class="badge" data-reveal><span class="dot"></span>${esc(s.hero_badge)}</p>` : ''}
      <h1 class="hero-title" data-reveal style="--d:80ms">${heroTitle(s.hero_title)}</h1>
      <p class="hero-lead" data-reveal style="--d:160ms">${esc(s.hero_subtitle)}</p>
      <div class="hero-cta" data-reveal style="--d:240ms">
        <a class="btn btn-gold btn-lg" href="/kurslar">Kurslarni ko‘rish ${icon('arrow')}</a>
        <button class="btn btn-ghost btn-lg" type="button" data-enroll="consult">Bepul maslahat olish</button>
        ${s.school_url ? `<a class="btn btn-ghost btn-lg" href="${esc(s.school_url)}" target="_blank" rel="noopener">Xususiy maktab ${icon('arrow')}</a>` : ''}
      </div>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <div class="hero-halo"></div>
      <div class="hero-fallback">
        <svg viewBox="0 0 200 200"><defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF7A8"/><stop offset=".5" stop-color="#FFD84A"/><stop offset="1" stop-color="#B07A00"/></linearGradient></defs>
        <path fill="url(#tg)" d="M62 40h76v28c0 24-16 42-38 44-22-2-38-20-38-44z"/><path fill="none" stroke="url(#tg)" stroke-width="8" d="M62 50H44c0 20 8 30 22 32M138 50h18c0 20-8 30-22 32"/>
        <rect x="92" y="110" width="16" height="26" fill="url(#tg)"/><rect x="70" y="136" width="60" height="14" rx="4" fill="url(#tg)"/><rect x="60" y="150" width="80" height="16" rx="5" fill="#0B45A0"/></svg>
      </div>
      <canvas class="hero-canvas" data-hero3d></canvas>
    </div>
  </div>
</section>
${statsStrip(s)}

<section class="section" id="kurslar">
  <div class="container">
    ${sectionHead({ eyebrow: 'Kurslar', title: 'Kurslarimiz', lead: 'O‘zingizga mos yo‘nalishni tanlang va bugunoq o‘qishni boshlang.', link: ['/kurslar', 'Barcha kurslar'] })}
    ${coursesGrid(courses.slice(0, 6), courses)}
  </div>
</section>

${whySection(s)}

<section class="section" id="natijalar">
  <div class="container">
    ${sectionHead({ eyebrow: 'Natijalar', title: 'O‘quvchilarimiz yutuqlari', lead: 'Faqat haqiqiy natijalar: imtihon ballari, sertifikatlar va yutuqlar.', link: results.length ? ['/natijalar', 'Barcha natijalar'] : null })}
    ${resultsGrid(results.slice(0, 6))}
  </div>
</section>

<section class="section" id="ustozlar">
  <div class="container">
    ${sectionHead({ eyebrow: 'Jamoa', title: 'Ustozlarimiz', lead: 'Bilim va tajribasini sizning muvaffaqiyatingizga bag‘ishlagan jamoa.', link: teachers.length ? ['/ustozlar', 'Barcha ustozlar'] : null })}
    ${teachersGrid(teachers.slice(0, 4))}
  </div>
</section>

${testimonialsSection(testimonials.slice(0, 6))}
${faqSection(faqs)}
${ctaBand()}

<section class="section" id="aloqa">
  <div class="container contact-grid">
    <div data-reveal>
      ${sectionHead({ eyebrow: 'Aloqa', title: 'Biz bilan bog‘laning', lead: 'Savollaringiz bo‘lsa, qo‘ng‘iroq qiling yoki ariza qoldiring.' })}
      ${info ? `<ul class="contact-list">${info}</ul>` : ''}
      ${socials(s, 'socials socials-lg')}
      <a class="link-more" href="/aloqa">Filiallar va xarita ${icon('arrow')}</a>
    </div>
    <div class="form-card" data-reveal><h3 class="card-title">Ariza qoldiring</h3>${enrollForm(courses, { id: 'home', inline: true })}</div>
  </div>
</section>`;
}

function pageHero(eyebrow, title, lead) {
  return `<section class="page-hero"><div class="container">
    <p class="eyebrow" data-reveal>${eyebrow}</p>
    <h1 class="page-title" data-reveal style="--d:60ms">${title}</h1>
    ${lead ? `<p class="section-lead" data-reveal style="--d:120ms">${lead}</p>` : ''}
  </div></section>`;
}

export function coursesPage({ courses }) {
  return `${pageHero('Kurslar', 'Barcha kurslar', 'Har bir kurs aniq maqsad, tizimli dastur va muntazam nazorat asosida tashkil etilgan.')}
<section class="section section-tight"><div class="container">${coursesGrid(courses)}</div></section>
${ctaBand()}`;
}

export function courseDetailPage({ course: c, courses }) {
  const body = c.description && c.description !== c.short_desc ? c.description : '';
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim()).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const others = courses.filter((x) => x.id !== c.id).slice(0, 3);
  return `<section class="page-hero"><div class="container course-hero">
    <div>
      <nav class="crumbs" aria-label="Yo‘l"><a href="/">Bosh sahifa</a><span>/</span><a href="/kurslar">Kurslar</a><span>/</span><span aria-current="page">${esc(c.title)}</span></nav>
      <h1 class="page-title" data-reveal>${esc(c.title)}</h1>
      <p class="section-lead" data-reveal>${esc(c.short_desc)}</p>
    </div>
    <span class="course-icon course-icon-xl tone-${courseTone(c, courses)}" data-reveal aria-hidden="true">${icon(c.icon || 'book', 'course-icon-svg')}</span>
  </div></section>
<section class="section section-tight"><div class="container course-layout">
  <article class="prose" data-reveal>${paragraphs || '<p>Kurs dasturi, dars jadvali va narxlar haqida batafsil ma’lumot olish uchun ariza qoldiring — mutaxassislarimiz siz bilan bog‘lanib, darajangizga mos guruhni tanlashda yordam berishadi.</p>'}</article>
  <aside class="course-aside" data-reveal>
    <h2 class="card-title">Kurs haqida</h2>
    <dl class="facts">
      <div><dt>Davomiyligi</dt><dd>${c.duration ? esc(c.duration) : 'Darajangizga qarab belgilanadi'}</dd></div>
      <div><dt>Narxi</dt><dd>${c.price != null ? `${formatMoney(c.price)} / oy` : 'Maslahat davomida aytiladi'}</dd></div>
    </dl>
    <button class="btn btn-gold btn-block" type="button" data-enroll="${c.id}">Kursga yozilish</button>
    <button class="btn btn-ghost btn-block" type="button" data-enroll="consult">Bepul maslahat olish</button>
  </aside>
</div></section>
${others.length ? `<section class="section"><div class="container">${sectionHead({ eyebrow: 'Yana', title: 'Boshqa kurslar', link: ['/kurslar', 'Barcha kurslar'] })}${coursesGrid(others, courses)}</div></section>` : ''}`;
}

export function teachersPage({ teachers }) {
  return `${pageHero('Jamoa', 'Ustozlarimiz', 'Bilim va tajribasini sizning muvaffaqiyatingizga bag‘ishlagan jamoa.')}
<section class="section section-tight"><div class="container">${teachersGrid(teachers)}</div></section>${ctaBand()}`;
}

export function resultsPage({ results }) {
  return `${pageHero('Natijalar', 'O‘quvchilarimiz yutuqlari', 'Bu bo‘limda faqat o‘quvchilarimizning haqiqiy imtihon natijalari, sertifikatlari va yutuqlari e’lon qilinadi.')}
<section class="section section-tight"><div class="container">${resultsGrid(results)}</div></section>${ctaBand()}`;
}

export function aboutPage({ s, testimonials, faqs = [] }) {
  const paragraphs = String(s.about_text).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  return `${pageHero('Biz haqimizda', esc(s.about_title), '')}
<section class="section section-tight"><div class="container about-grid">
  <div class="prose" data-reveal>${paragraphs}</div>
  <div class="about-card" data-reveal>
    <span class="course-icon course-icon-xl tone-orange" aria-hidden="true">${icon('award', 'course-icon-svg')}</span>
    <h2 class="card-title">Bizning maqsadimiz</h2>
    <p class="card-text">Har bir o‘quvchi o‘z maqsadiga ishonch bilan erishishi uchun puxta bilim va to‘g‘ri yo‘nalish berish.</p>
    <button class="btn btn-gold" type="button" data-enroll="consult">Bepul maslahat olish</button>
  </div>
</div></section>
${statsStrip(s)}
${whySection(s)}
${testimonialsSection(testimonials)}
${faqSection(faqs)}`;
}

export function contactPage({ s, branches, courses }) {
  const { info, branchCards } = contactBlock(s, branches);
  return `${pageHero('Aloqa', 'Filiallar va aloqa', 'Bizga qo‘ng‘iroq qiling, Telegram orqali yozing yoki ariza qoldiring — tez orada javob beramiz.')}
<section class="section section-tight"><div class="container contact-grid">
  <div data-reveal>
    ${info ? `<ul class="contact-list">${info}</ul>` : '<p class="muted">Aloqa ma’lumotlari tez orada joylanadi.</p>'}
    ${socials(s, 'socials socials-lg')}
  </div>
  <div class="form-card" data-reveal><h2 class="card-title">Ariza qoldiring</h2>${enrollForm(courses, { id: 'contact', inline: true })}</div>
</div></section>
${branchCards ? `<section class="section"><div class="container">${sectionHead({ eyebrow: 'Filiallar', title: 'Bizning manzillarimiz' })}<div class="grid grid-2">${branchCards}</div></div></section>` : ''}`;
}

export function notFoundPage() {
  return `<section class="page-hero not-found"><div class="container">
    <p class="eyebrow">404</p><h1 class="page-title">Sahifa topilmadi</h1>
    <p class="section-lead">Siz izlagan sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan.</p>
    <div class="hero-cta"><a class="btn btn-gold" href="/">Bosh sahifaga qaytish</a><a class="btn btn-ghost" href="/kurslar">Kurslarni ko‘rish</a></div>
  </div></section>`;
}
