// Foydalanish: npm run create-user -- --login ali --password "Parol123" --role admin --name "Ali Valiyev"
// Login mavjud bo‘lsa, paroli va roli yangilanadi (unutilgan administrator parolini tiklash uchun).
import { parseArgs } from 'node:util';
import { one, run, migrate, closeDb } from '../db.js';
import { hashPassword, passwordProblem, loginProblem, revokeSessions } from '../auth.js';

const { values } = parseArgs({
  options: {
    login: { type: 'string' },
    password: { type: 'string' },
    role: { type: 'string', default: 'admin' },
    name: { type: 'string', default: 'Administrator' },
  },
});

const problem = loginProblem(values.login) || passwordProblem(values.password)
  || (!['admin', 'manager'].includes(values.role) ? 'Rol admin yoki manager bo‘lishi kerak' : null);
if (problem) {
  console.error(`Xato: ${problem}`);
  process.exit(1);
}

await migrate();
const existing = await one('SELECT id FROM users WHERE lower(login) = lower(?)', values.login);
if (existing) {
  await run('UPDATE users SET password_hash = ?, role = ?, active = 1 WHERE id = ?', hashPassword(values.password), values.role, existing.id);
  await revokeSessions(existing.id);
  console.log(`“${values.login}” foydalanuvchisining paroli yangilandi.`);
} else {
  await run('INSERT INTO users (role, full_name, login, password_hash) VALUES (?, ?, ?, ?)', values.role, values.name, values.login, hashPassword(values.password));
  console.log(`“${values.login}” foydalanuvchisi (${values.role}) yaratildi.`);
}
await closeDb();
