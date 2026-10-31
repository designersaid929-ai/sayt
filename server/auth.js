import crypto from 'node:crypto';
import { one, run } from './db.js';
import { COOKIE_SECURE, SESSION_DAYS } from './config.js';

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

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

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

export function authenticate(login, password) {
  const user = one('SELECT * FROM users WHERE login = ? AND active = 1', String(login));
  const ok = verifyPassword(String(password), user ? user.password_hash : DUMMY_HASH);
  return ok && user ? user : null;
}

export function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = SESSION_DAYS * 86400;
  run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', sha256(token), userId, Date.now() + ttl * 1000);
  run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
  setCookie(res, token, ttl);
}

export function endSession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', sha256(token));
  setCookie(res, '', 0);
}

export function loadUser(req, _res, next) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  req.user = null;
  if (token) {
    req.user = one(
      `SELECT u.id, u.role, u.full_name, u.login FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
      sha256(token), Date.now(),
    ) ?? null;
  }
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
