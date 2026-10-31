(() => {
  const { h, api, toast, fmt, showFieldErrors } = window.UI;
  const root = document.getElementById('app');

  let meta = null;
  let site = null;
  const optionsCache = new Map();

  const ROLE_LABELS = { admin: 'Administrator', manager: 'Menejer', student: 'O‘quvchi' };
  const DAY_SHORT = { du: 'Du', se: 'Se', ch: 'Chor', pa: 'Pay', ju: 'Ju', sh: 'Shan', ya: 'Yak' };

  const NAV = [
    ['Asosiy', [['#/', 'Boshqaruv paneli'], ['#/r/applications', 'Arizalar', 'applications']]],
    ['O‘quv jarayoni', [
      ['#/r/students', 'O‘quvchilar', 'students'], ['#/r/groups', 'Guruhlar', 'groups'], ['#/attendance', 'Davomat', 'groups'],
      ['#/r/payments', 'To‘lovlar', 'payments'], ['#/r/tests', 'Test natijalari', 'tests'], ['#/r/homework', 'Uy vazifalari', 'homework'],
      ['#/r/materials', 'O‘quv materiallari', 'materials'],
    ]],
    ['Sayt', [
      ['#/r/courses', 'Kurslar', 'courses'], ['#/r/teachers', 'Ustozlar', 'teachers'], ['#/r/results', 'Natijalar', 'results'],
      ['#/r/testimonials', 'O‘quvchilar fikrlari', 'testimonials'], ['#/r/branches', 'Filiallar', 'branches'], ['#/settings', 'Sayt matnlari', '@admin'],
    ]],
    ['Tizim', [['#/users', 'Foydalanuvchilar', '@admin'], ['#/password', 'Parolni o‘zgartirish']]],
  ];

  /* ---------- Ishga tushirish ---------- */

  async function boot() {
    const { user } = await api('GET', '/api/auth/me');
    if (!user || user.role === 'student') return showLogin(user);
    [meta, site] = await Promise.all([api('GET', '/api/admin/meta'), api('GET', '/api/site')]);
    renderShell();
    addEventListener('hashchange', route);
    route();
  }

  function showLogin(user) {
    UI.loginView(root, {
      title: 'Boshqaruv paneli',
      lead: user?.role === 'student' ? 'Siz o‘quvchi sifatida kirgansiz. Xodim hisobi bilan kiring yoki kabinetingizga o‘ting.' : 'Davom etish uchun xodim hisobingiz bilan kiring.',
      foot: h('a', { href: '/kabinet' }, 'O‘quvchi kabinetiga o‘tish'),
      onSuccess: (u) => {
        if (u.role === 'student') location.href = '/kabinet';
        else location.reload();
      },
    });
  }

  /* ---------- Asosiy tuzilma ---------- */

  let els = {};
  function allowed(key) {
    if (!key) return true;
    if (key === '@admin') return meta.user.role === 'admin';
    return !!meta.resources[key];
  }

  function renderShell() {
    const nav = h('nav', {}, NAV.map(([group, items]) => {
      const links = items.filter(([, , key]) => allowed(key));
      if (!links.length) return null;
      return h('div', { class: 'nav-group' }, h('h4', {}, group),
        links.map(([href, label]) => h('a', { href, dataset: { href } }, h('span', {}, label),
          href === '#/r/applications' ? h('span', { class: 'nav-badge', id: 'new-badge', hidden: true }) : null)));
    }));
    const sidebar = h('aside', { class: 'sidebar' }, h('a', { href: '/', target: '_blank', title: 'Saytni ochish' }, UI.logos(site)), nav);
    const title = h('h1', {}, '');
    const content = h('div', { class: 'content' });
    const topbar = h('header', { class: 'topbar' },
      h('button', { class: 'btn icon-btn menu-btn', 'aria-label': 'Menyu', onclick: () => sidebar.classList.toggle('open') }, '☰'),
      title,
      h('div', { class: 'user' }, meta.user.full_name, h('span', {}, ROLE_LABELS[meta.user.role])),
      UI.themeButton(),
      h('a', { class: 'btn btn-sm', href: '/', target: '_blank' }, 'Saytni ko‘rish'),
      h('button', { class: 'btn btn-sm', onclick: UI.logout }, 'Chiqish'));
    root.replaceChildren(h('div', { class: 'layout' }, sidebar, h('div', { class: 'main' }, topbar, content)));
    els = { sidebar, title, content };
    refreshBadge();
  }

  async function refreshBadge() {
    try {
      const d = await api('GET', '/api/admin/dashboard');
      const b = document.getElementById('new-badge');
      if (b) {
        b.textContent = d.newApplications;
        b.hidden = !d.newApplications;
      }
      return d;
    } catch { return null; }
  }

  function setPage(title) {
    els.title.textContent = title;
    document.title = title === 'Boshqaruv paneli' ? title : `${title} — Boshqaruv paneli`;
    els.sidebar.classList.remove('open');
    els.sidebar.querySelectorAll('a[data-href]').forEach((a) => {
      const href = a.dataset.href;
      a.classList.toggle('active', href === '#/' ? (location.hash || '#/') === '#/' : (location.hash || '').startsWith(href));
    });
    els.content.replaceChildren(h('p', { class: 'muted' }, 'Yuklanmoqda…'));
  }

  async function route() {
    const hash = location.hash || '#/';
    try {
      if (hash === '#/') return await dashboard();
      if (hash.startsWith('#/r/')) {
        const name = hash.slice(4).split('?')[0];
        if (meta.resources[name]) return await listView(name);
      }
      if (hash === '#/attendance' && meta.resources.groups) return await attendanceView();
      if (hash === '#/settings' && meta.user.role === 'admin') return await settingsView();
      if (hash === '#/users' && meta.user.role === 'admin') return await usersView();
      if (hash === '#/password') {
        setPage('Parolni o‘zgartirish');
        return els.content.replaceChildren(UI.passwordForm());
      }
      location.hash = '#/';
    } catch (err) {
      if (err.status === 401) return location.reload();
      els.content.replaceChildren(h('p', { class: 'alert' }, err.message));
    }
  }

  /* ---------- Boshqaruv paneli ---------- */

  const STATUS_LABEL = Object.fromEntries((meta_status()).map((o) => [o.value, o.label]));
  function meta_status() {
    return [
      { value: 'new', label: 'Yangi' }, { value: 'contacted', label: 'Bog‘lanildi' },
      { value: 'enrolled', label: 'O‘qishga yozildi' }, { value: 'rejected', label: 'Rad etildi' },
    ];
  }

  async function dashboard() {
    setPage('Boshqaruv paneli');
    const d = await refreshBadge();
    if (!d) throw new Error('Ma’lumotlarni yuklab bo‘lmadi');
    const stat = (label, value, gold) => h('div', { class: 'card stat' }, h('div', { class: 'label' }, label), h('div', { class: `value${gold ? ' gold' : ''}` }, value));
    const recent = d.recentApplications.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, ['Sana', 'Ism', 'Telefon', 'Kurs', 'Holati'].map((t) => h('th', {}, t)))),
        h('tbody', {}, d.recentApplications.map((a) => h('tr', { onclick: () => { location.hash = '#/r/applications'; } },
          h('td', {}, fmt.datetime(a.created_at)), h('td', {}, a.full_name), h('td', {}, a.phone), h('td', {}, a.course_title),
          h('td', {}, h('span', { class: `pill pill-${a.status}` }, STATUS_LABEL[a.status])))))))
      : h('p', { class: 'empty' }, 'Hozircha arizalar yo‘q. Saytdan yuborilgan arizalar shu yerda paydo bo‘ladi.');
    els.content.replaceChildren(
      h('div', { class: 'stats' },
        stat('Yangi arizalar', d.newApplications, true),
        stat('Shu oydagi arizalar', d.monthApplications),
        stat('Faol o‘quvchilar', d.activeStudents),
        stat('Faol guruhlar', d.activeGroups),
        stat('Shu oydagi to‘lovlar', fmt.money(d.monthPayments))),
      h('div', { class: 'card' }, h('div', { class: 'panel-pad', style: 'padding-bottom:6px' }, h('h2', { class: 'section-title' }, 'So‘nggi arizalar')), recent),
    );
  }

  /* ---------- Ma’lumotlarni ko‘rsatish ---------- */

  async function options(resName, force = false) {
    if (!force && optionsCache.has(resName)) return optionsCache.get(resName);
    const { options: list } = await api('GET', `/api/admin/options/${resName}`);
    const map = new Map(list.map((o) => [o.id, o.label]));
    optionsCache.set(resName, { list, map });
    return optionsCache.get(resName);
  }

  async function preloadRefs(def) {
    const refs = [...new Set(def.fields.filter((f) => f.ref).map((f) => f.ref))];
    await Promise.all(refs.map((r) => options(r)));
  }

  function display(f, value) {
    if (value === null || value === undefined || value === '') return h('span', { class: 'muted' }, '—');
    switch (f.type) {
      case 'select': {
        const label = f.options.find((o) => o.value === value)?.label ?? value;
        return h('span', { class: `pill pill-${value}` }, label);
      }
      case 'bool': return h('span', { class: `pill pill-${value ? 'yes' : 'no'}` }, value ? 'Ha' : 'Yo‘q');
      case 'ref': return optionsCache.get(f.ref)?.map.get(value) ?? `#${value}`;
      case 'multi': return `${value.length} ta`;
      case 'money': return fmt.money(value);
      case 'decimal': return fmt.number(value);
      case 'date': return fmt.date(value);
      case 'datetime': return fmt.datetime(value);
      case 'month': return fmt.month(value);
      case 'days': return value.split(',').map((d) => DAY_SHORT[d]).join(', ');
      case 'image': return h('img', { class: 'thumb', src: value, alt: '' });
      case 'url': case 'video': return h('a', { href: value, target: '_blank', rel: 'noopener', onclick: (e) => e.stopPropagation() }, 'Havola');
      default: return String(value).length > 80 ? `${String(value).slice(0, 80)}…` : String(value);
    }
  }

  /* ---------- Umumiy ro‘yxat ---------- */

  async function listView(name) {
    const def = meta.resources[name];
    setPage(def.title);
    await preloadRefs(def);
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const filterFields = def.fields.filter((f) => f.filter && (f.type === 'select' || f.type === 'ref'));
    const filters = {};
    for (const f of filterFields) if (params.get(f.key)) filters[f.key] = params.get(f.key);

    let rows = [];
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Qidirish…', 'aria-label': 'Qidirish' });
    const countEl = h('span', { class: 'muted' });
    const tableBox = h('div', { class: 'card table-wrap' });

    const filterEls = filterFields.map((f) => {
      const opts = f.type === 'select' ? f.options.map((o) => [o.value, o.label]) : optionsCache.get(f.ref).list.map((o) => [String(o.id), o.label]);
      const sel = h('select', { class: 'input', 'aria-label': f.label, onchange: () => { filters[f.key] = sel.value; load(); } },
        h('option', { value: '' }, `${f.label}: barchasi`), opts.map(([v, l]) => h('option', { value: v, selected: filters[f.key] === v }, l)));
      return sel;
    });

    const columns = def.list.map((key) => def.fields.find((f) => f.key === key) ?? { key, label: def.listLabels[key] || key, type: 'text' });

    function renderTable() {
      const q = search.value.trim().toLowerCase();
      const visible = q ? rows.filter((r) => columns.some((c) => {
        const v = r[c.key];
        const text = c.type === 'ref' ? optionsCache.get(c.ref)?.map.get(v) : c.type === 'select' ? c.options.find((o) => o.value === v)?.label : v;
        return String(text ?? '').toLowerCase().includes(q);
      })) : rows;
      countEl.textContent = `${visible.length} ta yozuv`;
      if (!visible.length) {
        tableBox.replaceChildren(h('p', { class: 'empty' }, rows.length ? 'Qidiruv bo‘yicha hech narsa topilmadi.' : `Hozircha ${def.singular} yo‘q.`));
        return;
      }
      tableBox.replaceChildren(h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, columns.map((c) => h('th', {}, c.label)))),
        h('tbody', {}, visible.map((r) => h('tr', { onclick: () => openForm(name, r, load) },
          columns.map((c) => {
            if (name === 'applications' && c.key === 'status') return h('td', { onclick: (e) => e.stopPropagation() }, inlineSelect(name, r, c, load));
            return h('td', { class: ['money', 'decimal', 'number'].includes(c.type) ? 'num' : '' }, display(c, r[c.key]));
          }))))));
    }

    async function load() {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      ({ rows } = await api('GET', `/api/admin/r/${name}${qs ? `?${qs}` : ''}`));
      renderTable();
      if (name === 'applications') refreshBadge();
    }

    search.addEventListener('input', renderTable);
    els.content.replaceChildren(
      h('div', { class: 'toolbar' }, search, filterEls, h('span', { class: 'grow' }), countEl,
        def.noCreate ? null : h('button', { class: 'btn btn-gold', onclick: () => openForm(name, null, load) }, `+ Qo‘shish`)),
      tableBox,
    );
    await load();
  }

  function inlineSelect(name, row, f, reload) {
    const sel = h('select', { class: 'input', 'aria-label': f.label }, f.options.map((o) => h('option', { value: o.value, selected: o.value === row[f.key] }, o.label)));
    sel.addEventListener('change', async () => {
      try {
        await api('PUT', `/api/admin/r/${name}/${row.id}`, { [f.key]: sel.value });
        toast('Holat yangilandi');
        reload();
      } catch (err) {
        toast(err.message, 'err');
        sel.value = row[f.key];
      }
    });
    return sel;
  }

  /* ---------- Tahrirlash shakli ---------- */

  function closeDrawer() {
    document.querySelectorAll('.drawer, .drawer-backdrop').forEach((x) => x.remove());
    removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeDrawer(); }

  function openDrawer(title, body, foot) {
    closeDrawer();
    const drawer = h('div', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'drawer-head' }, h('h2', {}, title), h('button', { class: 'btn icon-btn', 'aria-label': 'Yopish', onclick: closeDrawer }, '×')),
      h('div', { class: 'drawer-body' }, body), h('div', { class: 'drawer-foot' }, foot));
    document.body.append(h('div', { class: 'drawer-backdrop', onclick: closeDrawer }), drawer);
    addEventListener('keydown', escClose);
    drawer.querySelector('input:not([type=hidden]), select, textarea')?.focus();
  }

  function input(f, value) {
    const id = `f-${f.key}`;
    const common = { id, name: f.key, placeholder: f.placeholder || '' };
    switch (f.type) {
      case 'textarea': return h('textarea', { ...common, rows: f.key === 'description' || f.key === 'about_text' ? 6 : 4, maxlength: f.max || 5000 }, value ?? '');
      case 'mapurl': return h('textarea', { ...common, rows: 3, placeholder: '<iframe src="https://www.google.com/maps/embed?..."' }, value ?? '');
      case 'select': return h('select', common, f.required ? null : h('option', { value: '' }, '— tanlanmagan —'),
        f.options.map((o) => h('option', { value: o.value, selected: o.value === (value ?? f.default) }, o.label)));
      case 'ref': return h('select', common, h('option', { value: '' }, f.required ? 'Tanlang…' : '— tanlanmagan —'),
        optionsCache.get(f.ref).list.map((o) => h('option', { value: o.id, selected: o.id === value }, o.label)));
      case 'bool': return h('label', { class: 'switch' }, h('input', { ...common, type: 'checkbox', checked: value === undefined ? f.default === 1 : !!value }), h('span', {}, f.label));
      case 'date': return h('input', { ...common, type: 'date', value: value ?? (f.default === 'today' ? meta.today : '') });
      case 'time': return h('input', { ...common, type: 'time', value: value ?? '' });
      case 'month': return h('input', { ...common, type: 'month', value: value ?? '' });
      case 'money': case 'number': case 'decimal':
        return h('input', { ...common, inputmode: f.type === 'decimal' ? 'decimal' : 'numeric', value: value ?? f.default ?? '' });
      case 'phone': return h('input', { ...common, type: 'tel', placeholder: '+998 90 123 45 67', value: value ?? '' });
      case 'email': return h('input', { ...common, type: 'email', value: value ?? '' });
      case 'url': case 'video': return h('input', { ...common, type: 'url', placeholder: 'https://', value: value ?? '' });
      case 'days': {
        const set = new Set(String(value || '').split(',').filter(Boolean));
        return h('div', { class: 'chips', id }, f.options.map((o) => h('label', { class: 'chip' }, h('input', { type: 'checkbox', value: o.value, checked: set.has(o.value) }), o.short)));
      }
      case 'multi': return multiInput(f, value || []);
      case 'image': return imageInput(f, value);
      default: return h('input', { ...common, value: value ?? '', maxlength: f.max || 200 });
    }
  }

  function multiInput(f, selected) {
    const set = new Set(selected);
    const search = h('input', { class: 'input', type: 'search', placeholder: 'Qidirish…' });
    const count = h('div', { class: 'multi-count' });
    const list = h('div', { class: 'multi-list' });
    const all = optionsCache.get(f.ref).list;
    const updateCount = () => { count.textContent = `Tanlangan: ${set.size} ta`; };
    function render() {
      const q = search.value.trim().toLowerCase();
      list.replaceChildren(...all.filter((o) => !q || o.label.toLowerCase().includes(q)).map((o) => {
        const cb = h('input', { type: 'checkbox', checked: set.has(o.id) });
        cb.addEventListener('change', () => { if (cb.checked) set.add(o.id); else set.delete(o.id); updateCount(); });
        return h('label', {}, cb, o.label);
      }));
      if (!all.length) list.replaceChildren(h('p', { class: 'muted', style: 'padding:8px' }, 'Avval o‘quvchilarni qo‘shing.'));
    }
    search.addEventListener('input', render);
    render();
    updateCount();
    const box = h('div', { class: 'multi', id: `f-${f.key}` }, search, list, count);
    box.getValue = () => [...set];
    return box;
  }

  function imageInput(f, value) {
    let current = value || '';
    const preview = h('div', {});
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true });
    const removeBtn = h('button', { class: 'btn btn-sm btn-danger', type: 'button', onclick: () => { current = ''; render(); } }, 'O‘chirish');
    function render() {
      preview.replaceChildren(current ? h('img', { src: current, alt: '' }) : h('div', { class: 'placeholder' }, 'Rasm yo‘q'));
      removeBtn.hidden = !current;
    }
    file.addEventListener('change', async () => {
      const f0 = file.files[0];
      if (!f0) return;
      if (f0.size > 4 * 1024 * 1024) return toast('Rasm hajmi 4 MB dan oshmasin', 'err');
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(f0);
      });
      try {
        const { url } = await api('POST', '/api/admin/upload', { data });
        current = url;
        render();
      } catch (err) {
        toast(err.message, 'err');
      }
      file.value = '';
    });
    render();
    const box = h('div', { class: 'image-field', id: `f-${f.key}` }, preview,
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => file.click() }, 'Rasm yuklash'), removeBtn, file);
    box.getValue = () => current;
    return box;
  }

  function readValue(f, form) {
    const el = form.querySelector(`#f-${f.key}`);
    if (!el) return undefined;
    if (f.type === 'bool') return el.checked;
    if (f.type === 'days') return [...el.querySelectorAll('input:checked')].map((x) => x.value);
    if (el.getValue) return el.getValue();
    return el.value;
  }

  function fieldBlock(f, value, readonly) {
    const wide = ['textarea', 'mapurl', 'multi', 'image', 'days'].includes(f.type) || readonly;
    if (readonly) {
      const shown = f.type === 'select' ? (f.options.find((o) => o.value === value)?.label ?? value) : f.type === 'datetime' ? fmt.datetime(value) : value;
      return h('div', { class: 'field span-2' }, h('span', { class: 'label' }, f.label), h('div', { class: 'readonly-value' }, shown || '—'));
    }
    return h('div', { class: `field${wide ? ' span-2' : ''}` },
      f.type === 'bool' ? null : h('label', { for: `f-${f.key}` }, f.label, f.required ? h('span', { class: 'req' }, ' *') : null),
      input(f, value),
      f.hint ? h('p', { class: 'field-hint' }, f.hint) : null,
      h('p', { class: 'field-error', dataset: { errorFor: f.key } }));
  }

  function openForm(name, row, reload) {
    const def = meta.resources[name];
    const isNew = !row;
    const form = h('form', { class: 'form-grid', novalidate: true }, def.fields.map((f) => fieldBlock(f, row?.[f.key], !!f.readonly)));
    const alert = h('p', { class: 'alert span-2', hidden: true });
    form.append(alert);
    const save = h('button', { class: 'btn btn-gold', type: 'button' }, 'Saqlash');

    async function submit() {
      const body = {};
      for (const f of def.fields) if (!f.readonly) body[f.key] = readValue(f, form);
      save.disabled = true;
      alert.hidden = true;
      showFieldErrors(form, {});
      try {
        if (isNew) await api('POST', `/api/admin/r/${name}`, body);
        else await api('PUT', `/api/admin/r/${name}/${row.id}`, body);
        if (def.fields.some((f) => f.ref) || ['students', 'courses', 'teachers', 'groups'].includes(name)) optionsCache.delete(name);
        closeDrawer();
        toast(isNew ? 'Qo‘shildi' : 'Saqlandi');
        reload();
      } catch (err) {
        showFieldErrors(form, err.fields);
        alert.textContent = err.message;
        alert.hidden = false;
      } finally {
        save.disabled = false;
      }
    }
    save.addEventListener('click', submit);
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });

    const extra = [];
    if (!isNew && name === 'applications') {
      extra.push(h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          try {
            const r = await api('POST', `/api/admin/applications/${row.id}/convert`, {});
            optionsCache.delete('students');
            toast(r.message);
            closeDrawer();
            reload();
          } catch (err) { toast(err.message, 'err'); }
        },
      }, 'O‘quvchiga aylantirish'));
    }
    if (!isNew && name === 'students') {
      extra.push(h('button', { class: 'btn', type: 'button', onclick: () => accountForm(row, reload) }, row.account_login ? 'Kabinet parolini yangilash' : 'Kabinet ochish'));
    }
    const del = isNew ? null : h('button', {
      class: 'btn btn-danger', type: 'button',
      onclick: async () => {
        if (!confirm(`Haqiqatan ham bu ${def.singular}ni o‘chirmoqchimisiz? Bu amalni qaytarib bo‘lmaydi.`)) return;
        try {
          await api('DELETE', `/api/admin/r/${name}/${row.id}`);
          optionsCache.delete(name);
          closeDrawer();
          toast('O‘chirildi');
          reload();
        } catch (err) { toast(err.message, 'err'); }
      },
    }, 'O‘chirish');

    const titleText = isNew ? `Yangi ${def.singular}` : `${def.singular[0].toUpperCase()}${def.singular.slice(1)}ni tahrirlash`;
    openDrawer(titleText, form, [save, ...extra, h('span', { class: 'spacer' }), del]);
  }

  function accountForm(student, reload) {
    const has = !!student.account_login;
    const form = h('form', { class: 'form-grid', novalidate: true },
      h('p', { class: 'span-2 muted' }, has
        ? `Login: ${student.account_login}. Yangi parol kiriting va uni o‘quvchiga xavfsiz yo‘l bilan yetkazing.`
        : 'O‘quvchi shaxsiy kabinetga shu login va parol bilan kiradi (/kabinet).'),
      has ? null : h('div', { class: 'field span-2' }, h('label', { for: 'acc-login' }, 'Login'),
        h('input', { id: 'acc-login', name: 'login', autocomplete: 'off', placeholder: 'masalan: aziza.karimova' }), h('p', { class: 'field-error', dataset: { errorFor: 'login' } })),
      h('div', { class: 'field span-2' }, h('label', { for: 'acc-pass' }, 'Parol'),
        h('input', { id: 'acc-pass', name: 'password', autocomplete: 'new-password' }),
        h('p', { class: 'field-hint' }, 'Kamida 8 ta belgi, harf va raqam qatnashsin.'), h('p', { class: 'field-error', dataset: { errorFor: 'password' } })));
    const save = h('button', {
      class: 'btn btn-gold', type: 'button',
      onclick: async () => {
        showFieldErrors(form, {});
        try {
          const r = await api('POST', `/api/admin/students/${student.id}/account`, { login: form.login?.value.trim(), password: form.password.value });
          toast(r.message);
          closeDrawer();
          reload();
        } catch (err) {
          showFieldErrors(form, err.fields);
          if (!err.fields) toast(err.message, 'err');
        }
      },
    }, has ? 'Parolni yangilash' : 'Kabinet ochish');
    openDrawer(`${student.full_name}: kabinet`, form, [save]);
  }

  /* ---------- Davomat ---------- */

  async function attendanceView() {
    setPage('Davomat');
    const groups = await options('groups', true);
    if (!groups.list.length) {
      els.content.replaceChildren(h('p', { class: 'empty card' }, 'Avval “Guruhlar” bo‘limida guruh yarating va unga o‘quvchilarni biriktiring.'));
      return;
    }
    const groupSel = h('select', { class: 'input', 'aria-label': 'Guruh' }, groups.list.map((g) => h('option', { value: g.id }, g.label)));
    const dateInput = h('input', { class: 'input', type: 'date', value: meta.today, 'aria-label': 'Sana' });
    const sheet = h('div', {});
    const history = h('div', {});

    async function load() {
      const d = await api('GET', `/api/admin/attendance?group_id=${groupSel.value}&date=${dateInput.value}`);
      const marks = new Map(d.students.map((s) => [s.id, s.status || null]));
      const topic = h('input', { class: 'input', placeholder: 'Dars mavzusi (ixtiyoriy)', value: d.lesson?.topic || '', maxlength: 200 });
      const rowsBox = h('div', {});
      function renderRows() {
        rowsBox.replaceChildren(...d.students.map((s) => h('div', { class: 'att-row' }, h('span', {}, s.full_name),
          h('div', { class: 'seg', role: 'group', 'aria-label': s.full_name }, [['present', 'Keldi'], ['late', 'Kechikdi'], ['absent', 'Kelmadi']].map(([v, l]) => h('button', {
            type: 'button', class: marks.get(s.id) === v ? 'on' : '', dataset: { v }, 'aria-pressed': String(marks.get(s.id) === v),
            onclick: () => { marks.set(s.id, v); renderRows(); },
          }, l))))));
      }
      renderRows();
      const saveBtn = h('button', {
        class: 'btn btn-gold',
        onclick: async () => {
          const payload = Object.fromEntries([...marks].filter(([, v]) => v));
          try {
            const r = await api('PUT', '/api/admin/attendance', { group_id: Number(groupSel.value), date: dateInput.value, topic: topic.value, marks: payload });
            toast(r.message);
            load();
          } catch (err) { toast(err.message, 'err'); }
        },
      }, 'Saqlash');
      sheet.replaceChildren(d.students.length
        ? h('div', { class: 'card' },
          h('div', { class: 'panel-pad', style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center' }, topic,
            h('button', { class: 'btn btn-sm', onclick: () => { d.students.forEach((s) => marks.set(s.id, 'present')); renderRows(); } }, 'Hammasi keldi')),
          rowsBox, h('div', { class: 'panel-pad' }, saveBtn))
        : h('p', { class: 'empty card' }, 'Bu guruhda o‘quvchi yo‘q. “Guruhlar” bo‘limida o‘quvchilarni biriktiring.'));

      history.replaceChildren(d.history.length
        ? h('div', { class: 'card table-wrap', style: 'margin-top:20px' }, h('table', { class: 'data' },
          h('thead', {}, h('tr', {}, ['Sana', 'Mavzu', 'Keldi', 'Kechikdi', 'Kelmadi'].map((t) => h('th', {}, t)))),
          h('tbody', {}, d.history.map((l) => h('tr', { onclick: () => { dateInput.value = l.date; load(); } },
            h('td', {}, fmt.date(l.date)), h('td', {}, l.topic || '—'), h('td', { class: 'num' }, l.present ?? 0),
            h('td', { class: 'num' }, l.late ?? 0), h('td', { class: 'num' }, l.absent ?? 0))))))
        : null);
    }

    groupSel.addEventListener('change', load);
    dateInput.addEventListener('change', load);
    els.content.replaceChildren(h('div', { class: 'toolbar' }, groupSel, dateInput), sheet,
      h('h2', { class: 'section-title', style: 'margin-top:28px' }, 'Darslar tarixi'), history);
    await load();
  }

  /* ---------- Sayt matnlari ---------- */

  async function settingsView() {
    setPage('Sayt matnlari');
    const { values } = await api('GET', '/api/admin/settings');
    const form = h('form', { class: 'form-grid card panel-pad', novalidate: true }, meta.settings.map((f) => fieldBlock(f, values[f.key], false)));
    const save = h('button', { class: 'btn btn-gold', type: 'submit' }, 'Saqlash');
    form.append(h('div', { class: 'span-2' }, save));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(meta.settings.map((f) => [f.key, readValue(f, form)]));
      showFieldErrors(form, {});
      save.disabled = true;
      try {
        const r = await api('PUT', '/api/admin/settings', body);
        toast(r.message);
      } catch (err) {
        showFieldErrors(form, err.fields);
        toast(err.message, 'err');
      } finally {
        save.disabled = false;
      }
    });
    els.content.replaceChildren(h('p', { class: 'muted', style: 'margin:0 0 16px' }, 'Bu yerdagi o‘zgarishlar saytda darhol ko‘rinadi.'), form);
  }

  /* ---------- Foydalanuvchilar ---------- */

  async function usersView() {
    setPage('Foydalanuvchilar');
    const { rows } = await api('GET', '/api/admin/users');
    const act = async (fn) => { try { const r = await fn(); toast(r.message || 'Saqlandi'); usersView(); } catch (err) { toast(err.message, 'err'); } };
    const table = h('div', { class: 'card table-wrap' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, ['Ism', 'Login', 'Rol', 'Holati', 'Amallar'].map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((u) => h('tr', { style: 'cursor:default' },
        h('td', {}, u.full_name), h('td', {}, u.login), h('td', {}, ROLE_LABELS[u.role]),
        h('td', {}, h('span', { class: `pill pill-${u.active ? 'yes' : 'no'}` }, u.active ? 'Faol' : 'O‘chirilgan')),
        h('td', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
          h('button', {
            class: 'btn btn-sm',
            onclick: () => {
              const p = prompt(`${u.full_name} uchun yangi parol (kamida 8 ta belgi, harf va raqam):`);
              if (p) act(() => api('PUT', `/api/admin/users/${u.id}`, { password: p }));
            },
          }, 'Parol'),
          u.id === meta.user.id ? null : h('button', { class: 'btn btn-sm', onclick: () => act(() => api('PUT', `/api/admin/users/${u.id}`, { active: !u.active })) }, u.active ? 'Bloklash' : 'Faollashtirish'),
          u.id === meta.user.id ? null : h('button', {
            class: 'btn btn-sm btn-danger',
            onclick: () => { if (confirm(`${u.full_name} hisobini o‘chirasizmi?`)) act(() => api('DELETE', `/api/admin/users/${u.id}`)); },
          }, 'O‘chirish')))))));

    const form = h('form', { class: 'form-grid card panel-pad', novalidate: true },
      h('h2', { class: 'section-title span-2' }, 'Yangi xodim qo‘shish'),
      ...[['full_name', 'Ism va familiya', 'text'], ['login', 'Login', 'text'], ['password', 'Parol', 'text']].map(([n, l]) => h('div', { class: 'field' },
        h('label', { for: `u-${n}` }, l), h('input', { id: `u-${n}`, name: n, autocomplete: 'off' }), h('p', { class: 'field-error', dataset: { errorFor: n } }))),
      h('div', { class: 'field' }, h('label', { for: 'u-role' }, 'Rol'),
        h('select', { id: 'u-role', name: 'role' }, h('option', { value: 'manager' }, 'Menejer'), h('option', { value: 'admin' }, 'Administrator')),
        h('p', { class: 'field-error', dataset: { errorFor: 'role' } })),
      h('div', { class: 'span-2' }, h('button', { class: 'btn btn-gold', type: 'submit' }, 'Qo‘shish')));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showFieldErrors(form, {});
      try {
        const r = await api('POST', '/api/admin/users', Object.fromEntries(new FormData(form)));
        toast(r.message);
        usersView();
      } catch (err) {
        showFieldErrors(form, err.fields);
        if (!err.fields) toast(err.message, 'err');
      }
    });
    els.content.replaceChildren(
      h('p', { class: 'muted', style: 'margin:0 0 16px' }, 'Menejer arizalar, o‘quvchilar, guruhlar, davomat va to‘lovlar bilan ishlaydi. Administrator — barcha bo‘limlar bilan. O‘quvchi hisoblari “O‘quvchilar” bo‘limida ochiladi.'),
      table, h('div', { style: 'height:20px' }), form);
  }

  boot().catch((err) => {
    root.replaceChildren(h('div', { class: 'auth' }, h('p', { class: 'alert' }, err.message || 'Panelni yuklab bo‘lmadi')));
  });
})();
