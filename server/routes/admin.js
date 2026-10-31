import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, one, all, run, tx } from '../db.js';
import { requireRole, hashPassword, passwordProblem, loginProblem } from '../auth.js';
import { RESOURCES, canAccess } from '../resources.js';
import { validateValue, HttpError } from '../validate.js';
import { SETTINGS_FIELDS, getSettings, saveSettings } from '../settings.js';
import { slugify, today } from '../util.js';
import { UPLOAD_DIR, DEMO_MODE } from '../config.js';

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

router.get('/dashboard', (_req, res) => {
  const month = today().slice(0, 7);
  res.json({
    newApplications: one("SELECT COUNT(*) AS n FROM applications WHERE status = 'new'").n,
    monthApplications: one("SELECT COUNT(*) AS n FROM applications WHERE substr(created_at, 1, 7) = ?", month).n,
    activeStudents: one("SELECT COUNT(*) AS n FROM students WHERE status = 'active'").n,
    activeGroups: one('SELECT COUNT(*) AS n FROM study_groups WHERE active = 1').n,
    monthPayments: one('SELECT COALESCE(SUM(amount), 0) AS n FROM payments WHERE substr(paid_at, 1, 7) = ?', month).n,
    recentApplications: all(
      'SELECT id, full_name, phone, course_title, status, created_at FROM applications ORDER BY created_at DESC LIMIT 6',
    ),
  });
});

/* ---------- Umumiy CRUD ---------- */

function resourceFor(req) {
  const r = RESOURCES[req.params.res];
  if (!r) throw new HttpError(404, 'Bo‘lim topilmadi');
  if (!canAccess(r, req.user.role)) throw new HttpError(403, 'Bu bo‘lim uchun ruxsatingiz yo‘q');
  return r;
}

function attachMulti(r, rows) {
  for (const f of r.fields.filter((x) => x.type === 'multi')) {
    const { table, self, other } = f.junction;
    const map = new Map();
    for (const link of all(`SELECT ${self} AS s, ${other} AS o FROM ${table}`)) {
      if (!map.has(link.s)) map.set(link.s, []);
      map.get(link.s).push(link.o);
    }
    for (const row of rows) row[f.key] = map.get(row.id) ?? [];
  }
  return rows;
}

