import express from 'express';
import { all, one } from '../db.js';
import { getSettings } from '../settings.js';
import { SITE_URL } from '../config.js';
import { phoneHref } from '../util.js';
import * as views from '../views.js';

const router = express.Router();

async function common() {
  return {
    s: await getSettings(),
    courses: await all('SELECT * FROM courses WHERE published = 1 ORDER BY sort IS NULL, sort, id'),
  };
}

const published = {
  teachers: () => all('SELECT * FROM teachers WHERE published = 1 ORDER BY sort IS NULL, sort, full_name'),
  results: () => all('SELECT * FROM results WHERE published = 1 ORDER BY sort IS NULL, sort, achieved_at DESC, id DESC'),
  testimonials: () => all('SELECT * FROM testimonials WHERE published = 1 ORDER BY sort IS NULL, sort, id DESC'),
  branches: () => all('SELECT * FROM branches ORDER BY sort IS NULL, sort, id'),
};

function organizationLd(s, branches) {
  const sameAs = ['telegram', 'instagram', 'facebook', 'youtube'].map((k) => s[k]).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: s.site_name,
    url: `${SITE_URL}/`,
    description: s.seo_description,
    logo: `${SITE_URL}${views.logoSources(s).light}`,
    ...(s.phone && { telephone: phoneHref(s.phone).slice(4) }),
    ...(s.email && { email: s.email }),
    ...(s.address && { address: { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'UZ' } }),
    ...(sameAs.length && { sameAs }),
    ...(branches.length && {
      location: branches.map((b) => ({ '@type': 'Place', name: b.name, address: b.address })),
    }),
  };
}

function send(res, opts) {
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(views.layout(opts));
}

router.get('/', async (req, res) => {
  const c = await common();
  const data = { ...c, ...Object.fromEntries(await Promise.all(Object.entries(published).map(async ([k, fn]) => [k, await fn()]))) };
  send(res, { ...c, path: '/', body: views.homePage(data), jsonLd: organizationLd(c.s, data.branches), hero3d: true });
});

router.get('/kurslar', async (req, res) => {
  const c = await common();
  send(res, { ...c, path: '/kurslar', title: 'Kurslar', description: `Kurslarimiz: ${c.courses.map((x) => x.title).join(', ')}.`, body: views.coursesPage(c) });
});

router.get('/kurslar/:slug', async (req, res, next) => {
  const c = await common();
  const course = await one('SELECT * FROM courses WHERE slug = ? AND published = 1', req.params.slug);
  if (!course) return next();
  send(res, {
    ...c, path: `/kurslar/${course.slug}`, title: course.title, description: course.short_desc || undefined,
    body: views.courseDetailPage({ ...c, course }),
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Course', name: course.title, description: course.short_desc || course.title,
      provider: { '@type': 'EducationalOrganization', name: c.s.site_name, sameAs: `${SITE_URL}/` },
    },
  });
});

router.get('/ustozlar', async (req, res) => {
  const c = await common();
  send(res, { ...c, path: '/ustozlar', title: 'Ustozlar', body: views.teachersPage({ teachers: await published.teachers() }) });
});

router.get('/natijalar', async (req, res) => {
  const c = await common();
  send(res, { ...c, path: '/natijalar', title: 'Natijalar', body: views.resultsPage({ results: await published.results() }) });
});

router.get('/biz-haqimizda', async (req, res) => {
  const c = await common();
  send(res, { ...c, path: '/biz-haqimizda', title: 'Biz haqimizda', body: views.aboutPage({ ...c, testimonials: await published.testimonials() }) });
});

router.get('/aloqa', async (req, res) => {
  const c = await common();
  const branches = await published.branches();
  send(res, { ...c, path: '/aloqa', title: 'Aloqa', body: views.contactPage({ ...c, branches }), jsonLd: organizationLd(c.s, branches) });
});

router.get('/robots.txt', async (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /kabinet\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

router.get('/sitemap.xml', async (req, res) => {
  const paths = ['/', '/kurslar', '/ustozlar', '/natijalar', '/biz-haqimizda', '/aloqa',
    ...(await all('SELECT slug FROM courses WHERE published = 1')).map((r) => `/kurslar/${r.slug}`)];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')}
</urlset>`);
});

export async function notFound(req, res) {
  const c = await common();
  res.status(404);
  send(res, { ...c, path: req.path, title: 'Sahifa topilmadi', body: views.notFoundPage(), noindex: true });
}

export default router;
