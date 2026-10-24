'use strict';
// Uji browser sungguhan (Chromium via Playwright) terhadap server Next.js.
// Pakai: npm run build && npm start (terminal 1), lalu BASE_URL=http://localhost:3000 npm run test:e2e
// Butuh: npm i -D playwright && npx playwright install chromium
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT = process.env.SHOT_DIR || path.join(__dirname, '..', 'e2e-shots');
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
const check = (ok, msg) => { if (!ok) { failures.push(msg); console.error('GAGAL: ' + msg); } else console.log('ok: ' + msg); };

async function run(browser, name, viewport, isMobile) {
  const ctx = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

  const res = await page.goto(BASE_URL + '/', { waitUntil: 'load' });
  check(res.status() === 200, `${name}: GET / status 200`);
  check(new URL(page.url()).pathname === '/', `${name}: URL tetap "/"`);
  check((await page.title()) === 'Bom Air Rimba', `${name}: judul halaman`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${name}: tanpa scroll horizontal (selisih ${overflow}px)`);
  await page.screenshot({ path: path.join(OUT, `${name}-1-awal.png`) });

  // Tombol Mulai harus terjangkau pemain: terlihat penuh di dalam peta, atau overlay bisa digulir.
  const reach = await page.evaluate(() => {
    const b = document.querySelector('#goBtn').getBoundingClientRect();
    const o = document.querySelector('#startOv'), r = o.getBoundingClientRect();
    return { inside: b.top >= r.top && b.bottom <= r.bottom, scroll: /auto|scroll/.test(getComputedStyle(o).overflowY), over: o.scrollHeight > o.clientHeight };
  });
  check(reach.inside || (reach.scroll && reach.over), `${name}: tombol Mulai terjangkau (terlihat=${reach.inside}, bisa digulir=${reach.scroll && reach.over})`);
  await page.click('#goBtn');
  const canvas = await page.$('#map');
  const box = await canvas.boundingBox();
  check(box.width <= viewport.width - 32 + 1, `${name}: lebar peta ${Math.round(box.width)}px muat dengan gutter 16px`);

  for (let i = 0; i < 6; i++) {
    await page.mouse.click(box.x + box.width * (0.15 + 0.14 * i), box.y + box.height * (0.3 + 0.08 * (i % 4)));
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: path.join(OUT, `${name}-2-main.png`) });

  const windText = await page.textContent('#windName');
  check(/Timur|Tenggara|Selatan|Barat|Utara/.test(windText), `${name}: HUD angin terisi (${windText})`);
  const tankDrops = await page.$$eval('[id^="dr"]', els => els.length);
  check(tankDrops === 3, `${name}: tangki 3 tetes`);

  await page.keyboard.press('p');
  check(await page.isVisible('#pauseOv'), `${name}: tombol P membuka jeda`);
  await page.keyboard.press('Escape');
  check(!(await page.isVisible('#pauseOv')), `${name}: Esc melanjutkan`);

  check(errors.length === 0, `${name}: tanpa error konsol${errors.length ? ' | ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  await run(browser, 'desktop', { width: 1200, height: 800 }, false);
  await run(browser, 'hp', { width: 400, height: 800 }, true);
  await browser.close();
  if (failures.length) { console.error(`\n${failures.length} pemeriksaan gagal. Tangkapan layar: ${OUT}`); process.exit(1); }
  console.log(`\nSemua lulus. Tangkapan layar: ${OUT}`);
})();