function collect(r, body, isCreate) {
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
    if (f.type === 'ref' && v !== null && !one(`SELECT 1 FROM ${RESOURCES[f.ref].table} WHERE id = ?`, v)) {
      errors[f.key] = `«${f.label}» topilmadi`;
      continue;
    }
    if (f.type === 'multi') {
      if (v.length) {
        const found = one(`SELECT COUNT(*) AS n FROM ${RESOURCES[f.ref].table} WHERE id IN (${v.map(() => '?').join(',')})`, ...v).n;
        if (found !== v.length) {
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

function uniqueSlug(base, id) {
  let slug = slugify(base) || `kurs-${Date.now().toString(36)}`;
  let n = 2;
  const root = slug;
  while (one('SELECT 1 FROM courses WHERE slug = ? AND id IS NOT ?', slug, id ?? null)) slug = `${root}-${n++}`;
  return slug;
}

function writeMulti(r, id, multis) {
  for (const [key, ids] of Object.entries(multis)) {
    const { table, self, other } = r.fields.find((f) => f.key === key).junction;
    run(`DELETE FROM ${table} WHERE ${self} = ?`, id);
    const stmt = db.prepare(`INSERT INTO ${table} (${self}, ${other}) VALUES (?, ?)`);
    for (const otherId of ids) stmt.run(id, otherId);
  }
}

function fetchRow(r, id) {
  const extra = r.extraSelect ? `, ${r.extraSelect}` : '';
  const row = one(`SELECT ${r.table}.*${extra} FROM ${r.table} WHERE id = ?`, id);
  if (!row) throw new HttpError(404, 'Yozuv topilmadi');
  return attachMulti(r, [row])[0];
}

router.get('/r/:res', (req, res) => {
  const r = resourceFor(req);
  const where = [];
  const params = [];
  for (const f of r.fields) {
    if (f.filter && req.query[f.key] !== undefined && req.query[f.key] !== '') {
      where.push(`${f.key} = ?`);
      params.push(String(req.query[f.key]));
    }
  }
  const extra = r.extraSelect ? `, ${r.extraSelect}` : '';
  const rows = all(
    `SELECT ${r.table}.*${extra} FROM ${r.table} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${r.order} LIMIT 5000`,
    ...params,
  );
  res.json({ rows: attachMulti(r, rows) });
});

router.get('/r/:res/:id', (req, res) => {
  const r = resourceFor(req);
  res.json({ row: fetchRow(r, Number(req.params.id)) });
});

router.post('/r/:res', (req, res) => {
  const r = resourceFor(req);
  if (r.noCreate) throw new HttpError(405, 'Bu bo‘limga qo‘lda yozuv qo‘shilmaydi');
  const { values, multis } = collect(r, req.body ?? {}, true);
  if (r.table === 'courses') values.slug = uniqueSlug(values.slug || values.title);
  r.beforeSave?.(values, req.user, true);
  const id = tx(() => {
    const keys = Object.keys(values);
    const info = run(
      `INSERT INTO ${r.table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      ...keys.map((k) => values[k]),
    );
    const newId = Number(info.lastInsertRowid);
    writeMulti(r, newId, multis);
    return newId;
  });
  res.status(201).json({ row: fetchRow(r, id) });
});

router.put('/r/:res/:id', (req, res) => {
  const r = resourceFor(req);
  const id = Number(req.params.id);
  fetchRow(r, id);
  const { values, multis } = collect(r, req.body ?? {}, false);
  if (r.table === 'courses' && ('slug' in values || 'title' in values)) {
    const current = one('SELECT slug, title FROM courses WHERE id = ?', id);
    values.slug = uniqueSlug(values.slug || current.slug || values.title || current.title, id);
  }
  r.beforeSave?.(values, req.user, false);
  if (r.check) {
    const merged = { ...fetchRow(r, id), ...values };
    const errors = r.check(merged);
    if (errors) throw new HttpError(422, 'Ma’lumotlarni tekshiring', errors);
  }
  tx(() => {
    const keys = Object.keys(values);
    if (keys.length) {
      run(`UPDATE ${r.table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => values[k]), id);
    }
    writeMulti(r, id, multis);
  });
  res.json({ row: fetchRow(r, id) });
});

router.delete('/r/:res/:id', (req, res) => {
  const r = resourceFor(req);
  const id = Number(req.params.id);
  const row = fetchRow(r, id);
  tx(() => {
    run(`DELETE FROM ${r.table} WHERE id = ?`, id);
    if (r.table === 'students' && row.user_id) run("DELETE FROM users WHERE id = ? AND role = 'student'", row.user_id);
  });
  res.json({ ok: true });
});

router.get('/options/:res', (req, res) => {
  const r = RESOURCES[req.params.res];
  if (!r?.label) throw new HttpError(404, 'Bo‘lim topilmadi');
  res.json({ options: all(`SELECT id, ${r.label} AS label FROM ${r.table} ORDER BY label COLLATE NOCASE`) });
});

/* ---------- Ariza → o‘quvchi ---------- */

router.post('/applications/:id/convert', (req, res) => {
  const app = one('SELECT * FROM applications WHERE id = ?', Number(req.params.id));
  if (!app) throw new HttpError(404, 'Ariza topilmadi');
  const existing = one('SELECT id FROM students WHERE phone = ?', app.phone);
  const studentId = tx(() => {
    const sid = existing?.id ?? Number(run(
      'INSERT INTO students (full_name, phone, notes) VALUES (?, ?, ?)',
      app.full_name, app.phone, [`Arizadan: ${app.course_title}`, app.comment].filter(Boolean).join('\n'),
    ).lastInsertRowid);
    run("UPDATE applications SET status = 'enrolled' WHERE id = ?", app.id);
    return sid;
  });
  res.json({
    ok: true, studentId,
    message: existing ? 'Bu raqamli o‘quvchi avvaldan mavjud. Ariza “O‘qishga yozildi” deb belgilandi.' : 'O‘quvchi ro‘yxatga qo‘shildi',
  });
});

/* ---------- O‘quvchi kabineti uchun hisob ---------- */

router.post('/students/:id/account', (req, res) => {
  const student = one('SELECT * FROM students WHERE id = ?', Number(req.params.id));
  if (!student) throw new HttpError(404, 'O‘quvchi topilmadi');
  const { login, password } = req.body ?? {};
  const pwProblem = passwordProblem(password);
  if (pwProblem) throw new HttpError(422, pwProblem, { password: pwProblem });

  if (student.user_id) {
    run('UPDATE users SET password_hash = ?, full_name = ?, active = 1 WHERE id = ?', hashPassword(password), student.full_name, student.user_id);
    return res.json({ ok: true, message: 'Parol yangilandi' });
  }
  const lp = loginProblem(login);
  if (lp) throw new HttpError(422, lp, { login: lp });
  if (one('SELECT 1 FROM users WHERE login = ?', login)) throw new HttpError(422, 'Bu login band', { login: 'Bu login band' });
  tx(() => {
    const uid = Number(run(
      "INSERT INTO users (role, full_name, login, password_hash) VALUES ('student', ?, ?, ?)",
      student.full_name, login, hashPassword(password),
    ).lastInsertRowid);
    run('UPDATE students SET user_id = ? WHERE id = ?', uid, student.id);
  });
  res.json({ ok: true, message: 'Kabinet ochildi' });
});

/* ---------- Davomat ---------- */

router.get('/attendance', (req, res) => {
  const groupId = Number(req.query.group_id);
  const date = String(req.query.date || '');
  if (!one('SELECT 1 FROM study_groups WHERE id = ?', groupId)) throw new HttpError(404, 'Guruh topilmadi');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(422, 'Sanani tanlang');
  const lesson = one('SELECT * FROM lessons WHERE group_id = ? AND date = ?', groupId, date);
  const students = all(
    `SELECT s.id, s.full_name, a.status FROM group_students gs JOIN students s ON s.id = gs.student_id
     LEFT JOIN attendance a ON a.student_id = s.id AND a.lesson_id = ?
     WHERE gs.group_id = ? ORDER BY s.full_name COLLATE NOCASE`,
    lesson?.id ?? 0, groupId,
  );
  const history = all(
    `SELECT l.id, l.date, l.topic,
       SUM(a.status = 'present') AS present, SUM(a.status = 'late') AS late, SUM(a.status = 'absent') AS absent
     FROM lessons l LEFT JOIN attendance a ON a.lesson_id = l.id
     WHERE l.group_id = ? GROUP BY l.id ORDER BY l.date DESC LIMIT 60`,
    groupId,
  );
  res.json({ lesson: lesson ?? null, students, history });
});

router.put('/attendance', (req, res) => {
  const { group_id: groupId, date, topic = '', marks = {} } = req.body ?? {};
  if (!one('SELECT 1 FROM study_groups WHERE id = ?', Number(groupId))) throw new HttpError(404, 'Guruh topilmadi');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new HttpError(422, 'Sanani tanlang');
  if (typeof topic !== 'string' || topic.length > 200) throw new HttpError(422, 'Dars mavzusi juda uzun');
  const members = new Set(all('SELECT student_id FROM group_students WHERE group_id = ?', Number(groupId)).map((r) => r.student_id));
  const entries = Object.entries(marks).filter(([sid, st]) => members.has(Number(sid)) && ['present', 'absent', 'late'].includes(st));
  if (!entries.length) throw new HttpError(422, 'Kamida bitta o‘quvchini belgilang');
  tx(() => {
    run(
      'INSERT INTO lessons (group_id, date, topic) VALUES (?, ?, ?) ON CONFLICT(group_id, date) DO UPDATE SET topic = excluded.topic',
      Number(groupId), date, topic.trim(),
    );
    const lessonId = one('SELECT id FROM lessons WHERE group_id = ? AND date = ?', Number(groupId), date).id;
    const stmt = db.prepare(
      'INSERT INTO attendance (lesson_id, student_id, status) VALUES (?, ?, ?) ON CONFLICT(lesson_id, student_id) DO UPDATE SET status = excluded.status',
    );
    for (const [sid, st] of entries) stmt.run(lessonId, Number(sid), st);
  });
  res.json({ ok: true, message: 'Davomat saqlandi' });
});

router.delete('/lessons/:id', (req, res) => {
  run('DELETE FROM lessons WHERE id = ?', Number(req.params.id));
  res.json({ ok: true });
});

/* ---------- Rasm yuklash ---------- */

const IMAGE_TYPES = {
  'image/png': { ext: 'png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': { ext: 'webp', magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
};

router.post('/upload', (req, res) => {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ''));
  if (!m) throw new HttpError(422, 'Faqat PNG, JPG yoki WEBP rasm yuklash mumkin');
  const buf = Buffer.from(m[2], 'base64');
  const type = IMAGE_TYPES[m[1]];
  if (!type.magic(buf)) throw new HttpError(422, 'Fayl rasm emas yoki shikastlangan');
  if (buf.length > 4 * 1024 * 1024) throw new HttpError(422, 'Rasm hajmi 4 MB dan oshmasin');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(12).toString('hex')}.${type.ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.status(201).json({ url: `/uploads/${name}` });
});

/* ---------- Sayt matnlari (faqat admin) ---------- */

router.get('/settings', isAdmin, (_req, res) => res.json({ values: getSettings() }));

router.put('/settings', isAdmin, (req, res) => {
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
  saveSettings(values);
  res.json({ ok: true, values: getSettings(), message: 'Sayt matnlari saqlandi' });
});

/* ---------- Xodimlar hisoblari (faqat admin) ---------- */

router.get('/users', isAdmin, (_req, res) => {
  res.json({
    rows: all(
      `SELECT u.id, u.role, u.full_name, u.login, u.active, u.created_at, s.id AS student_id
       FROM users u LEFT JOIN students s ON s.user_id = u.id ORDER BY u.role, u.full_name COLLATE NOCASE`,
    ),
  });
});

router.post('/users', isAdmin, (req, res) => {
  const { full_name: fullName, login, password, role } = req.body ?? {};
  const errors = {};
  if (typeof fullName !== 'string' || fullName.trim().length < 3) errors.full_name = 'Ism va familiyani kiriting';
  const lp = loginProblem(login);
  if (lp) errors.login = lp;
  else if (one('SELECT 1 FROM users WHERE login = ?', login)) errors.login = 'Bu login band';
  const pp = passwordProblem(password);
  if (pp) errors.password = pp;
  if (!['admin', 'manager'].includes(role)) errors.role = 'Rolni tanlang';
  if (Object.keys(errors).length) throw new HttpError(422, 'Ma’lumotlarni tekshiring', errors);
  run('INSERT INTO users (role, full_name, login, password_hash) VALUES (?, ?, ?, ?)', role, fullName.trim(), login, hashPassword(password));
  res.status(201).json({ ok: true, message: 'Foydalanuvchi qo‘shildi' });
});

router.put('/users/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  const user = one('SELECT * FROM users WHERE id = ?', id);
  if (!user) throw new HttpError(404, 'Foydalanuvchi topilmadi');
  const { active, password, role } = req.body ?? {};
  if (id === req.user.id && (active === 0 || active === false || (role && role !== 'admin'))) {
    throw new HttpError(422, 'O‘z hisobingizni o‘chira yoki rolini pasaytira olmaysiz');
  }
  tx(() => {
    if (active !== undefined) run('UPDATE users SET active = ? WHERE id = ?', active ? 1 : 0, id);
    if (role !== undefined && user.role !== 'student') {
      if (!['admin', 'manager'].includes(role)) throw new HttpError(422, 'Noto‘g‘ri rol');
      run('UPDATE users SET role = ? WHERE id = ?', role, id);
    }
    if (password !== undefined) {
      const pp = passwordProblem(password);
      if (pp) throw new HttpError(422, pp, { password: pp });
      run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(password), id);
      run('DELETE FROM sessions WHERE user_id = ?', id);
    }
    if (active !== undefined && !active) run('DELETE FROM sessions WHERE user_id = ?', id);
  });
  res.json({ ok: true, message: 'Saqlandi' });
});

router.delete('/users/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new HttpError(422, 'O‘z hisobingizni o‘chira olmaysiz');
  run('DELETE FROM users WHERE id = ?', id);
  res.json({ ok: true });
});

export default router;
