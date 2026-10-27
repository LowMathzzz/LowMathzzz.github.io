'use strict';
/* ===== Pecera del portfolio: el agua sigue al scroll. Canvas 2D dibuja a resolución pixel y WebGL compone agua, luz y vidrio ===== */
const SEA = {
  px: 3, vw: 1, vh: 1, doc: 1, scroll: 0, oy: 0, surf: 280, floor0: 0, bedTop: 0, k: 1,
  night: 0, light: null, theme: 'auto', lang: 'es', style: '2d', bands: {}, skyDirty: true,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, onTick: null, onLayout: null,
  lite: document.documentElement.classList.contains('lite'),                 // móvil / equipo modesto: lo decide el <head>
};
SEA.fps = SEA.lite ? 30 : 60;
function goLite() { SEA.lite = true; SEA.fps = 30; document.documentElement.classList.add('lite'); }

/* ---------- TRABAJO DIFERIDO: los sprites se generan de a uno en ratos libres, sin congelar el arranque ---------- */
const JOBS = [], idle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 300 }) : f => setTimeout(f, 16);
function later(job) { JOBS.push(job); if (JOBS.length === 1) idle(pump); }
function pump(dl) {
  const end = performance.now() + (dl && dl.timeRemaining ? Math.max(4, dl.timeRemaining()) : 8);
  do JOBS.shift()(); while (JOBS.length && performance.now() < end);
  if (JOBS.length) idle(pump);
}
const M = { x: -1e4, y: -1e4, cx: -1e4, cy: -1e4, moveT: -99, t: 0 };   // mouse: mundo (px del documento) y cliente
const WATER = [0.13, 0.42, 0.36], DEEP = [0.035, 0.12, 0.17], LED = [0.25, 0.40, 0.95];
const BED_H = 760;                                                         // alto de la franja decorada del fondo (px a escala 1)
let AW = 1, AH = 1, DPR = 1, tNow = 0;

/* ---------- DÍA / NOCHE (hora real del visitante) ---------- */
function hourNow() {
  if (SEA.theme === 'day') return 12.5;
  if (SEA.theme === 'night') return 23;
  const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
function lightAt(h) {
  const elev = Math.sin(Math.PI * (h - 6) / 12);
  const day = smooth(-0.12, 0.3, elev), twi = Math.exp(-((elev / 0.22) ** 2)) * smooth(-0.3, 0, elev);
  let amb = mix3([0.13, 0.16, 0.28], [0.80, 0.80, 0.76], day);
  amb = [amb[0] + 0.25 * twi, amb[1] + 0.10 * twi, amb[2]];
  const sI = smooth(0, 0.3, elev);
  let sun = mix3([1, 0.48, 0.18], [1, 0.86, 0.6], smooth(0.1, 0.7, elev)).map(v => v * sI * 1.15);
  sun = sun.map((v, i) => v + [0.45, 0.55, 0.9][i] * 0.22 * (1 - day));
  const a = lerp(0.3, clamp(-(h - 12) / 6 * 0.7, -0.75, 0.75), day);
  return { amb, sun, dir: [Math.sin(a), Math.cos(a)], night: 1 - day, elev, h };
}
const SKY = [[0, '#060a1c', '#141c3a'], [4.5, '#0b1230', '#2a2a52'], [6, '#2b3a6e', '#f29a5e'], [7.2, '#4a7ab8', '#f6c890'],
  [9, '#3f84d6', '#b4dcf2'], [13, '#2f7ae0', '#aad6f5'], [16.5, '#4382cc', '#d2e2ee'], [18, '#3a4f8f', '#f48a58'],
  [19.2, '#1e2552', '#c05a78'], [20.5, '#0b1130', '#2a2452'], [24, '#060a1c', '#141c3a']];
function skyAt(h) {
  let i = 0; while (SKY[i + 1][0] < h) i++;
  const [h0, a0, b0] = SKY[i], [h1, a1, b1] = SKY[i + 1], k = (h - h0) / (h1 - h0);
  return [mix3(hex(a0), hex(a1), k), mix3(hex(b0), hex(b1), k)];
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hsh(xi, yi, 77), hsh(xi + 1, yi, 77), u), lerp(hsh(xi, yi + 1, 77), hsh(xi + 1, yi + 1, 77), u), v);
}
function fbm(x, y) { let s = 0, a = .5; for (let o = 0; o < 5; o++) { s += a * vnoise(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; a *= .5; } return s / .97; }
function ridge(x, f, s) { return .5 * Math.sin(x * f + s) + .3 * Math.sin(x * f * 2.3 + s * 1.7) + .2 * Math.sin(x * f * 5.1 + s * 2.9) + .08 * Math.sin(x * f * 11 + s); }

/* ---------- GEOMETRÍA DEL MUNDO (px CSS del documento) ---------- */
const surfY = (x, t) => SEA.surf + 4 * Math.sin(x * 0.012 + t * 1.3) + 2.5 * Math.sin(x * 0.031 - t * 2.1) + 1.2 * Math.sin(x * 0.083 + t * 3.3);
const floorY = x => SEA.floor0 + (4 * Math.sin(x * 0.011) + 3 * Math.sin(x * 0.037)) * SEA.k;
const snap = v => Math.round(v / SEA.px) * SEA.px;
const fr = f => f * SEA.vw;
function crisp(c) {
  const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
  x.putImageData(id, 0, 0);
}

/* ---------- CANVAS + SHADER ---------- */
let seaC = document.getElementById('sea');
const uiC = document.getElementById('sea-ui'), ux = uiC.getContext('2d');
const skyC = mkCanvas(), fgC = mkCanvas(), cloudC = mkCanvas(), decA = mkCanvas(), decF = mkCanvas(), plB = mkCanvas(), plF = mkCanvas();
const fx = fgC.getContext('2d');
for (const c of [decA, decF, plB, plF]) c.getContext('2d', { willReadFrequently: true });

const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
const FS = `
precision highp float;
uniform sampler2D uSky, uFg;
uniform vec2 uRes, uSkyRes, uDir;
uniform float uPX, uScroll, uSurf, uFloor, uT, uNight, uWave, uR;
uniform vec3 uAmb, uSun, uLed, uWater, uDeep;

float sdR(vec2 a){ vec2 b=uRes*.5; vec2 q=abs(a-b)-b+uR; return length(max(q,0.))+min(max(q.x,q.y),0.)-uR; }
float surf(float x){ return uSurf + 4.*sin(x*.012+uT*1.3) + 2.5*sin(x*.031-uT*2.1) + 1.2*sin(x*.083+uT*3.3); }
vec4 fg(vec2 a){ return texture2D(uFg, clamp(a/uRes, vec2(.0005), vec2(.9995))); }
vec3 sky(vec2 a){ return texture2D(uSky, clamp((a+vec2(0.,uScroll/uPX))/uSkyRes, vec2(.0005), vec2(.9995))).rgb; }
float caus(vec2 p){
  vec2 q=p*.016; float t=uT*.6;
  float c=sin(q.x*3.1+sin(q.y*2.3+t)*1.7+t*.8)+sin(q.y*3.7+sin(q.x*2.9-t*.9)*1.5-t*.7)+sin((q.x+q.y)*2.3+sin((q.x-q.y)*3.3+t*.6)*1.3+t*.5);
  return pow(1.-abs(c)/3.,7.);
}
float shaft(vec2 w){
  float dy=max(w.y-uSurf,0.); vec2 d=normalize(vec2(uDir.x*.72,uDir.y));
  float xb=w.x-d.x/d.y*dy, st=.5+.5*sin(xb*.045+uT*.15)*sin(xb*.11-uT*.1+1.);
  return st*st*1.5*exp(-dy/1100.);
}
void main(){
  vec2 a=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);                 // pixel de arte, origen arriba a la izquierda
  float d=sdR(a);
  if (d>0.) { gl_FragColor=vec4(.016,.027,.031,1.); return; }
  vec2 w=a*uPX+vec2(0.,uScroll);                                       // mundo = px CSS del documento
  vec2 e=vec2(1.,0.);
  vec2 n=normalize(vec2(sdR(a+e.xy)-sdR(a-e.xy), sdR(a+e.yx)-sdR(a-e.yx))+1e-5);
  float depth=-d, band=42., t=clamp(1.-depth/band,0.,1.), side=mix(.15,1.,n.x*n.x), slab=smoothstep(5.,1.3,depth);
  float sy=surf(w.x); bool water=w.y>sy;
  float z=clamp((w.y-uSurf)/(uFloor-uSurf),0.,1.);
  vec2 wob=water ? vec2(sin(w.y*.045+uT*1.6+sin(w.x*.021+uT*.7)*1.6), cos(w.x*.038+uT*1.25+sin(w.y*.027-uT*.55)*1.6))*uWave*(1.-t*.75) : vec2(0.);
  vec2 off=-n*(band*.3*t*t*side+slab*4.5)+wob;
  vec4 f0=fg(a+off), f1=fg(a+off*1.03), f2=fg(a+off*1.06); vec4 f=vec4(f0.r,f1.g,f2.b,(f0.a+f1.a+f2.a)/3.);
  vec3 col;
  if (water) {
    vec2 q=w+off*uPX;
    float sw=shaft(q), c=caus(q), zs=clamp((w.y-uSurf)/1400.,0.,1.);
    float bed=smoothstep(uFloor-700.,uFloor,w.y);                     // el fondo vuelve a recibir la luz de la lámpara
    vec3 sun=uSun*sw*(.4+1.15*c*(.35+.65*zs))*mix(1.,.55,zs);
    vec3 led=uLed*uNight*(.5+.8*bed);
    vec3 amb=uAmb*mix(1.05,.62,z)*(1.+bed*(.3+.6*c));
    vec3 L=amb+sun+led;
    vec3 wc=mix(uWater*1.3,uDeep,smoothstep(0.,.9,z))*(amb+led+uSun*sw*.4);
    vec3 fl=f.rgb*(L+sun*.9) + f.a*uSun*sw*c*.18; fl=mix(fl,wc*f.a,.12*z);
    col=fl+wc*(1.-f.a);
    col+=uSun*sw*.10*(1.-zs)*(.6+.4*c);
  } else {
    vec3 L=uAmb+uSun*.3+uLed*uNight*.3;
    col=f.rgb*L + sky(a)*(1.-f.a);
  }
  vec3 Lw=uAmb+uLed*uNight*.5+uSun*.25;
  float dsy=(w.y-sy)/uPX, spark=.5+.5*sin(w.x*.05+uT*2.)*sin(w.x*.013-uT*.9);
  col+=vec3(.75,.9,1.)*Lw*smoothstep(1.2,0.,abs(dsy))*(.15+.35*spark);             // borde del agua
  col*=1.-.14*smoothstep(0.,1.,dsy)*smoothstep(4.,1.,dsy);                           // menisco
  col+=vec3(.8,.95,1.)*Lw*smoothstep(0.,-5.,dsy)*smoothstep(-9.,-5.,dsy)*.05;
  col*=1.-.4*pow(t,3.)*side;                                                          // vidrio: canto, borde y brillo
  col=mix(col, col*vec3(.75,1.,.92)+vec3(.02,.05,.04), slab*.8);
  col=mix(col, vec3(.85,.95,1.)*mix(1.,.6,uNight), smoothstep(1.,0.,abs(d+.5))*.8);
  col=mix(col, vec3(.8,.95,1.), smoothstep(1.,0.,abs(d+5.5))*.22);
  col+=smoothstep(5.,0.,abs(depth-13.))*smoothstep(.3,.95,-n.x-n.y*.25)*(.04+.1*(1.-uNight));
  vec2 uv=gl_FragCoord.xy/uRes;
  col*=1.-.28*pow(length(uv-.5)*1.25,2.5);
  gl_FragColor=vec4(col,1.);
}`;
const U = {};
let gl = null, g2 = null, texSky, texFg;
function initGL() {
  const g = seaC.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); if (!g) return null;
  const shd = (type, src) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw g.getShaderInfoLog(s); return s; };
  const prog = g.createProgram();
  g.attachShader(prog, shd(g.VERTEX_SHADER, VS)); g.attachShader(prog, shd(g.FRAGMENT_SHADER, FS));
  g.bindAttribLocation(prog, 0, 'a'); g.linkProgram(prog); g.useProgram(prog);
  g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
  g.enableVertexAttribArray(0); g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
  for (const n of ['uRes', 'uSkyRes', 'uDir', 'uPX', 'uScroll', 'uSurf', 'uFloor', 'uT', 'uNight', 'uWave', 'uR', 'uAmb', 'uSun', 'uLed', 'uWater', 'uDeep']) U[n] = g.getUniformLocation(prog, n);
  const mkTex = unit => {
    const t = g.createTexture(); g.activeTexture(g.TEXTURE0 + unit); g.bindTexture(g.TEXTURE_2D, t);
    for (const [k, v] of [[g.TEXTURE_MIN_FILTER, g.NEAREST], [g.TEXTURE_MAG_FILTER, g.NEAREST], [g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE]]) g.texParameteri(g.TEXTURE_2D, k, v);
    return t;
  };
  texSky = mkTex(0); texFg = mkTex(1);
  g.uniform1i(g.getUniformLocation(prog, 'uSky'), 0); g.uniform1i(g.getUniformLocation(prog, 'uFg'), 1);
  return g;
}
try { gl = initGL(); } catch (e) { gl = null; }
if (!gl) { const c = seaC.cloneNode(); seaC.replaceWith(c); seaC = c; g2 = seaC.getContext('2d'); }   // sin WebGL: composición simple en 2D
function upload(unit, tex, canvas, premul) {
  gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premul);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
}
function renderGL(t) {
  const L = SEA.light, px = SEA.px;
  gl.uniform2f(U.uRes, AW, AH); gl.uniform2f(U.uSkyRes, skyC.width, skyC.height); gl.uniform2f(U.uDir, L.dir[0], L.dir[1]);
  gl.uniform1f(U.uPX, px); gl.uniform1f(U.uScroll, SEA.oy * px); gl.uniform1f(U.uSurf, SEA.surf); gl.uniform1f(U.uFloor, SEA.floor0);
  gl.uniform1f(U.uT, t); gl.uniform1f(U.uNight, L.night); gl.uniform1f(U.uWave, SEA.reduced ? 0 : .9); gl.uniform1f(U.uR, SEA.vw < 700 ? 9 : 14);
  gl.uniform3fv(U.uAmb, L.amb); gl.uniform3fv(U.uSun, L.sun); gl.uniform3fv(U.uLed, LED); gl.uniform3fv(U.uWater, WATER); gl.uniform3fv(U.uDeep, DEEP);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function render2D() {
  const c = g2, L = SEA.light, top = SEA.oy * SEA.px, water = y => {
    const z = clamp((y - SEA.surf) / (SEA.floor0 - SEA.surf), 0, 1);
    return mix3(WATER.map(v => v * 1.3), DEEP, smooth(0, .9, z)).map((v, i) => v * (L.amb[i] + LED[i] * L.night * .5));
  };
  c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, AH); g.addColorStop(0, css(water(top))); g.addColorStop(1, css(water(top + SEA.vh)));
  c.fillStyle = g; c.fillRect(0, 0, AW, AH);
  const sa = Math.round(SEA.surf / SEA.px) - SEA.oy;
  if (sa > 0) c.drawImage(skyC, 0, SEA.oy, AW, sa, 0, 0, AW, sa);
  c.drawImage(fgC, 0, 0);
}

