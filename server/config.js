import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const IS_PROD = process.env.NODE_ENV === 'production';
export const PORT = Number(process.env.PORT) || 3000;
export const HOST = process.env.HOST || (IS_PROD ? '0.0.0.0' : '127.0.0.1');
export const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
export const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');
export const UPLOAD_DIR = path.resolve(ROOT, process.env.UPLOAD_DIR || 'uploads');
export const TRUST_PROXY = process.env.TRUST_PROXY === '1';
export const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === '1' : IS_PROD;
export const SESSION_DAYS = 7;
// Statik fayllar keshini har bir ishga tushirishda yangilash uchun
export const ASSET_VERSION = Date.now().toString(36);
