// Teacher dashboard (prd.md F12). Read-only view; vanilla JS, no build step.
(() => {
  const API = '/api/v1';
  const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  const SKILL_LABELS = { integerOps: 'Bil. bulat', fractions: 'Pecahan', algebraSimplify: 'Aljabar dasar' };
  const STATUS_ICON = { mastered: '●', active: '◐', locked: '○' };

  const $ = (id) => document.getElementById(id);
  let token = sessionStorage.getItem('sx_teacher_token');
  let currentClass = null;
  let summary = null;

  const views = ['login-view', 'classes-view', 'class-view'];
  function show(view) {
    views.forEach((v) => ($(v).hidden = v !== view));
    $('logout').hidden = view === 'login-view';
  }

  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) },
    });
    if (res.status === 401) { logout(); throw new Error('Sesi berakhir, silakan masuk lagi.'); }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
    return res;
  }

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  }

  function logout() {
    token = null;
    sessionStorage.removeItem('sx_teacher_token');
    show('login-view');
  }

  $('login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    $('login-error').textContent = '';
    const f = new FormData(ev.target);
    try {
      const res = await api('/teacher/login', { method: 'POST', body: JSON.stringify({ email: f.get('email'), pin: f.get('pin') }) });
      token = (await res.json()).token;
      sessionStorage.setItem('sx_teacher_token', token);
      loadClasses();
    } catch (e) { $('login-error').textContent = e.message; }
  });

  $('logout').addEventListener('click', logout);
  $('back').addEventListener('click', loadClasses);
  $('refresh').addEventListener('click', () => openClass(currentClass));
  $('export').addEventListener('click', async () => {
    const res = await api(`/classes/${currentClass}/export?format=csv`);
    const url = URL.createObjectURL(await res.blob());
    el('a', { href: url, download: `${currentClass}-events.csv` }).click();
    URL.revokeObjectURL(url);
  });

  async function loadClasses() {
    show('classes-view');
    const list = $('class-list');
    list.replaceChildren(el('li', { class: 'muted' }, 'Memuat…'));
    try {
      const { classes } = await (await api('/teacher/classes')).json();
      list.replaceChildren(...(classes.length ? classes.map((c) =>
        el('li', {}, el('button', { onclick: () => openClass(c.code) }, `${c.name} (${c.code}) · ${c.studentCount} siswa`))
      ) : [el('li', { class: 'muted' }, 'Belum ada kelas. Hubungi peneliti.')]));
    } catch (e) { list.replaceChildren(el('li', { class: 'error' }, e.message)); }
  }

  async function openClass(code) {
    currentClass = code;
    show('class-view');
    $('student-detail').hidden = true;
    summary = await (await api(`/classes/${code}/summary`)).json();
    $('class-title').textContent = `${summary.name} (${summary.code})`;
    renderErrorBars();
    renderTable();
  }

  function renderErrorBars() {
    const entries = Object.entries(summary.errorLabels).map(([k, label]) => [label, summary.classErrors[k] || 0]);
    const max = Math.max(1, ...entries.map((e) => e[1]));
    $('error-bars').replaceChildren(...entries.map(([label, n]) =>
      el('div', { class: 'bar' }, el('span', {}, label),
        el('div', { class: 'bar-track' }, el('div', { class: 'bar-fill', style: `width:${(n / max) * 100}%` })),
        el('span', {}, n))
    ));
  }

  function fmtSync(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function renderTable() {
    const head = el('tr', {}, el('th', {}, 'Siswa'), LEVELS.map((l) => el('th', {}, l)),
      el('th', {}, 'Kesalahan dominan'), el('th', {}, 'Status'), el('th', {}, 'Terakhir sinkron'));
    const rows = summary.students.map((s) => el('tr', { class: 'clickable', onclick: () => renderDetail(s) },
      el('td', {}, s.studentCode),
      LEVELS.map((l) => {
        const st = s.levels[l]?.status || 'locked';
        return el('td', { class: 'lvl-' + st, title: st }, STATUS_ICON[st]);
      }),
      el('td', {}, s.dominantError ? el('span', { class: 'tag err' }, summary.errorLabels[s.dominantError]) : '—'),
      el('td', {}, !s.joined ? el('span', { class: 'muted' }, 'belum bergabung')
        : s.stuckLevels.length ? el('span', { class: 'tag stuck' }, 'macet ' + s.stuckLevels.join(', ')) : '✓'),
      el('td', { class: 'muted' }, fmtSync(s.lastSyncAt)),
    ));
    $('student-table').replaceChildren(el('thead', {}, head), el('tbody', {}, rows));
  }

  function renderDetail(s) {
    const box = $('student-detail');
    box.hidden = false;
    const diag = Object.entries(s.diagnostic);
    box.replaceChildren(
      el('h3', {}, 'Detail ' + s.studentCode),
      el('p', {}, 'Diagnostik prasyarat: ', diag.length
        ? diag.map(([k, v]) => `${SKILL_LABELS[k] || k} ${v.correct}/${v.total}`).join(' · ') : 'belum dikerjakan'),
      el('p', {}, 'Kesalahan: ', Object.keys(s.errors).length
        ? Object.entries(s.errors).map(([k, n]) => `${summary.errorLabels[k]} ${n}×`).join(' · ') : 'tidak ada'),
      el('p', {}, 'Ketepatan jawaban "Mengapa?": ', s.whyCorrectRate == null ? '—' : Math.round(s.whyCorrectRate * 100) + '%'),
      el('p', { class: 'muted' }, `${s.eventCount} aktivitas tercatat.`),
    );
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (token) loadClasses(); else show('login-view');
})();