/* ---------- CIELO SOBRE EL AGUA (pixel art, se redibuja cada 2 s) ---------- */
function disc(c, x, y, r, color) {
  c.fillStyle = color; x = Math.round(x); y = Math.round(y);
  for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); c.fillRect(x - w, y + dy, w * 2 + 1, 1); }
}
function drawSky(h, t) {
  const px = SEA.px, W = AW, hor = Math.round(SEA.surf / px), H = hor + 12;
  if (skyC.width !== W || skyC.height !== H) { skyC.width = W; skyC.height = H; }
  const c = skyC.getContext('2d'), L = SEA.light, R = seeded(5), [zen, hz] = skyAt(h), night = L.night;
  const warm = 1 - smooth(.05, .6, L.elev), sunCol = mix3([1, .97, .88], [1, .6, .3], warm);
  c.imageSmoothingEnabled = false; c.globalAlpha = 1;
  let g = c.createLinearGradient(0, 0, 0, hor);
  g.addColorStop(0, css(zen)); g.addColorStop(.6, css(mix3(zen, hz, .5))); g.addColorStop(1, css(hz));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (night > .2) for (let i = 0; i < W * .3; i++) { c.globalAlpha = (night - .2) * (.25 + R() * .75); c.fillStyle = '#fff'; c.fillRect(R() * W | 0, R() * hor * .8 | 0, 1, 1); }
  c.globalAlpha = 1;
  const orb = hh => { const e = Math.sin(Math.PI * (hh - 6) / 12); return [W * (.12 + .76 * (hh - 6) / 12), hor - (hor - 30) * .85 * Math.max(e, 0) + 4, e]; };
  const [sx, sy, se] = orb(h);
  if (se > -.15) {
    let gg = c.createRadialGradient(sx, hor, 2, sx, hor, W * .5);                            // resplandor del horizonte
    gg.addColorStop(0, css(sunCol, .5 * (.3 + warm * .7) * smooth(-.15, .05, se))); gg.addColorStop(1, css(sunCol, 0));
    c.fillStyle = gg; c.fillRect(0, 0, W, H);
    gg = c.createRadialGradient(sx, sy, 0, sx, sy, 70);
    gg.addColorStop(0, css(sunCol, .9)); gg.addColorStop(.1, css(sunCol, .55)); gg.addColorStop(.35, css(sunCol, .15)); gg.addColorStop(1, css(sunCol, 0));
    c.fillStyle = gg; c.fillRect(sx - 70, sy - 70, 140, 140);
    disc(c, sx, sy, 7, css(mix3([1, 1, .96], sunCol, .4)));
  }
  const [mx, my, me] = orb((h + 12) % 24);
  if (me > 0 && night > .3) {
    const gg = c.createRadialGradient(mx, my, 2, mx, my, 40); gg.addColorStop(0, css([.75, .8, 1], .3 * night)); gg.addColorStop(1, css([.75, .8, 1], 0));
    c.fillStyle = gg; c.fillRect(mx - 40, my - 40, 80, 80);
    disc(c, mx, my, 6, '#e8ecf4');
    c.fillStyle = 'rgba(120,130,150,.45)'; for (const [ox, oy] of [[-2, -2], [2, 1], [-1, 3], [3, -3]]) c.fillRect(Math.round(mx) + ox, Math.round(my) + oy, 2, 1);
  }
  // nubes por ruido fractal: luz del lado del sol y base en sombra
  const litC = mix3(mix3([1, 1, 1], sunCol, warm * .75), [.2, .22, .32], night * .85).map(v => v * (1 - night * .45));
  const shadeC = mix3(mix3(hz, zen, .45).map(v => v * .78), [.07, .08, .13], night * .7);
  const DS = 2, cw = Math.ceil(W / DS), ch = Math.ceil(hor * .85 / DS);
  cloudC.width = cw; cloudC.height = ch;
  const cc = cloudC.getContext('2d'), id = cc.createImageData(cw, ch), dd = id.data, cov = .52, drift = t * 4;
  for (let j = 0; j < ch; j++) {
    const wy = j * DS * px, vy = j / ch, band = smooth(0, .18, vy) * (1 - smooth(.72, 1, vy));
    for (let i = 0; i < cw; i++) {
      const wx = i * DS * px, nx = (wx + drift) * .0032, ny = wy * .0085;
      const d = fbm(nx, ny) * (.75 + .35 * band) - (1 - band) * .15, a = smooth(cov, cov + .16, d);
      if (a <= 0) continue;
      const dxs = sx * px - wx, dys = sy * px - wy, dl = Math.hypot(dxs, dys) || 1;
      const d2 = fbm(nx + dxs / dl * .05, ny + dys / dl * .13);
      const litAmt = clamp(.55 + (d - d2) * 5, 0, 1), thick = smooth(cov, cov + .45, d);
      let ccol = mix3(shadeC, litC, litAmt * (1 - .45 * thick));
      const rim = Math.max(0, 1 - dl / 380) * (1 - a) * 1.2 * (1 - night);
      ccol = ccol.map((q, k) => q + sunCol[k] * rim);
      const o = (j * cw + i) * 4;
      dd[o] = ccol[0] * 255; dd[o + 1] = ccol[1] * 255; dd[o + 2] = ccol[2] * 255; dd[o + 3] = a > .5 ? 245 : 0;
    }
  }
  cc.putImageData(id, 0, 0); c.drawImage(cloudC, 0, 0, cw * DS, ch * DS);
  // montañas con perspectiva atmosférica y pinos en la orilla (columnas de 1 px: bordes nítidos)
  const rock = [.24, .27, .3].map(v => v * (1 - night * .7));
  [[hor - 9, 34, .72, .003, 1.3], [hor - 3, 22, .45, .006, 4.1], [hor + 1, 12, .2, .011, 7.7]].forEach(([by, amp, haze, f, s]) => {
    c.fillStyle = css(mix3(rock, hz.map(v => v * (1 - night * .5)), haze));
    for (let x = 0; x < W; x++) { const y = Math.round(by - amp * (ridge(x * px, f, s) + .6)); c.fillRect(x, y, 1, H - y); }
  });
  c.fillStyle = css([.06, .13, .08].map(v => v * (1 - night * .6)));
  for (let x = -4; x < W + 6; x += 4 + R() * 6) {
    const th = 12 + R() * 20, base = hor + 3;
    for (let k = 0; k < 3; k++) {
      const ww = th * (.5 - k * .12), yy = base - th * k * .28, top = yy - th * .55;
      for (let y = Math.round(top); y < yy; y++) { const hw = ww / 2 * (y - top) / (yy - top); c.fillRect(Math.round(x - hw), y, Math.round(hw * 2) + 1, 1); }
    }
  }
  if (night > .4) { c.fillStyle = '#ffd27a'; for (let i = 0; i < 8; i++) c.fillRect(R() * W | 0, hor - 3 - (R() * 12 | 0), 1, 1); }
}

