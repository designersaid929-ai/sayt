import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { tx } from './db.js';
import { hashPassword, passwordProblem, loginProblem } from './auth.js';
import { DATA_DIR } from './config.js';

// Boshlang‘ich kurslar: faqat nom va tavsif. Narx va davomiylik ataylab bo‘sh —
// ularni administrator haqiqiy qiymatlar bilan to‘ldiradi.
const COURSES = [
  ['ingliz-tili', 'Ingliz tili', 'globe', 'Noldan boshlab erkin muloqot darajasigacha: grammatika, so‘z boyligi, tinglab tushunish va gapirish ko‘nikmalari.'],
  ['ielts', 'IELTS', 'award', 'IELTS imtihonining barcha bo‘limlari bo‘yicha strategiyalar, amaliy testlar va yozma ishlar tahlili.'],
  ['sat', 'SAT', 'cap', 'SAT imtihonining matematika hamda o‘qish va yozish bo‘limlariga tizimli tayyorgarlik.'],
  ['matematika', 'Matematika', 'pi', 'Maktab dasturi, olimpiadalar va oliy ta’lim muassasalariga kirish imtihonlariga puxta tayyorgarlik.'],
  ['rus-tili', 'Rus tili', 'book', 'Kundalik muloqot, grammatika va savodli yozish ko‘nikmalarini bosqichma-bosqich rivojlantirish.'],
  ['boshqa-kurslar', 'Boshqa kurslar', 'spark', 'Qo‘shimcha yo‘nalishlar haqida ma’lumot olish uchun ariza qoldiring yoki biz bilan bog‘laning.'],
];

export async function seed() {
  let created = null;
  // Bir vaqtda bir nechta server ishga tushsa ham bir marta bajariladi
  await tx(async (q) => {
    await q.run('SELECT pg_advisory_xact_lock(482918)');
    if (!(await q.one('SELECT 1 FROM courses LIMIT 1'))) {
      for (const [i, [slug, title, icon, short]] of COURSES.entries()) {
        await q.run('INSERT INTO courses (slug, title, icon, short_desc, sort) VALUES (?, ?, ?, ?, ?)', slug, title, icon, short, i + 1);
      }
    }
    if (!(await q.one("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1"))) {
      const login = process.env.ADMIN_LOGIN || 'admin';
      let password = process.env.ADMIN_PASSWORD;
      const generated = !password;
      if (generated) password = `${crypto.randomBytes(9).toString('base64url')}7a`;
      const problem = loginProblem(login) || passwordProblem(password);
      if (problem) throw new Error(`ADMIN_LOGIN/ADMIN_PASSWORD noto‘g‘ri: ${problem}`);
      await q.run("INSERT INTO users (role, full_name, login, password_hash) VALUES ('admin', 'Administrator', ?, ?)", login, hashPassword(password));
      if (generated) created = { login, password };
    }
  });
  if (created) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, 'BIRINCHI-KIRISH.txt');
    fs.writeFileSync(file, `Administrator paneli: /admin\nLogin: ${created.login}\nParol: ${created.password}\n\nKirgandan so‘ng parolni o‘zgartiring va bu faylni o‘chiring.\n`, { mode: 0o600 });
    console.log(`\n  Administrator hisobi yaratildi. Kirish ma’lumotlari: ${file}\n`);
  }
}
