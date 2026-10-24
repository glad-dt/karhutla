# Tasks

Urut dari yang paling penting. Setiap tugas kecil dan bisa dites.

1. **[selesai] Tambahkan game ke repo dalam kerangka Next.js.** File ada di `public/bom-air-rimba.html` dan disajikan di `/`. Tes: `npm run build` lulus, `GET /` 200, `node --check` lulus pada JS inline.
2. **[selesai] Buat `tools/smoke.js` (uji asap Node).** Tiruan `document`, `canvas`, `requestAnimationFrame`, pemeriksa radius negatif pada `arc` dan `ellipse`, klik "Mulai", klik acak, lompat frame sampai layar akhir terisi. Tes: `node tools/smoke.js` keluar kode 0 pada lebar 1200 dan 400 untuk file dasar.
3. **[selesai] Buat `tools/check-rules.js` (pemeriksa aturan keras).** Tes: gagal bila ada em dash, tag `<script src>` atau `<link>` selain Google Fonts, atau lebih dari satu file HTML; lulus pada file dasar.
4. **[selesai] Tambah tingkat kesulitan** (kecepatan api, jumlah percikan, kekuatan angin) dengan default memakai nilai tabel konstanta. Mudah/Normal/Sulit dipilih di layar awal dan tersimpan. Tes: uji asap lulus di tiap tingkat; default menghasilkan konstanta yang sama persis dengan brief.
5. **[selesai] Tambah efek suara sintetis Web Audio**, `AudioContext` dibuat hanya setelah klik pertama. Tes: uji asap dengan tiruan `AudioContext` yang mencatat pembuatan; nol pembuatan sebelum klik.
6. **[selesai] Tambah jenis bom/pesawat kedua dengan radius berbeda.** Bom Besar: radius 3,6 petak, pakai 2 isi tangki, pesawat lebih besar dan lebih lambat; tombol 1 dan 2 atau kartu Tangki. Tes: unit pada `impact` memastikan petak yang dibasahi sesuai radius tiap jenis; uji asap lulus.
7. **[selesai] Rapikan tampilan HP.** Di lebar di bawah 760 px: peta tepat di bawah judul, kartu statistik di bawah peta, layar awal/jeda/akhir memenuhi layar (tombol Mulai tidak lagi terpotong). Tes: di Chromium Playwright lebar 400, `scrollWidth <= clientWidth`, gutter samping >= 16 px, HUD dan toast tidak terpotong (tangkapan layar diperiksa manual).
8. **[selesai] Cek akhir di browser sungguhan** (desktop dan HP). Tes: konsol tanpa error selama satu permainan penuh sampai layar akhir; `prefers-reduced-motion` mematikan animasi CSS.
