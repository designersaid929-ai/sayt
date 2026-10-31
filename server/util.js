const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, '')
    .split('')
    .map((c) => CYRILLIC[c] ?? c)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  return `${String(Math.round(Number(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`;
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  return `${m[1]}-yil ${Number(m[3])}-${MONTHS[Number(m[2]) - 1]}`;
}

/** "+998 90 123 45 67" ko‘rinishiga keltiradi yoki null qaytaradi. */
export function normalizePhone(input) {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.length === 9) d = `998${d}`;
  if (!/^998\d{9}$/.test(d)) return null;
  return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

export function phoneHref(phone) {
  return `tel:+${String(phone).replace(/\D/g, '')}`;
}

export function youtubeId(url) {
  let u;
  try { u = new URL(String(url).trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else id = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