/* ---------- FONDO DE LA PECERA: grava, tronco, roca, maceta, coco y corales (de la pecera original) ---------- */
const PEB = ['#8c7b66', '#b5a68b', '#6a5e50', '#d4c6a8', '#9a8a74', '#4f463d'], MOSS = ['#3f8a34', '#5fb544', '#2f6b2c'];
const CORAL = ['#ff5fa2', '#ff8a2a', '#9b5cff'];
let caves = [];
function bedCtx(cv) { const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.setTransform(1 / SEA.px, 0, 0, 1 / SEA.px, 0, -SEA.bedTop / SEA.px); return x; }
function texture(c, R, cols, n, x, y, w, h) {
  const P = SEA.px; c.save(); c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < n; i++) { c.fillStyle = cols[R() * cols.length | 0]; c.fillRect(snap(x + R() * w), snap(y + R() * h), P * (1 + (R() * 2 | 0)), P); }
  c.restore();
}
const shade = (h, k) => toHex(hex(h).map(v => v * k));
function coralBranch(c, R, x, y, a, len, w, d, color) {
  const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len, P = SEA.px;
  c.strokeStyle = shade(color, .65 + d * .12); c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
  if (d >= 3 || len < 10 * SEA.k) { c.fillStyle = shade(color, 1.3); c.fillRect(snap(nx) - P, snap(ny) - P * 2, P * 2, P * 2); return; }
  for (let k = 0; k < 2 + (R() < .4); k++) coralBranch(c, R, nx, ny, a + (R() - .5) * 1.1, len * (.65 + R() * .2), Math.max(P, w * .75), d + 1, color);
}
function drawCorals(c, R) {
  const [c1, c2, c3] = CORAL, k = SEA.k, P = SEA.px;
  let x = fr(.27), b = floorY(x) + 6 * k;                                   // acropora ramificada
  for (let i = 0; i < 4; i++) coralBranch(c, R, x + (i - 1.5) * 22 * k, b, -Math.PI / 2 + (i - 1.5) * .3, (55 + R() * 20) * k, Math.max(P, 10 * k), 0, c1);
  x = fr(.47); b = floorY(x) + 10 * k;                                       // coral cerebro
  c.fillStyle = c2; c.beginPath(); c.ellipse(x, b, 62 * k, 46 * k, 0, Math.PI, 0); c.fill();
  c.fillStyle = shade(c2, .6);
  for (let yy = b - 46 * k; yy < b; yy += P) for (let xx = x - 62 * k; xx < x + 62 * k; xx += P) {
    const ex = (xx - x) / (62 * k), ey = (yy - b) / (46 * k); if (ex * ex + ey * ey > 1) continue;
    if (Math.sin(xx / k * .09 + Math.sin(yy / k * .11) * 2.2) > .55) c.fillRect(snap(xx), snap(yy), P, P);
  }
  x = fr(.72); b = floorY(x) + 4 * k;                                        // abanico (gorgonia)
  c.strokeStyle = c3; c.lineWidth = Math.max(P, 4 * k);
  for (let j = 0; j < 9; j++) { const a = -Math.PI / 2 + (j - 4) * .17; c.beginPath(); c.moveTo(x, b); c.quadraticCurveTo(x + Math.cos(a) * 70 * k, b + Math.sin(a) * 90 * k, x + Math.cos(a) * 140 * k, b + Math.sin(a) * 160 * k); c.stroke(); }
  c.strokeStyle = shade(c3, 1.25); c.lineWidth = Math.max(P, 3 * k);
  for (let r = 50; r < 160; r += 22) { c.beginPath(); c.arc(x, b, r * k, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  for (let i = 0; i < 26; i++) {                                             // pólipos sobre la roca
    const cx = caves[0].cx + (R() - .5) * 180 * k, cy = caves[0].top + (30 + R() * 50) * k;
    c.fillStyle = i % 2 ? c1 : c2; c.beginPath(); c.arc(cx, cy, Math.max(P, 7 * k), 0, 7); c.fill();
    c.fillStyle = shade(i % 2 ? c1 : c2, .5); c.fillRect(snap(cx) - P / 2, snap(cy) - P / 2, P, P);
  }
}
function buildBed() {
  const k = SEA.k, P = SEA.px, W = SEA.vw, bot = SEA.bedTop + BED_H * k + P;
  for (const c of [decA, decF, plB, plF]) { c.width = AW; c.height = Math.ceil(BED_H * k / P) + 2; }
  const A = bedCtx(decA), F = bedCtx(decF), R = seeded(11);
  A.fillStyle = '#5b4f42';
  A.beginPath(); A.moveTo(0, bot); for (let x = 0; x <= W; x += P) A.lineTo(x, floorY(x)); A.lineTo(W, bot); A.fill();
  for (let i = 0; i < 2600 * W / 1800; i++) { const x = R() * W, y = floorY(x) + R() * 100 * k; A.fillStyle = R() < .18 ? MOSS[R() * 3 | 0] : PEB[R() * 6 | 0]; A.fillRect(snap(x), snap(y), P * (1 + (R() < .3)), P); }
  const dwX = fr(.36), dwY = floorY(dwX);                                   // tronco
  A.fillStyle = '#6e4b30';
  const branch = (x0, y0, x1, y1, w0, w1) => { const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    A.beginPath(); A.moveTo(x0 + nx * w0, y0 + ny * w0); A.lineTo(x1 + nx * w1, y1 + ny * w1); A.lineTo(x1 - nx * w1, y1 - ny * w1); A.lineTo(x0 - nx * w0, y0 - ny * w0); A.fill(); };
  branch(dwX - 220 * k, dwY + 10 * k, dwX + 160 * k, dwY - 70 * k, 26 * k, 14 * k); branch(dwX - 40 * k, dwY - 20 * k, dwX - 150 * k, dwY - 210 * k, 16 * k, 6 * k);
  branch(dwX + 60 * k, dwY - 45 * k, dwX + 120 * k, dwY - 230 * k, 12 * k, 5 * k); branch(dwX + 150 * k, dwY - 66 * k, dwX + 260 * k, dwY - 120 * k, 10 * k, 4 * k);
  texture(A, R, ['#4a3020', '#8a6040', '#5a3a26'], 260, dwX - 240 * k, dwY - 240 * k, 520 * k, 260 * k);
  for (const f of [.52, .55, .93]) { const x = fr(f), y = floorY(x) - 10 * k; A.fillStyle = '#2f6b2c'; A.beginPath(); A.arc(x, y, 16 * k, 0, 7); A.fill(); texture(A, R, MOSS, 30, x - 18 * k, y - 18 * k, 36 * k, 36 * k); }
  caves = [];
  { // roca con cueva
    const cx = fr(.15), base = floorY(cx), w = 330 * k, h = 210 * k, hx = cx + 18 * k, hy = base - 34 * k, rx = 82 * k, ry = 56 * k;
    A.fillStyle = '#05080a'; A.beginPath(); A.ellipse(hx, hy, rx + 6 * k, ry + 6 * k, 0, 0, 7); A.fill();
    const pts = [[cx - w / 2, base + 24 * k]];
    for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI, rr = .86 + R() * .2; pts.push([cx + Math.cos(a) * w / 2 * rr, base + Math.sin(a) * h * rr]); }
    pts.push([cx + w / 2, base + 24 * k]);
    F.fillStyle = '#5d6670'; F.beginPath(); pts.forEach(([x, y], i) => i ? F.lineTo(x, y) : F.moveTo(x, y)); F.closePath();
    F.ellipse(hx, hy, rx, ry, 0, 0, PI2); F.fill('evenodd');
    texture(F, R, ['#4a525b', '#7b8794', '#3e4650', '#8d99a5'], 480, cx - w / 2, base - h, w, h + 24 * k);
    for (let i = 0; i < 80; i++) { F.fillStyle = MOSS[R() * 3 | 0]; const a = Math.PI * (1.15 + R() * .7); F.fillRect(snap(cx + Math.cos(a) * w * .42), snap(base + Math.sin(a) * h * .9 + R() * 12 * k), P, P); }
    caves.push({ cx, top: base - h * .95 });
  }
  { // maceta de barro acostada
    const px0 = fr(.62), px1 = px0 + 230 * k, base = floorY(px0 + 115 * k), r = 62 * k, cy = base - r + 16 * k;
    A.fillStyle = '#1a0c06'; A.beginPath(); A.ellipse(px0, cy, 14 * k, r - 7 * k, 0, 0, 7); A.fill();
    F.fillStyle = '#b9643e'; F.beginPath(); F.moveTo(px0, cy - r); F.lineTo(px1, cy - r); F.ellipse(px1, cy, 24 * k, r, 0, -Math.PI / 2, Math.PI / 2);
    F.lineTo(px0, cy + r); F.ellipse(px0, cy, 20 * k, r, 0, Math.PI / 2, Math.PI * 1.5); F.closePath();
    F.ellipse(px0, cy, 13 * k, r - 7 * k, 0, 0, PI2); F.fill('evenodd');
    texture(F, R, ['#a55634', '#c97650', '#9a4c2e'], 200, px0, cy - r, 250 * k, r * 2);
    F.fillStyle = '#d98a5e'; for (const bp of [px0 + 60 * k, px1 - 36 * k]) F.fillRect(snap(bp), cy - r, P, r * 2);
  }
  { // coco
    const kx = fr(.82), base = floorY(kx);
    A.fillStyle = '#120a05'; A.fillRect(kx - 26 * k, base - 50 * k, 52 * k, 60 * k);
    F.fillStyle = '#6b4528'; F.beginPath(); F.ellipse(kx, base + 12 * k, 76 * k, 72 * k, 0, Math.PI, 0); F.closePath();
    F.moveTo(kx - 22 * k, base + 10 * k); F.lineTo(kx - 22 * k, base - 26 * k); F.arc(kx, base - 26 * k, 22 * k, Math.PI, 0); F.lineTo(kx + 22 * k, base + 10 * k); F.closePath(); F.fill('evenodd');
    texture(F, R, ['#8a5c38', '#4e321c', '#7a5030'], 200, kx - 76 * k, base - 62 * k, 152 * k, 76 * k);
  }
  drawCorals(A, R);
  for (let i = 0; i < 900 * W / 1800; i++) { const x = R() * W, y = floorY(x) + (34 + R() * 64) * k; F.fillStyle = R() < .15 ? MOSS[R() * 3 | 0] : PEB[R() * 6 | 0]; F.fillRect(snap(x), snap(y), P * (1 + (R() < .3)), P); }
  crisp(decA); crisp(decF);
  buildPlants(); buildGround();
  clam.x = fr(.905);
}

/* ---------- PLANTAS + anémona (animadas, se apartan del mouse) ---------- */
let plants = [];
function buildPlants() {
  const R = seeded(21), rock = caves[0], k = SEA.k;
  const P_ = (f, kind, layer, h, extra = {}) => ({ x: fr(f), kind, layer, h: h * k, ph: R() * 6, seed: R() * 1e6 | 0, n: 4 + (R() * 4 | 0), push: 0, ...extra });
  plants = [
    P_(.04, 'vallis', 0, 520), P_(.31, 'vallis', 0, 600), P_(.42, 'vallis', 0, 560), P_(.57, 'cabomba', 0, 480),
    P_(.68, 'vallis', 0, 620), P_(.89, 'vallis', 0, 540), P_(.97, 'cabomba', 0, 420),
    P_(.22, 'ludwigia', 0, 340), P_(.5, 'ludwigia', 0, 300), P_(.76, 'ludwigia', 0, 360),
    { ...P_(.15, 'fern', 0, 120), x: rock.cx - 60 * k, base: rock.top + 14 * k },
    { ...P_(.36, 'fern', 0, 90), base: floorY(fr(.36)) - 70 * k },
    P_(.965, 'anemone', 0, 80),
  ];
  for (let f = .03; f < .98; f += .045 + R() * .04) if (Math.abs(f - .905) > .05) plants.push(P_(f, 'grass', 1, 40 + R() * 40));   // la almeja queda despejada
  plants.push(P_(.985, 'vallis', 1, 520));
}
function leaf(c, x, y, a, L, w) {
  const ca = Math.cos(a), sa = Math.sin(a), px = -sa * w, py = ca * w;
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + ca * L / 2 + px, y + sa * L / 2 + py, x + ca * L, y + sa * L);
  c.quadraticCurveTo(x + ca * L / 2 - px, y + sa * L / 2 - py, x, y); c.fill();
}
function drawPlant(c, p, t) {
  const R = seeded(p.seed), base = p.base ?? floorY(p.x) + 16 * SEA.k, k = SEA.k, P = SEA.px;
  let target = 0;
  if (t - M.moveT < 1.2 && Math.abs(M.x - p.x) < 150 && M.y > base - p.h && M.y < base) target = Math.sign(p.x - M.x || 1) * (1 - Math.abs(M.x - p.x) / 150);
  p.push += (target - p.push) * .08;
  const sw = j => Math.sin(t * .8 + p.ph + j) + p.push * 2.2;
  if (p.kind === 'vallis' || p.kind === 'grass') {
    const greens = p.kind === 'grass' ? ['#4fa83a', '#6cc24a', '#3b8a30'] : ['#3d8a33', '#58a83e', '#2f6f2a', '#6fbf4c'];
    for (let j = 0; j < p.n + (p.kind === 'grass' ? 3 : 0); j++) {
      const x0 = p.x + (j - p.n / 2) * (p.kind === 'grass' ? 6 : 9) * k, h = p.h * (.55 + R() * .45), s = sw(j * .6) * h * .14;
      c.strokeStyle = greens[j % greens.length]; c.lineWidth = Math.max(P, (p.kind === 'grass' ? 4 : 7) * k);
      c.beginPath(); c.moveTo(x0, base); c.quadraticCurveTo(x0 + s * .3, base - h * .55, x0 + s, base - h); c.stroke();
      if (p.kind === 'vallis') { c.fillStyle = '#e6c84a'; c.fillRect(snap(x0 + s) - P, snap(base - h) - P, P, P * 2); }
    }
  } else if (p.kind === 'ludwigia' || p.kind === 'cabomba') {
    for (let s = 0; s < 3; s++) {
      let x = p.x + (s - 1) * 22 * k, y = base; const segs = 12, seg = p.h * (.7 + R() * .3) / segs;
      for (let j = 0; j < segs; j++) {
        const a = -Math.PI / 2 + sw(j * .25 + s) * .045 * j, nx = x + Math.cos(a) * seg, ny = y + Math.sin(a) * seg;
        c.strokeStyle = p.kind === 'ludwigia' ? '#7a3a2a' : '#3e7a35'; c.lineWidth = Math.max(P, 4 * k); c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
        if (p.kind === 'ludwigia') { c.fillStyle = css(mix3([.25, .55, .2], [.85, .3, .2], j / segs)); leaf(c, nx, ny, a - 1.1, 22 * k, 7 * k); leaf(c, nx, ny, a + 1.1, 22 * k, 7 * k); }
        else { c.strokeStyle = j % 2 ? '#6fc34f' : '#58a83e'; for (let f = -2; f <= 2; f++) { const fa = a + f * .55 + Math.PI / 2 * Math.sign(f || 1) * .6; c.beginPath(); c.moveTo(nx, ny); c.lineTo(nx + Math.cos(fa) * 16 * k, ny + Math.sin(fa) * 16 * k); c.stroke(); } }
        x = nx; y = ny;
      }
    }
  } else if (p.kind === 'fern') {
    for (let j = 0; j < 6; j++) { const a = -Math.PI / 2 + (j - 2.5) * .38 + sw(j) * .06; c.fillStyle = j % 2 ? '#2e6b38' : '#3f8a46'; leaf(c, p.x + (j - 2.5) * 6 * k, base, a, p.h * (.7 + R() * .4), 11 * k); }
  } else if (p.kind === 'anemone') {
    const [c1, , c3] = CORAL;
    c.fillStyle = shade(c3, .6); c.fillRect(p.x - 26 * k, base - 34 * k, 52 * k, 34 * k);
    for (let j = 0; j < 18; j++) {
      const a = -Math.PI / 2 + (j - 8.5) * .16, L = p.h * (.6 + R() * .4), s = sw(j * .5) * .25;
      const x0 = p.x + (j - 8.5) * 3 * k, tx = x0 + Math.cos(a + s) * L, ty = base - 34 * k + Math.sin(a + s) * L;
      c.strokeStyle = c3; c.lineWidth = Math.max(P, 5 * k); c.beginPath(); c.moveTo(x0, base - 34 * k); c.quadraticCurveTo(p.x + (j - 8.5) * 5 * k, base - 34 * k - L * .5, tx, ty); c.stroke();
      c.fillStyle = c1; c.fillRect(snap(tx) - P, snap(ty) - P, P * 2, P * 2);
    }
  }
}

