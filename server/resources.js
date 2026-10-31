import { DAYS } from './validate.js';

export const APP_STATUS = [
  { value: 'new', label: 'Yangi' },
  { value: 'contacted', label: 'Bog‘lanildi' },
  { value: 'enrolled', label: 'O‘qishga yozildi' },
  { value: 'rejected', label: 'Rad etildi' },
];

export const TIME_OPTIONS = [
  { value: 'morning', label: 'Ertalab (08:00–12:00)' },
  { value: 'afternoon', label: 'Tushdan keyin (12:00–17:00)' },
  { value: 'evening', label: 'Kechqurun (17:00–21:00)' },
  { value: 'any', label: 'Farqi yo‘q' },
];

export const ICONS = [
  { value: 'globe', label: 'Globus (xorijiy tillar)' },
  { value: 'award', label: 'Medal (xalqaro sertifikat)' },
  { value: 'cap', label: 'Bitiruvchi qalpog‘i' },
  { value: 'pi', label: 'Matematika' },
  { value: 'book', label: 'Kitob' },
  { value: 'atom', label: 'Atom (tabiiy fanlar)' },
  { value: 'code', label: 'Dasturlash' },
  { value: 'pen', label: 'Qalam' },
  { value: 'spark', label: 'Yulduzcha (boshqa)' },
];

const STUDENT_STATUS = [
  { value: 'active', label: 'O‘qiyapti' },
  { value: 'paused', label: 'To‘xtatgan' },
  { value: 'left', label: 'Ketgan' },
];

const PAY_METHODS = [
  { value: 'cash', label: 'Naqd' },
  { value: 'card', label: 'Plastik karta' },
  { value: 'transfer', label: 'Bank o‘tkazmasi' },
];

const STAFF = ['admin', 'manager'];
const ADMIN = ['admin'];
const SORT = { key: 'sort', label: 'Tartib raqami', type: 'number', hint: 'Kichik raqam oldinroq ko‘rsatiladi' };
const PUBLISHED = { key: 'published', label: 'Saytda ko‘rsatish', type: 'bool', default: 1 };

/**
 * Administrator panelidagi umumiy CRUD bo‘limlari.
 * Maydon ta’riflari ham server tekshiruvi, ham panel shakllari uchun yagona manba.
 */
