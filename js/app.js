'use strict';
/* ===== Portfolio: idioma, navegación, profundímetro, día/noche, peceras chicas y contacto ===== */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};
const EMAIL = 'mateoloechle@outlook.com', CM = 60;   // la pecera mide 60 cm de la superficie al fondo

/* ---------- TEXTOS EN INGLÉS (el español vive en el HTML) ---------- */
const EN = {
  skip: 'Skip to content', 'nav.about': 'About', 'nav.stack': 'Stack', 'nav.exp': 'Experience', 'nav.projects': 'Projects', 'nav.contact': 'Contact', 'nav.menu': 'Menu',
  gauge: 'Depth', 'g.top': 'Surface', 'g.pearls': 'Pearls',
  'hero.status': 'Open to work · Lima, Peru · Remote', 'hero.kicker': "Hi, I'm",
  'hero.lede': 'I build secure backends and cross-platform apps: REST APIs, WebSockets and clean architectures that scale.',
  'hero.stack': 'Main stack', 'hero.cta1': 'See projects →', 'hero.cta2': "Let's talk", 'hero.dive': 'Dive', 'hud.fish': 'fish',
  'hero.hint': 'This is a real fish tank: <b>click</b> to feed, move fast and they flee, stay still and they come closer. <b>F</b> feeds · <b>T</b> knocks on the glass.',
  'about.title': 'About me',
  'about.p0': "Software engineer in Lima, Peru. I build the part you don't see —APIs, data and security— so everything else just works.",
  'about.p1': 'Backend developer focused on <strong>Java and Spring Boot</strong>: REST APIs, WebSockets, WebHooks, data modeling and JWT security. I also build cross-platform mobile apps with <strong>Flutter</strong> and have worked on web projects with Angular, Vue and React.',
  'about.p2': 'I work with <strong>AWS</strong> (EC2, Lambda), Docker and CI/CD on GitHub Actions and Jenkins, with observability in Grafana. I like clean, scalable architectures —microservices, event-driven, hexagonal, Clean Architecture— backed by tests in JUnit and Mockito.',
  'about.f1': 'languages', 'about.f2': 'certifications', 'about.f3': 'CRM delivered end to end', 'about.f4': 'professional English',
  'about.card': 'Species card', 'about.k1': 'Habitat', 'about.v1': 'Lima, Peru · open to remote', 'about.k2': 'Diet', 'about.v2': 'REST APIs, WebSockets and well-tested code',
  'about.k3': 'Behavior', 'about.v3': "Curious. Swims toward hard problems and doesn't let go until they ship.", 'about.k4': 'Languages', 'about.v4': 'Spanish (native) · English (B2)',
  'about.k5': 'Education', 'about.v5': 'Software Engineering — UPC (2022 – 2027)', 'about.k6': 'Status', 'about.v6': 'Open to new challenges',
  'stack.title': 'Tech school', 'stack.sub': 'Every fish is a technology I work with. Filter by category, hover the list or drop some food into the tank.',
  'stack.filter': 'Filter by category', 'cat.all': 'All', 'cat.lang': 'Languages', 'cat.data': 'Data',
  'tank.title': 'Click: food · fast mouse: they flee', 'tank.demo': 'Click: food',
  'stack.arch': 'Architecture & patterns', 'stack.method': 'Methodologies & tools', 'pill.micro': 'Microservices', 'pill.hex': 'Hexagonal',
  'exp.title': 'Logbook', 'exp.sub': "Where I've been swimming: experience and education.",
  'exp.a.when': 'Dec 2025 — Sep 2026', 'exp.a.where': 'Lima, Peru · remote', 'exp.a.note': 'Remote, with occasional on-site work',
  'exp.a.b1': 'Built <strong>AAS-NET</strong> end to end: a CRM for insurance brokers that centralizes policies, installments and renewals, claims, clients and sub-agents, plus exportable reports.',
  'exp.a.b2': "Built the platform's monolithic backend: business logic, REST API and data model to run the entire portfolio from a single system.",
  'exp.a.b3': 'Secured the API with JWT authentication and hardening standards, with role-based access and permissions for sub-agents, administrative staff and managers.',
  'exp.a.b4': 'Implemented database encryption and strengthened frontend security to protect sensitive client and policy data.',
  'exp.a.b5': 'Delivered the complete system through to completion, working remotely and coordinating with the on-site team when needed.',
  'exp.b.when': 'Mar 2022 — 2027 (expected)', 'exp.b.where': 'Lima, Peru', 'exp.b.title': 'B.S. in Software Engineering', 'exp.b.note': 'Universidad Peruana de Ciencias Aplicadas · in progress',
  'exp.b.b1': 'Applied software engineering principles, the software development life cycle (SDLC), design and testing to build solid, maintainable solutions.',
  'exp.b.b2': 'Went deep into advanced data structures and algorithm analysis to optimize time and memory usage.',
  'exp.b.b3': 'Designed data models in relational and NoSQL databases, prioritizing consistency, performance and scalability.',
  'tag.rest': 'REST API', 'tag.rbac': 'Roles & permissions', 'tag.enc': 'DB encryption', 'tag.reports': 'Reports', 'tag.ds': 'Data structures', 'tag.algo': 'Algorithms', 'tag.proc': 'Procedural pixel art',
  'projects.title': 'Projects', 'projects.sub': "What I've built, from the surface to the seabed.",
  'p1.badge': '★ Professional work', 'p1.sub': 'CRM for insurance brokers',
  'p1.desc': 'Centralizes policies, installments and renewals, claims, clients and sub-agents, with exportable reports. I built it end to end and delivered it complete.',
  'p1.b1': 'Monolithic backend with a REST API and a data model to run the entire portfolio from a single system.',
  'p1.b2': 'JWT and hardening, with roles and permissions for sub-agents, administrative staff and managers.',
  'p1.b3': 'Encrypted database and a hardened frontend to protect sensitive client and policy data.',
  'p2.when': 'Personal project · 2025 — present', 'p2.sub': 'Operations management for restaurants and grills',
  'p2.desc': 'A modular web platform: attendance and payroll, expenses and accounts payable, sales reconciliation, recipe-based inventory and goods receiving.',
  'p2.b1': 'Automates Excel processing (biometric logs, sales reports, supplier orders) to calculate late arrivals, deductions and salaries.',
  'p2.b2': 'Layered security: encryption of sensitive data, role-based access control, expiring sessions and abuse protection.',
  'p2.m1': 'Payroll', 'p2.m2': 'Expenses', 'p2.m3': 'Sales', 'p2.m4': 'Inventory',
  'p3.when': 'Personal project · 2026', 'p3.sub': 'Interactive wallpaper for Wallpaper Engine', 'p3.live': 'Live',
  'p3.desc': "A pixel-art aquarium that follows your PC's real clock: code-generated fish, shrimp and snails that eat, flee, sleep and hide. This website runs on its engine.",
  'p3.b1': '11 procedurally generated fish species (2D and 3D voxel), 19 shrimp varieties and schooling behavior with boids.',
  'p3.b2': 'WebGL glass, water and light shader: refraction, caustics, sun rays and a day/night cycle.',
  'p3.toggle': 'See the fish in 3D voxels', 'p3.toggle2': 'Back to 2D pixel art',
  'pearls.title': 'Pearls', 'pearls.sub': 'Certifications and courses. Each certification is a pearl; each course, a shell. One is still forming.',
  'c.mongo': 'Introduction to MongoDB', 'c.scrum': 'Scrum Fundamentals', 'c.java': 'Java (basic)', 'c.flutter': 'Flutter — mobile development', 'c.micro': 'Microservices development', 'c.cyber': 'Cybersecurity Analyst',
  'k.cert': 'Certification', 'k.course': 'Course', 'k.wip': 'In progress',
  'contact.title': "Let's talk", 'contact.big': 'Got a project, a team or an idea that needs a solid backend? Write to me.',
  'contact.sub': 'Available for backend, mobile and full-stack roles — remote or in Lima.', 'contact.copy': 'copy', 'contact.cv': 'Download résumé (PDF, Spanish)',
  'form.title': 'Message in a bottle', 'form.name': 'Name', 'form.msg': 'Message', 'form.ph': 'What are you working on?', 'form.send': 'Throw the bottle →',
  'form.note': 'Your email app will open with the message ready to send.',
  foot: 'Handmade with HTML, Canvas and WebGL. No frameworks, just fish.',
};
const TXT = {
  es: { day: 'día', night: 'noche', dawn: 'amanecer', dusk: 'atardecer', copied: '¡Email copiado!', sent: 'Botella lanzada: revisa tu correo', modes: ['Ciclo real: sigue tu hora local', 'Siempre de día', 'Siempre de noche'], toggle3d: ['Ver los peces en voxel 3D', 'Volver al pixel art 2D'] },
  en: { day: 'day', night: 'night', dawn: 'dawn', dusk: 'dusk', copied: 'Email copied!', sent: 'Bottle thrown: check your email app', modes: ['Real cycle: follows your local time', 'Always day', 'Always night'], toggle3d: ['See the fish in 3D voxels', 'Back to 2D pixel art'] },
};
const tx = k => TXT[SEA.lang][k];

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
  themeUI(); styleUI(); hud();
}
for (const b of $$('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));

/* ---------- DÍA / NOCHE ---------- */
const MODES = ['auto', 'day', 'night'], ICONS = ['◐', '☀', '☾'];
function themeUI() {
  const i = MODES.indexOf(SEA.theme), b = $('#theme-btn');
  b.firstElementChild.textContent = ICONS[i]; b.title = tx('modes')[i]; b.setAttribute('aria-label', tx('modes')[i]);
}
$('#theme-btn').addEventListener('click', () => {
  SEA.theme = MODES[(MODES.indexOf(SEA.theme) + 1) % 3]; SEA.skyDirty = true;
  store.set('theme', SEA.theme); themeUI(); toast(tx('modes')[MODES.indexOf(SEA.theme)]);
});

/* ---------- PECES EN 2D O VOXEL 3D ---------- */
function styleUI() { const b = $('#style-btn'); if (b) b.textContent = tx('toggle3d')[SEA.style === '3d' ? 1 : 0]; }
$('#style-btn').addEventListener('click', () => { SEA.style = SEA.style === '3d' ? '2d' : '3d'; styleUI(); });

/* ---------- HUD DE LA PECERA ---------- */
const setText = (el, v) => { v = String(v); if (el.textContent !== v) el.textContent = v; };   // escribir solo si cambió: no invalida el layout
function hud() {
  const d = new Date(), L = SEA.light;
  setText($('#hud-time'), d.toLocaleTimeString(SEA.lang === 'en' ? 'en-US' : 'es-PE', { hour: '2-digit', minute: '2-digit' }));
  if (!L) return;
  const mode = L.night > .65 ? 'night' : L.elev < .25 ? (L.h < 12 ? 'dawn' : 'dusk') : 'day';
  setText($('#hud-mode'), tx(mode));
  setText($('#hud-fish'), allFish().length);
}

/* ---------- PROFUNDÍMETRO, NAV ACTIVA Y AVISOS ---------- */
// las posiciones se miden solo cuando cambia el layout; por frame se usan transforms (no fuerzan layout)
const SECS = ['top', 'about', 'stack', 'experience', 'projects', 'pearls', 'contact'];
const G = { gauge: $('.gauge'), track: $('.gauge-track'), fill: $('.gauge-fill'), fish: $('.gauge-fish'), val: $('#depth-val'), nav: $('#nav'), links: $$('.gauge-marks a, .nav-links a') };
const depthAt = y => clamp((y - SEA.surf) / (SEA.floor0 - SEA.surf), 0, 1);
const secTop = id => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + scrollY : 0; };
let tops = [], trackH = 0;
function placeMarks() {
  tops = SECS.map(id => [id, secTop(id)]);
  trackH = getComputedStyle(G.gauge).display === 'none' ? 0 : G.track.clientHeight;
  for (const a of $$('.gauge-marks a')) a.parentElement.style.top = (a.dataset.sec === 'top' ? 0 : depthAt(secTop(a.dataset.sec) + 140)) * 100 + '%';
  for (const b of $$('[data-depth]')) setText(b, Math.round(depthAt(secTop(b.dataset.depth) + 140) * CM));
  lastD = -1;
}
SEA.onLayout = placeMarks;
let lastY = 0, lastD = -1, lastSec = '', solid = null, nightAttr = null, tickN = 0;
SEA.onTick = () => {
  const y = scrollY, d = depthAt(y + SEA.vh * .5);
  if (trackH && Math.abs(d - lastD) > .0004) {
    lastD = d;
    G.fill.style.transform = `scaleY(${d.toFixed(4)})`;
    G.fish.style.transform = `translate(-50%, ${(d * trackH - 8).toFixed(1)}px)`;
    setText(G.val, Math.round(d * CM));
  }
  if (Math.abs(y - lastY) > 2) { G.fish.classList.toggle('left', y < lastY); lastY = y; }
  let cur = 'top'; for (const [id, top] of tops) if (top <= y + SEA.vh * .45) cur = id;
  if (cur !== lastSec) { lastSec = cur; for (const a of G.links) a.classList.toggle('active', a.getAttribute('href') === '#' + cur); }
  if ((y > 40) !== solid) { solid = y > 40; G.nav.classList.toggle('solid', solid); }
  const night = SEA.night > .55;
  if (night !== nightAttr) { nightAttr = night; document.documentElement.toggleAttribute('data-night', night); }
  if (++tickN % 30 === 0) hud();
};
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

/* ---------- MENÚ MÓVIL ---------- */
$('#menu-btn').addEventListener('click', () => { const open = $('#nav').classList.toggle('open'); $('#menu-btn').setAttribute('aria-expanded', String(open)); });
for (const a of $$('.nav-links a')) a.addEventListener('click', () => { $('#nav').classList.remove('open'); $('#menu-btn').setAttribute('aria-expanded', 'false'); });

/* ---------- APARECER AL BUCEAR ---------- */
const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }, { threshold: .12 });
for (const el of $$('.reveal')) io.observe(el);