/* ---------- PERFIL DEL SUELO (para que los caracoles trepen la decoración) ---------- */
let ground = new Float32Array(1);
function buildGround() {
  const P = SEA.px, wl = decF.width, hl = decF.height, d = decF.getContext('2d').getImageData(0, 0, wl, hl).data, raw = new Float32Array(wl);
  for (let i = 0; i < wl; i++) {
    const x = i * P + P / 2; let gy = floorY(x);
    for (let j = 0; j < hl; j++) if (d[(j * wl + i) * 4 + 3] > 0) { const yy = SEA.bedTop + j * P; if (yy < gy - 6) gy = yy; break; }
    raw[i] = gy - SEA.bedTop;                                                 // relativo al fondo: sobrevive a cambios de alto
  }
  ground = raw.map((_, i) => { let s = 0, n = 0; for (let j = -2; j <= 2; j++) { const v = raw[i + j]; if (v !== undefined) { s += v; n++; } } return s / n; });
}
const groundAt = x => SEA.bedTop + ground[clamp(Math.round(x / SEA.px - .5), 0, ground.length - 1)];

/* ---------- PECES (compartidos por el fondo de la página y las peceras chicas) ---------- */
function nearestFood(w, x, y, max = 700) {
  let best = max * max, f = null;
  for (const p of w.pellets) { if (p.air) continue; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < best) { best = d; f = p; } }
  return f;
}
class Fish {
  constructor(g, sp, spr, o = {}) {
    Object.assign(this, { g, sp, spr, label: o.label, cat: o.cat, follow: o.follow });
    const b = g.band(), w = g.w;
    this.x = rnd(b.x0, b.x1); this.y = sp.bottom ? w.floorAt(this.x) - this.hh : rnd(b.y0, b.y1);
    this.vx = rnd(-10, 10); this.vy = 0; this.dir = this.vx < 0 ? -1 : 1; this.face = this.dir; this.ang = 0;
    this.anim = rnd(0, NF); this.state = 'swim'; this.st = 0; this.emote = ''; this.emoteT = 0; this.pend = null; this.near = 0;
    this.tx = this.x; this.ty = this.y; this.wait = 0; this.alpha = 1; this.fade = 1;
  }
  get px() { return this.g.w.px; }
  get len() { return this.sp.L * this.px; }
  get r() { return this.len / 2; }
  get hh() { return this.sp.Ds.H * (this.sp.Ds.botK ?? 1) * this.px; }
  get ph() { return this.spr.frames[0].height * this.px; }
  say(e, d = 1.6) { this.emote = e; this.emoteT = d; }
  pick() {
    const b = this.g.band(), w = this.g.w, [a, z] = w.night > .7 && !this.sp.nocturnal ? [.55, 1] : this.sp.band;
    this.tx = rnd(b.x0, b.x1); this.ty = this.sp.bottom ? w.floorAt(this.tx) - this.hh : b.y0 + (b.y1 - b.y0) * rnd(a, z); this.wait = rnd(4, 10) * (this.sp.bottom ? 2 : 1);
  }
  update(dt, t) {
    const g = this.g, w = g.w, sp = this.sp, m = w.mouse, V = w.view;
    this.alpha += (this.fade - this.alpha) * Math.min(1, dt * 4);
    if (this.emoteT > 0) this.emoteT -= dt;
    if (this.pend && (this.pend.t -= dt) <= 0) { startle(this, this.pend.x, this.pend.y, false); this.pend = null; }
    const sleepy = sp.nocturnal ? w.night < .3 : w.night > .7;
    const food = nearestFood(w, this.x, this.y);
    let tx, ty, mul = 1, arrive = true, boids = false, tilt = null;
    const idle = t - m.moveT > 1.5;
    if (this.state === 'flee') {
      this.st -= dt;
      const dx = this.x - this.thx, dy = this.y - this.thy, d = Math.hypot(dx, dy) || 1;
      tx = this.x + dx / d * 200; ty = this.y + dy / d * 120; mul = 3.2; arrive = false;
      if (this.st <= 0) this.state = 'swim';
    } else if (food) {
      tx = food.x; ty = food.y; mul = 1.9; this.near = 0;
    } else if (sp.curious && idle && !sleepy && Math.hypot(m.x - this.x, m.y - this.y) < 500) {
      tx = m.x + (m.x > this.x ? -this.r - 20 : this.r + 20); ty = m.y; mul = 1.1;
      if (this.near === 0) this.say('?', 1.2);
      this.near += dt; if (this.near > 3 && this.emoteT <= 0 && Math.random() < dt * .4) this.say('♥', 1.5);
    } else if (this.follow && (this.y < V.top + 70 || this.y > V.top + V.h - 70)) {
      tx = this.x; ty = V.top + V.h * .55; mul = 4.5; this.near = 0;   // la mascota acompaña al visitante mientras baja
    } else {
      this.near = 0;
      if (g.members.length > 1 && !sp.bottom) { tx = g.tx; ty = g.ty; boids = true; }
      else { this.wait -= dt; if (Math.hypot(this.tx - this.x, this.ty - this.y) < 25 || this.wait < 0) this.pick(); tx = this.tx; ty = this.ty; }
      if (sp.bottom) { if (this.y > w.floorAt(this.x) - this.hh - 20) tilt = .35; mul = sleepy ? .1 : .6; }
      if (sleepy) { mul = Math.min(mul, .4); if (this.emoteT <= 0 && Math.random() < dt * .12) this.say('z', 2); }
    }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    const spd = sp.speed * mul * w.speed;
    const ar = arrive ? Math.min(1, d / 70 + (food ? .5 : .12)) : 1;
    let dvx = dx / d * spd * ar, dvy = dy / d * spd * ar * .75;
    if (g.members.length > 1) {
      let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0; const sep = this.r * 1.6 + 6;
      for (const o of g.members) {
        if (o === this) continue;
        const ex = o.x - this.x, ey = o.y - this.y, d2 = ex * ex + ey * ey;
        if (d2 > 200 * 200) continue;
        n++; cx += ex; cy += ey; ax += o.vx; ay += o.vy;
        if (d2 < sep * sep) { const dd = Math.sqrt(d2) || 1; sx -= ex / dd * (1 - dd / sep); sy -= ey / dd * (1 - dd / sep); }
      }
      dvx += sx * spd * 1.8; dvy += sy * spd * 1.8;
      const coh = sp.loose ? .2 : .45;
      if (n && boids) { const cl = Math.hypot(cx, cy) || 1; dvx += cx / cl * spd * coh + (ax / n - this.vx) * .5; dvy += cy / cl * spd * coh * .7 + (ay / n - this.vy) * .5; }
    }
    const k = Math.min(1, dt * (this.state === 'flee' ? 4 : food ? 3 : 1.4));
    this.vx += (dvx - this.vx) * k; this.vy += (dvy - this.vy) * k;
    const turning = 1 - Math.abs(this.face);                                  // al girar frena un poco
    this.x += this.vx * dt * (1 - turning * .6); this.y += this.vy * dt;
    this.x = clamp(this.x, w.lim.x0, w.lim.x1);
    this.y = clamp(this.y, w.surfAt(this.x) + 25, w.floorAt(this.x) - this.hh * .9);
    if (this.vx > 8) this.dir = 1; else if (this.vx < -8) this.dir = -1;
    this.face += clamp(this.dir - this.face, -dt * 6, dt * 6);                // giro con frames reales (escorzo)
    const ta = tilt ?? clamp(Math.atan2(this.vy, Math.abs(this.vx) + 1), -.8, .8);
    this.ang += (ta - this.ang) * Math.min(1, dt * 6);
    this.anim += dt * (3 + Math.hypot(this.vx, this.vy) * .12) * 1.4;
    if (food && Math.hypot(food.x - this.x, food.y - this.y) < this.r * .6 + 6) {
      w.pellets.splice(w.pellets.indexOf(food), 1);
      if (Math.random() < .3) this.say('♥', 1.2);
      for (let i = 0; i < 2; i++) w.bubbles.push({ x: this.x + this.dir * this.r, y: this.y, r: 1, v: rnd(40, 70), ph: rnd(0, 6) });
    }
  }
  draw(c) {
    const v3 = SEA.style === '3d' && (this.spr.v3 || SEA.budget3d-- > 0);   // el voxel se genera de a poco, sin trabar el frame
    const st = v3 ? sprites3D(this.spr) : this.spr, px = this.px;
    const a = Math.abs(this.face), sg = this.face < 0 ? -1 : 1;
    const img = a > .85 ? st.frames[(this.anim | 0) % NF] : st.turn[a > .6 ? 0 : a > .3 ? 1 : 2];
    c.save(); c.globalAlpha = this.alpha;
    c.translate(Math.round(this.x / px) * px, Math.round(this.y / px) * px);
    c.rotate(this.ang * sg * Math.min(1, a * 1.3));
    c.scale(px * sg, px);
    c.drawImage(img, -(img.width >> 1), -(img.height >> 1));
    c.restore();
  }
}
class Group {
  constructor(w, band) { this.w = w; this.band = band; this.members = []; this.tx = 0; this.ty = 0; this.wait = 0; }
  pick() {
    const b = this.band(), sb = this.members[0] ? this.members[0].sp.band : [.15, .85], [a, z] = this.w.night > .7 ? [.55, .95] : sb;
    this.tx = rnd(Math.min(b.x0 + 80, b.x1), Math.max(b.x1 - 80, b.x0)); this.ty = b.y0 + (b.y1 - b.y0) * rnd(a, z); this.wait = rnd(5, 11);
  }
  update(dt, t) {
    this.wait -= dt;
    const al = this.members;
    if (al.length) {
      const cx = al.reduce((s, f) => s + f.x, 0) / al.length, cy = al.reduce((s, f) => s + f.y, 0) / al.length;
      if (this.wait < 0 || Math.hypot(cx - this.tx, cy - this.ty) < 50) this.pick();
    }
    for (const f of al) f.update(dt, t);
  }
}
function startle(f, x, y, spread = true) {
  f.state = 'flee'; f.st = rnd(.8, 1.3); f.thx = x; f.thy = y; f.say('!', 1.1);
  const dx = f.x - x, dy = f.y - y, d = Math.hypot(dx, dy) || 1, sp = f.sp.speed * 5;
  f.vx = dx / d * sp; f.vy = dy / d * sp * .7;
  if (spread) for (const o of f.g.members) if (o !== f && o.state !== 'flee' && Math.hypot(o.x - f.x, o.y - f.y) < 200) o.pend = { t: rnd(.05, .25), x, y };
}

