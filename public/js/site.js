(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Menyu: surilganda fon, telefonda ochiluvchi ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('.nav-toggle');
  const setNav = (open) => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menyuni yopish' : 'Menyuni ochish');
  };
  toggle.addEventListener('click', () => setNav(!header.classList.contains('nav-open')));
  $$('.main-nav a').forEach((a) => a.addEventListener('click', () => setNav(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

  /* ---------- Ko‘rinish maydoniga kirganda paydo bo‘lish ---------- */
  const revealEls = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Telefon raqami niqobi: +998 90 123 45 67 ---------- */
  function formatPhone(value) {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('998')) d = d.slice(3);
    d = d.slice(0, 9);
    const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    return `+998${parts.length ? ' ' : ''}${parts.join(' ')}`;
  }
  $$('[data-phone]').forEach((input) => {
    input.addEventListener('focus', () => { if (!input.value) input.value = '+998 '; });
    input.addEventListener('blur', () => { if (input.value.trim() === '+998') input.value = ''; });
    input.addEventListener('input', () => { input.value = formatPhone(input.value); });
  });

  /* ---------- Ariza shakli ---------- */
  const MESSAGES = {
    full_name: 'Ism va familiyangizni kiriting',
    phone: 'Telefon raqamini to‘liq kiriting: +998 XX XXX XX XX',
    course: 'Kursni tanlang',
    preferred_time: 'Sizga qulay vaqtni tanlang',
  };

  function validate(form) {
    const errors = {};
    const data = Object.fromEntries(new FormData(form));
    if ((data.full_name || '').trim().length < 3) errors.full_name = MESSAGES.full_name;
    if ((data.phone || '').replace(/\D/g, '').length !== 12) errors.phone = MESSAGES.phone;
    if (!data.course) errors.course = MESSAGES.course;
    if (!data.preferred_time) errors.preferred_time = MESSAGES.preferred_time;
    return { data, errors };
  }

  function showErrors(form, errors) {
    $$('[data-error]', form).forEach((p) => {
      const msg = errors[p.dataset.error] || '';
      p.textContent = msg;
      p.closest('.field').classList.toggle('has-error', !!msg);
    });
    const first = Object.keys(errors)[0];
    if (first) form.elements[first]?.focus();
  }

  $$('[data-enroll-form]').forEach((form) => {
    form.addEventListener('input', (e) => {
      const field = e.target.closest('.field');
      if (field?.classList.contains('has-error')) {
        field.classList.remove('has-error');
        $('[data-error]', field).textContent = '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = $('[data-form-alert]', form);
      alert.hidden = true;
      const { data, errors } = validate(form);
      showErrors(form, errors);
      if (Object.keys(errors).length) return;

      const btn = $('button[type="submit"]', form);
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Yuborilmoqda…';
      try {
        const res = await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (json.fields) showErrors(form, json.fields);
          alert.textContent = json.error || 'Xatolik yuz berdi. Qayta urinib ko‘ring.';
          alert.hidden = false;
          return;
        }
        onSuccess(form, json.message);
      } catch {
        alert.textContent = 'Internet aloqasini tekshirib, qayta urinib ko‘ring.';
        alert.hidden = false;
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  });

  function onSuccess(form, message) {
    const text = message || 'Arizangiz qabul qilindi! Tez orada siz bilan bog‘lanamiz.';
    form.reset();
    const dialogEl = form.closest('dialog');
    if (dialogEl) {
      $('[data-form-view]', dialogEl).hidden = true;
      $('[data-success-view]', dialogEl).hidden = false;
      $('[data-success-text]', dialogEl).textContent = text;
      return;
    }
    let box = form.nextElementSibling;
    if (!box?.classList.contains('form-success')) {
      box = document.createElement('div');
      box.className = 'form-success';
      box.setAttribute('role', 'status');
      box.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg><p></p>';
      form.after(box);
    }
    $('p', box).textContent = text;
    box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }

  /* ---------- “Kursga yozilish” modal oynasi ---------- */
  const dialog = $('#enroll-dialog');
  function openEnroll(course) {
    $('[data-form-view]', dialog).hidden = false;
    $('[data-success-view]', dialog).hidden = true;
    const form = $('form', dialog);
    showErrors(form, {});
    $('[data-form-alert]', form).hidden = true;
    if (course) form.elements.course.value = course;
    setNav(false);
    dialog.showModal();
    document.body.classList.add('modal-open');
    setTimeout(() => form.elements.full_name.focus(), 60);
  }
  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-enroll]');
    if (trigger) {
      e.preventDefault();
      openEnroll(trigger.dataset.enroll);
    }
  });

  /* ---------- Video fikrlar: bosilgandagina YouTube yuklanadi ---------- */
  document.addEventListener('click', (e) => {
    const facade = e.target.closest('[data-youtube]');
    if (!facade) return;
    const iframe = document.createElement('iframe');
    iframe.className = 'video-frame';
    iframe.src = `https://www.youtube-nocookie.com/embed/${facade.dataset.youtube}?autoplay=1&rel=0`;
    iframe.title = 'O‘quvchi fikri (video)';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);
  });

  /* ---------- Hero 3D sahnasi: sahifa yuklangandan keyin, kechiktirib ---------- */
  const src = document.currentScript?.dataset.hero3d;
  const canvas = $('canvas[data-hero3d]');
  if (src && canvas) {
    const supportsWebGL = (() => {
      try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
    })();
    if (supportsWebGL) {
      const start = () => import(src).then((m) => m.mount(canvas, { reduceMotion })).catch(() => {});
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
      if (document.readyState === 'complete') idle(start);
      else addEventListener('load', () => idle(start), { once: true });
    }
  }
})();
