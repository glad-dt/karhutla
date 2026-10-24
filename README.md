# Bom Air Rimba

Game simulasi kebakaran hutan bergaya kartun. Brief lengkap ada di `BRIEF.md`.

Game adalah satu file HTML mandiri (`public/bom-air-rimba.html`, vanilla JS + Canvas 2D). Next.js hanya membungkusnya: `next.config.mjs` menyajikan file itu di `/`, jadi deploy ke Vercel tidak butuh langkah build khusus untuk game.

## Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000, mode pengembangan
npm run build && npm start   # mode produksi, sama seperti di Vercel
```

## Testing

Urut dari yang tercepat.

1. **Otomatis, tanpa browser** (beberapa detik): `npm test`
   - `test:rules` memeriksa aturan keras brief: satu file, tanpa em dash, tanpa sumber eksternal selain Google Fonts, konstanta sesuai tabel brief, `node --check` lulus.
   - `test:smoke` menjalankan game headless di Node (tiruan DOM dan canvas) sampai layar akhir, lebar 1200 dan 400, masing-masing 3 permainan. Gagal bila `arc` atau `ellipse` menerima radius negatif.
2. **Otomatis, browser sungguhan**: butuh Playwright sekali saja.
   ```bash
   npm i -D playwright && npx playwright install chromium
   npm run build && npm start        # terminal 1
   npm run test:e2e                  # terminal 2
   ```
   Memeriksa lebar desktop 1200 dan HP 400: status 200, tanpa scroll horizontal, tombol Mulai terjangkau, jeda lewat P/Esc, konsol bersih. Tangkapan layar masuk ke `e2e-shots/`, buka dan lihat sendiri.
3. **Manual (wajib sebelum rilis)**. Buka `npm run dev`, lalu:
   - Desktop: klik "Mulai terbang", bom beberapa titik, tunggu angin berganti (toast), biarkan asap melewati garis batas kanan (toast tetangga), mainkan sampai layar akhir (hektar, bintang, rekor). Muat ulang dan pastikan rekor tersimpan.
   - HP: buka dari ponsel di jaringan yang sama (`npm run dev -- -H 0.0.0.0`, lalu `http://IP-KOMPUTER:3000`) atau DevTools mode perangkat lebar 400. Cek HUD tidak terpotong, toast terbaca, ketuk peta menjatuhkan bom, rotasi layar tidak merusak peta.
   - Konsol browser harus tanpa error.

## Deploy ke Vercel

Import repo ini di Vercel. Framework terdeteksi otomatis sebagai Next.js, tanpa pengaturan tambahan.