/* ---------- CINTA: se duplica para que el loop no tenga corte ---------- */
const track = $('.ticker-track'); track.innerHTML += track.innerHTML;

/* ---------- CARDUMEN TECNOLÓGICO: cada tecnología es un pez con los colores de su marca ---------- */
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
  li.addEventListener('mouseenter', () => {
    techTank.hot = li.dataset.tech; li.classList.add('hot');
    const f = techTank.groups.flatMap(g => g.members).find(f => f.label === li.dataset.tech); if (f) f.say('♥', 1.4);
  });
  li.addEventListener('mouseleave', () => { techTank.hot = null; li.classList.remove('hot'); });
}

/* ---------- DEMO EN VIVO DE LA PECERA PIXEL ---------- */
new Tank($('#demo-tank'), tk => {
  const band = () => ({ x0: tk.lim.x0, x1: tk.lim.x1, y0: 34, y1: tk.h - 30 });
  for (const [k, n] of [['neon', 7], ['guppy', 3], ['betta', 1], ['cory', 3], ['platy', 2]]) {
    const g = new Group(tk, band), sp = FISH[k];
    tk.groups.push(g);
    for (let i = 0; i < n; i++) later(() => addFish(g, sp, fishSprite(sp, i % sp.variants.length)));
  }
});

