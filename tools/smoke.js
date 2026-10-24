'use strict';
// Uji asap headless: tiruan DOM + canvas, jalankan skrip game sampai layar akhir.
// Gagal bila arc/ellipse menerima radius negatif atau NaN, ada exception, atau game tidak selesai.
const vm = require('vm');
const { readHtml, extractScript } = require('./lib');

const script = extractScript(readHtml());
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean);
const EXPECT = {
  0: { p: 0.8, wind: 0.8, sparks: [6, 14, 22, 31] },
  1: { p: 1, wind: 1, sparks: [6, 14, 22, 31, 41, 53] },
  2: { p: 1.2, wind: 1.15, sparks: [6, 12, 18, 25, 32, 40, 47, 53] },
};
// Tiap lebar: satu permainan per tingkat (bom besar dipakai di tingkat ganjil) dan satu dengan suara mati.
const VARIANTS = [
  { level: 0, big: false, sound: true }, { level: 1, big: true, sound: true },
  { level: 2, big: false, sound: true }, { level: 1, big: true, sound: false },
];
const MAX_SIM_SECONDS = 900;

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function makeCtx(errors) {
  const bad = (name, v) => { if (!(v >= 0) || !Number.isFinite(v)) errors.push(`${name} menerima radius tidak valid: ${v}`); };
  const calls = { arc: 0, ellipse: 0 };
  const target = {
    arc(x, y, r) { calls.arc++; bad('arc', r); },
    ellipse(x, y, rx, ry) { calls.ellipse++; bad('ellipse rx', rx); bad('ellipse ry', ry); },
    createLinearGradient() { return { addColorStop() {} }; },
    measureText() { return { width: 10 }; },
  };
  const ctx = new Proxy(target, {
    get(t, p) { if (p === '__calls') return calls; return p in t ? t[p] : (t[p] = () => {}); },
    set(t, p, v) { t[p] = v; return true; },
  });
  return ctx;
}

function makeEl(id, win, errors) {
  const listeners = {};
  const cls = new Set();
  const el = {
    id, hidden: false, textContent: '', innerHTML: '', style: {}, className: '', offsetWidth: 0,
    width: 300, height: 150, children: [],
    attrs: {},
    classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    dispatch(t, ev) { for (const fn of listeners[t] || []) fn(ev || {}); },
    getContext() { return (this._ctx = this._ctx || makeCtx(errors)); },
    getBoundingClientRect() {
      if (id === '#map') return { left: 0, top: 0, width: parseFloat(this.style.width) || this.width, height: parseFloat(this.style.height) || this.height };
      return { left: 0, top: 0, width: win.innerWidth - 32, height: 100 };
    },
    get clientWidth() { return win.innerWidth - 32; },
  };
  return el;
}

