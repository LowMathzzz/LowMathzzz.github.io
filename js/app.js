'use strict';
/* ===== Portfolio: idioma, navegación, indicador lateral, tema día/noche, tecnologías y contacto ===== */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};
const EMAIL = 'mateoloechle@outlook.com';

/* ---------- TEXTOS EN INGLÉS (el español vive en el HTML) ---------- */
const EN = {
  skip: 'Skip to content', 'nav.label': 'Sections', 'nav.home': 'Home', 'nav.profile': 'Profile', 'nav.work': 'Projects', 'nav.tech': 'Technologies',
  'nav.bg': 'Background', 'nav.contact': 'Contact', 'nav.menu': 'Menu',
  'hero.lede': 'I design and build secure backends with Java and Spring Boot, and cross-platform apps with Flutter.',
  'hero.open': 'Open to new opportunities', 'hero.where': 'Lima, Peru · remote or on-site', 'hero.time': 'Time in Lima',
  'hero.cta1': 'Get in touch', 'hero.cta2': 'View résumé', 'hero.hint': 'Interactive background: click the water or move your cursor.', 'hero.down': 'Go to profile',
  'profile.title': 'Software engineer based in Lima, Peru.', 'profile.facts': 'In short',
  'profile.p0': 'I focus on backend with Java and Spring Boot and on mobile apps with Flutter.',
  'profile.p1': "I'm especially interested in application security —JWT authentication, role-based access control and data encryption— and in designing systems that stay easy to maintain as they grow.",
  'profile.p2': 'I am also drawn to clean and event-driven architectures, cross-platform mobile development and automating cloud deployments.',
  'now.title': 'Right now', 'now.1': 'Looking for my next backend or mobile role', 'now.2': 'Training as a Cybersecurity Analyst',
  'now.4': 'Studying Software Engineering at UPC (graduating 2027)',
  'profile.k2': 'Location', 'profile.v2': 'Lima, Peru (GMT-5)', 'profile.k3': 'Work mode', 'profile.v3': 'Remote or on-site in Lima',
  'profile.k4': 'Languages', 'profile.v4': 'Spanish (native) · English (B2)', 'profile.k5': 'Education', 'profile.v5': 'Software Engineering, UPC (2027)',
  'work.eyebrow': 'Projects', 'work.title': 'Recent work', 'tab1.s': 'CRM · 2025 – 2026', 'tab2.s': 'Restaurants · 2025 – present',
  'c.role': 'Role', 'c.sec': 'Security', 'c.practices': 'Practices', 'c.period': 'Period', 'c.mode': 'Work mode', 'c.type': 'Type', 'c.status': 'Status',
  'c1.when': 'Dec 2025 — Sep 2026', 'c1.sub': 'CRM for insurance brokers', 'c1.mode': 'Remote, occasionally on-site', 'c1.status': 'Delivered',
  'c1.desc': "A system that centralizes the brokerage's operations: policies, installments and renewals, claims, clients, sub-agents and exportable reports. I built it end to end, from the data model to delivery.",
  'c1.b1': 'Monolithic backend with the business logic, REST API and data model for the entire portfolio.',
  'c1.b2': 'Modules for policies, installments and renewals, claims, clients and sub-agents, with exportable reports.',
  'c1.s1': 'JWT authentication and hardening standards on the API.', 'c1.s2': 'Roles and permissions for sub-agents, administrative staff and managers.',
  'c1.s3': 'Database encryption and strengthened frontend security.', 'c1.h3': 'Delivery',
  'c1.d1': 'Complete system delivered through to completion.', 'c1.d2': 'Remote work, coordinating with the on-site team when needed.',
  'c1.stack': 'REST API · JWT · Role-based access control · Data encryption · Hardening · Reports',
  'c2.kind': 'Personal project', 'c2.status': 'In development', 'c2.when': '2025 — present', 'c2.sub': 'Operations management for restaurants and grills', 'c2.role': 'Design and full development',
  'c2.desc': "A modular web platform for a restaurant's daily operations: attendance and payroll, expenses and accounts payable, sales reconciliation, recipe-based inventory and goods receiving.",
  'c2.m1': 'Payroll', 'c2.m2': 'Expenses', 'c2.m3': 'Sales', 'c2.m4': 'Inventory', 'c2.m5': 'Receiving',
  'c2.h1': 'Automation', 'c2.b1': 'Automatic processing of Excel files: biometric logs, sales reports and supplier orders.',
  'c2.b2': 'Calculation of late arrivals, deductions and salaries from that data.',
  'c2.s1': 'Encryption of sensitive data and role-based access control.', 'c2.s2': 'Expiring sessions and abuse protection.',
  'c2.h3': 'Modules', 'c2.d1': 'Payroll, expenses and accounts payable.', 'c2.d2': 'Sales reconciliation and recipe-based inventory.',
  'tech.title': 'Tools I work with.', 'tech.filter': 'Filter by area', 'cat.all': 'All', 'cat.lang': 'Languages', 'cat.back': 'Backend & testing',
  'cat.cloud': 'Cloud & DevOps', 'cat.data': 'Data', 'cat.front': 'Front-end & mobile',
  'tech.arch': 'Architecture & patterns', 'tech.method': 'Methodologies & tools', 'pill.micro': 'Microservices', 'pill.hex': 'Hexagonal architecture',
  'bg.title': 'Experience and education.', 'bg.cv': 'View full résumé', 'bg.org1': 'Arias y Arias Corredores de Seguros · Lima, Peru (remote)',
  'tag.rest': 'REST API', 'tag.enc': 'Encryption', 'tag.remote': 'Remote',
  'bg.job1': "End-to-end development of AAS-NET, the brokerage's CRM: backend, REST API, data model and security with JWT, roles and encryption, through delivery of the complete system.",
  'bg.when2': 'Mar 2022 — 2027', 'bg.deg': 'B.S. in Software Engineering', 'bg.org2': 'Universidad Peruana de Ciencias Aplicadas (UPC) · in progress, expected 2027',
  'bg.e1': 'Software engineering, the software development life cycle (SDLC), design and testing.',
  'bg.e2': 'Advanced data structures and algorithm analysis to optimize time and memory.',
  'bg.e3': 'Data modeling in relational and NoSQL databases: consistency, performance and scalability.',
  'bg.certs': 'Certifications', 'bg.courses': 'Courses',
  'cert.mongo': 'Introduction to MongoDB', 'cert.scrum': 'Scrum Fundamentals', 'cert.java': 'Java (basic)', 'cert.flutter': 'Flutter — mobile development',
  'cert.micro': 'Microservices development', 'cert.cyber': 'Cybersecurity Analyst', 'cert.wip': 'in progress',
  'contact.title': 'Have a role or a project in mind?', 'contact.big': "I'm open to backend, mobile or full-stack roles, remote or in Lima. Write to me and let's talk.",
  'contact.copy': 'Copy',
  foot: 'Designed and built by me · HTML, CSS, JavaScript and WebGL',
};
const TXT = {
  es: { copied: 'Email copiado', modes: ['Tema automático según tu hora', 'Tema de día', 'Tema de noche'], motion: ['Pausar animación', 'Reanudar animación'] },
  en: { copied: 'Email copied', modes: ['Automatic theme by your local time', 'Day theme', 'Night theme'], motion: ['Pause animation', 'Resume animation'] },
};
const tx = k => TXT[SEA.lang][k];
const setText = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };   // escribir solo si cambió: no invalida el layout

