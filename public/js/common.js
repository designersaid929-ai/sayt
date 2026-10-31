// Administrator paneli va o‘quvchi kabineti uchun umumiy yordamchilar
window.UI = (() => {
  /** Element yaratish: h('div', { class: 'x', onclick }, 'matn', child) — matn har doim xavfsiz (textContent). */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.error || 'Xatolik yuz berdi');
      err.status = res.status;
      err.fields = json.fields;
      throw err;
    }
    return json;
  }

  function toast(message, type = 'ok') {
    const box = document.getElementById('toasts');
    const t = h('div', { class: `toast ${type}`, role: 'status' }, message);
    box.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  function date(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${Number(m[3])}-${MONTHS[Number(m[2]) - 1]}, ${m[1]}` : '';
  }
  function datetime(iso) {
    if (!iso) return '';
    const d = new Date(`${iso.replace(' ', 'T')}Z`); // SQLite vaqti UTC da saqlanadi
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function month(ym) {
    const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
    return m ? `${m[1]}-yil ${MONTHS[Number(m[2]) - 1]}` : '';
  }
  function money(n) {
    if (n === null || n === undefined || n === '') return '';
    return `${String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`;
  }
  function number(n) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  }

  function showFieldErrors(form, fields = {}) {
    form.querySelectorAll('[data-error-for]').forEach((p) => {
      const msg = fields[p.dataset.errorFor] || '';
      p.textContent = msg;
      p.closest('.field')?.classList.toggle('has-error', !!msg);
    });
  }

  /** Qorong‘i va yorug‘ fon uchun logotiplar (qaysi biri ko‘rinishini CSS hal qiladi). */
  function logos(site, cls = 'logo') {
    return [
      h('img', { class: `${cls} logo-on-dark`, src: site.logo.dark, alt: site.site_name }),
      h('img', { class: `${cls} logo-on-light`, src: site.logo.light, alt: site.site_name }),
    ];
  }

  function themeButton() {
    const label = document.documentElement.dataset.theme === 'light' ? 'Qorong‘i rejimga o‘tish' : 'Yorug‘ rejimga o‘tish';
    return h('button', { class: 'btn theme-toggle', type: 'button', dataset: { themeToggle: '' }, 'aria-label': label, title: label },
      h('span', { class: 'i-sun', 'aria-hidden': 'true' }, '☀'), h('span', { class: 'i-moon', 'aria-hidden': 'true' }, '☾'));
  }

  /** Kirish oynasi. onSuccess(user) — muvaffaqiyatli kirgandan keyin chaqiriladi. */
  async function loginView(root, { title, lead, foot, onSuccess }) {
    const site = await api('GET', '/api/site').catch(() => ({ logo: { dark: '/assets/brand/logo-dark.png', light: '/assets/brand/logo-light.png' }, site_name: '' }));
    const alert = h('p', { class: 'alert', role: 'alert', hidden: true });
    const btn = h('button', { class: 'btn btn-gold btn-block', type: 'submit' }, 'Kirish');
    const form = h('form', { novalidate: true },
      h('div', { class: 'field' }, h('label', { for: 'login' }, 'Login'),
        h('input', { id: 'login', name: 'login', autocomplete: 'username', required: true, autocapitalize: 'none' })),
      h('div', { class: 'field' }, h('label', { for: 'password' }, 'Parol'),
        h('input', { id: 'password', name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
      alert, btn);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alert.hidden = true;
      const login = form.login.value.trim();
      const password = form.password.value;
      if (!login || !password) {
        alert.textContent = 'Login va parolni kiriting';
        alert.hidden = false;
        return;
      }
      btn.disabled = true;
      try {
        const { user } = await api('POST', '/api/auth/login', { login, password });
        onSuccess(user);
      } catch (err) {
        alert.textContent = err.message;
        alert.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
    root.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'auth-card' },
      themeButton(), ...logos(site),
      h('h1', {}, title), h('p', { class: 'lead' }, lead), form,
      foot ? h('p', { class: 'auth-foot' }, foot) : null)));
    form.login.focus();
  }

  /** Parolni o‘zgartirish shakli (xodimlar va o‘quvchilar uchun). */
  function passwordForm() {
    const form = h('form', { class: 'card panel-pad', style: 'max-width:460px;display:grid;gap:14px', novalidate: true },
      ...[['current', 'Joriy parol', 'current-password'], ['next', 'Yangi parol', 'new-password'], ['repeat', 'Yangi parolni takrorlang', 'new-password']]
        .map(([name, label, ac]) => h('div', { class: 'field' }, h('label', { for: `pw-${name}` }, label),
          h('input', { id: `pw-${name}`, name, type: 'password', autocomplete: ac }), h('p', { class: 'field-error', dataset: { errorFor: name } }))),
      h('p', { class: 'field-hint' }, 'Kamida 8 ta belgi, harf va raqam qatnashsin.'),
      h('div', {}, h('button', { class: 'btn btn-gold', type: 'submit' }, 'Parolni o‘zgartirish')));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showFieldErrors(form, {});
      if (form.next.value !== form.repeat.value) return showFieldErrors(form, { repeat: 'Parollar mos kelmadi' });
      try {
        const r = await api('PUT', '/api/auth/password', { current: form.current.value, next: form.next.value });
        form.reset();
        toast(r.message);
      } catch (err) {
        showFieldErrors(form, err.fields);
        if (!err.fields) toast(err.message, 'err');
      }
    });
    return form;
  }

  async function logout() {
    await api('POST', '/api/auth/logout', {}).catch(() => {});
    location.reload();
  }

  return { h, api, toast, logos, themeButton, fmt: { date, datetime, month, money, number }, showFieldErrors, loginView, passwordForm, logout };
})();
