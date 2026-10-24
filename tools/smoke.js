'use strict';
// Uji asap headless: tiruan DOM + canvas, jalankan skrip game sampai layar akhir.
// Gagal bila arc/ellipse menerima radius negatif atau NaN, ada exception, atau game tidak selesai.
const vm = require('vm');
const { readHtml, extractScript } = require('./lib');

const script = extractScript(readHtml());
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean);
const RUNS_PER_WIDTH = 3;
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

function runOnce(width, seed) {
  const errors = [];
  const rnd = mulberry32(seed);
  const win = { innerWidth: width, innerHeight: width < 640 ? 800 : 800, devicePixelRatio: 2, scrollY: 0, _l: {} };
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
  };

  // Timer palsu supaya endTimer (900 ms) bisa dimajukan tanpa menunggu.
  let now = 0, timerId = 0; const timers = new Map();
  const setTimeoutF = (fn, ms) => { timers.set(++timerId, { at: now + (ms || 0), fn }); return timerId; };
  const clearTimeoutF = id => timers.delete(id);
  const advanceTimers = () => { for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); } };

  let rafCb = null;
  const store = {};
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
  if (start.hidden) errors.push('layar awal tidak tampil saat boot');
  // Layar awal harus punya aturan dan tombol mulai.
  goBtn.dispatch('click');
  if (!start.hidden) errors.push('layar awal tidak tertutup setelah klik Mulai');

  const dt = 1000 / 60;
  let ts = 0, frames = 0, clicks = 0;
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
  return { errors, frames, clicks, score: getEl('#endScore').textContent, pct: getEl('#endPct').textContent, grid: map.width && `${map.width}x${map.height}` };
}

const widths = WIDTHS.length ? WIDTHS : [1200, 400];
let failed = false;
for (const w of widths) {
  for (let r = 0; r < RUNS_PER_WIDTH; r++) {
    const res = runOnce(w, 1000 + r * 7919 + w);
    const tag = `lebar ${w} run ${r + 1}`;
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
