import { normalizePhone, youtubeId } from './util.js';

export const DAYS = [
  { value: 'du', label: 'Dushanba', short: 'Du' },
  { value: 'se', label: 'Seshanba', short: 'Se' },
  { value: 'ch', label: 'Chorshanba', short: 'Chor' },
  { value: 'pa', label: 'Payshanba', short: 'Pay' },
  { value: 'ju', label: 'Juma', short: 'Ju' },
  { value: 'sh', label: 'Shanba', short: 'Shan' },
  { value: 'ya', label: 'Yakshanba', short: 'Yak' },
];

// Bo‘sh bo‘lganda '' saqlanadigan turlar; qolganlari (raqam, sana, havola) null bo‘ladi
const STRING_TYPES = new Set(['text', 'textarea', 'slug', 'image', 'url', 'video', 'mapurl', 'email', 'phone', 'month', 'select', 'time', 'days']);

const MAP_PREFIXES = [
  'https://www.google.com/maps/embed',
  'https://maps.google.com/maps',
  'https://yandex.uz/map-widget/',
  'https://yandex.ru/map-widget/',
  'https://yandex.com/map-widget/',
];

function isEmpty(raw) {
  return raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '') || (Array.isArray(raw) && raw.length === 0);
}

function wrong(label) {
  return { error: `«${label}» noto‘g‘ri kiritilgan` };
}

/** Bitta maydon qiymatini tekshiradi: { value } yoki { error } qaytaradi. */
export function validateValue(field, raw) {
  const { label, type } = field;
  if (type === 'bool') return { value: raw === true || raw === 1 || raw === '1' || raw === 'on' ? 1 : 0 };
  if (isEmpty(raw)) {
    if (field.required) return { error: `«${label}» maydonini to‘ldiring` };
    if (type === 'multi') return { value: [] };
    return { value: STRING_TYPES.has(type) ? '' : null };
  }

  switch (type) {
    case 'text':
    case 'textarea':
    case 'slug': {
      if (typeof raw !== 'string' && typeof raw !== 'number') return wrong(label);
      const s = String(raw).trim();
      const max = field.max ?? (type === 'textarea' ? 5000 : 200);
      if (s.length > max) return { error: `«${label}» juda uzun (ko‘pi bilan ${max} ta belgi)` };
      if (field.min && s.length < field.min) return { error: `«${label}» juda qisqa` };
      return { value: s };
    }
    case 'number': {
      const n = Number(raw);
      if (!Number.isInteger(n) || Math.abs(n) > 1e9) return wrong(label);
      return { value: n };
    }
    case 'money': {
      const n = Number(String(raw).replace(/[\s ]/g, ''));
      if (!Number.isInteger(n) || n < 0 || n > 2e9) return { error: `«${label}» butun musbat son bo‘lishi kerak` };
      return { value: n };
    }
    case 'decimal': {
      const n = Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > 1e6) return wrong(label);
      return { value: Math.round(n * 100) / 100 };
    }
    case 'date': {
      const s = String(raw);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) return wrong(label);
      return { value: s };
    }
    case 'time':
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw)) ? { value: String(raw) } : wrong(label);
    case 'month':
      return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(raw)) ? { value: String(raw) } : wrong(label);
    case 'select': {
      const s = String(raw);
      return field.options.some((o) => o.value === s) ? { value: s } : wrong(label);
    }
    case 'phone': {
      const p = normalizePhone(raw);
      return p ? { value: p } : { error: `«${label}»: raqamni +998 XX XXX XX XX ko‘rinishida kiriting` };
    }
    case 'email': {
      const s = String(raw).trim();
      return s.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? { value: s } : wrong(label);
    }
    case 'url': {
      const s = String(raw).trim();
      try {
        const u = new URL(s);
        if (!['http:', 'https:'].includes(u.protocol) || s.length > 500) return wrong(label);
      } catch {
        return { error: `«${label}»: to‘liq havolani kiriting (https://...)` };
      }
      return { value: s };
    }
    case 'video': {
      const s = String(raw).trim();
      return youtubeId(s) ? { value: s } : { error: `«${label}»: YouTube havolasini kiriting` };
    }
    case 'mapurl': {
      const s = String(raw).trim();
      // Foydalanuvchi butun <iframe> kodini joylasa, undan src ni ajratib olamiz
      const src = s.match(/src="([^"]+)"/)?.[1] ?? s;
      return MAP_PREFIXES.some((p) => src.startsWith(p)) && src.length <= 2000
        ? { value: src }
        : { error: `«${label}»: Google Maps yoki Yandex Xaritalar “embed” havolasini kiriting` };
    }
    case 'image': {
      const s = String(raw);
      return /^\/uploads\/[a-z0-9]+\.(png|jpe?g|webp)$/.test(s) ? { value: s } : wrong(label);
    }
    case 'ref': {
      const n = Number(raw);
      return Number.isInteger(n) && n > 0 ? { value: n } : wrong(label);
    }
    case 'multi': {
      if (!Array.isArray(raw)) return wrong(label);
      const ids = [...new Set(raw.map(Number))];
      return ids.every((n) => Number.isInteger(n) && n > 0) ? { value: ids } : wrong(label);
    }
    case 'days': {
      const list = Array.isArray(raw) ? raw : String(raw).split(',');
      const valid = DAYS.map((d) => d.value);
      if (!list.every((d) => valid.includes(d))) return wrong(label);
      return { value: valid.filter((d) => list.includes(d)).join(',') };
    }
    default:
      return wrong(label);
  }
}

export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
