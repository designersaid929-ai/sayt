import express from 'express';
import { one, all, run } from '../db.js';
import {
  authenticate, startSession, endSession, requireRole, rateLimit, passwordProblem, hashPassword, verifyPassword, revokeSessions,
} from '../auth.js';
import { validateValue } from '../validate.js';
import { TIME_OPTIONS } from '../resources.js';
import { getSettings } from '../settings.js';
import { logoSources } from '../views.js';

const router = express.Router();

/* ---------- Kursga yozilish arizasi (ommaviy) ---------- */

const APPLICATION_FIELDS = [
  { key: 'full_name', label: 'Ism va familiya', type: 'text', required: true, min: 3, max: 120 },
  { key: 'phone', label: 'Telefon raqami', type: 'phone', required: true },
  { key: 'preferred_time', label: 'Qulay vaqt', type: 'select', options: TIME_OPTIONS, required: true },
  { key: 'comment', label: 'Qo‘shimcha izoh', type: 'textarea', max: 1000 },
];

router.post(
  '/applications',
  rateLimit({ windowMs: 10 * 60_000, max: 5, message: 'Siz yaqinda bir nechta ariza yubordingiz. Birozdan so‘ng qayta urinib ko‘ring.' }),
  (req, res) => {
    const body = req.body ?? {};
    // Botlar uchun yashirin maydon: to‘ldirilgan bo‘lsa, jimgina qabul qilgandek javob beramiz
    if (body.website) return res.json({ ok: true });

    const values = {};
    const errors = {};
    for (const f of APPLICATION_FIELDS) {
      const r = validateValue(f, body[f.key]);
      if (r.error) errors[f.key] = r.error;
      else values[f.key] = r.value;
    }

    let courseId = null;
    let courseTitle = 'Bepul maslahat';
    if (body.course === 'consult') {
      // maslahat so‘rovi — kurs tanlanmagan
    } else {
      const course = one('SELECT id, title FROM courses WHERE id = ? AND published = 1', Number(body.course) || 0);
      if (course) {
        courseId = course.id;
        courseTitle = course.title;
      } else {
        errors.course = 'Kursni tanlang';
      }
    }

    if (Object.keys(errors).length) return res.status(422).json({ error: 'Ma’lumotlarni tekshiring', fields: errors });

    run(
      `INSERT INTO applications (full_name, phone, course_id, course_title, preferred_time, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      values.full_name, values.phone, courseId, courseTitle, values.preferred_time, values.comment,
    );
    res.status(201).json({ ok: true, message: 'Arizangiz qabul qilindi! Mutaxassislarimiz tez orada siz bilan bog‘lanishadi.' });
  },
);

router.get('/site', (_req, res) => {
  const s = getSettings();
  res.json({ site_name: s.site_name, logo: logoSources(s) });
});

/* ---------- Kirish tizimi ---------- */

router.post(
  '/auth/login',
  rateLimit({ windowMs: 15 * 60_000, max: 10, message: 'Juda ko‘p urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.' }),
  (req, res) => {
    const { login, password } = req.body ?? {};
    if (typeof login !== 'string' || typeof password !== 'string' || !login || !password) {
      return res.status(422).json({ error: 'Login va parolni kiriting' });
    }
    const user = authenticate(login.trim(), password);
    if (!user) return res.status(401).json({ error: 'Login yoki parol noto‘g‘ri' });
    startSession(res, user.id);
    res.json({ user: { id: user.id, role: user.role, full_name: user.full_name, login: user.login } });
  },
);

router.post('/auth/logout', (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

router.get('/auth/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ user: req.user });
});

router.put('/auth/password', requireRole('admin', 'manager', 'student'), (req, res) => {
  const { current, next } = req.body ?? {};
  const row = one('SELECT password_hash FROM users WHERE id = ?', req.user.id);
  if (typeof current !== 'string' || !verifyPassword(current, row.password_hash)) {
    return res.status(422).json({ error: 'Joriy parol noto‘g‘ri', fields: { current: 'Joriy parol noto‘g‘ri' } });
  }
  const problem = passwordProblem(next);
  if (problem) return res.status(422).json({ error: problem, fields: { next: problem } });
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(next), req.user.id);
  // boshqa qurilmalardagi sessiyalar yopiladi, joriy qurilmada esa kirish saqlanadi
  revokeSessions(req.user.id);
  startSession(res, req.user.id);
  res.json({ ok: true, message: 'Parol muvaffaqiyatli o‘zgartirildi' });
});

/* ---------- O‘quvchi kabineti ---------- */

router.get('/cabinet', requireRole('student'), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const student = one('SELECT id, full_name, phone, status FROM students WHERE user_id = ?', req.user.id);
  if (!student) return res.json({ student: null });

  const groups = all(
    `SELECT g.id, g.name, g.days, g.start_time, g.end_time, g.room, c.title AS course, t.full_name AS teacher
     FROM group_students gs JOIN study_groups g ON g.id = gs.group_id
     LEFT JOIN courses c ON c.id = g.course_id LEFT JOIN teachers t ON t.id = g.teacher_id
     WHERE gs.student_id = ? AND g.active = 1 ORDER BY g.name`,
    student.id,
  );
  const attendance = all(
    `SELECT l.date, l.topic, a.status, g.name AS group_name
     FROM attendance a JOIN lessons l ON l.id = a.lesson_id JOIN study_groups g ON g.id = l.group_id
     WHERE a.student_id = ? ORDER BY l.date DESC LIMIT 200`,
    student.id,
  );
  const tests = all(
    `SELECT t.title, t.score, t.max_score, t.taken_at, g.name AS group_name
     FROM tests t LEFT JOIN study_groups g ON g.id = t.group_id WHERE t.student_id = ? ORDER BY t.taken_at DESC`,
    student.id,
  );
  const homework = all(
    `SELECT h.title, h.description, h.due_date, g.name AS group_name
     FROM homework h JOIN study_groups g ON g.id = h.group_id
     WHERE h.group_id IN (SELECT group_id FROM group_students WHERE student_id = ?)
     ORDER BY h.due_date IS NULL, h.due_date DESC, h.id DESC LIMIT 100`,
    student.id,
  );
  const payments = all(
    'SELECT amount, paid_at, period, method FROM payments WHERE student_id = ? ORDER BY paid_at DESC, id DESC',
    student.id,
  );
  const materials = all(
    `SELECT m.title, m.url, m.description, g.name AS group_name
     FROM materials m LEFT JOIN study_groups g ON g.id = m.group_id
     WHERE m.group_id IS NULL OR m.group_id IN (SELECT group_id FROM group_students WHERE student_id = ?)
     ORDER BY m.id DESC`,
    student.id,
  );

  res.json({ student, groups, attendance, tests, homework, payments, materials });
});

export default router;
