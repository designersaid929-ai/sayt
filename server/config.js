import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const IS_PROD = process.env.NODE_ENV === 'production';
export const PORT = Number(process.env.PORT) || 3000;
export const HOST = process.env.HOST || (IS_PROD ? '0.0.0.0' : '127.0.0.1');
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
export const SITE_URL = (process.env.SITE_URL || (vercelUrl ? `https://${vercelUrl}` : `http://localhost:${PORT}`)).replace(/\/+$/, '');
export const ON_VERCEL = !!process.env.VERCEL;
// Ma’lumotlar Supabase (Postgres) bazasida. Lokal papka faqat sessiya kaliti va birinchi kirish fayli uchun.
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const DB_SCHEMA = process.env.DB_SCHEMA || 'bilimziyo';
export const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || (ON_VERCEL ? '/tmp/data' : 'data'));
export const DEMO_MODE = process.env.DEMO_MODE === '1';
export const TRUST_PROXY = process.env.TRUST_PROXY === '1' || !!process.env.VERCEL;
export const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === '1' : IS_PROD || !!process.env.VERCEL;
export const SESSION_DAYS = 7;
// Statik fayllar keshini har bir ishga tushirishda yangilash uchun
export const ASSET_VERSION = Date.now().toString(36);