/* ---------- COMIDA, BURBUJAS Y ONDAS (genérico para cualquier pecera) ---------- */
function dropFood(w, x, y) {
  if (y > w.floorAt(x) - 5) return;
  for (let i = 0; i < 4; i++) w.pellets.push({ x: x + rnd(-16, 16), y: y + rnd(-6, 6), vy: 0, ph: rnd(0, 6), air: y < w.surfAt(x), bottom: false, t: 0, life: 0, bites: 2, c: Math.random() < .5 ? '#c8722e' : '#e3a04f' });
  if (w.pellets.length > 120) w.pellets.splice(0, w.pellets.length - 120);
}
function updateWater(w, dt, t) {
  for (let i = w.pellets.length - 1; i >= 0; i--) {
    const p = w.pellets[i];
    if (p.bottom) { if ((p.t += dt) > 60) w.pellets.splice(i, 1); continue; }
    const sy = w.surfAt(p.x);
    if (p.y < sy) p.vy = Math.min(p.vy + 700 * dt, 400);
    else { if (p.air) { w.ripples.push({ x: p.x, t: 0 }); p.air = false; p.vy = 30; } p.vy += (28 - p.vy) * Math.min(1, dt * 2); p.x += Math.sin(t * 2 + p.ph) * 8 * dt; }
    p.y += p.vy * dt;
    if (p.y >= w.floorAt(p.x)) { p.y = w.floorAt(p.x); p.bottom = true; }
    else if ((p.life += dt) > 90) w.pellets.splice(i, 1);                     // ponytail: lo que nadie come se disuelve
  }
  for (let i = w.bubbles.length - 1; i >= 0; i--) {
    const b = w.bubbles[i]; b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.ph) * 12 * dt;
    if (b.y < w.surfAt(b.x) + 4 || b.y < w.view.top - 60) w.bubbles.splice(i, 1);
  }
  for (let i = w.ripples.length - 1; i >= 0; i--) if ((w.ripples[i].t += dt) > 1.2) w.ripples.splice(i, 1);
}
function drawWater(c, w, t, top = -1e9, bot = 1e9) {
  const px = w.px, P = v => Math.round(v / px) * px;
  for (const p of w.pellets) if (p.y > top && p.y < bot) { c.globalAlpha = p.bottom && p.t > 50 ? (60 - p.t) / 10 : 1; c.fillStyle = p.c; c.fillRect(P(p.x) - px, P(p.y) - px, px * 2, px * 2); }
  c.globalAlpha = 1; c.strokeStyle = 'rgba(230,248,255,.8)'; c.lineWidth = px;
  for (const b of w.bubbles) if (b.y > top && b.y < bot) { const r = (b.r + 1) * px; c.strokeRect(P(b.x) - r + px / 2, P(b.y) - r + px / 2, r * 2 - px, r * 2 - px); }
  c.fillStyle = '#dcf5ff';
  for (const r of w.ripples) {
    const rx = 6 + r.t * 40, ry = 2 + r.t * 5, y0 = w.surfAt(r.x); c.globalAlpha = (1 - r.t / 1.2) * .7;
    for (let i = 0; i < 28; i++) { const q = i / 28 * PI2; c.fillRect(P(r.x + Math.cos(q) * rx), P(y0 + Math.sin(q) * ry), px, px); }
  }
  c.globalAlpha = 1;
}

