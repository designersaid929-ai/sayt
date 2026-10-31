import express from 'express';
import crypto from 'node:crypto';
import { one, all, run, tx } from '../db.js';
import { requireRole, hashPassword, passwordProblem, loginProblem, revokeSessions } from '../auth.js';
import { RESOURCES, canAccess } from '../resources.js';
import { validateValue, HttpError } from '../validate.js';
import { SETTINGS_FIELDS, getSettings, saveSettings } from '../settings.js';
import { slugify, today } from '../util.js';
import { DEMO_MODE } from '../config.js';

const router = express.Router();
router.use(requireRole('admin', 'manager'));
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const isAdmin = requireRole('admin');

/* ---------- Meta ma’lumot: panel shakllari shu yerdan quriladi ---------- */

router.get('/meta', (req, res) => {
  const resources = {};
  for (const [name, r] of Object.entries(RESOURCES)) {
    if (!canAccess(r, req.user.role)) continue;
    resources[name] = {
      title: r.title, singular: r.singular, noCreate: !!r.noCreate, list: r.list, listLabels: r.listLabels ?? {},
      fields: r.fields.map(({ junction, ...f }) => f),
    };
  }
  res.json({
    user: req.user,
    resources,
    settings: req.user.role === 'admin' ? SETTINGS_FIELDS : null,
    today: today(),
    demo: DEMO_MODE,
  });
});

router.get('/dashboard', async (_req, res) => {
  const month = today().slice(0, 7);
  const [counts, recentApplications] = await Promise.all([
    one(
      `SELECT
        (SELECT COUNT(*) FROM applications WHERE status = 'new')::int AS "newApplications",
        (SELECT COUNT(*) FROM applications WHERE substr(created_at, 1, 7) = ?)::int AS "monthApplications",
        (SELECT COUNT(*) FROM students WHERE status = 'active')::int AS "activeStudents",
        (SELECT COUNT(*) FROM study_groups WHERE active = 1)::int AS "activeGroups",
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE substr(paid_at, 1, 7) = ?)::float8 AS "monthPayments"`,
      month, month,
    ),
    all('SELECT id, full_name, phone, course_title, status, created_at FROM applications ORDER BY created_at DESC LIMIT 6'),
  ]);
  res.json({ ...counts, recentApplications });
});

/* ---------- Umumiy CRUD ---------- */

function resourceFor(req) {
  const r = RESOURCES[req.params.res];
  if (!r) throw new HttpError(404, 'Bo‘lim topilmadi');
  if (!canAccess(r, req.user.role)) throw new HttpError(403, 'Bu bo‘lim uchun ruxsatingiz yo‘q');
  return r;
}

async function attachMulti(r, rows) {
  for (const f of r.fields.filter((x) => x.type === 'multi')) {
    const { table, self, other } = f.junction;
    const map = new Map();
    for (const link of await all(`SELECT ${self} AS s, ${other} AS o FROM ${table}`)) {
      if (!map.has(link.s)) map.set(link.s, []);
      map.get(link.s).push(link.o);
    }
    for (const row of rows) row[f.key] = map.get(row.id) ?? [];
  }
  return rows;
}

async function collect(r, body, isCreate) {
  const values = {};
  const multis = {};
  const errors = {};
  for (const f of r.fields) {
    if (f.readonly) continue;
    if (!isCreate && !(f.key in body)) continue; // qisman yangilash (masalan, faqat holat)
    const result = validateValue(f, body[f.key]);
    if (result.error) {
      errors[f.key] = result.error;
      continue;
    }
    const v = result.value;
    if (f.type === 'ref' && v !== null && !(await one(`SELECT 1 FROM ${RESOURCES[f.ref].table} WHERE id = ?`, v))) {
      errors[f.key] = `«${f.label}» topilmadi`;
      continue;
    }
    if (f.type === 'multi') {
      if (v.length) {
        const { n } = await one(`SELECT COUNT(*)::int AS n FROM ${RESOURCES[f.ref].table} WHERE id = ANY(?::int[])`, v);
        if (n !== v.length) {
          errors[f.key] = `«${f.label}» ro‘yxatida topilmagan yozuv bor`;
          continue;
        }
      }
      multis[f.key] = v;
    } else {
      values[f.key] = v;
    }
  }
  const extra = r.check?.({ ...values });
  if (extra && isCreate) Object.assign(errors, extra);
  if (Object.keys(errors).length) throw new HttpError(422, 'Ma’lumotlarni tekshiring', errors);
  return { values, multis };
}

