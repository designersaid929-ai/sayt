(() => {
  const { h, api, fmt } = window.UI;
  const root = document.getElementById('app');

  const DAYS = { du: 'Dushanba', se: 'Seshanba', ch: 'Chorshanba', pa: 'Payshanba', ju: 'Juma', sh: 'Shanba', ya: 'Yakshanba' };
  const ATT = { present: 'Keldi', late: 'Kechikdi', absent: 'Kelmadi' };
  const PAY = { cash: 'Naqd', card: 'Plastik karta', transfer: 'Bank o‘tkazmasi' };

  async function boot() {
    const { user } = await api('GET', '/api/auth/me');
    if (!user) {
      return UI.loginView(root, {
        title: 'O‘quvchi kabineti',
        lead: 'Login va parolni o‘quv markazi administratoridan olishingiz mumkin.',
        foot: h('a', { href: '/' }, '← Saytga qaytish'),
        onSuccess: (u) => (u.role === 'student' ? boot() : (location.href = '/admin')),
      });
    }
    if (user.role !== 'student') {
      location.href = '/admin';
      return;
    }
    const [data, site] = await Promise.all([api('GET', '/api/cabinet'), api('GET', '/api/site')]);
    render(user, data, site);
  }

  const empty = (text) => h('p', { class: 'empty card' }, text);

  function table(headers, rows) {
    return h('div', { class: 'card table-wrap' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, headers.map((t) => h('th', {}, t)))),
      h('tbody', {}, rows.map((cells) => h('tr', { style: 'cursor:default' }, cells.map((c) => h('td', {}, c)))))));
  }

  const TABS = [
    ['schedule', 'Dars jadvali', (d) => (d.groups.length
      ? h('div', { class: 'cards' }, d.groups.map((g) => h('div', { class: 'card schedule-card' },
        h('h3', {}, g.name),
        g.course ? h('div', { class: 'kv' }, h('span', {}, 'Kurs'), h('span', {}, g.course)) : null,
        h('div', { class: 'kv' }, h('span', {}, 'Kunlar'), h('span', {}, g.days ? g.days.split(',').map((x) => DAYS[x]).join(', ') : '—')),
        h('div', { class: 'kv' }, h('span', {}, 'Vaqti'), h('span', {}, g.start_time ? `${g.start_time}${g.end_time ? `–${g.end_time}` : ''}` : '—')),
        g.room ? h('div', { class: 'kv' }, h('span', {}, 'Xona'), h('span', {}, g.room)) : null,
        g.teacher ? h('div', { class: 'kv' }, h('span', {}, 'Ustoz'), h('span', {}, g.teacher)) : null)))
      : empty('Siz hali birorta guruhga biriktirilmagansiz.'))],

    ['attendance', 'Davomat', (d) => {
      if (!d.attendance.length) return empty('Davomat ma’lumotlari hali kiritilmagan.');
      const attended = d.attendance.filter((a) => a.status !== 'absent').length;
      const pct = Math.round((attended / d.attendance.length) * 100);
      return h('div', {},
        h('div', { class: 'card panel-pad', style: 'margin-bottom:16px' },
          h('div', { class: 'kv' }, h('span', {}, 'Qatnashuv'), h('strong', {}, `${pct}% (${attended} / ${d.attendance.length} dars)`)),
          h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` }))),
        table(['Sana', 'Guruh', 'Mavzu', 'Holat'], d.attendance.map((a) => [
          fmt.date(a.date), a.group_name, a.topic || '—', h('span', { class: `pill pill-${a.status}` }, ATT[a.status]),
        ])));
    }],

    ['tests', 'Test natijalari', (d) => (d.tests.length
      ? table(['Sana', 'Test', 'Natija', ''], d.tests.map((t) => {
        const pct = t.max_score ? Math.round((t.score / t.max_score) * 100) : 0;
        return [fmt.date(t.taken_at), t.title, `${fmt.number(t.score)} / ${fmt.number(t.max_score)}`,
          h('div', { style: 'min-width:120px' }, h('div', { class: 'bar' }, h('i', { style: `width:${Math.min(pct, 100)}%` })))];
      }))
      : empty('Test natijalari hali kiritilmagan.'))],

    ['homework', 'Uy vazifalari', (d) => (d.homework.length
      ? h('div', { class: 'cards' }, d.homework.map((w) => h('div', { class: 'card schedule-card' },
        h('h3', {}, w.title),
        h('div', { class: 'kv' }, h('span', {}, 'Guruh'), h('span', {}, w.group_name)),
        w.due_date ? h('div', { class: 'kv' }, h('span', {}, 'Muddat'), h('span', {}, fmt.date(w.due_date))) : null,
        w.description ? h('p', { style: 'margin:6px 0 0;white-space:pre-wrap;color:var(--text-2)' }, w.description) : null)))
      : empty('Hozircha uy vazifasi berilmagan.'))],

    ['payments', 'To‘lovlar', (d) => (d.payments.length
      ? h('div', {},
        h('div', { class: 'card panel-pad', style: 'margin-bottom:16px' },
          h('div', { class: 'kv' }, h('span', {}, 'Jami to‘langan'), h('strong', {}, fmt.money(d.payments.reduce((s, p) => s + p.amount, 0))))),
        table(['Sana', 'Oy', 'Summa', 'Usul'], d.payments.map((p) => [fmt.date(p.paid_at), fmt.month(p.period) || '—', fmt.money(p.amount), PAY[p.method] || p.method])))
      : empty('To‘lovlar tarixi hali mavjud emas.'))],

    ['materials', 'Materiallar', (d) => (d.materials.length
      ? h('div', { class: 'cards' }, d.materials.map((m) => h('div', { class: 'card schedule-card' },
        h('h3', {}, m.title),
        m.group_name ? h('div', { class: 'kv' }, h('span', {}, 'Guruh'), h('span', {}, m.group_name)) : null,
        m.description ? h('p', { style: 'margin:0;color:var(--text-2)' }, m.description) : null,
        h('a', { class: 'btn btn-sm', href: m.url, target: '_blank', rel: 'noopener noreferrer', style: 'justify-self:start;margin-top:6px' }, 'Ochish ↗'))))
      : empty('O‘quv materiallari hali joylanmagan.'))],

    ['password', 'Parolni o‘zgartirish', () => UI.passwordForm()],
  ];

  function render(user, data, site) {
    const panel = h('div', {});
    const tabBtns = TABS.map(([key, label]) => h('button', { type: 'button', dataset: { tab: key }, onclick: () => show(key) }, label));
    function show(key) {
      const tab = TABS.find((t) => t[0] === key) || TABS[0];
      tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab[0]));
      panel.replaceChildren(tab[2](data));
      history.replaceState(null, '', `#${tab[0]}`);
    }

    const body = data.student
      ? [h('nav', { class: 'tabs', 'aria-label': 'Kabinet bo‘limlari' }, tabBtns), panel]
      : [empty('Hisobingiz hali o‘quvchi ma’lumotlariga bog‘lanmagan. Iltimos, administratorga murojaat qiling.')];

    root.replaceChildren(
      h('header', { class: 'cab-header' },
        h('a', { href: '/' }, UI.logos(site)),
        h('span', { class: 'grow' }),
        UI.themeButton(),
        h('button', { class: 'btn btn-sm', onclick: UI.logout }, 'Chiqish')),
      h('main', { class: 'cab-wrap' },
        h('h1', { style: 'font-size:1.7rem' }, `Assalomu alaykum, ${user.full_name.split(' ')[0]}!`),
        h('p', { class: 'muted', style: 'margin:6px 0 0' }, 'Shaxsiy kabinetingizga xush kelibsiz.'),
        ...body));
    if (data.student) show(location.hash.slice(1));
  }

  boot().catch((err) => root.replaceChildren(h('div', { class: 'auth' }, h('p', { class: 'alert' }, err.message))));
})();