/* ---------- GAMBAS ---------- */
const SHRIMP_KEYS = Object.keys(SHRIMPS);
class Shrimp {
  constructor(i) {
    this.spr = shrimpSprite(SHRIMP_KEYS[(i * 7 + (Math.random() * 3 | 0)) % SHRIMP_KEYS.length]);
    this.x = rnd(80, SEA.vw - 80); this.y = floorY(this.x); this.dir = Math.random() < .5 ? -1 : 1;
    this.state = 'idle'; this.st = rnd(0, 2); this.vx = 0; this.vy = 0; this.anim = 0; this.ang = 0; this.tx = this.x; this.food = null; this.ph = rnd(0, 6);
  }
  hop(dirx) { this.state = 'hop'; this.vx = dirx * rnd(110, 160); this.vy = -rnd(120, 170); this.dir = -Math.sign(dirx) || this.dir; }
  update(dt) {
    const sleepy = SEA.night > .7, lo = 60, hi = SEA.vw - 60;
    if (this.state === 'hop') {
      this.vy += 170 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 1 - dt * .8; this.ang += dt * 8 * Math.sign(this.vx || 1);
      this.x = clamp(this.x, lo, hi);
      if (this.vy > 0 && this.y >= floorY(this.x)) { this.y = floorY(this.x); this.state = 'idle'; this.st = rnd(.5, 1.5); this.ang = 0; }
      return;
    }
    if (!this.food || !BG.pellets.includes(this.food)) { this.food = null; let best = 600; for (const p of BG.pellets) if (p.bottom && Math.abs(p.x - this.x) < best) { best = Math.abs(p.x - this.x); this.food = p; } }
    if (this.food) { this.state = 'walk'; this.tx = this.food.x; }
    else if (this.state !== 'walk' && (this.st -= dt) < 0) {
      const r = Math.random();
      if (r < .12 && !sleepy) { this.hop(rnd(-1, 1)); return; }
      if (sleepy && r < .6) { this.st = rnd(4, 10); return; }                // de noche descansan más
      this.state = 'walk'; this.tx = clamp(this.x + rnd(-220, 220), lo, hi);
    }
    if (this.state === 'walk') {
      const dx = this.tx - this.x;
      if (Math.abs(dx) < 5) {
        if (this.food) { this.food.bites -= dt * 1.5; this.anim += dt * 6; if (this.food.bites <= 0) { BG.pellets.splice(BG.pellets.indexOf(this.food), 1); this.food = null; } }
        else { this.state = 'idle'; this.st = rnd(1, 4); }
      } else { this.dir = Math.sign(dx); this.x += this.dir * (sleepy ? 6 : 14) * dt; this.anim += dt * 6; }
    }
    this.y = floorY(this.x);
  }
  draw(c, t) {
    const s = this.spr, px = SEA.px;
    c.save(); c.translate(snap(this.x), snap(this.y)); c.rotate(this.ang); c.scale(px * this.dir, px);
    c.drawImage(s.frames[(this.anim * 1.5 | 0) % 2], -(s.w >> 1), -(s.foot + 1)); c.restore();
    if (this.state === 'hop') return;
    const hx = this.x + this.dir * px * s.head[0], hy = this.y + px * (s.head[1] + s.h / 2 - (s.foot + 1)), L = 20 * px;
    const w1 = Math.sin(t * 2.6 + this.ph) * .12, w2 = Math.sin(t * 3.3 + this.ph * 1.7) * .15;
    c.strokeStyle = s.ant; c.globalAlpha = .8; c.lineWidth = px * .7;
    c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + this.dir * L * .55, hy - L * (.6 + w1), hx - this.dir * L * .35, hy - L * (.45 + w1)); c.stroke();
    c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + this.dir * L * .5, hy - L * .08, hx + this.dir * L * .95, hy + L * (.12 + w2)); c.stroke();
    c.globalAlpha = 1;
  }
}

/* ---------- CARACOLES: caminan y trepan la decoración; se esconden con el mouse ---------- */
class Snail {
  constructor(i) {
    this.spr = SNAIL_SPR[i % SNAIL_SPR.length]; this.x = rnd(100, SEA.vw - 100); this.dir = Math.random() < .5 ? -1 : 1;
    this.ext = 1; this.state = 'crawl'; this.st = rnd(4, 12); this.anim = rnd(0, 2); this.ang = 0;
  }
  get y() { return groundAt(this.x); }
  hide() { this.state = 'hide'; this.st = rnd(3, 7); }
  update(dt) {
    const ta = Math.atan((groundAt(this.x + 6) - groundAt(this.x - 6)) / 12);
    this.ang += (ta - this.ang) * Math.min(1, dt * 4);
    if (this.state === 'hide') { this.ext = Math.max(0, this.ext - dt * 4); if ((this.st -= dt) < 0) { this.state = 'idle'; this.st = 1; } return; }
    this.ext = Math.min(1, this.ext + dt * .8); if (this.ext < 1) return;
    this.anim += dt * 2; this.st -= dt;
    if (this.state === 'idle') { if (this.st < 0) { this.state = 'crawl'; this.st = rnd(6, 16); if (Math.random() < .4) this.dir *= -1; } return; }
    if (this.st < 0) { this.state = 'idle'; this.st = rnd(2, 6); return; }
    const p = BG.pellets.find(q => q.bottom && Math.abs(q.x - this.x) < 260);
    if (p) { this.dir = Math.sign(p.x - this.x) || this.dir; if (Math.abs(p.x - this.x) < 4) { p.bites -= dt * .5; if (p.bites <= 0) BG.pellets.splice(BG.pellets.indexOf(p), 1); return; } }
    this.x += this.dir * 6 * dt * Math.max(.15, Math.cos(this.ang));
    if (this.x < 100 || this.x > SEA.vw - 100) { this.dir *= -1; this.x = clamp(this.x, 100, SEA.vw - 100); }
  }
  draw(c) {
    const s = this.spr, px = SEA.px, f = this.ext > .9 ? (this.anim | 0) % 2 : this.ext > .4 ? 2 : 3;
    c.save(); c.translate(snap(this.x), snap(this.y + 1)); c.rotate(this.ang); c.scale(px * this.dir, px);
    c.drawImage(s.frames[f], -(s.w >> 1), -15); c.restore();
  }
}

/* ---------- ALMEJA: se abre, suelta burbujas y se cierra si acercas el mouse ---------- */
const clam = { x: 0, o: 0, open: false, st: 2, block: 0 };
function updateClam(dt, t) {
  const y = floorY(clam.x);
  if (Math.hypot(M.x - clam.x, M.y - y) < 170 && t - M.moveT < 4) clam.block = 1.5;
  clam.block -= dt;
  if (clam.block <= 0 && (clam.st -= dt) < 0) { clam.open = !clam.open; clam.st = clam.open ? rnd(3, 6) : rnd(2.5, 5); }
  const target = clam.block > 0 ? 0 : clam.open ? 1 : 0, sp = clam.block > 0 ? 7 : target > clam.o ? 1.6 : 2.4, prev = clam.o;
  clam.o += clamp(target - clam.o, -dt * sp, dt * sp);
  const by = y - (20 + clam.o * 14) * SEA.k;
  if (prev < .55 && clam.o >= .55) for (let i = 0; i < 16; i++) BG.bubbles.push({ x: clam.x + rnd(-14, 14), y: by + rnd(-6, 6), r: rnd(0, 2) | 0, v: rnd(80, 150), ph: rnd(0, 6) });
  if (clam.o > .55 && Math.random() < dt * 14) BG.bubbles.push({ x: clam.x + rnd(-8, 8), y: by, r: rnd(0, 2) | 0, v: rnd(70, 120), ph: rnd(0, 6) });
}
function drawClam(c) {
  const { x, o } = clam, b = floorY(x) + 8 * SEA.k;
  c.save(); c.translate(x, b); c.scale(1.4 * SEA.k, 1.4 * SEA.k);
  const rim = -14, line = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
  if (o > .05) {                                                             // interior y perla
    c.fillStyle = '#8a2e44'; c.beginPath(); c.ellipse(0, rim, 42, 3 + 12 * o, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#e07890'; c.beginPath(); c.ellipse(0, rim, 37, 2 + 8 * o, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#f6f4fa'; c.beginPath(); c.arc(0, rim - 6 * o, 8, 0, 7); c.fill();
    c.fillStyle = '#ffffff'; c.fillRect(-4, rim - 6 * o - 5, 3, 3);
  }
  c.fillStyle = '#f2d2bc'; c.beginPath(); c.ellipse(0, rim, 46, 18, 0, 0, Math.PI); c.fill();
  c.strokeStyle = '#b98a72'; c.lineWidth = 3;
  for (let j = -3; j <= 3; j++) line(j * 6, 2, j * 12, rim + 2);
  if (o < .15) {
    c.fillStyle = '#f6dcc8'; c.beginPath(); c.ellipse(0, rim, 46, 16 * (1 - o * 2), 0, Math.PI, 0); c.fill();
    for (let j = -3; j <= 3; j++) line(j * 4, rim - 14 * (1 - o * 2), j * 12, rim - 2);
  } else {
    const ye = rim - 6 - o * 22, hh = 4 + 13 * o;
    c.fillStyle = '#f6dcc8'; c.beginPath(); c.ellipse(0, ye, 46, hh + 4, 0, 0, 7); c.fill();
    c.fillStyle = '#e48aa0'; c.beginPath(); c.ellipse(0, ye + 2, 40, hh, 0, 0, 7); c.fill();
    c.strokeStyle = '#c86a82'; for (let j = -3; j <= 3; j++) line(j * 3, ye - hh + 2, j * 10, ye + hh);
  }
  c.restore();
}

/* ---------- LA PECERA GRANDE: toda la página ---------- */
const BG = {
  px: 3, pellets: [], bubbles: [], ripples: [], groups: [], fish: [], night: 0, speed: 1, mouse: M,
  lim: { x0: 30, x1: 1000 }, view: { top: 0, h: 800 }, surfAt: x => surfY(x, tNow), floorAt: x => floorY(x),
};
// [especie, cantidad, sección donde vive] — en orden de aparición: primero lo que se ve al cargar
const BG_FISH = [['betta', 1, 'follow'], ['neon', 10, 'top'], ['cebra', 6, 'top'], ['arcoiris', 3, 'top'], ['guppy', 5, 'about'], ['platy', 3, 'about'],
  ['killi', 1, 'stack'], ['gourami', 1, 'experience'], ['arcoiris', 3, 'experience'], ['neon', 9, 'projects'], ['platy', 3, 'pearls'],
  ['guppy', 3, 'pearls'], ['goldfish', 1, 'contact'], ['cory', 5, 'floor'], ['pleco', 1, 'floor']];
let shrimps = [], snails = [], motes = [];
const bandOf = key => () => {
  const b = key === 'follow' ? { y0: BG.view.top + 90, y1: BG.view.top + BG.view.h - 90 } : SEA.bands[key] || SEA.bands.top;
  return { x0: BG.lim.x0, x1: BG.lim.x1, y0: Math.max(b.y0, SEA.surf + 40), y1: Math.max(Math.min(b.y1, SEA.floor0 - 40), SEA.surf + 80) };
};
function measureBands() {
  const B = SEA.bands, box = id => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect(); return [r.top + scrollY, r.bottom + scrollY]; };
  for (const id of ['about', 'stack', 'experience', 'projects', 'pearls', 'contact']) { const r = box(id); if (r) B[id] = { y0: r[0] + 40, y1: r[1] - 40 }; }
  const hero = box('top'); B.top = { y0: SEA.surf + 60, y1: hero ? hero[1] : SEA.vh };
  B.floor = { y0: SEA.floor0 - 60, y1: SEA.floor0 };
}
// agrega un pez cuando su sprite está listo; aparece con un fundido
function addFish(g, sp, spr, o) {
  const f = new Fish(g, sp, spr, o); f.alpha = 0;
  g.members.push(f); if (g.members.length === 1) g.pick();
  return f;
}
function populate() {
  const mob = SEA.vw < 700;
  for (const [k, n, where] of BG_FISH) {
    const g = new Group(BG, bandOf(where)), sp = FISH[k], cnt = mob ? Math.ceil(n * .6) : n;
    BG.groups.push(g);
    for (let i = 0; i < cnt; i++) later(() => BG.fish.push(addFish(g, sp, fishSprite(sp, Math.random() * sp.variants.length | 0), { follow: where === 'follow' })));
  }
  const ns = Math.max(3, Math.round(8 * SEA.vw / 1800));
  for (let i = 0; i < ns; i++) later(() => shrimps.push(new Shrimp(i)));
  for (let i = 0; i < 4; i++) snails.push(new Snail(i));
  for (let i = 0; i < (SEA.lite ? 35 : 70); i++) motes.push({ x: rnd(0, SEA.vw), y: rnd(0, SEA.vh), v: rnd(3, 9), ph: rnd(0, 6) });
}
const allFish = () => BG.fish;
function tocToc(x, y) {
  for (const f of allFish()) if (Math.abs(f.y - y) < SEA.vh) startle(f, x, y, false);
  for (const s of shrimps) if (s.state !== 'hop') s.hop(Math.sign(s.x - x) || 1);
  for (const s of snails) s.hide();
  clam.block = 2;
  if (!SEA.reduced) { seaC.classList.remove('shake'); void seaC.offsetWidth; seaC.classList.add('shake'); }
}

