'use strict';
// Memeriksa "aturan keras" di BRIEF.md terhadap public/bom-air-rimba.html.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { HTML_PATH, readHtml, extractScript } = require('./lib');

const html = readHtml();
const script = extractScript(html);
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

// Tanpa em dash.
check(!html.includes(String.fromCharCode(0x2014)), 'ada tanda em dash di file HTML');

// Satu file: tidak ada <script src>, <img>, <audio>, <video>, <iframe>.
check(!/<script[^>]+src=/i.test(html), 'ada <script src>');
check(!/<(img|audio|video|iframe|source)\b/i.test(html), 'ada tag aset (img/audio/video/iframe/source)');
check(!/\bimport\s+.+\s+from\s+['"]/.test(script) && !/\bimport\(/.test(script), 'skrip memakai import');

// Satu-satunya sumber eksternal: Google Fonts.
const urls = html.match(/https?:\/\/[^\s"'<>)]+/g) || [];
const allowed = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'http://www.w3.org'];
for (const u of urls) {
  check(allowed.some(a => u.startsWith(a)), 'sumber eksternal tidak diizinkan: ' + u);
}
check(/Lilita\+One/.test(html) && /Nunito/.test(html), 'Google Fonts Lilita One dan Nunito harus dipakai');
check(/--display:[^;]*'Lilita One'[^;]*,[^;]*sans-serif/.test(html), 'font judul butuh fallback');
check(/--body:[^;]*'Nunito'[^;]*,[^;]*sans-serif/.test(html), 'font teks butuh fallback');

// Tema, responsif, aksesibilitas gerak.
check(/:root\s*\{[^}]*--night:/.test(html), 'warna belum didefinisikan sebagai custom property di :root');
check(/prefers-reduced-motion:\s*reduce/.test(html), 'prefers-reduced-motion tidak dihormati');
check(/name="viewport"/.test(html), 'meta viewport hilang');
check(/<html lang="id"/.test(html), 'lang="id" hilang');
check(!/prefers-color-scheme:\s*light/.test(html), 'tema harus gelap tunggal');

// Konstanta di brief.
const constants = {
  HA: '4', R_BOMB: '2.5', WET_TICKS: '28', TANK_MAX: '3', TANK_REFILL: '3.5',
  PLANE_SPEED: '30', FALL_TIME: '0.5', BASE_P: '0.17', BORDER_COLS: '2',
};
for (const [k, v] of Object.entries(constants)) {
  const m = script.match(new RegExp('\\b' + k + '\\s*=\\s*([0-9.]+)'));
  check(m && parseFloat(m[1]) === parseFloat(v), `konstanta ${k} harus ${v}, ditemukan ${m ? m[1] : 'tidak ada'}`);
}
check(/SPARKS\s*=\s*\[6,\s*14,\s*22,\s*31,\s*41,\s*53\]/.test(script), 'SPARKS harus [6,14,22,31,41,53]');
check(/bom-air-rimba-best/.test(script), 'kunci localStorage bom-air-rimba-best hilang');
check(!/\bfetch\(|XMLHttpRequest|new Audio\(/.test(script), 'skrip memanggil jaringan atau memuat berkas audio');
check(!/data:audio|\.mp3|\.wav|\.ogg/i.test(html), 'ada aset audio');

// Suara sintetis: AudioContext dibuat satu kali, hanya di ensureAudio, dan ensureAudio hanya dipanggil dari gestur.
check((script.match(/new AC\(/g) || []).length === 1 && !/new (webkit)?AudioContext/.test(script), 'AudioContext harus dibuat tepat satu kali lewat `new AC(`');
const ea = script.match(/function ensureAudio\(\) \{[\s\S]*?\n\}\n/);
check(ea && /new AC\(/.test(ea[0]), '`new AC(` harus berada di dalam ensureAudio');
check(/pointerdown', e => \{\s*e\.preventDefault\(\); ensureAudio\(\)/.test(script), 'ensureAudio harus dipanggil di pointerdown');
check(/goBtn\.addEventListener\('click', \(\) => \{ ensureAudio\(\)/.test(script), 'ensureAudio harus dipanggil di klik Mulai');
check((script.match(/ensureAudio\(\)/g) || []).length === 5, 'ensureAudio harus muncul tepat 5 kali: definisi, pointerdown, Mulai, Main lagi, setSound');

// Tingkat dan bom: Normal dan bom biasa harus sama dengan brief.
check(/\{ name: 'Normal', p: 1, wind: 1, sparks: SPARKS \}/.test(script), 'tingkat Normal harus p 1, wind 1, sparks SPARKS');
check(/\{ r: R_BOMB, cost: 1, speed: PLANE_SPEED, size: 1 \}/.test(script), 'bom biasa harus memakai R_BOMB, 1 isi, PLANE_SPEED');
check(/R_BIG\s*=\s*3\.6/.test(script) && /COST_BIG\s*=\s*2/.test(script), 'konstanta bom besar R_BIG 3.6 dan COST_BIG 2');

// Tidak ada radius hasil hitungan yang bisa negatif tanpa pengaman: grow dibatasi >= 0.
check(/Math\.max\(0,\s*Math\.min\(1,\s*\(animT - since\[i\]\)/.test(script), 'pengaman Math.max(0, ...) pada faktor api hilang');

// Sintaks JS.
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rules-')), 'game.js');
fs.writeFileSync(tmp, script);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
catch (e) { check(false, 'node --check gagal: ' + String(e.stderr || e.message)); }

if (failures.length) {
  console.error('GAGAL (' + HTML_PATH + '):');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK: semua aturan keras lulus (' + Math.round(html.length / 1024) + ' KB)');