async function uniqueSlug(base, id) {
  let slug = slugify(base) || `kurs-${Date.now().toString(36)}`;
  let n = 2;
  const root = slug;
  while (await one('SELECT 1 FROM courses WHERE slug = ? AND id IS DISTINCT FROM ?', slug, id ?? null)) slug = `${root}-${n++}`;
  return slug;
}

async function writeMulti(q, r, id, multis) {
  for (const [key, ids] of Object.entries(multis)) {
    const { table, self, other } = r.fields.find((f) => f.key === key).junction;
    await q.run(`DELETE FROM ${table} WHERE ${self} = ?`, id);
    for (const otherId of ids) await q.run(`INSERT INTO ${table} (${self}, ${other}) VALUES (?, ?)`, id, otherId);
  }
}

async function fetchRow(r, id) {
  const extra = r.extraSelect ? `, ${r.extraSelect}` : '';
  const row = await one(`SELECT ${r.table}.*${extra} FROM ${r.table} WHERE id = ?`, id);
  if (!row) throw new HttpError(404, 'Yozuv topilmadi');
  return (await attachMulti(r, [row]))[0];
}

const parseId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, 'Yozuv topilmadi');
  return n;
};

router.get('/r/:res', async (req, res) => {
  const r = resourceFor(req);
  const where = [];
  const params = [];
  for (const f of r.fields) {
    if (f.filter && req.query[f.key] !== undefined && req.query[f.key] !== '') {
      // ref filtrlari raqam, select filtrlari matn
      where.push(f.type === 'ref' ? `${f.key} = ?::int` : `${f.key} = ?`);
      params.push(String(req.query[f.key]));
    }
  }
  const extra = r.extraSelect ? `, ${r.extraSelect}` : '';
  const rows = await all(
    `SELECT ${r.table}.*${extra} FROM ${r.table} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${r.order} LIMIT 5000`,
    ...params,
  );
  res.json({ rows: await attachMulti(r, rows) });
});

router.get('/r/:res/:id', async (req, res) => {
  const r = resourceFor(req);
  res.json({ row: await fetchRow(r, parseId(req.params.id)) });
});

router.post('/r/:res', async (req, res) => {
  const r = resourceFor(req);
  if (r.noCreate) throw new HttpError(405, 'Bu bo‘limga qo‘lda yozuv qo‘shilmaydi');
  const { values, multis } = await collect(r, req.body ?? {}, true);
  if (r.table === 'courses') values.slug = await uniqueSlug(values.slug || values.title);
  r.beforeSave?.(values, req.user, true);
  const id = await tx(async (q) => {
    const keys = Object.keys(values);
    const { id: newId } = await q.one(
      `INSERT INTO ${r.table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) RETURNING id`,
      ...keys.map((k) => values[k]),
    );
    await writeMulti(q, r, newId, multis);
    return newId;
  });
  res.status(201).json({ row: await fetchRow(r, id) });
});

