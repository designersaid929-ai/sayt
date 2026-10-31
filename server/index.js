import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { PUBLIC_DIR, UPLOAD_DIR, IS_PROD, PORT, HOST, TRUST_PROXY, SITE_URL } from './config.js';
import { loadUser, csrfGuard } from './auth.js';
import { HttpError } from './validate.js';
import { seed } from './seed.js';
import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';
import pageRoutes, { notFound } from './routes/pages.js';

seed();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY ? 1 : false);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "frame-src https://www.youtube-nocookie.com https://www.google.com https://maps.google.com https://yandex.uz https://yandex.ru https://yandex.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  if (IS_PROD && SITE_URL.startsWith('https://')) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(compression());

const staticOpts = { index: false, maxAge: IS_PROD ? '30d' : 0 };
app.use(express.static(PUBLIC_DIR, { ...staticOpts, extensions: [] }));
app.use('/uploads', express.static(UPLOAD_DIR, { index: false, maxAge: '30d', immutable: true }));

app.use('/api/admin/upload', express.json({ limit: '6mb' }));
app.use('/api', express.json({ limit: '100kb' }), csrfGuard, loadUser);
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Topilmadi' }));

const appShell = (file) => (_req, res) => {
  res.set({ 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex' });
  res.sendFile(path.join(PUBLIC_DIR, file));
};
app.get('/admin', appShell('admin.html'));
app.get('/kabinet', appShell('kabinet.html'));

app.use(pageRoutes);
app.use(notFound);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err instanceof HttpError ? err.status : err.type === 'entity.too.large' ? 413 : err.status === 400 ? 400 : 500;
  if (status === 500) console.error(err);
  const message = err instanceof HttpError ? err.message
    : status === 413 ? 'Yuborilgan ma’lumot hajmi juda katta'
      : status === 400 ? 'Noto‘g‘ri so‘rov' : 'Serverda xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.';
  if (req.path.startsWith('/api')) return res.status(status).json({ error: message, fields: err.fields });
  res.status(status).type('text/plain').send(message);
});

app.listen(PORT, HOST, () => {
  console.log(`Sayt ishga tushdi: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
