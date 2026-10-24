# Plan: Bom Air Rimba

Dasar: `BRIEF.md`. Tidak ada kode di repo ini sekarang, dan `bom-air-rimba-standalone.html` yang disebut brief belum ada di sini.

## Prasyarat

Taruh `bom-air-rimba-standalone.html` di root repo. Tanpa file itu, brief hanya bisa dipenuhi dengan menulis ulang game dari spesifikasi, yang jauh lebih besar dan berisiko menghidupkan lagi bug yang sudah diperbaiki (radius negatif pada `arc`/`ellipse`, penyetelan `R_BOMB` dan `BASE_P`).

## Pendekatan

1. Baca file sumber penuh. Cocokkan dengan brief: konstanta, struktur IIFE, aturan keras. Catat selisihnya.
2. Bangun harness uji asap Node (`tools/smoke.js`, di luar file game) dengan tiruan `document`, `canvas`, `requestAnimationFrame`, pemeriksa radius negatif, dan lebar jendela 1200 dan 400. Jalankan sebagai garis dasar sebelum mengubah apa pun.
3. Tambah pemeriksa aturan keras otomatis: satu file, tanpa em dash, tanpa sumber eksternal selain Google Fonts, JS lulus `node --check`.
4. Kerjakan bagian "Tugas" satu per satu, tiap perubahan kecil dan diuji ulang: kesulitan, efek suara Web Audio, bom/pesawat kedua, rapikan tampilan HP.
5. Verifikasi manual di browser sungguhan (lebar 400 dan desktop): tata letak HUD, keterbacaan toast, konsol bersih.

## Risiko

- Bagian "Tugas" di brief masih berupa contoh, belum keputusan. Urutan dan cakupan perlu dikonfirmasi pemilik sebelum langkah 4.
- Tampilan visual belum pernah dilihat langsung, jadi harness Node tidak menangkap masalah tata letak. Langkah 5 tidak bisa diganti.
- Web Audio butuh gestur pengguna. Suara hanya boleh dimulai setelah klik pertama.
- Kesulitan baru bisa merusak keseimbangan yang sudah disetel. Tingkat default harus tetap memakai nilai tabel konstanta di brief.