/* ---------- IDIOMA ---------- */
function setLang(l) {
  SEA.lang = l; document.documentElement.lang = l; store.set('lang', l);
  for (const el of $$('[data-i18n]')) {
    if (el.dataset.es === undefined) el.dataset.es = el.innerHTML;
    el.innerHTML = l === 'en' ? (EN[el.dataset.i18n] ?? el.dataset.es) : el.dataset.es;
  }
  for (const el of $$('[data-i18n-attr]')) for (const pair of el.dataset.i18nAttr.split(';')) {
    const [attr, key] = pair.split(':'), k = 'es' + attr.replace(/[^a-z]/g, '');
    if (el.dataset[k] === undefined) el.dataset[k] = el.getAttribute(attr) || '';
    el.setAttribute(attr, l === 'en' ? (EN[key] ?? el.dataset[k]) : el.dataset[k]);
  }
  for (const b of $$('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === l));
  themeUI(); motionUI(); clock();
}
for (const b of $$('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

/* ---------- TEMA DÍA / NOCHE ---------- */
const MODES = ['auto', 'day', 'night'], ICONS = ['◐', '☀', '☾'];
function themeUI() {
  const i = MODES.indexOf(SEA.theme), b = $('#theme-btn');
  b.firstElementChild.textContent = ICONS[i]; b.title = tx('modes')[i]; b.setAttribute('aria-label', tx('modes')[i]);
}
$('#theme-btn').addEventListener('click', () => {
  SEA.theme = MODES[(MODES.indexOf(SEA.theme) + 1) % 3]; SEA.skyDirty = true;
  store.set('theme', SEA.theme); themeUI(); toast(tx('modes')[MODES.indexOf(SEA.theme)]);
});

/* ---------- PAUSAR EL FONDO (contenido en movimiento: WCAG 2.2.2) ---------- */
function motionUI() { setText($('#motion-btn'), tx('motion')[SEA.paused ? 1 : 0]); document.documentElement.classList.toggle('paused', SEA.paused); }
$('#motion-btn').addEventListener('click', () => { SEA.paused = !SEA.paused; store.set('motion', SEA.paused ? 'off' : 'on'); motionUI(); });

/* ---------- HORA EN LIMA ---------- */
function clock() {
  const v = new Date().toLocaleTimeString(SEA.lang === 'en' ? 'en-US' : 'es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
  for (const el of $$('.lima-time')) setText(el, v);
}
setInterval(clock, 15000);

/* ---------- INDICADOR LATERAL, NAV ACTIVA Y AVISOS ---------- */
// las posiciones se miden solo cuando cambia el layout; por frame se usan transforms (no fuerzan layout)
const SECS = ['top', 'profile', 'work', 'tech', 'background', 'contact'];
const G = { gauge: $('.gauge'), track: $('.gauge-track'), fill: $('.gauge-fill'), fish: $('.gauge-fish'), bar: $('.nav-progress'), nav: $('#nav'), links: $$('.gauge-marks a, .nav-links a') };
const progressAt = y => clamp((y - SEA.surf) / (SEA.floor0 - SEA.surf), 0, 1);
const secTop = id => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + scrollY : 0; };
let tops = [], trackH = 0, maxY = 1;
function placeMarks() {
  tops = SECS.map(id => [id, secTop(id)]);
  trackH = getComputedStyle(G.gauge).display === 'none' ? 0 : G.track.clientHeight;
  maxY = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  for (const a of $$('.gauge-marks a')) a.parentElement.style.top = (a.dataset.sec === 'top' ? 0 : progressAt(secTop(a.dataset.sec) + 140)) * 100 + '%';
  lastP = -1;
}
SEA.onLayout = placeMarks;
let lastY = 0, lastP = -1, lastB = -1, lastSec = '', solid = null, nightAttr = null;
SEA.onTick = () => {
  const y = scrollY, p = progressAt(y + SEA.vh * .5), b = clamp(y / maxY, 0, 1);
  if (Math.abs(b - lastB) > .0005) { lastB = b; G.bar.style.transform = `scaleX(${b.toFixed(4)})`; }   // barra de progreso: reemplaza al scroll oculto
  if (trackH && Math.abs(p - lastP) > .0004) {
    lastP = p;
    G.fill.style.transform = `scaleY(${p.toFixed(4)})`;
    G.fish.style.transform = `translate(-50%, ${(p * trackH - 8).toFixed(1)}px)`;
  }
  if (Math.abs(y - lastY) > 2) { G.fish.classList.toggle('left', y < lastY); lastY = y; }
  let cur = 'top'; for (const [id, top] of tops) if (top <= y + SEA.vh * .45) cur = id;
  if (cur !== lastSec) { lastSec = cur; for (const a of G.links) a.classList.toggle('active', a.getAttribute('href') === '#' + cur); }
  if ((y > 40) !== solid) { solid = y > 40; G.nav.classList.toggle('solid', solid); }
  const night = SEA.night > .55;
  if (night !== nightAttr) { nightAttr = night; document.documentElement.toggleAttribute('data-night', night); }
};
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

/* ---------- MENÚ MÓVIL ---------- */
$('#menu-btn').addEventListener('click', () => { const open = $('#nav').classList.toggle('open'); $('#menu-btn').setAttribute('aria-expanded', String(open)); });
for (const a of $$('.nav-links a')) a.addEventListener('click', () => { $('#nav').classList.remove('open'); $('#menu-btn').setAttribute('aria-expanded', 'false'); });

/* ---------- APARECER AL HACER SCROLL ---------- */
const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }, { threshold: .12 });
for (const el of $$('.reveal')) io.observe(el);

/* ---------- TECNOLOGÍAS: cada una se dibuja con los colores de su marca ---------- */
const TECH = {
  Java: ['goldfish', { b: '#f0861a', top: '#d8650a', bel: '#ffc070', f: '#5382a1' }],
  Kotlin: ['guppy', { t1: '#7f52ff', t2: '#e44857' }], Dart: ['guppy', { t1: '#0175c2', t2: '#13b9fd' }],
  Python: ['guppy', { t1: '#3776ab', t2: '#ffd43b', sp: 1 }], TypeScript: ['guppy', { t1: '#3178c6', t2: '#9cc4f0' }],
  JavaScript: ['guppy', { t1: '#f7df1e', t2: '#fff3a0' }], 'C#': ['guppy', { t1: '#9b4f96', t2: '#d39bd0' }], 'C++': ['guppy', { t1: '#00599c', t2: '#659ad2' }],
  'Spring Boot': ['betta', { b: '#6db33f', s: '#a6e27a', f1: '#6db33f', f2: '#1f5a12' }], Kafka: ['betta', { b: '#2a2a2a', s: '#6a6a6a', f1: '#e8e8e8', f2: '#3a3a3a' }],
  JUnit: ['platy', { b: '#25a162', f: '#7fd6a6' }], Mockito: ['platy', { b: '#9fd36b', f: '#e6f5d0' }], Stripe: ['betta', { b: '#635bff', s: '#8f89ff', f1: '#635bff', f2: '#00d4ff' }],
  Culqi: ['platy', { b: '#00a19b', f: '#7de0db' }], SendGrid: ['platy', { b: '#1a82e2', b2: '#51a9e3', f: '#9dd0f5' }],
  AWS: ['gourami', { b: '#ff9900', l: '#232f3e' }], Azure: ['gourami', { b: '#0078d4', l: '#50e6ff' }], Docker: ['gourami', { b: '#2496ed', l: '#bfe3ff' }],
  'GitHub Actions': ['betta', { b: '#2088ff', s: '#79b8ff', f1: '#24292f', f2: '#2088ff' }], Jenkins: ['platy', { b: '#d24939', f: '#f2c6a0' }],
  Linux: ['platy', { b: '#fcc624', b2: '#f2a900', f: '#333333' }], Grafana: ['platy', { b: '#f46800', b2: '#fbca0a', f: '#fbca0a' }],
  PostgreSQL: ['cory', { b: '#336791', k: '#1d3f5c', bel: '#a9c4dc' }], MongoDB: ['cory', { b: '#47a248', k: '#1f5c22', bel: '#b8e0b0' }],
  Redis: ['cory', { b: '#dc382d', k: '#7a1a14', bel: '#f2b0a8' }], SQL: ['cory', { b: '#e38c00', k: '#8a5200', bel: '#f6d29a' }],
  Flutter: ['betta', { b: '#54c5f8', s: '#9be2ff', f1: '#54c5f8', f2: '#02569b' }], Angular: ['platy', { b: '#dd0031', b2: '#c3002f', f: '#ff6b81' }],
  Vue: ['gourami', { b: '#42b883', l: '#35495e' }], React: ['neon', {}],
};
const CAT_BAND = { lang: [.02, .4], back: [.2, .62], cloud: [.38, .8], front: [.1, .55], data: [.8, 1] };
const techTank = new Tank($('#tech-tank'), tk => {
  for (const [cat, [a, z]] of Object.entries(CAT_BAND)) {
    const g = new Group(tk, () => {
      const [p, q] = tk.filter === cat ? [.15, .8] : [a, z];
      return { x0: tk.lim.x0, x1: tk.lim.x1, y0: 40 + (tk.h - 70) * p, y1: 40 + (tk.h - 70) * q };
    });
    tk.groups.push(g);
    for (const li of $$(`#tech-list li[data-cat="${cat}"]`)) later(() => {
      const [k, V] = TECH[li.dataset.tech] || ['neon', {}], sp = FISH[k];
      const f = addFish(g, sp, fishSprites(sp, { ...sp.variants[0], ...V }), { label: li.dataset.tech, cat });
      f.fade = tk.filter === 'all' || cat === tk.filter ? 1 : .16;
    });
  }
}, { labels: true });
for (const c of $$('.chip')) c.addEventListener('click', () => {
  const cat = c.dataset.cat; techTank.filter = cat;
  for (const o of $$('.chip')) o.setAttribute('aria-pressed', String(o === c));
  for (const li of $$('#tech-list li')) li.classList.toggle('off', cat !== 'all' && li.dataset.cat !== cat);
  for (const g of techTank.groups) { g.pick(); for (const f of g.members) f.fade = cat === 'all' || f.cat === cat ? 1 : .16; }
});
for (const li of $$('#tech-list li')) {
  li.addEventListener('mouseenter', () => { techTank.hot = li.dataset.tech; li.classList.add('hot'); });
  li.addEventListener('mouseleave', () => { techTank.hot = null; li.classList.remove('hot'); });
}

/* ---------- PROYECTOS: pestañas (sin JS se ven los dos) ---------- */
const tabs = $$('.tab');
function showTab(t, anim) {
  for (const o of tabs) {
    const on = o === t, panel = document.getElementById(o.getAttribute('aria-controls'));
    o.setAttribute('aria-selected', String(on)); o.tabIndex = on ? 0 : -1; panel.hidden = !on;
    if (on && anim) { panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap'); }
  }
}
for (const t of tabs) {
  t.addEventListener('click', () => showTab(t, true));
  t.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    showTab(n, true); n.focus();
  });
}
showTab(tabs[0]);

/* ---------- CONTACTO ---------- */
for (const b of $$('[data-copy]')) b.addEventListener('click', () => {
  const done = () => toast(tx('copied'));
  if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, () => { location.href = 'mailto:' + EMAIL; });
  else location.href = 'mailto:' + EMAIL;
});

/* ---------- ARRANQUE ---------- */
$('#year').textContent = new Date().getFullYear();
SEA.theme = MODES.includes(store.get('theme')) ? store.get('theme') : 'auto';
SEA.paused = store.get('motion') ? store.get('motion') === 'off' : SEA.reduced;
setLang(store.get('lang') || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en'));
placeMarks();
console.log('%cMateo Loechle — Software Engineer', 'font:700 14px system-ui');
console.log(EMAIL + ' · github.com/LowMathzzz');