/* ---------- CONTACTO ---------- */
for (const b of $$('[data-copy]')) b.addEventListener('click', () => {
  const done = () => toast(tx('copied'));
  if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy).then(done, () => { location.href = 'mailto:' + EMAIL; });
  else location.href = 'mailto:' + EMAIL;
});
const BOTTLE = '<svg viewBox="0 0 11 19"><path fill="#b98a5a" d="M4 0h3v2H4z"/><path fill="#9fe6d8" d="M4 2h3v3h1v1h1v1h1v11H1V7h1V6h1V5h1z"/><path fill="#f6efd8" d="M3 9h5v6H3z"/><path fill="#fff" d="M2 8h1v4H2z"/></svg>';
$('#bottle').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, d = new FormData(f), name = String(d.get('name')).trim(), from = String(d.get('email')).trim();
  const subject = (SEA.lang === 'en' ? 'Hi Mateo — message from ' : 'Hola Mateo — mensaje de ') + name;
  const body = `${String(d.get('msg')).trim()}\n\n— ${name} · ${from}`;
  const r = f.querySelector('.btn').getBoundingClientRect(), b = document.createElement('div');
  b.className = 'bottle-fly'; b.innerHTML = BOTTLE; b.style.left = r.left + r.width / 2 + 'px'; b.style.top = r.top - 20 + 'px';
  document.body.appendChild(b); setTimeout(() => b.remove(), 2600);
  toast(tx('sent'));
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

/* ---------- ARRANQUE ---------- */
$('#year').textContent = new Date().getFullYear();
SEA.theme = MODES.includes(store.get('theme')) ? store.get('theme') : 'auto';
setLang(store.get('lang') || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en'));
placeMarks();
console.log('%c ><(((º>  %c¿Buscando bugs? Aquí solo hay peces.', 'color:#ffd25a;font:700 16px monospace', 'color:#7fd2c2;font:14px monospace');
console.log('%c' + EMAIL + ' · github.com/LowMathzzz', 'color:#bcd8d1;font:12px monospace');
