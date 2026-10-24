# Brief: Bom Air Rimba

Game simulasi kebakaran hutan bergaya kartun. Satu file HTML, tanpa build step, jalan mulus di browser desktop dan HP. File sumber saat ini: `bom-air-rimba-standalone.html` (sekitar 50 KB, vanilla JS + Canvas 2D). Baca file itu dulu sebelum mengubah apa pun, lalu kerjakan tugas di bagian "Tugas" di bawah.

## Aturan keras

- Tetap satu file HTML. CSS dan JS inline. Tidak ada framework, tidak ada library.
- Satu-satunya sumber eksternal yang boleh: Google Fonts (Lilita One untuk judul dan angka, Nunito untuk teks). Wajib ada fallback font.
- Semua gambar digambar lewat kode (Canvas 2D dan SVG inline). Tidak ada aset gambar atau audio.
- Teks UI berbahasa Indonesia. Jangan pakai tanda em dash di teks mana pun.
- Tema tunggal gelap (malam kebiruan). Warna didefinisikan sebagai CSS custom property di `:root`.
- Responsif sampai lebar 400 px, tanpa scroll horizontal. Gutter samping minimal 16 px.
- Hormati `prefers-reduced-motion` untuk animasi CSS.

## Alur permainan

1. Layar awal berisi aturan singkat dan tombol "Mulai terbang".
2. Saat mulai, 3 titik api menyala di petak hutan, minimal 8 petak satu sama lain.
3. Api menyebar tiap 1 detik (satu tick) mengikuti arah angin.
4. Pemain klik atau ketuk peta. Pesawat terbang dari sisi layar terdekat ke titik itu dan menjatuhkan bom air (jatuh 0,5 detik). Dampak mematikan api dan membasahi petak dalam radius 2,5 petak.
5. Petak basah tidak bisa terbakar selama 28 tick, lalu kering lagi.
6. Percikan api baru muncul di 6 waktu tetap (detik 6, 14, 22, 31, 41, 53). Tiga yang pertama menyalakan 1 titik, sisanya 2 titik. Jika semua api padam sebelum percikan habis, percikan berikutnya dimajukan menjadi 2 detik lagi.
7. Permainan selesai saat tidak ada api, semua percikan sudah muncul, dan tidak ada bara terbang tertunda. Layar akhir menampilkan hektar selamat, persen hutan utuh, bintang, jumlah bom, durasi, jumlah protes tetangga, dan rekor.

## Aturan simulasi

Konstanta ada di bagian atas skrip, ubah di sana untuk menyetel kesulitan:

| Konstanta | Nilai | Arti |
|---|---|---|
| `HA` | 4 | hektar per petak |
| `R_BOMB` | 2.5 | radius bom (petak) |
| `WET_TICKS` | 28 | lama petak kebal api |
| `TANK_MAX` / `TANK_REFILL` | 3 / 3.5 | kapasitas bom, detik per isi ulang |
| `PLANE_SPEED` | 30 | petak per detik |
| `FALL_TIME` | 0.5 | detik bom jatuh |
| `BASE_P` | 0.17 | peluang dasar api merambat per tetangga per tick |
| `BORDER_COLS` | 2 | lebar zona negara tetangga |

Medan: danau (tidak terbakar), tanah kosong (tidak terbakar), rumput, hutan. Peta dibuat acak dengan value noise. Grid 44x24 di desktop, 32x20 jika `innerWidth < 640`. Grid selalu landscape.

Perambatan api, per petak yang menyala ke 8 tetangga:
- `p = BASE_P * m`, dengan `m = 1 + kekuatanAngin * 1.7 * dot(arahTetangga, arahAngin)`, minimum 0,08.
- Rumput dikali 1,35. Tetangga diagonal dikali 0,7. `p` dibatasi maksimum 0,95.
- Peluang gabungan dari beberapa sumber api dihitung sebagai `1 - hasil kali (1 - p)`.
- Api padam jadi abu setelah 4 tick di hutan, 2 tick di rumput.
- Bara terbang: tiap petak menyala punya peluang `0,018 * kekuatanAngin` per tick melempar bara 2 sampai 4 petak searah angin, menyala di tick berikutnya.

Angin: 8 arah mata angin, kekuatan 0,5 sampai 1,0. Berganti tiap 13 sampai 21 detik (belok 45 atau 90 derajat, kadang 180). Ada toast saat berganti dan hitung mundur di HUD.

## Zona batas negara

