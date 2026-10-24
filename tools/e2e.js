'use strict';
// Uji browser sungguhan (Chromium via Playwright) terhadap server Next.js.
// Memainkan satu permainan penuh sampai layar akhir di desktop dan HP (butuh sekitar 1 sampai 3 menit).
// Pakai: npm run build && npm start (terminal 1), lalu BASE_URL=http://localhost:3000 npm run test:e2e
// Butuh: npm i -D playwright && npx playwright install chromium
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', 'e2e-shots');
const MAX_PLAY_MS = 360000;
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
const check = (ok, msg) => { if (!ok) { failures.push(msg); console.error('GAGAL: ' + msg); } else console.log('ok: ' + msg); };

const COUNT_AUDIO = () => {
  window.__ac = 0;
  const A = window.AudioContext;
  if (A) window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ac++; } };
};

async function newPage(browser, viewport, isMobile, extra) {
  const ctx = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: 2, ...extra });
  await ctx.addInitScript(COUNT_AUDIO);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  return { ctx, page, errors };
}

async function run(browser, name, viewport, isMobile) {
  const { ctx, page, errors } = await newPage(browser, viewport, isMobile);
  const res = await page.goto(BASE_URL + '/', { waitUntil: 'load' });
  check(res.status() === 200, `${name}: GET / status 200`);
  check(new URL(page.url()).pathname === '/', `${name}: URL tetap "/"`);
  check((await page.title()) === 'Bom Air Rimba', `${name}: judul halaman`);
  check((await page.evaluate(() => window.__ac)) === 0, `${name}: tidak ada AudioContext sebelum klik pertama`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${name}: tanpa scroll horizontal (selisih ${overflow}px)`);

  if (isMobile) {
    const lay = await page.evaluate(() => {
      const top = id => document.querySelector(id).getBoundingClientRect().top;
      return { stage: top('#stage'), score: top('.card.score'), tank: top('#tank'), vh: innerHeight, sh: document.documentElement.scrollHeight };
    });
    check(lay.stage < lay.score, `${name}: peta berada di atas kartu statistik`);
    check(lay.sh <= lay.vh, `${name}: seluruh HUD dan peta muat tanpa menggulir (tinggi ${lay.sh} dari ${lay.vh})`);
  }

  // Layar awal: tombol Mulai terlihat penuh di dalam viewport.
  const reach = await page.evaluate(() => {
    const b = document.querySelector('#goBtn').getBoundingClientRect();
    return b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth;
  });
  check(reach, `${name}: tombol Mulai terlihat penuh di layar`);
  await page.screenshot({ path: path.join(OUT, `${name}-1-awal.png`) });

  // Tingkat: pilih Sulit lalu kembali ke Normal, pilihan tersimpan.
  await page.click('#lvl2');
  check((await page.getAttribute('#lvl2', 'aria-pressed')) === 'true', `${name}: tingkat Sulit terpilih`);
  await page.reload({ waitUntil: 'load' });
  check((await page.getAttribute('#lvl2', 'aria-pressed')) === 'true', `${name}: pilihan tingkat bertahan setelah muat ulang`);
  await page.click('#lvl1');

  await page.click('#goBtn');
  check((await page.evaluate(() => window.__ac)) === 1, `${name}: AudioContext dibuat satu kali setelah klik Mulai`);
  const canvas = await page.$('#map');
  const box = await canvas.boundingBox();
  check(box.width <= viewport.width - 32 + 1, `${name}: lebar peta ${Math.round(box.width)}px muat dengan gutter 16px`);

  // Bom besar lewat tombol 2.
  await page.keyboard.press('2');
  check((await page.getAttribute('#bomb1', 'aria-pressed')) === 'true', `${name}: tombol 2 memilih bom besar`);
  await page.keyboard.press('1');
  check((await page.getAttribute('#bomb0', 'aria-pressed')) === 'true', `${name}: tombol 1 memilih bom biasa`);

  await page.keyboard.press('p');
  check(await page.isVisible('#pauseOv'), `${name}: tombol P membuka jeda`);
  await page.keyboard.press('Escape');
  check(!(await page.isVisible('#pauseOv')), `${name}: Esc melanjutkan`);

  // Mainkan sampai layar akhir, bergantian bom biasa dan besar.
  const t0 = Date.now(); let n = 0, shot = false;
  while (!(await page.isVisible('#endOv')) && Date.now() - t0 < MAX_PLAY_MS) {
    await page.keyboard.press(n % 3 === 2 ? '2' : '1');
    await page.mouse.click(box.x + box.width * (0.05 + 0.8 * Math.random()), box.y + box.height * (0.1 + 0.8 * Math.random()));
    n++;
    if (!shot && Date.now() - t0 > 8000) { await page.screenshot({ path: path.join(OUT, `${name}-2-main.png`) }); shot = true; }
    await page.waitForTimeout(600);
  }
  const ended = await page.isVisible('#endOv');
  check(ended, `${name}: layar akhir muncul (${Math.round((Date.now() - t0) / 1000)} dtk, ${n} klik)`);
  if (ended) {
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${name}-3-akhir.png`) });
    const stats = await page.textContent('#endStats');
    check(/Tingkat Normal .* Bom terpakai \d+ .* Durasi \d\d:\d\d .* Protes tetangga \d+x/.test(stats), `${name}: statistik akhir (${stats})`);
    check(/% hutan masih utuh$/.test(await page.textContent('#endPct')), `${name}: persen hutan utuh`);
    check((await page.$$eval('#stars svg', e => e.length)) === 3, `${name}: tiga bintang di layar akhir`);
    check(/Rekor/.test(await page.textContent('#endBest')), `${name}: rekor tampil`);
    const best = await page.evaluate(() => localStorage.getItem('bom-air-rimba-best'));
    check(best !== null && +best >= 0, `${name}: rekor tersimpan di localStorage (${best})`);
    check(await page.isVisible('#againBtn'), `${name}: tombol Main lagi terlihat`);
  }
  check((await page.evaluate(() => window.__ac)) === 1, `${name}: AudioContext tetap satu`);
  check(errors.length === 0, `${name}: tanpa error konsol${errors.length ? ' | ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

async function reducedMotion(browser) {
  const dur = async extra => {
    const { ctx, page } = await newPage(browser, { width: 1200, height: 800 }, false, extra);
    await page.goto(BASE_URL + '/', { waitUntil: 'load' });
    const v = await page.evaluate(() => getComputedStyle(document.querySelector('#toast')).transitionDuration);
    await ctx.close();
    return v;
  };
  const normal = await dur({}), reduced = await dur({ reducedMotion: 'reduce' });
  check(normal !== '0s', `gerak normal: transisi toast aktif (${normal})`);
  check(reduced === '0s', `prefers-reduced-motion: transisi toast mati (${reduced})`);
}

(async () => {
  const browser = await chromium.launch();
  await Promise.all([
    run(browser, 'desktop', { width: 1200, height: 800 }, false),
    run(browser, 'hp', { width: 400, height: 800 }, true),
  ]);
  await reducedMotion(browser);
  await browser.close();
  if (failures.length) { console.error(`\n${failures.length} pemeriksaan gagal. Tangkapan layar: ${OUT}`); process.exit(1); }
  console.log(`\nSemua lulus. Tangkapan layar: ${OUT}`);
})();
