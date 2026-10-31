import postgres from 'postgres';
import { DATABASE_URL, DB_SCHEMA, ON_VERCEL } from './config.js';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL o‘rnatilmagan. .env fayliga Supabase (Postgres) ulanish satrini yozing — README’ga qarang.');
}

// Supabase Supavisor (transaction mode) prepared statement’larni qo‘llamaydi — prepare: false
export const sql = postgres(DATABASE_URL, {
  prepare: false,
  max: ON_VERCEL ? 1 : 5,
  idle_timeout: 20,
  connect_timeout: 15,
  onnotice: () => {},
  connection: { search_path: DB_SCHEMA },
});

const NOW = "to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')";

const MIGRATIONS = [
  `
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin','manager','student')),
    full_name TEXT NOT NULL,
    login TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE UNIQUE INDEX users_login_ci ON users (lower(login));
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');

  CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    short_desc TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    price INTEGER,
    icon TEXT NOT NULL DEFAULT 'book',
    sort INTEGER,
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT '',
    experience TEXT NOT NULL DEFAULT '',
    achievements TEXT NOT NULL DEFAULT '',
    photo TEXT NOT NULL DEFAULT '',
    sort INTEGER,
    published INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    parent_phone TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','left')),
    notes TEXT NOT NULL DEFAULT '',
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE study_groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
    days TEXT NOT NULL DEFAULT '',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    room TEXT NOT NULL DEFAULT '',
    start_date TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE group_students (
    group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, student_id)
  );
  CREATE TABLE lessons (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    UNIQUE (group_id, date)
  );
  CREATE TABLE attendance (
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present','absent','late')),
    PRIMARY KEY (lesson_id, student_id)
  );
  CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    paid_at TEXT NOT NULL,
    period TEXT NOT NULL DEFAULT '',
    method TEXT NOT NULL DEFAULT 'cash',
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    course_title TEXT NOT NULL DEFAULT '',
    preferred_time TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','enrolled','rejected')),
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    student_name TEXT NOT NULL,
    exam TEXT NOT NULL,
    score TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    achieved_at TEXT,
    sort INTEGER,
    published INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE testimonials (
    id SERIAL PRIMARY KEY,
    author TEXT NOT NULL,
    role_text TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    photo TEXT NOT NULL DEFAULT '',
    sort INTEGER,
    published INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    hours TEXT NOT NULL DEFAULT '',
    map_url TEXT NOT NULL DEFAULT '',
    sort INTEGER
  );
  CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES study_groups(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    max_score DOUBLE PRECISION NOT NULL DEFAULT 100,
    taken_at TEXT NOT NULL
  );
  CREATE TABLE homework (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES study_groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  -- Yuklangan rasmlar ham bazada saqlanadi (serverda doimiy disk bo‘lmasa ham yo‘qolmaydi)
  CREATE TABLE files (
    name TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data BYTEA NOT NULL,
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX idx_applications_status ON applications(status);
  CREATE INDEX idx_payments_student ON payments(student_id);
  CREATE INDEX idx_tests_student ON tests(student_id);
  CREATE INDEX idx_group_students_student ON group_students(student_id);
  `,
];

/** `?` belgilarini Postgres’ning $1, $2 ... ko‘rinishiga o‘tkazadi. */
function toPg(query) {
  let i = 0;
  return query.replace(/\?/g, () => `$${++i}`);
}

function queries(s) {
  const exec = (q, params) => s.unsafe(toPg(q), params.map((p) => (p === undefined ? null : p)));
  return {
    all: (q, ...p) => exec(q, p),
    one: async (q, ...p) => (await exec(q, p))[0],
    run: (q, ...p) => exec(q, p),
  };
}

export const { all, one, run } = queries(sql);

/** Tranzaksiya: fn({ all, one, run }) ichidagi so‘rovlar bitta tranzaksiyada bajariladi. */
export function tx(fn) {
  return sql.begin((t) => fn(queries(t)));
}

/** Jadvallarni yaratadi/yangilaydi. Bir vaqtda bir nechta server ishga tushsa ham xavfsiz (advisory lock). */
export async function migrate() {
  if (!/^[a-z_][a-z0-9_]*$/.test(DB_SCHEMA)) throw new Error(`DB_SCHEMA noto‘g‘ri: ${DB_SCHEMA}`);
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${DB_SCHEMA}`);
  await sql.begin(async (t) => {
    await t`SELECT pg_advisory_xact_lock(482917)`;
    await t.unsafe('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
    const row = (await t.unsafe('SELECT version FROM schema_version'))[0];
    let version = row?.version ?? 0;
    if (!row) await t.unsafe('INSERT INTO schema_version (version) VALUES (0)');
    for (; version < MIGRATIONS.length; version++) {
      await t.unsafe(MIGRATIONS[version]);
      await t.unsafe('UPDATE schema_version SET version = $1', [version + 1]);
    }
  });
}