- Dua kolom paling kanan adalah negara tetangga: tanah kosong, tidak terbakar, tidak dihitung di skor, diberi arsiran biru dan tulisan "NEGARA TETANGGA".
- Garis batas merah-putih bertiang di tepi kirinya.
- Setiap partikel asap yang melintasi garis memicu toast: `Kabar dari tetangga: lho, kok asapnya ke sini lagi?` plus teks melayang "Asap lintas batas". Ada jeda 7 detik antar notifikasi. Jumlahnya dihitung dan tampil di layar akhir.
- Asap dibuat melayang lebih jauh (kecepatan angin x3,5, umur 1,6 sampai 2,8 detik) supaya benar-benar sampai ke garis.

## Skor

- Hektar selamat = (petak mudah terbakar - petak abu - petak menyala) x `HA`. Angka di HUD bergerak halus ke nilai target.
- Hektar hangus ditampilkan terpisah.
- Bintang: 3 bila selamat >= 85%, 2 bila >= 65%, 1 bila >= 35%, selain itu 0.
- Rekor terbaik disimpan di `localStorage` kunci `bom-air-rimba-best`, selalu dalam try/catch.

## Tampilan dan kontrol

- HUD: judul + tombol Jeda dan Ulang, kartu Hektar selamat (dengan bar), Hangus, Waktu, Angin (kompas SVG berputar + nama arah + kata sepoi/sedang/kencang), Tangki (3 tetes yang terisi bertahap).
- Gaya kartun: kontur tebal warna `#10132a`, bayangan keras, pohon dan rumput sebagai sprite yang digambar sekali ke offscreen canvas, api berupa kurva bezier bergoyang, pesawat kuning-merah dengan baling-baling, bom biru jatuh dengan bayangan, cincin dan percikan air, asap, bara, garis angin tipis.
- Kursor bidik berupa lingkaran putus-putus sebesar radius bom (biru bila tangki ada, merah bila kosong).
- Kontrol: klik atau ketuk untuk bom, tombol P atau Esc untuk jeda, jeda otomatis saat tab disembunyikan.
- Canvas diskalakan sesuai `devicePixelRatio` (maksimum 2) dan dihitung ulang saat resize.

## Struktur kode

Satu IIFE dengan bagian berurutan: generasi peta (`newGame`), layout dan sprite (`layout`, `buildSprites`, `buildBase`, `drawBorder`), simulasi (`tick`, `placeInitialFires`, `fireSpark`, `changeWind`), pengeboman (`requestBomb`, `impact`), efek (`updateFx`, `neighborSmoke`), render (`render`, `drawPlane`, `drawFlame`), HUD dan alur (`updateHud`, `updateGame`, `begin`, `endGame`), input, dan boot. State permainan: `state` bernilai `ready`, `play`, `pause`, atau `over`.

## Bug yang sudah diperbaiki, jangan diulang

- `IndexSizeError: arc: Negative radius`. Waktu mulai nyala disimpan di `Float32Array` sehingga bisa lebih besar dari jam animasi, membuat faktor pertumbuhan api negatif. Solusi: `Math.max(0, ...)`. Sebelum memanggil `arc` atau `ellipse` dengan radius hasil hitungan, pastikan nilainya >= 0.
- Dengan konstanta awal (`R_BOMB` 2.2, `BASE_P` 0.22) api terlalu cepat dan bom acak hanya menyelamatkan sekitar 8% hutan. Nilai sekarang adalah hasil penyetelan.

## Cara menguji

Tidak ada browser di sandbox, jadi uji asap dilakukan headless dengan Node: tiruan `document`, `canvas` dan `requestAnimationFrame`, lalu jalankan skrip game, klik "Mulai", kirim klik acak, lompati frame sampai layar akhir terisi. Sisipkan pemeriksa yang melempar error bila `arc` atau `ellipse` menerima radius negatif. Jalankan untuk lebar jendela 1200 dan 400. Selain itu, buka di browser sungguhan dan cek konsol. Tampilan visual belum pernah dilihat langsung, jadi periksa tata letak HUD di lebar HP dan keterbacaan toast.

## Tugas

Isi bagian ini sebelum menyalin ke Claude Code. Contoh yang masuk akal:

- Tambah efek suara sintetis lewat Web Audio (mulai hanya setelah klik pertama).
- Tambah tingkat kesulitan (kecepatan api, jumlah percikan, kekuatan angin).
- Tambah jenis bom atau pesawat kedua dengan radius berbeda.
- Rapikan bila ada masalah tampilan di HP setelah dicek di perangkat sungguhan.

Setiap perubahan harus tetap satu file, lulus `node --check` pada JS-nya, dan lulus uji asap di atas.
