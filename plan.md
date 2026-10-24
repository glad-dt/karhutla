# Plan: Bom Air Rimba

Dasar: `BRIEF.md` (tidak diubah, sesuai permintaan).

## Keputusan setelah brief

- Eksekusi memakai Next.js untuk deploy ke Vercel. Ini bertabrakan dengan aturan keras "tanpa framework", jadi game tetap satu file HTML mandiri di `public/bom-air-rimba.html` dan Next.js hanya menyajikannya di `/` lewat rewrite. Aturan brief untuk file game tetap berlaku penuh dan dijaga oleh `tools/check-rules.js`.
- File sumber sudah ada (disalin dari unggahan, 47 KB). Tidak ada penulisan ulang.

## Pendekatan

1. Baca file sumber penuh. Cocokkan dengan brief: konstanta, struktur IIFE, aturan keras. Catat selisihnya.
2. Bangun harness uji asap Node (`tools/smoke.js`, di luar file game; dijalankan dengan `npm test`) dengan tiruan `document`, `canvas`, `requestAnimationFrame`, pemeriksa radius negatif, dan lebar jendela 1200 dan 400. Jalankan sebagai garis dasar sebelum mengubah apa pun.
3. Tambah pemeriksa aturan keras otomatis: satu file, tanpa em dash, tanpa sumber eksternal selain Google Fonts, JS lulus `node --check`.
4. Kerjakan bagian "Tugas" satu per satu, tiap perubahan kecil dan diuji ulang: kesulitan, efek suara Web Audio, bom/pesawat kedua, rapikan tampilan HP.
5. Verifikasi manual di browser sungguhan (lebar 400 dan desktop): tata letak HUD, keterbacaan toast, konsol bersih.

## Risiko

- Bagian "Tugas" di brief masih berupa contoh, belum keputusan. Urutan dan cakupan perlu dikonfirmasi pemilik sebelum langkah 4.
- Tampilan visual belum pernah dilihat langsung, jadi harness Node tidak menangkap masalah tata letak. Langkah 5 tidak bisa diganti.
- Web Audio butuh gestur pengguna. Suara hanya boleh dimulai setelah klik pertama.
- Kesulitan baru bisa merusak keseimbangan yang sudah disetel. Tingkat default harus tetap memakai nilai tabel konstanta di brief.
