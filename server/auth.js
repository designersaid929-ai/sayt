import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { one, run } from './db.js';
import { COOKIE_SECURE, SESSION_DAYS, DATA_DIR } from './config.js';

const SCRYPT = { N: 16384, r: 8, p: 1 };
const COOKIE = 'sid';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, SCRYPT);
  return crypto.timingSafeEqual(actual, expected);
}

// Login mavjud bo‘lmaganda ham vaqt bir xil bo‘lishi uchun
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak';
  if (password.length > 128) return 'Parol juda uzun';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Parolda kamida bitta harf va bitta raqam bo‘lsin';
  return null;
}

export function loginProblem(login) {
  if (typeof login !== 'string' || !/^[a-zA-Z0-9._-]{3,40}$/.test(login)) {
    return 'Login 3–40 ta lotin harfi, raqam yoki . _ - belgilaridan iborat bo‘lsin';
  }
  return null;
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(res, value, maxAgeSec) {
  const parts = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (COOKIE_SECURE) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export async function authenticate(login, password) {
  const user = await one('SELECT * FROM users WHERE lower(login) = lower(?) AND active = 1', String(login));
  const ok = verifyPassword(String(password), user ? user.password_hash : DUMMY_HASH);
  return ok && user ? user : null;
}

/*
 * Sessiya — imzolangan cookie: "foydalanuvchi.versiya.muddat.imzo".
 * Bazada saqlanmaydi, shuning uchun bir nechta server nusxasida (Vercel) ham ishlaydi.
 * Parol o‘zgarganda yoki hisob bloklanganda users.token_version oshiriladi va eski cookie’lar bekor bo‘ladi.
 */
function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, 'session-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('base64url');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}
const SECRET = loadSecret();
const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

export async function startSession(res, userId) {
  const user = await one('SELECT token_version FROM users WHERE id = ?', userId);
  const ttl = SESSION_DAYS * 86400;
  const payload = `${userId}.${user.token_version}.${Date.now() + ttl * 1000}`;
  setCookie(res, `${payload}.${sign(payload)}`, ttl);
}

export function endSession(_req, res) {
  setCookie(res, '', 0);
}

/** Foydalanuvchining barcha ochiq sessiyalarini bekor qiladi. */
export async function revokeSessions(userId) {
  await run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', userId);
}

function verifyToken(token) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.([\w-]+)$/.exec(token || '');
  if (!m) return null;
  const expected = Buffer.from(sign(`${m[1]}.${m[2]}.${m[3]}`));
  const given = Buffer.from(m[4]);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  if (Number(m[3]) < Date.now()) return null;
  return { userId: Number(m[1]), version: Number(m[2]) };
}

export async function loadUser(req, _res, next) {
  const t = verifyToken(parseCookies(req.headers.cookie)[COOKIE]);
  req.user = t
    ? (await one('SELECT id, role, full_name, login FROM users WHERE id = ? AND token_version = ? AND active = 1', t.userId, t.version)) ?? null
    : null;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Tizimga kiring' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Bu amal uchun ruxsatingiz yo‘q' });
    next();
  };
}

/**
 * Saytlararo so‘rovlardan himoya: o‘zgartiruvchi so‘rovlar faqat JSON ko‘rinishida
 * va faqat shu saytning o‘zidan qabul qilinadi.
 */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!req.is('application/json')) return res.status(415).json({ error: 'Noto‘g‘ri so‘rov turi' });
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { host = null; }
    if (host !== req.headers.host) return res.status(403).json({ error: 'Ruxsat etilmagan manba' });
  }
  next();
}

const buckets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 60_000).unref();

export function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = `${req.ip}|${req.baseUrl}${req.path}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.reset < now) {
      b = { count: 0, reset: now + windowMs };
      buckets.set(key, b);
    }
    if (++b.count > max) {
      res.setHeader('Retry-After', Math.ceil((b.reset - now) / 1000));
      return res.status(429).json({ error: message || 'Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.' });
    }
    next();
  };
}