export const RESOURCES = {
  applications: {
    table: 'applications', title: 'Arizalar', singular: 'ariza', roles: STAFF, noCreate: true,
    order: "CASE status WHEN 'new' THEN 0 ELSE 1 END, created_at DESC",
    fields: [
      { key: 'full_name', label: 'Ism va familiya', type: 'text', readonly: true },
      { key: 'phone', label: 'Telefon', type: 'phone', readonly: true },
      { key: 'course_title', label: 'Kurs', type: 'text', readonly: true },
      { key: 'preferred_time', label: 'Qulay vaqt', type: 'select', options: TIME_OPTIONS, readonly: true },
      { key: 'comment', label: 'Izoh', type: 'textarea', readonly: true },
      { key: 'created_at', label: 'Yuborilgan', type: 'datetime', readonly: true },
      { key: 'status', label: 'Holati', type: 'select', options: APP_STATUS, required: true, filter: true },
      { key: 'admin_note', label: 'Menejer izohi', type: 'textarea', max: 2000 },
    ],
    list: ['created_at', 'full_name', 'phone', 'course_title', 'preferred_time', 'status'],
  },
  students: {
    table: 'students', title: 'O‘quvchilar', singular: 'o‘quvchi', roles: STAFF,
    order: 'lower(full_name)', label: "full_name || CASE WHEN phone <> '' THEN ' · ' || phone ELSE '' END",
    extraSelect: '(SELECT login FROM users WHERE users.id = students.user_id) AS account_login',
    fields: [
      { key: 'full_name', label: 'Ism va familiya', type: 'text', required: true, max: 120 },
      { key: 'phone', label: 'Telefon raqami', type: 'phone', required: true },
      { key: 'parent_phone', label: 'Ota-ona telefoni', type: 'phone' },
      { key: 'status', label: 'Holati', type: 'select', options: STUDENT_STATUS, required: true, default: 'active', filter: true },
      { key: 'notes', label: 'Izoh', type: 'textarea', max: 2000 },
    ],
    list: ['full_name', 'phone', 'status', 'account_login'],
    listLabels: { account_login: 'Kabinet logini' },
  },
  groups: {
    table: 'study_groups', title: 'Guruhlar', singular: 'guruh', roles: STAFF, order: 'active DESC, lower(name)', label: 'name',
    fields: [
      { key: 'name', label: 'Guruh nomi', type: 'text', required: true, max: 80, placeholder: 'Masalan: IELTS-1 (kechki)' },
      { key: 'course_id', label: 'Kurs', type: 'ref', ref: 'courses', filter: true },
      { key: 'teacher_id', label: 'Ustoz', type: 'ref', ref: 'teachers', filter: true },
      { key: 'days', label: 'Dars kunlari', type: 'days', options: DAYS },
      { key: 'start_time', label: 'Boshlanish vaqti', type: 'time' },
      { key: 'end_time', label: 'Tugash vaqti', type: 'time' },
      { key: 'room', label: 'Xona', type: 'text', max: 40 },
      { key: 'start_date', label: 'Guruh ochilgan sana', type: 'date' },
      { key: 'active', label: 'Faol guruh', type: 'bool', default: 1 },
      {
        key: 'student_ids', label: 'O‘quvchilar', type: 'multi', ref: 'students',
        junction: { table: 'group_students', self: 'group_id', other: 'student_id' },
      },
    ],
    list: ['name', 'course_id', 'teacher_id', 'days', 'start_time', 'student_ids', 'active'],
  },
  payments: {
    table: 'payments', title: 'To‘lovlar', singular: 'to‘lov', roles: STAFF, order: 'paid_at DESC, id DESC',
    fields: [
      { key: 'student_id', label: 'O‘quvchi', type: 'ref', ref: 'students', required: true, filter: true },
      { key: 'amount', label: 'Summa (so‘m)', type: 'money', required: true },
      { key: 'paid_at', label: 'To‘lov sanasi', type: 'date', required: true, default: 'today' },
      { key: 'period', label: 'Qaysi oy uchun', type: 'month' },
      { key: 'method', label: 'To‘lov usuli', type: 'select', options: PAY_METHODS, required: true, default: 'cash', filter: true },
      { key: 'note', label: 'Izoh', type: 'text', max: 300 },
    ],
    list: ['paid_at', 'student_id', 'amount', 'period', 'method'],
    beforeSave: (values, user, isCreate) => { if (isCreate) values.created_by = user.id; },
  },
  tests: {
    table: 'tests', title: 'Test natijalari', singular: 'test natijasi', roles: STAFF, order: 'taken_at DESC, id DESC',
    fields: [
      { key: 'student_id', label: 'O‘quvchi', type: 'ref', ref: 'students', required: true, filter: true },
      { key: 'group_id', label: 'Guruh', type: 'ref', ref: 'groups', filter: true },
      { key: 'title', label: 'Test nomi', type: 'text', required: true, max: 120 },
      { key: 'score', label: 'To‘plangan ball', type: 'decimal', required: true },
      { key: 'max_score', label: 'Maksimal ball', type: 'decimal', required: true, default: 100 },
      { key: 'taken_at', label: 'Sana', type: 'date', required: true, default: 'today' },
    ],
    list: ['taken_at', 'student_id', 'title', 'score', 'max_score'],
  },
  homework: {
    table: 'homework', title: 'Uy vazifalari', singular: 'uy vazifasi', roles: STAFF, order: 'due_date IS NULL, due_date DESC, id DESC',
    fields: [
      { key: 'group_id', label: 'Guruh', type: 'ref', ref: 'groups', required: true, filter: true },
      { key: 'title', label: 'Vazifa nomi', type: 'text', required: true, max: 150 },
      { key: 'description', label: 'Vazifa matni', type: 'textarea', max: 4000 },
      { key: 'due_date', label: 'Topshirish muddati', type: 'date' },
    ],
    list: ['group_id', 'title', 'due_date'],
  },
  materials: {
    table: 'materials', title: 'O‘quv materiallari', singular: 'material', roles: STAFF, order: 'id DESC',
    fields: [
      { key: 'group_id', label: 'Guruh', type: 'ref', ref: 'groups', filter: true, hint: 'Bo‘sh qoldirilsa, barcha o‘quvchilarga ko‘rinadi' },
      { key: 'title', label: 'Material nomi', type: 'text', required: true, max: 150 },
      { key: 'url', label: 'Havola', type: 'url', required: true, hint: 'Google Drive, Telegram kanal, YouTube va boshqa manzil' },
      { key: 'description', label: 'Qisqa izoh', type: 'textarea', max: 1000 },
    ],
    list: ['title', 'group_id', 'url'],
  },
  courses: {
    table: 'courses', title: 'Kurslar', singular: 'kurs', roles: ADMIN, order: 'sort IS NULL, sort, id', label: 'title',
    fields: [
      { key: 'title', label: 'Kurs nomi', type: 'text', required: true, max: 80 },
      { key: 'slug', label: 'Sahifa manzili (slug)', type: 'slug', max: 60, hint: 'Bo‘sh qoldirilsa, nomdan avtomatik yaratiladi' },
      { key: 'short_desc', label: 'Qisqa tavsif (kartada)', type: 'textarea', max: 220 },
      { key: 'description', label: 'To‘liq tavsif (kurs sahifasida)', type: 'textarea', max: 5000 },
      { key: 'duration', label: 'Davomiyligi', type: 'text', max: 60, placeholder: 'Masalan: 6 oy' },
      { key: 'price', label: 'Narxi (so‘m, oyiga)', type: 'money', hint: 'Bo‘sh qoldirilsa, “narx bo‘yicha maslahat” yozuvi chiqadi' },
      { key: 'icon', label: '3D belgi', type: 'select', options: ICONS, required: true, default: 'book' },
      SORT,
      PUBLISHED,
    ],
    list: ['title', 'duration', 'price', 'published'],
  },
  teachers: {
    table: 'teachers', title: 'Ustozlar', singular: 'ustoz', roles: ADMIN, order: 'sort IS NULL, sort, full_name', label: 'full_name',
    fields: [
      { key: 'full_name', label: 'Ism va familiya', type: 'text', required: true, max: 120 },
      { key: 'specialty', label: 'Mutaxassisligi', type: 'text', max: 120, placeholder: 'Masalan: IELTS ustozi' },
      { key: 'experience', label: 'Tajribasi', type: 'text', max: 60, placeholder: 'Masalan: 7 yil' },
      { key: 'achievements', label: 'Yutuqlari', type: 'textarea', max: 1500, hint: 'Har bir yutuqni yangi qatordan yozing' },
      { key: 'photo', label: 'Rasmi', type: 'image' },
      SORT,
      PUBLISHED,
    ],
    list: ['photo', 'full_name', 'specialty', 'experience', 'published'],
  },
  results: {
    table: 'results', title: 'Natijalar', singular: 'natija', roles: ADMIN, order: 'sort IS NULL, sort, achieved_at DESC, id DESC',
    fields: [
      { key: 'student_name', label: 'O‘quvchi ismi', type: 'text', required: true, max: 120 },
      { key: 'exam', label: 'Imtihon yoki yutuq', type: 'text', required: true, max: 80, placeholder: 'Masalan: IELTS' },
      { key: 'score', label: 'Natija', type: 'text', max: 40, placeholder: 'Masalan: 7.5' },
      { key: 'description', label: 'Izoh', type: 'textarea', max: 600 },
      { key: 'image', label: 'Sertifikat rasmi', type: 'image' },
      { key: 'achieved_at', label: 'Sana', type: 'date' },
      SORT,
      PUBLISHED,
    ],
    list: ['image', 'student_name', 'exam', 'score', 'published'],
  },
  testimonials: {
    table: 'testimonials', title: 'O‘quvchilar fikrlari', singular: 'fikr', roles: ADMIN, order: 'sort IS NULL, sort, id DESC',
    fields: [
      { key: 'author', label: 'Muallif', type: 'text', required: true, max: 120 },
      { key: 'role_text', label: 'Kim', type: 'text', max: 120, placeholder: 'Masalan: IELTS kursi bitiruvchisi' },
      { key: 'text', label: 'Fikr matni', type: 'textarea', max: 1500 },
      { key: 'video_url', label: 'Video (YouTube havolasi)', type: 'video' },
      { key: 'photo', label: 'Rasm', type: 'image' },
      SORT,
      PUBLISHED,
    ],
    list: ['author', 'role_text', 'video_url', 'published'],
    check: (v) => (!v.text && !v.video_url ? { text: 'Fikr matni yoki video havolasini kiriting' } : null),
  },
  branches: {
    table: 'branches', title: 'Filiallar', singular: 'filial', roles: ADMIN, order: 'sort IS NULL, sort, id',
    fields: [
      { key: 'name', label: 'Filial nomi', type: 'text', required: true, max: 120 },
      { key: 'address', label: 'Manzil', type: 'text', required: true, max: 250 },
      { key: 'phone', label: 'Telefon', type: 'phone' },
      { key: 'hours', label: 'Ish vaqti', type: 'text', max: 100, placeholder: 'Du–Sha, 08:00–20:00' },
      { key: 'map_url', label: 'Xarita (embed havola)', type: 'mapurl', hint: 'Google Maps → Ulashish → Xaritani joylashtirish → iframe kodini to‘liq qo‘ying' },
      SORT,
    ],
    list: ['name', 'address', 'phone'],
  },
};

export function canAccess(resource, role) {
  return resource.roles.includes(role);
}
