# Tasks

Urut dari yang paling penting. Setiap tugas kecil dan bisa dites.

1. **Tambahkan `bom-air-rimba-standalone.html` ke repo.** Tes: file ada di root, ukuran sekitar 50 KB, `node --check` lulus pada JS inline yang diekstrak.
2. **Buat `tools/smoke.js` (uji asap Node).** Tiruan `document`, `canvas`, `requestAnimationFrame`, pemeriksa radius negatif pada `arc` dan `ellipse`, klik "Mulai", klik acak, lompat frame sampai layar akhir terisi. Tes: `node tools/smoke.js` keluar kode 0 pada lebar 1200 dan 400 untuk file dasar.
3. **Buat `tools/check-rules.js` (pemeriksa aturan keras).** Tes: gagal bila ada em dash, tag `<script src>` atau `<link>` selain Google Fonts, atau lebih dari satu file HTML; lulus pada file dasar.
4. **Tambah tingkat kesulitan** (kecepatan api, jumlah percikan, kekuatan angin) dengan default memakai nilai tabel konstanta. Tes: uji asap lulus di tiap tingkat; default menghasilkan konstanta yang sama persis dengan brief.
5. **Tambah efek suara sintetis Web Audio**, `AudioContext` dibuat hanya setelah klik pertama. Tes: uji asap dengan tiruan `AudioContext` yang mencatat pembuatan; nol pembuatan sebelum klik.
6. **Tambah jenis bom/pesawat kedua dengan radius berbeda.** Tes: unit pada `impact` memastikan petak yang dibasahi sesuai radius tiap jenis; uji asap lulus.
7. **Rapikan tampilan HP.** Tes: di Chromium Playwright lebar 400, `scrollWidth <= clientWidth`, gutter samping >= 16 px, HUD dan toast tidak terpotong (tangkapan layar diperiksa manual).
8. **Cek akhir di browser sungguhan** (desktop dan HP). Tes: konsol tanpa error selama satu permainan penuh sampai layar akhir; `prefers-reduced-motion` mematikan animasi CSS.