/* ---------- LAYOUT ---------- */
const seaWrap = document.getElementById('sea-wrap');
function layout() {
  const de = document.documentElement, vw = de.clientWidth, vh = seaWrap.clientHeight, px = vw < 700 ? 2 : 3;
  if (!vw || !vh) return;                                                   // pestaña oculta: se reintenta en el próximo resize
  const rebuild = vw !== SEA.vw || px !== SEA.px;
  SEA.px = BG.px = px; SEA.vw = vw; SEA.vh = vh; SEA.doc = de.scrollHeight;
  SEA.k = clamp(vw / 1700, .5, 1.1);
  const name = document.getElementById('name');
  if (name) { const r = name.getBoundingClientRect(); SEA.surf = Math.round(r.top + scrollY + r.height * .5); }   // la línea del agua cruza el nombre
  SEA.bedTop = Math.floor((SEA.doc - BED_H * SEA.k) / px) * px;
  SEA.floor0 = SEA.bedTop + (BED_H - 110) * SEA.k;
  AW = Math.ceil(vw / px); AH = Math.ceil(vh / px);
  if (seaC.width !== AW || seaC.height !== AH) {
    seaC.width = fgC.width = AW; seaC.height = fgC.height = AH;
    seaC.style.width = AW * px + 'px'; seaC.style.height = AH * px + 'px';
    if (gl) gl.viewport(0, 0, AW, AH);
  }
  DPR = Math.min(2, devicePixelRatio || 1);
  uiC.width = Math.round(vw * DPR); uiC.height = Math.round(vh * DPR);
  BG.lim = { x0: 30, x1: vw - 30 };
  measureBands();
  if (rebuild) buildBed();
  SEA.skyDirty = true;
  if (!SEA.ready) { SEA.ready = true; populate(); }
  if (SEA.onLayout) SEA.onLayout();
}
let layoutT = 0;
const relayout = () => { clearTimeout(layoutT); layoutT = setTimeout(layout, 100); };
addEventListener('resize', relayout);
new ResizeObserver(relayout).observe(document.body);
if (document.fonts) document.fonts.ready.then(layout);

/* ---------- MOUSE Y TECLADO ---------- */
const NOFEED = 'a,button,input,textarea,select,label,summary,.panel,.tank,.nav,.gauge,.ticker,[data-nofeed]';
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const x = e.clientX, y = e.clientY + scrollY, dt = Math.max(1e-3, tNow - M.t), speed = Math.hypot(x - M.x, y - M.y) / dt;
  Object.assign(M, { x, y, cx: e.clientX, cy: e.clientY, t: tNow, moveT: tNow });
  for (const s of snails) if (s.state !== 'hide' && Math.hypot(s.x - x, s.y - 12 - y) < 80) s.hide();
  if (speed < 50 || speed > 1e5 || e.target.closest('.tank')) return;
  for (const f of allFish()) if (f.state !== 'flee' && Math.hypot(f.x - x, f.y - y) < f.r * .8 + 18) startle(f, x, y);
  for (const s of shrimps) if (s.state !== 'hop' && Math.hypot(s.x - x, s.y - 12 - y) < 40) s.hop(Math.sign(s.x - x) || 1);
}, { passive: true });
addEventListener('scroll', () => { if (M.cy > -1e3) M.y = M.cy + scrollY; }, { passive: true });
addEventListener('click', e => {
  if (e.button !== 0 || e.target.closest(NOFEED)) return;
  const x = e.clientX, y = e.clientY + scrollY;
  const f = allFish().find(f => Math.hypot(f.x - x, f.y - y) < f.r * .8 + 14);
  if (f) { startle(f, x, y); return; }
  const sh = shrimps.find(s => Math.hypot(s.x - x, s.y - 12 - y) < 40);
  if (sh) { sh.hop(Math.sign(sh.x - x) || 1); return; }
  const sn = snails.find(s => Math.hypot(s.x - x, s.y - 12 - y) < 40);
  if (sn) { sn.hide(); return; }
  if (e.clientX < 24 || e.clientX > SEA.vw - 24) { tocToc(x, y); return; }   // toc toc en el vidrio
  dropFood(BG, x, y);
});
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]'))) return;
  const has = M.cy > -1e3, x = has ? M.x : SEA.vw / 2, y = has ? M.y : scrollY + SEA.vh * .45;
  if (e.key === 'f' || e.key === 'F') dropFood(BG, x, y);
  else if (e.key === 't' || e.key === 'T') tocToc(x, y);
});

/* ---------- DIBUJO ---------- */
let plantT = -1;
function drawFg(t) {
  const c = fx, px = SEA.px, top = SEA.oy * px, bot = top + SEA.vh, bedVis = SEA.bedTop < bot + 60;
  if (bedVis && t - plantT > (SEA.lite ? 1 / 12 : 1 / 30)) {                 // las plantas se mecen lento: no hace falta redibujarlas cada frame
    plantT = t;
    for (const [cv, layer] of [[plB, 0], [plF, 1]]) {
      const pc = bedCtx(cv); pc.lineCap = 'butt';
      for (const p of plants) if (p.layer === layer) drawPlant(pc, p, t);
      if (layer === 0) drawClam(pc);
    }
    crisp(plB); crisp(plF);
  }
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, AW, AH); c.imageSmoothingEnabled = false;
  c.setTransform(1 / px, 0, 0, 1 / px, 0, -SEA.oy);
  const blit = cv => c.drawImage(cv, 0, SEA.bedTop, cv.width * px, cv.height * px);
  c.fillStyle = 'rgba(220,240,235,.45)';
  for (const s of motes) if (s.y > SEA.surf) c.fillRect(snap(s.x), snap(s.y), px, px);
  if (bedVis) { blit(decA); blit(plB); }
  if (bedVis) { for (const s of snails) s.draw(c); for (const s of shrimps) s.draw(c, t); }
  const fish = allFish().filter(f => f.y > top - 80 && f.y < bot + 80).sort((a, b) => a.len - b.len);
  for (const f of fish) f.draw(c);
  drawWater(c, BG, t, top - 20, bot + 20);
  if (bedVis) { blit(decF); blit(plF); }
}
function updateMotes(dt, t) {
  const top = SEA.oy * SEA.px, h = SEA.vh + 40;
  for (const s of motes) {
    s.y += s.v * dt; s.x += Math.sin(t * .5 + s.ph) * 6 * dt;
    if (s.y < top - 20) s.y += h; else if (s.y > top + SEA.vh + 20) s.y -= h;   // se reciclan alrededor de la vista
  }
}
const FONT = '700 12px "Space Mono", ui-monospace, monospace', EMO = '700 18px "Space Mono", ui-monospace, monospace';
function emote(c, f) {
  c.globalAlpha = Math.min(1, f.emoteT * 2) * f.alpha; c.font = EMO;
  c.fillStyle = f.emote === '♥' ? '#ff7aa8' : f.emote === '!' ? '#ffe14a' : f.emote === 'z' ? '#9fc4ff' : '#fff';
  c.fillText(f.emote, f.x + f.dir * f.r * .5, f.y - f.ph * .35 - 6 - (f.emote === 'z' ? (2 - f.emoteT) * 8 : 0));
  c.globalAlpha = 1;
}
function tag(c, text, x, y, color = '#fff', a = 1, w = 0) {
  c.font = FONT; w = w || c.measureText(text).width + 12;
  c.globalAlpha = a; c.fillStyle = 'rgba(3,14,16,.7)'; c.fillRect(Math.round(x - w / 2), Math.round(y - 13), Math.round(w), 18);
  c.fillStyle = color; c.fillText(text, Math.round(x), Math.round(y)); c.globalAlpha = 1;
}
let uiDrawn = true;
function drawUI(t) {
  const c = ux, top = SEA.oy * SEA.px, emo = [];
  let hov = null, hd = 130;
  for (const f of BG.fish) {
    if (f.y < top - 60 || f.y > top + SEA.vh + 60) continue;
    if (f.emoteT > 0) emo.push(f);
    const d = Math.hypot(f.x - M.x, f.y - M.y); if (d < hd) { hd = d; hov = f; }
  }
  if (t - M.moveT > 4) hov = null;
  if (!emo.length && !hov && !uiDrawn) return;                              // nada que dibujar: ni siquiera se limpia
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, uiC.width, uiC.height);
  uiDrawn = emo.length > 0 || !!hov; if (!uiDrawn) return;
  c.setTransform(DPR, 0, 0, DPR, 0, -top * DPR); c.textAlign = 'center';
  for (const f of emo) emote(c, f);
  if (hov) tag(c, SEA.lang === 'en' ? hov.sp.en : hov.sp.name, hov.x, hov.y - hov.ph * .42 - 8);
}

