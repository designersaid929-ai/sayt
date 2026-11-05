import { all, tx } from './db.js';

export const SETTINGS_FIELDS = [
  { key: 'site_name', label: 'Markaz nomi', type: 'text', required: true, max: 80, default: 'BilimZiyo o‘quv markazi' },
  { key: 'logo', label: 'Logotip (qorong‘i fon uchun)', type: 'image', hint: 'Bo‘sh qoldirilsa, BilimZiyo logotipi ishlatiladi. PNG, JPG yoki WEBP, shaffof fonli PNG tavsiya etiladi.', default: '' },
  { key: 'logo_light', label: 'Logotip (yorug‘ fon uchun)', type: 'image', hint: 'Yozuvi to‘q rangdagi variant. Bo‘sh qoldirilsa, yuqoridagi logotip ishlatiladi.', default: '' },
  { key: 'hero_badge', label: 'Bosh ekran: yuqori yozuv', type: 'text', max: 60, default: 'Zamonaviy ta’lim markazi' },
  { key: 'hero_title', label: 'Bosh ekran: sarlavha', type: 'text', required: true, max: 90, default: 'Kelajagingizni bilim bilan yarating!' },
  {
    key: 'hero_subtitle', label: 'Bosh ekran: izoh', type: 'textarea', max: 300,
    default: 'Maqsadingizga mos kursni tanlang, tajribali ustozlardan ta’lim oling va orzularingiz sari dadil qadam tashlang.',
  },
  { key: 'about_title', label: '“Biz haqimizda” sarlavhasi', type: 'text', max: 90, default: 'Bilim — eng ishonchli sarmoya' },
  {
    key: 'about_text', label: '“Biz haqimizda” matni', type: 'textarea', max: 3000,
    default: 'Markazimiz o‘quvchilarga sifatli va zamonaviy ta’lim berishni o‘z oldiga maqsad qilib qo‘ygan. Biz har bir o‘quvchining salohiyatini ochish, unga aniq maqsad belgilash va shu maqsadga erishishida yordam berish uchun ishlaymiz.\n\nDarslarimizda nazariy bilim amaliyot bilan uyg‘unlashadi: o‘quvchi nimani, nima uchun va qanday o‘rganayotganini aniq tushunadi.',
  },
  {
    key: 'stats', label: 'Raqamlar bloki', type: 'textarea', max: 600, default: '',
    hint: 'Har qatorda: raqam | izoh. Masalan: 15 yil | tajriba. Bo‘sh qoldirilsa, blok ko‘rsatilmaydi.',
  },
  {
    key: 'why_items', label: '“Nega bizni tanlashadi?” bandlari', type: 'textarea', max: 2000, default: '',
    hint: 'Har qatorda: sarlavha | izoh. Bo‘sh qoldirilsa, standart bandlar ko‘rsatiladi.',
  },
  { key: 'school_url', label: '“Xususiy maktab” havolasi', type: 'url', default: '', hint: 'To‘ldirilsa, bosh ekranda tugma chiqadi' },
  { key: 'phone', label: 'Telefon raqami', type: 'phone', default: '' },
  { key: 'phone2', label: 'Qo‘shimcha telefon', type: 'phone', default: '' },
  { key: 'email', label: 'Elektron pochta', type: 'email', default: '' },
  { key: 'address', label: 'Asosiy manzil', type: 'text', max: 200, default: '' },
  {
    key: 'map_url', label: 'Asosiy xarita (embed havola)', type: 'mapurl', default: '',
    hint: 'Google Maps → Ulashish → Xaritani joylashtirish → iframe kodini to‘liq qo‘ying. Bosh sahifa va “Aloqa”da chiqadi.',
  },
  { key: 'work_hours', label: 'Ish vaqti', type: 'text', max: 100, default: '' },
  { key: 'telegram', label: 'Telegram havolasi', type: 'url', default: '' },
  { key: 'instagram', label: 'Instagram havolasi', type: 'url', default: '' },
  { key: 'facebook', label: 'Facebook havolasi', type: 'url', default: '' },
  { key: 'youtube', label: 'YouTube havolasi', type: 'url', default: '' },
  {
    key: 'seo_description', label: 'Qidiruv tizimlari uchun tavsif', type: 'textarea', max: 300,
    default: 'Ingliz tili, IELTS, SAT, matematika va rus tili kurslari. Tajribali ustozlar, zamonaviy ta’lim usullari va qulay dars jadvali.',
  },
];

// Qisqa muddatli kesh: bir nechta server nusxasida ham o‘zgarishlar tez orada ko‘rinadi
const TTL_MS = 15_000;
let cache = null;
let cachedAt = 0;

export async function getSettings() {
  if (!cache || Date.now() - cachedAt > TTL_MS) {
    const stored = Object.fromEntries((await all('SELECT key, value FROM settings')).map((r) => [r.key, r.value]));
    const next = {};
    for (const f of SETTINGS_FIELDS) next[f.key] = stored[f.key] ?? f.default ?? '';
    cache = next;
    cachedAt = Date.now();
  }
  return cache;
}

export async function saveSettings(values) {
  await tx(async (q) => {
    for (const [key, value] of Object.entries(values)) {
      await q.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', key, String(value ?? ''));
    }
  });
  cache = null;
}