function makeAudio(counter) {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const node = kind => { counter.nodes[kind] = (counter.nodes[kind] || 0) + 1; return { connect: x => x, start() {}, stop() {}, gain: param(), frequency: param(), type: '', buffer: null }; };
  return class AC {
    constructor() { counter.created++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createGain() { return node('gain'); } createOscillator() { return node('osc'); }
    createBufferSource() { return node('src'); } createBiquadFilter() { return node('filter'); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    resume() {}
  };
}

function win_key(k) { currentDoc.dispatch('keydown', { key: k }); }
let currentDoc = null;

function runOnce(width, seed, v) {
  const errors = [];
  const rnd = mulberry32(seed);
  const audio = { created: 0, nodes: {} };
  const win = { innerWidth: width, innerHeight: 800, devicePixelRatio: 2, scrollY: 0, _l: {}, __BAR_PROBE__: true };
  win.AudioContext = makeAudio(audio);
  win.addEventListener = (t, fn) => { (win._l[t] = win._l[t] || []).push(fn); };

  const els = {};
  const getEl = sel => els[sel] || (els[sel] = makeEl(sel, win, errors));
  const docListeners = {};
  const document = {
    hidden: false,
    fonts: null,
    querySelector: getEl,
    createElement() { const c = makeEl('#offscreen', win, errors); return c; },
    addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
    dispatch(t, ev) { for (const fn of docListeners[t] || []) fn(ev || {}); },
  };

  // Timer palsu supaya endTimer (900 ms) bisa dimajukan tanpa menunggu.
  let now = 0, timerId = 0; const timers = new Map();
  const setTimeoutF = (fn, ms) => { timers.set(++timerId, { at: now + (ms || 0), fn }); return timerId; };
  const clearTimeoutF = id => timers.delete(id);
  const advanceTimers = () => { for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); } };

  let rafCb = null;
  const store = {};
  if (!v.sound) store['bom-air-rimba-sound'] = '0';
  currentDoc = document;
  const sandbox = {
    window: win, document, console,
    Math: Object.assign(Object.create(Math), { random: rnd }),
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    requestAnimationFrame: cb => { rafCb = cb; },
    setTimeout: setTimeoutF, clearTimeout: clearTimeoutF,
    Uint8Array, Float32Array, Number, String, Date, Infinity, isFinite,
  };
  sandbox.Math.random = rnd;
  vm.createContext(sandbox);

  try { vm.runInContext(script, sandbox, { filename: 'game.js' }); }
  catch (e) { errors.push('exception saat boot: ' + e.stack); return { errors }; }

  const map = getEl('#map'), start = getEl('#startOv'), end = getEl('#endOv'), goBtn = getEl('#goBtn');
  const probe = win.__BAR_PROBE__;
  if (typeof probe !== 'object') { errors.push('pengait uji tidak terpasang'); return { errors }; }
  if (start.hidden) errors.push('layar awal tidak tampil saat boot');
  // Suara tidak boleh dibuat sebelum ada gestur pengguna.
  for (let i = 0; i < 30; i++) { now += 16; if (rafCb) { const cb = rafCb; rafCb = null; cb(now); } }
  if (audio.created !== 0) errors.push('AudioContext dibuat sebelum gestur pengguna');

  // Tingkat kesulitan lewat UI: Normal harus sama persis dengan brief.
  getEl('#lvl0').dispatch('click'); getEl('#lvl2').dispatch('click');
  getEl('#lvl' + v.level).dispatch('click');
  const prm = probe.params(), ex = EXPECT[v.level];
  if (prm.p !== ex.p || prm.wind !== ex.wind || JSON.stringify(prm.sparks) !== JSON.stringify(ex.sparks)) errors.push('parameter tingkat ' + v.level + ' salah: ' + JSON.stringify(prm));
  if (prm.baseP !== 0.17) errors.push('BASE_P berubah: ' + prm.baseP);
  if (getEl('#lvl' + v.level).attrs['aria-pressed'] !== 'true') errors.push('tombol tingkat tidak ditandai');
  if (prm.windStr > 1 || prm.windStr <= 0) errors.push('kekuatan angin di luar batas: ' + prm.windStr);

  // Radius tiap jenis bom: petak yang dibasahi harus sama dengan hitungan geometri independen.
  const g = probe.grid(), flam = i => g.type[i] >= 2;
  const cells = [];
  for (let y = 0; y < g.rows; y++) for (let x = 4; x < g.cols - 2 - 4; x++) if (flam(y * g.cols + x)) cells.push([x, y]);
  const A = cells[0], B = cells.find(c => Math.hypot(c[0] - A[0], c[1] - A[1]) >= 11);
  const expected = ([cx, cy], R) => { let n = 0; for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (flam(y * g.cols + x) && Math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - (cy + 0.5)) <= R) n++; return n; };
  const wet = () => { let n = 0; for (let i = 0; i < g.st.length; i++) if (g.st[i] === 3) n++; return n; };
  if (A && B) {
    let w0 = wet(); probe.impactAt(A[0], A[1], 0); const d0 = wet() - w0;
    w0 = wet(); probe.impactAt(B[0], B[1], 1); const d1 = wet() - w0;
    if (d0 !== expected(A, 2.5)) errors.push(`bom biasa membasahi ${d0} petak, seharusnya ${expected(A, 2.5)}`);
    if (d1 !== expected(B, 3.6)) errors.push(`bom besar membasahi ${d1} petak, seharusnya ${expected(B, 3.6)}`);
    if (expected(B, 3.6) <= 0 || expected(A, 2.5) <= 0) errors.push('uji radius tidak bermakna (0 petak)');
  } else errors.push('tidak ada dua titik uji untuk bom');
  // newGame ulang agar permainan mulai bersih: klik tingkat yang sama saat state ready.
  getEl('#lvl' + v.level).dispatch('click');

  // Tombol 2 memilih bom besar, 1 bom biasa.
  win_key('2'); if (probe.bombKind() !== 1) errors.push('tombol 2 tidak memilih bom besar');
  win_key('1'); if (probe.bombKind() !== 0) errors.push('tombol 1 tidak memilih bom biasa');
  if (v.big) win_key('2');

  goBtn.dispatch('click');
  if (v.sound && audio.created !== 1) errors.push('AudioContext harus dibuat tepat sekali setelah klik, dibuat: ' + audio.created);
  if (!v.sound && audio.created !== 0) errors.push('AudioContext dibuat padahal suara mati');
  if (!start.hidden) errors.push('layar awal tidak tertutup setelah klik Mulai');

  const dt = 1000 / 60;
  let ts = now, frames = 0, clicks = 0; // stempel waktu rAF harus terus naik
  const maxFrames = Math.ceil(MAX_SIM_SECONDS * 60);
  try {
    while (frames < maxFrames && end.hidden) {
      ts += dt; now = ts; frames++;
      if (frames % 40 === 0) {
        clicks++;
        map.dispatch('pointerdown', { clientX: rnd() * map.width, clientY: rnd() * map.height, pointerType: rnd() < 0.5 ? 'mouse' : 'touch', preventDefault() {} });
      }
      if (frames % 90 === 0) map.dispatch('pointermove', { clientX: rnd() * map.width, clientY: rnd() * map.height });
      const cb = rafCb; rafCb = null;
      if (!cb) { errors.push('requestAnimationFrame tidak dijadwalkan ulang'); break; }
      cb(ts);
      advanceTimers();
    }
  } catch (e) { errors.push('exception di frame ' + frames + ': ' + e.stack); }

  if (end.hidden) errors.push(`layar akhir tidak muncul setelah ${frames} frame`);
  else {
    const text = {
      score: getEl('#endScore').textContent, pct: getEl('#endPct').textContent,
      stats: getEl('#endStats').textContent, best: getEl('#endBest').textContent,
    };
    if (!/^\d/.test(text.score)) errors.push('skor akhir kosong: ' + text.score);
    if (!/% hutan masih utuh$/.test(text.pct)) errors.push('persen akhir salah: ' + text.pct);
    if (!/Bom terpakai \d+ .* Durasi \d\d:\d\d .* Protes tetangga \d+x/.test(text.stats)) errors.push('statistik akhir salah: ' + text.stats);
    if (!/Rekor/.test(text.best)) errors.push('rekor tidak tampil: ' + text.best);
    if (getEl('#stars').innerHTML.split('<svg').length - 1 !== 3) errors.push('harus ada 3 bintang');
  }
  const cvs = map.getContext();
  if (cvs.__calls.arc + cvs.__calls.ellipse === 0) errors.push('canvas tidak pernah menggambar');
  if (v.sound && !((audio.nodes.osc || 0) > 0 && (audio.nodes.src || 0) > 0)) errors.push('tidak ada suara yang dibunyikan selama permainan: ' + JSON.stringify(audio.nodes));
  if (!v.sound && Object.keys(audio.nodes).length) errors.push('ada node audio padahal suara mati');
  return { errors, frames, clicks, score: getEl('#endScore').textContent, pct: getEl('#endPct').textContent, grid: map.width && `${map.width}x${map.height}` };
}

const widths = WIDTHS.length ? WIDTHS : [1200, 400];
let failed = false;
for (const w of widths) {
  for (let r = 0; r < VARIANTS.length; r++) {
    const v = VARIANTS[r];
    const res = runOnce(w, 1000 + r * 7919 + w, v);
    const tag = `lebar ${w} tingkat ${v.level}${v.big ? ' +bom besar' : ''}${v.sound ? '' : ' tanpa suara'}`;
    if (res.errors.length) {
      failed = true;
      console.error(`GAGAL ${tag}`);
      for (const e of [...new Set(res.errors)].slice(0, 6)) console.error('  - ' + e);
    } else {
      console.log(`OK ${tag}: ${res.frames} frame, ${res.clicks} klik, ${res.score} ha selamat (${res.pct})`);
    }
  }
}
process.exit(failed ? 1 : 0);