/* ---------- PECERAS CHICAS (stack y demo de proyecto) ---------- */
const TANKS = [];
class Tank {
  constructor(el, fill, o = {}) {
    this.el = el; this.cv = el.querySelector('.tk'); this.c = this.cv.getContext('2d'); this.uc = el.querySelector('.tku'); this.u = this.uc && this.uc.getContext('2d');
    Object.assign(this, { px: 2, pellets: [], bubbles: [], ripples: [], groups: [], night: 0, speed: 1, fill, labels: !!o.labels, filter: 'all', hot: null, visible: false, w: 0, h: 0, bubT: 0, weeds: [] });
    this.mouse = { x: -1e4, y: -1e4, moveT: -99, t: 0 }; this.lim = { x0: 0, x1: 0 }; this.view = { top: -1e4, h: 3e4 };
    this.surfAt = x => 14 + 1.5 * Math.sin(x * .035 + tNow * 1.4) + Math.sin(x * .09 - tNow * 2);
    this.floorAt = x => this.h - 18 + 2 * Math.sin(x * .045);
    this.gravel = mkCanvas();
    new ResizeObserver(() => this.resize()).observe(el);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(el);
    const local = e => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const [x, y] = local(e), m = this.mouse, dt = Math.max(1e-3, tNow - m.t), speed = Math.hypot(x - m.x, y - m.y) / dt;
      Object.assign(m, { x, y, t: tNow, moveT: tNow });
      if (speed < 50 || speed > 1e5) return;
      for (const g of this.groups) for (const f of g.members) if (f.state !== 'flee' && Math.hypot(f.x - x, f.y - y) < f.r * .8 + 14) startle(f, x, y);
    });
    el.addEventListener('pointerleave', () => { this.mouse.x = this.mouse.y = -1e4; });
    el.addEventListener('click', e => {
      const [x, y] = local(e);
      const f = this.groups.flatMap(g => g.members).find(f => Math.hypot(f.x - x, f.y - y) < f.r * .8 + 12);
      if (f) startle(f, x, y); else dropFood(this, x, y);
    });
    TANKS.push(this);
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    this.w = r.width; this.h = r.height;
    this.cv.width = Math.ceil(this.w / this.px); this.cv.height = Math.ceil(this.h / this.px);
    if (this.u) { this.uc.width = Math.round(this.w * DPR); this.uc.height = Math.round(this.h * DPR); }
    this.lim = { x0: 22, x1: this.w - 22 };
    const g = this.gravel, gc = g.getContext('2d'), R = seeded(3), P = this.px;      // grava y plantas
    g.width = this.cv.width; g.height = 14;
    for (let x = 0; x < g.width; x++) { const top = Math.round(6 + Math.sin(x * this.px * .045) * 1); for (let y = top; y < 14; y++) { gc.fillStyle = PEB[R() * 6 | 0]; gc.fillRect(x, y, 1, 1); } }
    this.weeds = []; for (let x = 18; x < this.w - 10; x += 26 + R() * 70) this.weeds.push({ x, h: (.35 + R() * .45) * this.h, c: ['#3d8a33', '#58a83e', '#6fbf4c'][R() * 3 | 0], ph: R() * 6 });
    if (!this.groups.length) this.fill(this);
  }
  fishAt(x, y) { return this.groups.flatMap(g => g.members).find(f => Math.hypot(f.x - x, f.y - y) < f.r * .8 + 12); }
  frame(dt, t) {
    if (!this.w) return;
    this.night = SEA.night; this.speed = .9;
    updateWater(this, dt, t);
    if ((this.bubT -= dt) < 0) { this.bubT = rnd(.15, .45); this.bubbles.push({ x: this.w - 30 + rnd(-3, 3), y: this.h - 22, r: Math.random() < .5 ? 0 : 1, v: rnd(45, 85), ph: rnd(0, 6) }); }
    for (const g of this.groups) g.update(dt, t);
    const c = this.c, px = this.px, day = 1 - SEA.night * .8;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height); c.imageSmoothingEnabled = false;
    c.setTransform(1 / px, 0, 0, 1 / px, 0, 0);
    c.globalCompositeOperation = 'lighter';                                   // rayos de luz desde la superficie
    for (let i = 0; i < 4; i++) {
      const x = this.w * (.12 + i * .25) + Math.sin(t * .3 + i) * 24, a = (.05 + .03 * Math.sin(t * .5 + i * 2)) * day;
      c.fillStyle = `rgba(255,248,220,${a})`; c.beginPath(); c.moveTo(x - 16, 0); c.lineTo(x + 16, 0); c.lineTo(x + 90, this.h); c.lineTo(x + 10, this.h); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    for (const w of this.weeds) {                                             // vallisneria en columnas de pixel
      c.fillStyle = w.c; const base = this.h - 14;
      for (let y = 0; y < w.h; y += px) { const k = y / w.h, s = Math.sin(t * .8 + w.ph + k * 2) * k * k * 14; c.fillRect(Math.round((w.x + s) / px) * px, base - y, px * 2, px); }
    }
    const fish = this.groups.flatMap(g => g.members).sort((a, b) => a.len - b.len);
    for (const f of fish) f.draw(c);
    drawWater(c, this, t);
    c.drawImage(this.gravel, 0, this.h - 14 * px + 2 * px, this.gravel.width * px, 14 * px);
    c.fillStyle = 'rgba(225,250,255,.55)';
    for (let x = 0; x < this.w; x += px) c.fillRect(x, Math.round(this.surfAt(x) / px) * px, px, px);
    if (!this.u) return;
    const u = this.u, m = this.mouse;
    u.setTransform(1, 0, 0, 1, 0, 0); u.clearRect(0, 0, this.uc.width, this.uc.height); u.setTransform(DPR, 0, 0, DPR, 0, 0); u.textAlign = 'center';
    let hov = null, hd = 70; for (const f of fish) { const d = Math.hypot(f.x - m.x, f.y - m.y); if (d < hd) { hd = d; hov = f; } }
    for (const f of fish) if (f.emoteT > 0) emote(u, f);
    // etiquetas sin encimarse: primero la señalada, después las más grandes
    const isHot = f => f === hov || f.label === this.hot, boxes = [];
    u.font = FONT;
    for (const f of fish.filter(f => f.label).sort((a, b) => isHot(b) - isHot(a) || b.len - a.len)) {
      const hot = isHot(f); if (!hot && this.filter !== 'all' && f.cat !== this.filter) continue;
      const y = f.y - f.ph * .42 - 4, w = f.lw || (f.lw = u.measureText(f.label).width + 12), bx = [f.x - w / 2, y - 13, w, 18];
      if (!hot && boxes.some(b => bx[0] < b[0] + b[2] + 2 && b[0] < bx[0] + bx[2] + 2 && bx[1] < b[1] + b[3] && b[1] < bx[1] + bx[3])) continue;
      boxes.push(bx); tag(u, f.label, f.x, y, hot ? '#ffd25a' : '#fff', (hot ? 1 : this.filter === 'all' ? .8 : 1) * Math.min(1, f.alpha * 1.5), w);
    }
  }
}

/* ---------- LOOP ---------- */
layout();
let last = performance.now(), skyT = -99, slow = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!SEA.ready) { last = now; return; }
  if (now - last < 1000 / SEA.fps - 3) return;                              // móvil: 30 fps sobran para una pecera
  const t0 = performance.now(), dt = Math.min((now - last) / 1000, .066) * (SEA.reduced ? .5 : 1); last = now;
  const t = tNow += dt;
  SEA.scroll = scrollY; SEA.oy = Math.round(scrollY / SEA.px); SEA.budget3d = SEA.lite ? 1 : 2;
  const h = hourNow(); SEA.light = lightAt(h); SEA.night = SEA.light.night;
  BG.view.top = SEA.oy * SEA.px; BG.view.h = SEA.vh; BG.night = SEA.night; BG.speed = 1;
  if (BG.view.top < SEA.surf + 40 && (SEA.skyDirty || t - skyT > (SEA.lite ? 4 : 2))) { drawSky(h, t); skyT = t; SEA.skyDirty = false; if (gl) upload(0, texSky, skyC, false); }
  updateWater(BG, dt, t); updateMotes(dt, t);
  if (BG.view.top + SEA.vh > SEA.surf + 200 && Math.random() < dt * (SEA.lite ? 2 : 4)) {   // cortina de burbujas en los bordes, como un aireador
    const x = Math.random() < .5 ? SEA.vw * .05 : SEA.vw * .95;
    BG.bubbles.push({ x: x + rnd(-5, 5), y: Math.min(BG.view.top + SEA.vh + 10, SEA.floor0), r: rnd(0, 2) | 0, v: rnd(70, 120), ph: rnd(0, 6) });
  }
  for (const g of BG.groups) g.update(dt, t);
  if (SEA.bedTop < BG.view.top + SEA.vh + 600) { updateClam(dt, t); for (const s of shrimps) s.update(dt); for (const s of snails) s.update(dt); }
  drawFg(t);
  if (gl) { upload(1, texFg, fgC, true); renderGL(t); } else render2D();
  drawUI(t);
  for (const tk of TANKS) if (tk.visible) tk.frame(dt, t);
  if (SEA.onTick) SEA.onTick(t);
  if (!SEA.lite) { slow = performance.now() - t0 > 12 ? slow + 1 : Math.max(0, slow - 1); if (slow > 40) goLite(); }   // si el equipo no da abasto, baja solo a modo liviano
}
requestAnimationFrame(frame);