router.put('/r/:res/:id', async (req, res) => {
  const r = resourceFor(req);
  const id = parseId(req.params.id);
  const current = await fetchRow(r, id);
  const { values, multis } = await collect(r, req.body ?? {}, false);
  if (r.table === 'courses' && ('slug' in values || 'title' in values)) {
    values.slug = await uniqueSlug(values.slug || current.slug || values.title || current.title, id);
  }
  r.beforeSave?.(values, req.user, false);
  if (r.check) {
    const errors = r.check({ ...current, ...values });
    if (errors) throw new HttpError(422, 'Ma’lumotlarni tekshiring', errors);
  }
  await tx(async (q) => {
    const keys = Object.keys(values);
    if (keys.length) {
      await q.run(`UPDATE ${r.table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => values[k]), id);
    }
    await writeMulti(q, r, id, multis);
  });
  res.json({ row: await fetchRow(r, id) });
});

router.delete('/r/:res/:id', async (req, res) => {
  const r = resourceFor(req);
  const id = parseId(req.params.id);
  const row = await fetchRow(r, id);
  await tx(async (q) => {
    await q.run(`DELETE FROM ${r.table} WHERE id = ?`, id);
    if (r.table === 'students' && row.user_id) await q.run("DELETE FROM users WHERE id = ? AND role = 'student'", row.user_id);
  });
  res.json({ ok: true });
});

router.get('/options/:res', async (req, res) => {
  const r = RESOURCES[req.params.res];
  if (!r?.label) throw new HttpError(404, 'Bo‘lim topilmadi');
  res.json({ options: await all(`SELECT id, ${r.label} AS label FROM ${r.table} ORDER BY lower(${r.label})`) });
});

/* ---------- Ariza → o‘quvchi ---------- */

router.post('/applications/:id/convert', async (req, res) => {
  const app = await one('SELECT * FROM applications WHERE id = ?', parseId(req.params.id));
  if (!app) throw new HttpError(404, 'Ariza topilmadi');
  const existing = await one('SELECT id FROM students WHERE phone = ?', app.phone);
  const studentId = await tx(async (q) => {
    const sid = existing?.id ?? (await q.one(
      'INSERT INTO students (full_name, phone, notes) VALUES (?, ?, ?) RETURNING id',
      app.full_name, app.phone, [`Arizadan: ${app.course_title}`, app.comment].filter(Boolean).join('\n'),
    )).id;
    await q.run("UPDATE applications SET status = 'enrolled' WHERE id = ?", app.id);
    return sid;
  });
  res.json({
    ok: true, studentId,
    message: existing ? 'Bu raqamli o‘quvchi avvaldan mavjud. Ariza “O‘qishga yozildi” deb belgilandi.' : 'O‘quvchi ro‘yxatga qo‘shildi',
  });
});

/* ---------- O‘quvchi kabineti uchun hisob ---------- */

router.post('/students/:id/account', async (req, res) => {
  const student = await one('SELECT * FROM students WHERE id = ?', parseId(req.params.id));
  if (!student) throw new HttpError(404, 'O‘quvchi topilmadi');
  const { login, password } = req.body ?? {};
  const pwProblem = passwordProblem(password);
  if (pwProblem) throw new HttpError(422, pwProblem, { password: pwProblem });

  if (student.user_id) {
    await run('UPDATE users SET password_hash = ?, full_name = ?, active = 1 WHERE id = ?', hashPassword(password), student.full_name, student.user_id);
    await revokeSessions(student.user_id);
    return res.json({ ok: true, message: 'Parol yangilandi' });
  }
  const lp = loginProblem(login);
  if (lp) throw new HttpError(422, lp, { login: lp });
  if (await one('SELECT 1 FROM users WHERE lower(login) = lower(?)', login)) throw new HttpError(422, 'Bu login band', { login: 'Bu login band' });
  await tx(async (q) => {
    const { id: uid } = await q.one(
      "INSERT INTO users (role, full_name, login, password_hash) VALUES ('student', ?, ?, ?) RETURNING id",
      student.full_name, login, hashPassword(password),
    );
    await q.run('UPDATE students SET user_id = ? WHERE id = ?', uid, student.id);
  });
  res.json({ ok: true, message: 'Kabinet ochildi' });
});

/* ---------- Davomat ---------- */

router.get('/attendance', async (req, res) => {
  const groupId = Number(req.query.group_id);
  const date = String(req.query.date || '');
  if (!Number.isInteger(groupId) || !(await one('SELECT 1 FROM study_groups WHERE id = ?', groupId))) throw new HttpError(404, 'Guruh topilmadi');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(422, 'Sanani tanlang');
  const lesson = await one('SELECT * FROM lessons WHERE group_id = ? AND date = ?', groupId, date);
  const students = await all(
    `SELECT s.id, s.full_name, a.status FROM group_students gs JOIN students s ON s.id = gs.student_id
     LEFT JOIN attendance a ON a.student_id = s.id AND a.lesson_id = ?
     WHERE gs.group_id = ? ORDER BY lower(s.full_name)`,
    lesson?.id ?? 0, groupId,
  );
  const history = await all(
    `SELECT l.id, l.date, l.topic,
       COUNT(*) FILTER (WHERE a.status = 'present')::int AS present,
       COUNT(*) FILTER (WHERE a.status = 'late')::int AS late,
       COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent
     FROM lessons l LEFT JOIN attendance a ON a.lesson_id = l.id
     WHERE l.group_id = ? GROUP BY l.id ORDER BY l.date DESC LIMIT 60`,
    groupId,
  );
  res.json({ lesson: lesson ?? null, students, history });
});

router.put('/attendance', async (req, res) => {
  const { group_id: groupId, date, topic = '', marks = {} } = req.body ?? {};
  if (!Number.isInteger(Number(groupId)) || !(await one('SELECT 1 FROM study_groups WHERE id = ?', Number(groupId)))) {
    throw new HttpError(404, 'Guruh topilmadi');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new HttpError(422, 'Sanani tanlang');
  if (typeof topic !== 'string' || topic.length > 200) throw new HttpError(422, 'Dars mavzusi juda uzun');
  const members = new Set((await all('SELECT student_id FROM group_students WHERE group_id = ?', Number(groupId))).map((r) => r.student_id));
  const entries = Object.entries(marks).filter(([sid, st]) => members.has(Number(sid)) && ['present', 'absent', 'late'].includes(st));
  if (!entries.length) throw new HttpError(422, 'Kamida bitta o‘quvchini belgilang');
  await tx(async (q) => {
    const { id: lessonId } = await q.one(
      `INSERT INTO lessons (group_id, date, topic) VALUES (?, ?, ?)
       ON CONFLICT (group_id, date) DO UPDATE SET topic = excluded.topic RETURNING id`,
      Number(groupId), date, topic.trim(),
    );
    for (const [sid, st] of entries) {
      await q.run(
        `INSERT INTO attendance (lesson_id, student_id, status) VALUES (?, ?, ?)
         ON CONFLICT (lesson_id, student_id) DO UPDATE SET status = excluded.status`,
        lessonId, Number(sid), st,
      );
    }
  });
  res.json({ ok: true, message: 'Davomat saqlandi' });
});

router.delete('/lessons/:id', async (req, res) => {
  await run('DELETE FROM lessons WHERE id = ?', parseId(req.params.id));
  res.json({ ok: true });
});

/* ---------- Rasm yuklash (bazaga saqlanadi, /uploads/:name orqali beriladi) ---------- */

const IMAGE_TYPES = {
  'image/png': { ext: 'png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': { ext: 'webp', magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
};

router.post('/upload', async (req, res) => {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ''));
  if (!m) throw new HttpError(422, 'Faqat PNG, JPG yoki WEBP rasm yuklash mumkin');
  const buf = Buffer.from(m[2], 'base64');
  const type = IMAGE_TYPES[m[1]];
  if (!type.magic(buf)) throw new HttpError(422, 'Fayl rasm emas yoki shikastlangan');
  if (buf.length > 3 * 1024 * 1024) throw new HttpError(422, 'Rasm hajmi 3 MB dan oshmasin');
  const name = `${crypto.randomBytes(12).toString('hex')}.${type.ext}`;
  await run('INSERT INTO files (name, mime, data) VALUES (?, ?, ?)', name, m[1], buf);
  res.status(201).json({ url: `/uploads/${name}` });
});

/* ---------- Sayt matnlari (faqat admin) ---------- */

router.get('/settings', isAdmin, async (_req, res) => res.json({ values: await getSettings() }));

router.put('/settings', isAdmin, async (req, res) => {
  const body = req.body ?? {};
  const values = {};
  const errors = {};
  for (const f of SETTINGS_FIELDS) {
    if (!(f.key in body)) continue;
    const r = validateValue(f, body[f.key]);
    if (r.error) errors[f.key] = r.error;
    else values[f.key] = r.value ?? '';
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'Ma’lumotlarni tekshiring', errors);
  await saveSettings(values);
  res.json({ ok: true, values: await getSettings(), message: 'Sayt matnlari saqlandi' });
});

/* ---------- Xodimlar hisoblari (faqat admin) ---------- */

router.get('/users', isAdmin, async (_req, res) => {
  res.json({
    rows: await all(
      `SELECT u.id, u.role, u.full_name, u.login, u.active, u.created_at, s.id AS student_id
       FROM users u LEFT JOIN students s ON s.user_id = u.id ORDER BY u.role, lower(u.full_name)`,
    ),
  });
});

router.post('/users', isAdmin, async (req, res) => {
  const { full_name: fullName, login, password, role } = req.body ?? {};
  const errors = {};
  if (typeof fullName !== 'string' || fullName.trim().length < 3) errors.full_name = 'Ism va familiyani kiriting';
  const lp = loginProblem(login);
  if (lp) errors.login = lp;
  else if (await one('SELECT 1 FROM users WHERE lower(login) = lower(?)', login)) errors.login = 'Bu login band';
  const pp = passwordProblem(password);
  if (pp) errors.password = pp;
  if (!['admin', 'manager'].includes(role)) errors.role = 'Rolni tanlang';
  if (Object.keys(errors).length) throw new HttpError(422, 'Ma’lumotlarni tekshiring', errors);
  await run('INSERT INTO users (role, full_name, login, password_hash) VALUES (?, ?, ?, ?)', role, fullName.trim(), login, hashPassword(password));
  res.status(201).json({ ok: true, message: 'Foydalanuvchi qo‘shildi' });
});

router.put('/users/:id', isAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const user = await one('SELECT * FROM users WHERE id = ?', id);
  if (!user) throw new HttpError(404, 'Foydalanuvchi topilmadi');
  const { active, password, role } = req.body ?? {};
  if (id === req.user.id && (active === 0 || active === false || (role && role !== 'admin'))) {
    throw new HttpError(422, 'O‘z hisobingizni o‘chira yoki rolini pasaytira olmaysiz');
  }
  if (role !== undefined && user.role !== 'student' && !['admin', 'manager'].includes(role)) throw new HttpError(422, 'Noto‘g‘ri rol');
  if (password !== undefined) {
    const pp = passwordProblem(password);
    if (pp) throw new HttpError(422, pp, { password: pp });
  }
  await tx(async (q) => {
    if (active !== undefined) await q.run('UPDATE users SET active = ? WHERE id = ?', active ? 1 : 0, id);
    if (role !== undefined && user.role !== 'student') await q.run('UPDATE users SET role = ? WHERE id = ?', role, id);
    if (password !== undefined) await q.run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(password), id);
    if (password !== undefined || (active !== undefined && !active)) {
      await q.run('UPDATE users SET token_version = token_version + 1 WHERE id = ?', id);
    }
  });
  res.json({ ok: true, message: 'Saqlandi' });
});

router.delete('/users/:id', isAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === req.user.id) throw new HttpError(422, 'O‘z hisobingizni o‘chira olmaysiz');
  await run('DELETE FROM users WHERE id = ?', id);
  res.json({ ok: true });
});

export default router;
