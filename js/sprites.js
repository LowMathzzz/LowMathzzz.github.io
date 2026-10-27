'use strict';
/* ===== Generadores procedurales de sprites pixel art (peces, gambas, caracoles) ===== */
const NF = 8, PI2 = Math.PI * 2, PU = 3, PU2 = 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const toHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
const css = (c, a = 1) => `rgba(${c.map(v => Math.round(clamp(v, 0, 1) * 255)).join(',')},${a})`;
const HEXC = new Map();                                                   // los patrones repiten pocos colores: se parsean una vez
const col = h => typeof h === 'string' ? HEXC.get(h) || HEXC.set(h, hex(h)).get(h) : h;
function seeded(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hsh(x, y, s = 1) { let n = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
const mkCanvas = () => document.createElement('canvas');

// pixeles -> canvas (con contorno oscuro estilo pixel art)
function rasterize(pix, w, h, outline = true) {
  const c = mkCanvas(); c.width = w; c.height = h;
  const x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data;
  for (let i = 0; i < pix.length; i++) {
    const p = pix[i]; if (!p) continue;
    const px = i % w, edge = outline && (px === 0 || px === w - 1 || !pix[i - 1] || !pix[i + 1] || !pix[i - w] || !pix[i + w]);
    const k = edge ? (p.fin ? .7 : .55) : 1, a = edge ? Math.min(1, p.a + .25) : p.a, c0 = p.eye || p.c;
    d[i * 4] = c0[0] * k * 255; d[i * 4 + 1] = c0[1] * k * 255; d[i * 4 + 2] = c0[2] * k * 255; d[i * 4 + 3] = a * 255;
  }
  x.putImageData(id, 0, 0); return c;
}

/* ---------- PECES: muestreo de la forma ---------- */
function finShape(type, t) {
  switch (type) {
    case 'tri': return t < .7 ? .35 + .65 * t / .7 : 1 - (t - .7) / .3 * .9;
    case 'sail': return Math.pow(Math.sin(Math.PI * t), .5);
    case 'long': return .75 + .25 * Math.sin(Math.PI * t);
    default: return .6;
  }
}
function tailHalf(T, r, ped) {
  const th = T.h;
  switch (T.type) {
    case 'round': { let v = lerp(ped, th, Math.sin(Math.min(1, r / .7) * Math.PI / 2)); if (r > .7) v *= Math.sqrt(Math.max(0, 1 - ((r - .7) / .3) ** 2)); return v; }
    case 'fan': return lerp(ped, th, Math.pow(r, .6));
    case 'veil': return lerp(ped, th, Math.pow(r, .55));
    default: return lerp(ped, th, Math.pow(r, .85));
  }
}
function notch(type, r, dd, th) {
  if (type === 'fork') return r > .5 && Math.abs(dd) < th * .85 * ((r - .5) / .5);
  if (type === 'lyre') return r > .3 && Math.abs(dd) < th * .92 * ((r - .3) / .7);
  if (type === 'fan') return r > .75 && Math.abs(dd) < th * .35 * ((r - .75) / .25);
  return false;
}
// comp < 1 = pez visto en escorzo (girando)
function sampleFish(S, V, k, comp) {
  const D = S.Ds, L = S.L * comp, H = D.H, tk = D.topK ?? 1, bk = D.botK ?? 1, ut = D.ut, TH = D.tail.h, Wr = D.wide ?? .45;
  const dh = D.dorsal ? D.dorsal[2] : 0, ah = D.anal ? D.anal[2] : 0, pl = D.pelvic ? D.pelvic[1] : 0;
  const ext = Math.ceil(Math.max(H * tk + dh, H * bk + ah + pl * .9, TH * 1.5)) + 3;
  const pad = 2, w = Math.ceil(L) + pad * 2, h = ext * 2 + 2, cy = ext + 1, pedH = H * (D.ped ?? .28);
  const bodyH = s => { const pk = D.peak ?? .55, sp = s < pk ? .5 * s / pk : .5 + .5 * (s - pk) / (1 - pk);
    return Math.max(H * Math.pow(Math.sin(Math.PI * sp), D.round ?? .7), H * lerp(D.ped ?? .28, D.snout ?? .18, s)); };
  const finPx = (region, u, t, vv, x, y) => { const [c, a] = S.fin(region, u, t, vv, V, x, y), cc = col(c); return { c: cc, c0: cc, a, fin: true, t: 0 }; };
  const ph = k / NF * PI2, ts = .76 + .24 * Math.cos(ph), fl = 1 + .12 * Math.sin(ph + 1.3);
  const A = D.bend ?? Math.max(.7, H * .1);
  const bend = u => A * Math.pow(1 - clamp(u, 0, 1), 2) * Math.sin(ph - u * 5);
  const pix = new Array(w * h).fill(null);
  for (let x = 0; x < w; x++) {
    const u = (x - pad + .5) / L; if (u < -.05 || u > 1.02) continue;
    const c = cy + bend(u), inBody = u >= ut && u <= 1;
    const hh = inBody ? bodyH((u - ut) / (1 - ut)) : pedH, topE = hh * tk, botE = hh * bk;
    for (let y = 0; y < h; y++) {
      const dy = y + .5 - c; let px = null;
      if (inBody && dy >= -topE && dy <= botE) {
        const v = dy < 0 ? dy / topE : dy / botE, cc = col(S.pat(u, v, V, x, y)), sh = .78 + .3 * (v + 1) / 2;
        px = { c: cc.map(q => q * sh), c0: cc, a: 1, t: Wr * hh * Math.sqrt(Math.max(0, 1 - v * v)) };
      } else if (u < ut) {
        const r = (ut - u) / (ut * ts);
        if (r >= 0 && r <= 1) {
          const tq = tailHalf(D.tail, r, pedH), co = D.tail.type === 'veil' ? TH * .35 * r * r : 0, dd = dy - co;
          if (Math.abs(dd) <= tq && !notch(D.tail.type, r, dd, TH)) px = finPx('tail', u, r, dd / tq, x, y);
        }
      }
      if (!px && D.dorsal) { const [d0, d1, dd, ty] = D.dorsal; if (u >= d0 && u <= d1) { const t = (u - d0) / (d1 - d0), fh = dd * finShape(ty, t) * fl; if (dy < -topE && dy >= -topE - fh) px = finPx('dorsal', u, (-dy - topE) / fh, 0, x, y); } }
      if (!px && D.anal) { const [a0, a1, ad, ty] = D.anal; if (u >= a0 && u <= a1) { const t = (u - a0) / (a1 - a0), fh = ad * finShape(ty, t) * fl; if (dy > botE && dy <= botE + fh) px = finPx('anal', u, (dy - botE) / fh, 0, x, y); } }
      if (px) pix[y * w + x] = px;
    }
  }
  if (D.pect) {
    const [pu, pv, ps] = D.pect, fx = pad + pu * L, fy = cy + bend(pu) + pv * H, sz = ps * (.55 + .45 * Math.abs(Math.sin(ph * 1.5)));
    for (let y = Math.floor(fy - sz); y <= fy + sz; y++) for (let x = Math.floor(fx - sz * 1.6 * comp); x <= fx; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const ex = (x + .5 - fx + sz * .8 * comp) / (sz * .8 * comp), ey = (y + .5 - fy) / (sz * .55);
      if (ex * ex + ey * ey <= 1) { const p = finPx('pect', pu, 1, 0, x, y), o = pix[y * w + x]; if (o) { o.c = mix3(o.c, p.c, p.a * .7); o.c0 = mix3(o.c0, p.c, p.a * .7); } else pix[y * w + x] = p; }
    }
  }
  if (D.pelvic) {
    const [pu, len] = D.pelvic, x0 = pad + pu * L, y0 = cy + bend(pu) + bodyH((pu - ut) / (1 - ut)) * bk;
    for (let i = 0; i < len; i++) {
      const xx = Math.round(x0 - i * .55 * comp), yy = Math.round(y0 + i * .85 + Math.sin(ph - i * .3) * .9 * (i / len));
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && !pix[yy * w + xx]) pix[yy * w + xx] = finPx('pelvic', pu, i / len, 0, xx, yy);
    }
  }
  if (D.barbel) for (const dy of [1, 2]) { const xx = pad + Math.ceil(L) - 1, yy = Math.round(cy + bend(1) + bodyH(1) * bk * .4 + dy); if (yy < h) pix[yy * w + xx] = { c: col('#d8c8a8'), c0: col('#d8c8a8'), a: 1, fin: true, t: 0 }; }
  const [eu, ev, es] = D.eye, eyeC = col(V.eye || '#0a0a10');                    // ojo
  const ex = Math.round(pad + eu * L - es / 2), ey = Math.round(cy + bend(eu) + ev * H - es / 2);
  for (let j = 0; j < es; j++) for (let i = 0; i < es; i++) { const p = pix[(ey + j) * w + ex + i]; if (p) p.eye = i === 0 && j === 0 && es >= 2 ? [1, 1, 1] : eyeC; }
  return { pix, w, h };
}

/* ---------- ESPECIES ---------- */
const FISH = {
  neon: { name: 'Neones', en: 'Neon tetras', cm: 3.6, count: 10, school: true, speed: 58, band: [.3, .75],
    D: { H: 3, topK: .9, peak: .55, ut: .22, tail: { type: 'fork', h: 3.4 }, dorsal: [.45, .62, 2.4, 'tri'], anal: [.3, .5, 2, 'tri'], eye: [.86, -.15, 1], wide: .5 },
    variants: [{}],
    pat: (u, v) => v < -.45 ? '#8a9378' : (v < .08 && u > .2) ? (u > .7 ? '#5ff0ff' : '#1fd5ff') : (v >= .08 && u < .62) ? '#ff2a3d' : '#e8ecf2',
    fin: () => ['#c8dce4', .35] },
  cebra: { name: 'Cebras', en: 'Zebra danios', cm: 5, count: 6, school: true, speed: 72, band: [.1, .55],
    D: { H: 3.4, topK: .9, peak: .5, ut: .22, tail: { type: 'fork', h: 4.2 }, dorsal: [.42, .56, 2.6, 'tri'], anal: [.3, .52, 2.6, 'tri'], eye: [.88, -.15, 1] },
    variants: [{}],
    pat: (u, v) => u > .86 ? '#d9d2b0' : Math.floor((v + 1) * 2.6) % 2 ? '#efe7c4' : '#28389e',
    fin: (r, u, t, vv) => r === 'tail' ? [Math.floor((vv + 1) * 2.2) % 2 ? '#e8e2c4' : '#3445a8', .85] : ['#e6e0c8', .5] },
  arcoiris: { name: 'Arcoíris', en: 'Rainbowfish', cm: 9, count: 3, school: true, speed: 50, band: [.15, .6],
    D: { H: 8.5, topK: .95, botK: .85, peak: .62, round: .65, ut: .2, tail: { type: 'fork', h: 7 }, dorsal: [.25, .55, 6, 'sail'], anal: [.18, .56, 6.5, 'sail'], eye: [.88, -.2, 2], wide: .38 },
    variants: [{}],
    pat: (u, v) => { const c = u < .46 ? mix3(hex('#ff7414'), hex('#f2cf3a'), smooth(.3, .46, u)) : mix3(hex('#f2cf3a'), hex('#3354c8'), smooth(.46, .64, u)); return v < -.6 ? c.map(q => q * .8) : c; },
    fin: (r, u, t) => [t > .8 ? '#ffb040' : '#ff5e1e', .8] },
  guppy: { name: 'Guppys', en: 'Guppies', cm: 4, count: 4, school: true, loose: true, speed: 52, band: [0, .5],
    D: { H: 2.8, ut: .4, tail: { type: 'fan', h: 7.5 }, dorsal: [.32, .52, 4, 'long'], anal: [.46, .58, 1.6, 'tri'], eye: [.88, -.15, 1] },
    variants: [{ t1: '#ff2a2a', t2: '#ff9a3a' }, { t1: '#2a6aff', t2: '#7ad8ff' }, { t1: '#ffd21a', t2: '#ff8a1a' }, { t1: '#ff6a1a', t2: '#1a1a1a', sp: 1 }, { t1: '#3ad88a', t2: '#e8f04a', sp: 1 }],
    pat: (u, v, V) => u < .55 && v > -.4 ? mix3(hex('#b8c0c6'), hex(V.t1), .45) : '#b8c0c6',
    fin: (r, u, t, vv, V, x, y) => [V.sp ? (hsh(x, y, 5) < .3 ? V.t2 : V.t1) : toHex(mix3(hex(V.t1), hex(V.t2), t)), .9] },
  platy: { name: 'Platys', en: 'Platies', cm: 5, count: 3, school: true, loose: true, speed: 40, band: [.2, .7],
    D: { H: 4.6, peak: .55, round: .6, ut: .22, tail: { type: 'round', h: 4.6 }, dorsal: [.42, .6, 3.6, 'sail'], anal: [.4, .55, 2.5, 'tri'], eye: [.88, -.15, 1] },
    variants: [{ b: '#ff3a1a', f: '#ff6a3a' }, { b: '#ffc21a', b2: '#ff6a1a', f: '#ff7a2a' }, { b: '#8aa6c8', f: '#c8d4e0', mk: 1 }],
    pat: (u, v, V) => V.mk && u > .2 && u < .3 && Math.abs(v) < .55 ? '#141414' : V.b2 ? mix3(hex(V.b), hex(V.b2), smooth(.3, .7, 1 - u)) : V.b,
    fin: (r, u, t, vv, V) => [V.f, .75] },
  cory: { name: 'Corydoras', en: 'Corydoras', cm: 5, count: 5, school: true, bottom: true, speed: 30, band: [.92, 1],
    D: { H: 4.6, topK: 1.15, botK: .55, peak: .5, round: .7, ped: .35, snout: .35, ut: .2, tail: { type: 'fork', h: 4.2 }, dorsal: [.5, .68, 5.5, 'tri'], anal: [.35, .45, 2, 'tri'], pect: [.75, .5, 3], eye: [.82, -.05, 1], barbel: 1, wide: .6 },
    variants: [{ b: '#ece4d6', k: '#16161a', panda: 1 }, { b: '#7c8a5a', k: '#3c4a2a', bel: '#e0a070' }, { b: '#f2d6c6', k: '#e8b8a8', eye: '#d02030' }],
    pat: (u, v, V, x, y) => V.panda ? ((u > .76 && u < .9 && v < .5) || (u > .18 && u < .32 && v < .3) ? V.k : v > .5 ? '#fff8f0' : V.b)
      : V.bel && v > .4 ? V.bel : hsh(x, y, 2) < .12 ? V.k : V.b,
    fin: (r, u, t, vv, V) => V.panda && r === 'dorsal' ? [V.k, .95] : [V.b, .55] },
  betta: { name: 'Rubí', en: 'Ruby', cm: 6.5, count: 1, curious: true, speed: 32, band: [0, .45],
    D: { H: 4.4, peak: .55, ut: .26, tail: { type: 'veil', h: 13 }, dorsal: [.18, .62, 9, 'long'], anal: [.12, .7, 10, 'long'], pect: [.74, .2, 2.5], eye: [.88, -.15, 2] },
    variants: [{ b: '#c4123a', s: '#ff4a6a', f1: '#d0103a', f2: '#3b2bd1' }, { b: '#2238b8', s: '#5a8aff', f1: '#2a40d0', f2: '#c01a5a' }, { b: '#f2efe8', s: '#e02020', f1: '#f4f0ea', f2: '#e83030' }],
    pat: (u, v, V, x, y) => hsh(x, y, 9) < .18 ? V.s : V.b,
    fin: (r, u, t, vv, V, x) => { const c = mix3(hex(V.f1), hex(V.f2), smooth(.3, 1, t)); return [x % 2 ? c : c.map(q => q * 1.12), .92]; } },
  goldfish: { name: 'Dorado', en: 'Goldie', cm: 11, count: 1, curious: true, speed: 28, band: [.3, .9],
    D: { H: 12, topK: 1.05, botK: .95, peak: .55, round: .55, ped: .3, ut: .3, tail: { type: 'fan', h: 15 }, dorsal: [.42, .7, 8, 'sail'], anal: [.28, .4, 6, 'sail'], pect: [.72, .3, 3.5], eye: [.87, -.25, 2], wide: .6 },
    variants: [{ b: '#ff7a10', top: '#ff5400', bel: '#ffc24a', f: '#ff9a3c' }, { b: '#f4efe6', top: '#f4efe6', bel: '#fff8ee', f: '#fff0e0', cap: 1 }],
    pat: (u, v, V) => V.cap && u > .8 && v < -.2 ? '#e82a10' : v < -.4 ? V.top : v > .4 ? V.bel : V.b,
    fin: (r, u, t, vv, V) => t > .85 ? ['#fff0dc', .8] : [V.f, .75] },
  killi: { name: 'Kili', en: 'Killi', cm: 5, count: 1, shy: true, speed: 50, band: [0, .35],
    D: { H: 3.3, ut: .24, tail: { type: 'lyre', h: 5.5 }, dorsal: [.28, .5, 4, 'sail'], anal: [.28, .52, 4, 'sail'], eye: [.88, -.15, 1] },
    variants: [{}],
    pat: (u, v, V, x, y) => v > .5 ? '#ffd25a' : hsh(x, y, 7) < .2 ? '#d4202a' : '#3a9ec4',
    fin: (r, u, t, vv, V, x, y) => t > .8 ? ['#ffe066', .9] : hsh(x, y, 8) < .25 ? ['#d4202a', .85] : ['#ffa02a', .8] },
  gourami: { name: 'Gurami', en: 'Gourami', cm: 7, count: 1, curious: true, speed: 28, band: [.15, .6],
    D: { H: 8, peak: .55, round: .6, ut: .2, tail: { type: 'round', h: 6 }, dorsal: [.25, .62, 4.5, 'low'], anal: [.12, .72, 6, 'low'], pelvic: [.72, 20], eye: [.88, -.12, 2], wide: .35 },
    variants: [{ b: '#ff5a2a', l: '#2f7ae0' }, { b: '#ffb02a', l: '#ffd86a' }],
    pat: (u, v, V) => Math.sin(u * 34 + v * 2.5) > .35 ? V.l : V.b,
    fin: (r, u, t, vv, V) => [toHex(mix3(hex(V.b), hex(V.l), t)), .8] },
  pleco: { name: 'Pleco', en: 'Pleco', cm: 11, count: 1, shy: true, bottom: true, nocturnal: true, speed: 18, band: [.97, 1],
    D: { H: 6, topK: 1.1, botK: .5, peak: .75, round: .8, ped: .25, snout: .45, ut: .18, tail: { type: 'tri', h: 6 }, dorsal: [.45, .72, 9, 'sail'], pect: [.82, .55, 6], eye: [.86, -.45, 1], wide: .8 },
    variants: [{}],
    pat: (u, v, V, x, y) => hsh(x, y, 3) < .18 ? '#c8bfa8' : v > .5 ? '#8a8070' : '#5c5446',
    fin: (r, u, t, vv, V, x, y) => hsh(x, y, 6) < .2 ? ['#c8bfa8', .9] : ['#4a4438', .9] },
};
// escala comprimida: los grandes siguen siendo más grandes, pero sin desproporción
const lengthPx = cm => 58 * Math.pow(cm / 5, .55);
function scaleD(D, k) {
  const s = v => v * k;
  return { ...D, H: s(D.H), tail: { ...D.tail, h: s(D.tail.h) },
    dorsal: D.dorsal && [D.dorsal[0], D.dorsal[1], s(D.dorsal[2]), D.dorsal[3]],
    anal: D.anal && [D.anal[0], D.anal[1], s(D.anal[2]), D.anal[3]],
    pect: D.pect && [D.pect[0], D.pect[1], Math.max(1.5, s(D.pect[2]))],
    pelvic: D.pelvic && [D.pelvic[0], Math.round(s(D.pelvic[1]))] };
}
const TURN_COMP = [.7, .45, .25];
// sprites de una variante: 8 frames de nado + 3 de giro en escorzo
function fishSprites(S, V) {
  const frames = []; for (let f = 0; f < NF; f++) { const s = sampleFish(S, V, f, 1); frames.push(rasterize(s.pix, s.w, s.h)); }
  return { frames, turn: TURN_COMP.map(c => { const s = sampleFish(S, V, 0, c); return rasterize(s.pix, s.w, s.h); }) };
}
const fishSprite = (S, i) => S.s2[i] || (S.s2[i] = fishSprites(S, S.variants[i]));   // perezoso: solo las variantes que nadan
for (const k in FISH) {
  const S = FISH[k];
  S.L = Math.round(lengthPx(S.cm) / PU); S.Ds = scaleD(S.D, S.L / (S.cm * 4.2));
  S.s2 = [];
}

/* ---------- GAMBAS (más erguidas: cola nivelada, cabeza en alto, patas largas) ---------- */
const SHRIMPS = {
  red_cherry: ['Red Cherry', 'solid', '#d81e1e', '#9e1010'], sakura: ['Sakura Red', 'solid', '#ff2d2d', '#c81818'],
  bloody_mary: ['Bloody Mary', 'solid', '#9a0012', '#5e000a'], yellow: ['Yellow', 'solid', '#ffd21f', '#d9a400'],
  blue_dream: ['Blue Dream', 'solid', '#1f43b0', '#122a78'], blue_velvet: ['Blue Velvet', 'solid', '#4a9be8', '#2a6cbc'],
  black_rose: ['Black Rose', 'solid', '#24242a', '#0a0a0e'], crystal_red: ['Crystal Red', 'bands', '#cf1530', '#f6f6f6'],
  crystal_black: ['Crystal Black', 'bands', '#141418', '#f6f6f6'], snow_white: ['Snow White', 'solid', '#f4f4f0', '#d8d8d0'],
  yellow_rili: ['Yellow Rili', 'rili', '#ffd21f', '#fff6c0'], rili_red: ['Rili Red', 'rili', '#d81e1e', '#ffd8d8'],
  rili_blue: ['Rili Blue', 'rili', '#1f3fa8', '#d8e4ff'], tangerine_tiger: ['Tangerine Tiger', 'tiger', '#ff8a1a', '#3a1606'],
  green_hulk: ['Green Hulk', 'spots', '#8fd0c4', '#e8fff8'], pinto_zebra: ['Pinto Zebra', 'zebra', '#121214', '#f2f2f2'],
  red_wine: ['Red Wine', 'bands', '#7a0a1e', '#f2f2f2'], black_galaxy: ['Black Galaxy', 'spots', '#a8c8dc', '#1a2230'],
  blue_shadow: ['Blue Shadow', 'zebra', '#16161c', '#bcd4ff'],
};
function shrimpPat(V, u, v, seg, x, y) {
  const [, t, c1, c2] = V;
  switch (t) {
    case 'bands': return [[c1, c2, c1, c2, c1, c2, c1][seg + 1], 1];
    case 'rili': return u < .3 || u > .58 ? [c1, 1] : [c2, .35];
    case 'tiger': return [u < .58 && x % 3 === 0 ? c2 : c1, 1];
    case 'spots': return [hsh(x, y, 11) < .25 ? c2 : c1, 1];
    case 'zebra': return [x % 3 === 0 || (u > .52 && u < .58) ? c2 : c1, 1];
    default: return [v < -.5 ? c2 : v < -.2 && hsh(x, y, 13) < .2 ? toHex(hex(c1).map(q => q * 1.25)) : c1, .95];
  }
}
function genShrimp(V) {
  const L = 20, pad = 3, w = L + pad * 2 + 4, h = 18, base = 9, frames = [];
  let foot = 0, head = [0, 0];
  for (let k = 0; k < 2; k++) {
    const pix = new Array(w * h).fill(null), center = [], hhs = [];
    for (let x = 0; x < w; x++) {
      const u = (x - pad + .5) / L; if (u < 0 || u > 1) continue;
      const c = base - 3.2 * smooth(.42, .98, u) - .8 * Math.sin(Math.PI * clamp((u - .08) / .5, 0, 1));
      const hh = (u < .1 ? 1 + (.1 - u) * 16 : u < .55 ? lerp(1.3, 2.7, (u - .1) / .45) : u < .93 ? 3.2 - ((u - .74) / .19) ** 2 * 1.3 : 1) * 1.05;
      center[x] = c; hhs[x] = hh;
      const seg = u < .1 ? -1 : u < .55 ? Math.floor((u - .1) / .09) : 5;
      for (let y = 0; y < h; y++) {
        const dy = y + .5 - c; if (Math.abs(dy) > hh) continue;
        const [cc, a] = shrimpPat(V, u, dy / hh, seg, x, y), sh = .82 + .3 * (dy / hh + 1) / 2;
        pix[y * w + x] = { c: col(cc).map(q => q * sh), a };
      }
    }
    const legC = mix3(col(V[2]), [1, 1, 1], .35), set = (x, y, c, a = .95) => { if (x >= 0 && y >= 0 && x < w && y < h && !pix[y * w + x]) pix[y * w + x] = { c, a }; };
    const xe = pad + L - 1;
    for (let i = 1; i <= 3; i++) set(xe + i, Math.round(center[xe] - 1 - i * .5), col(V[2]));            // rostro apuntando hacia arriba
    [.62, .74, .86].forEach((lu, i) => {                                                                   // patas para caminar (paran el cuerpo)
      const x = Math.round(pad + lu * L), y0 = Math.round(center[x] + hhs[x]), sw = (i + k) % 2 ? 1 : 0;
      for (let j = 0; j < 4; j++) { const yy = y0 + j; set(x + (j > 1 ? sw : 0), yy, legC); foot = Math.max(foot, yy); }
    });
    [.2, .29, .38, .47].forEach((lu, i) => { const x = Math.round(pad + lu * L), y0 = Math.round(center[x] + hhs[x]); set(x, y0, legC, .8); set(x + ((i + k) % 2), y0 + 1, legC, .7); });
    const cv = rasterize(pix, w, h), ctx = cv.getContext('2d'), ex = Math.round(pad + .9 * L);
    ctx.fillStyle = '#050505'; ctx.fillRect(ex, Math.round(center[ex] - hhs[ex] * .45), 1, 1);
    head = [ex + 1 - w / 2, Math.round(center[ex] - hhs[ex] * .7) - h / 2];
    frames.push(cv);
  }
  return { frames, w, h, foot, head, ant: toHex(mix3(col(V[2]), [1, 1, 1], .35)) };
}
const SHRIMP_SPR = {}, shrimpSprite = k => SHRIMP_SPR[k] || (SHRIMP_SPR[k] = genShrimp(SHRIMPS[k]));

/* ---------- CARACOLES (concha con espiral y brillo, cuerpo con tentáculos) ---------- */
const SNAILS = [
  { shell: 'zebra', c1: '#d8b840', c2: '#2a2414', body: '#9a9284' },    // nerita cebra
  { shell: 'rings', c1: '#f0c030', c2: '#b07a10', body: '#ead08a' },    // misterio dorado
  { shell: 'flat', c1: '#d8402c', c2: '#8a1a10', body: '#e87058' },     // ramshorn rojo
  { shell: 'rings', c1: '#6f92dc', c2: '#3a5aa0', body: '#6a7896' },    // misterio azul
];
function genSnail(V) {
  const w = 26, h = 17, scx = 11, scy = 7.5, R = 6.4, frames = [];
  for (const [e, wig] of [[1, 0], [1, 1], [.5, 0], [0, 0]]) {
    const pix = new Array(w * h).fill(null), bc = col(V.body), set = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) pix[y * w + x] = { c, a: 1 }; };
    if (e > 0) {
      const x1 = Math.round(scx + 3 + 9 * e);
      for (let x = 3; x <= x1; x++) { set(x, 12, bc.map(q => q * 1.1)); set(x, 13, bc); set(x, 14, bc.map(q => q * .78)); }
      for (let y = 9; y <= 12; y++) for (let x = x1 - 3; x <= x1 + (y > 10 ? 1 : 0); x++) set(x, y, bc.map(q => q * (y === 9 ? 1.15 : 1)));
      if (e === 1) for (const [tx, ty] of [[0, 0], [1, -1], [1 + wig, -2], [2 + wig, -3]]) { set(x1 - 2 + tx, 9 + ty, bc); set(x1 + tx, 9 + ty + 1, bc); }
      if (e === 1) { set(x1 + 2 + wig, 6, [.1, .1, .1]); set(x1 + 2, 8, [.1, .1, .1]); }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + .5 - scx, dy = (y + .5 - scy) / .95, d = Math.hypot(dx, dy); if (d > R) continue;
      const a = Math.atan2(dy, dx), s = ((a / PI2 + d / (R * .38)) % 1 + 1) % 1;
      let c = col(V.c1);
      if (s < .09) c = col(V.c2);                                                  // sutura de la espiral
      else if (V.shell === 'zebra' && Math.sin(a * 5 + d * .7) > .45) c = col(V.c2);
      else if (V.shell === 'flat' && d > R * .55 && s < .3) c = mix3(col(V.c1), col(V.c2), .5);
      c = c.map(q => q * (1.15 - .38 * ((dx + dy) / R + 1) / 2));                 // luz desde arriba a la izquierda
      if (dx < -R * .1 && dy < -R * .3 && d > R * .55 && d < R * .8) c = c.map(q => Math.min(1, q * 1.35));
      set(x, y, c);
    }
    frames.push(rasterize(pix, w, h));
  }
  return { frames, w, h };
}
const SNAIL_SPR = SNAILS.map(genSnail);
