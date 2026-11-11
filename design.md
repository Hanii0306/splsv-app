# Design

Dokumen desain pedagogis & antarmuka. Setiap keputusan merujuk pada kode temuan wawancara (lihat `prd.md` §1).

## 1. Prinsip desain berbasis Cognitive Load Theory

| Prinsip | Jenis beban | Bukti | Penerapan di aplikasi |
|---|---|---|---|
| Pre-training | Intrinsic | IL03 | Diagnostik & modul penguatan bilangan bulat/pecahan sebelum L2 dan L6 |
| Sequencing sederhana → kompleks | Intrinsic | IL04 | Level L0–L7 |
| Segmenting | Intrinsic/Extraneous | IL02, EL04 | Satu transformasi per layar |
| Learner pacing | Extraneous | EL04, K02 | Tidak ada autoplay. Tombol Lanjut/Ulangi |
| Coherence | Extraneous | EL03, DS03 | Tanpa maskot/hiasan. Latar polos |
| Signaling | Extraneous | EL03, EL05 | 3 warna semantik. Sorot kata kunci |
| Spatial contiguity | Extraneous | EL02 | Timbangan & persamaan dalam satu viewport |
| Worked example → fading | Germane | GL03, GL05 | Contoh → lengkapi → mandiri |
| Self-explanation | Germane | GL04 | Prompt "Mengapa?" |
| Representasi konkret | Germane | GL01 | Timbangan 3D |
| Verifikasi | Germane | GL02 | Substitusi balik |
| Expertise reversal | Semua | — | Siswa mahir boleh melewati contoh |

## 2. Alur aplikasi

```
Buka aplikasi
  └─ Masukkan kode siswa (S01) ──► [pertama kali] Diagnostik prasyarat (≤5 mnt)
        └─ Peta Belajar (L0…L7, status: terkunci/sedang/selesai)
              └─ Level Lx
                    ├─ 1. Contoh dikerjakan (worked example, langkah demi langkah)
                    ├─ 2. Soal pasangan (completion: siswa melengkapi 1–2 langkah)
                    ├─ 3. Latihan mandiri (3–5 soal, hint memudar)
                    ├─ 4. Verifikasi & "Mengapa?"
                    └─ 5. Kartu pola + 1 soal transfer
              └─ Ulasan (riwayat kesalahan, ulangi soal yang salah)
  └─ Menu Peneliti (PIN): ekspor data, kuesioner beban kognitif
```

Navigasi utama hanya **2 tingkat** (Peta Belajar → Layar Level). Tidak ada drawer/menu tersembunyi.

### 2.1 Struktur sesi 40+ menit
Sesi panjang (hasil interview) berisiko menumpuk kelelahan dan beban kognitif. Karena itu, sesi dibagi
menjadi **segmen ±12 menit**:

| Segmen | Isi | Peran guru di kelas |
|---|---|---|
| 1 (±12 mnt) | Contoh dikerjakan + soal pasangan | Membuka konsep, timbangan diproyeksikan |
| Jeda 1–2 mnt | Kartu ringkasan pola (tanpa soal) | — |
| 2 (±12 mnt) | Latihan mandiri dengan hint memudar | Berkeliling, memantau dashboard |
| Jeda 1–2 mnt | Prompt "Mengapa?" / jelaskan ke teman sebangku (GL04) | Diskusi singkat |
| 3 (±12 mnt) | Soal cerita / transfer | Membahas kesalahan dominan dari dashboard |
| Penutup | Cek substitusi + kuesioner beban kognitif singkat (saat uji coba) | — |

Aplikasi menawarkan jeda (tidak memaksa) dan menyimpan posisi agar bisa dilanjutkan di rumah.

## 3. Sistem visual

### 3.1 Token warna

| Token | Terang | Gelap | Makna (hanya ini) |
|---|---|---|---|
| `--bg` | `#FAFAF7` | `#16181D` | Latar |
| `--surface` | `#FFFFFF` | `#20232A` | Kartu |
| `--text` | `#1F2328` | `#E8EAED` | Teks utama |
| `--text-muted` | `#5B6470` | `#A0A8B3` | Teks sekunder |
| `--var` | `#2563EB` (biru) | `#7AA2F7` | **Suku variabel** (x, 2x) |
| `--const` | `#B45309` (oranye tua) | `#F0A35E` | **Konstanta** |
| `--op` | `#7C3AED` (ungu) | `#B69CFF` | **Operasi yang sedang diterapkan** ke kedua ruas |
| `--ok` | `#15803D` | `#5BC27E` | Benar / seimbang |
| `--warn` | `#B91C1C` | `#F07474` | Salah / timbangan miring |

Aturan:
- Warna semantik tidak pernah berdiri sendiri. `--op` selalu disertai garis bawah tebal, sedangkan
  `--ok` dan `--warn` selalu disertai ikon ✓/!.
- Warna yang sama dipakai untuk objek 3D: kotak-x biru, beban satuan oranye, sorotan operasi ungu.

### 3.2 Tipografi
- Font UI: **Nunito** atau system sans. Persamaan: **JetBrains Mono** atau font tabular agar suku sejajar.
- Ukuran: persamaan 28 sp, instruksi 18 sp, teks bantu 14 sp. Mengikuti pengaturan ukuran font Android.

### 3.3 Tata letak layar latihan (potret, 360×640 dp)

```
┌─────────────────────────────┐
│ ← L3 · Soal 2/5        ⚙   │  header 48dp
├─────────────────────────────┤
│                             │
│     [ Timbangan 3D ]        │  ~40% tinggi
│   ▣▣ ●●●●●   │   ●●●●●●●●●  │
│                             │
├─────────────────────────────┤
│   2x + 5  =  15             │  persamaan aktif (28sp)
│   −5         −5   (ungu)    │  operasi yang diterapkan
├─────────────────────────────┤
│ Langkah 1: Apa yang kita    │  instruksi ≤15 kata
│ lakukan agar 2x sendirian?  │
│  [−5 kedua ruas] [÷2] [+5]  │  pilihan aksi (chips)
├─────────────────────────────┤
│ [💡 Bantuan]   [Lanjut →]   │  maks 3 tombol utama
└─────────────────────────────┘
Riwayat langkah: strip yang bisa diketuk di bawah header (ringkas, 1 baris).
```

Tidak ada elemen lain. Skor, poin, dan streak tidak ditampilkan saat mengerjakan soal.

## 4. Spesifikasi Timbangan 3D (Three.js)

| Aspek | Spesifikasi |
|---|---|
| Gaya | Low-poly, flat shading, warna token. Tanpa tekstur foto |
| Kamera | Perspektif FOV 35°, sedikit dari atas (elevasi 15°). Siswa bisa memutar ±30° (opsional), reset otomatis |
| Objek | Tiang + lengan + 2 piring. **Kotak-x** (kubus biru berlabel "x"), **beban 1** (silinder oranye kecil), **beban 5** (silinder lebih besar, opsional untuk angka > 10), **balon** (bola merah muda pucat bertali) = −1 |
| Kemiringan | Seimbang = 0°. Operasi hanya di satu sisi → miring maks 12° dengan easing *spring* 400 ms + ikon ! |
| Aksi | Ketuk chip aksi lalu objek keluar/masuk **di kedua piring bersamaan** (sorotan ungu). Untuk ÷k: objek dikelompokkan menjadi k grup, lalu 1 grup dipertahankan |
| Sinkronisasi | Persamaan di bawahnya berubah pada frame akhir animasi, dan suku terkait berkedip ungu sekali |
| Batas | Maks 20 objek per piring. Angka lebih besar ditampilkan dengan label angka di piring (skala abstrak) |
| Transisi abstraksi | L0–L3: timbangan dominan. L4–L5: timbangan mengecil (30%). L6–L7: timbangan opsional (tombol "Lihat timbangan"). Tujuannya mendorong pemindahan dari konkret ke simbolik |
| Gerak dikurangi | Jika pengaturan Android "hapus animasi" aktif, animasi diganti perubahan instan |

### Pemetaan "pindah ruas" (IL01)
Saat siswa sudah di L4+ dan memilih aksi pintasan "pindahkan +5 ke kanan", aplikasi menampilkan dua baris:
```
2x + 5 = 15
2x + 5 − 5 = 15 − 5     ← ungu: "kurangi kedua ruas dengan 5"
2x = 10                 ← "+5 'pindah' menjadi −5 karena kita mengurangi di kedua sisi"
```
Untuk `−2x = 8`: animasi membagi kedua piring menjadi 2 grup, dan balon ditampilkan untuk menjelaskan tanda
negatif. Keterangannya: "−2 mengalikan x, jadi kedua ruas **dibagi −2**".

## 5. Desain fitur pemodelan soal cerita (F5)

```
Tahap 1 – Baca            Tahap 2 – Tandai           Tahap 3 – Misalkan        Tahap 4 – Susun
┌──────────────┐        ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ Jumlah tiga  │        │ Jumlah tiga  │        │ Yang belum   │        │ [x] [+] [x+1]│
│ bilangan     │        │ bilangan     │        │ diketahui:   │        │ [+] [x+2]    │
│ berurutan    │  ──►   │ ‾‾‾‾‾‾‾‾‾‾‾‾ │  ──►   │ ○ bilangan   │  ──►   │ [=] [45]     │
│ adalah 45.   │        │ berurutan 45 │        │   pertama ✓  │        │ x+x+1+x+2=45 │
│   [Lanjut]   │        │ ketuk kata…  │        │ x, x+1, x+2  │        │   [Cek]      │
└──────────────┘        └──────────────┘        └──────────────┘        └──────────────┘
```
- Kata kunci yang ditandai muncul sebagai "kartu informasi" kecil di atas layar dan tetap terlihat di tahap
  berikutnya, sehingga siswa tidak perlu membaca ulang seluruh cerita (EL02).
- Glosarium kata kunci → operasi dapat dibuka satu ketuk: *total/jumlah → +*, *selisih → −*,
  *sisa → dikurangi*, *lebih … dari → +*, *kali lipat → ×*, *berurutan → x, x+1, x+2*.
- Setelah persamaan tersusun, alurnya kembali ke latihan terpandu, lalu F7 (kewajaran dalam konteks).

## 6. Desain hint (F6)

| Tingkat | Bentuk | Contoh untuk `2x + 5 = 15` |
|---|---|---|
| H1 Pemantik | Pertanyaan | "Apa yang menempel pada 2x di ruas kiri?" |
| H2 Petunjuk langkah | Arahan | "Langkah 1: hilangkan +5 dari kedua ruas." |
| H3 Contoh sejenis | Worked example mini | "Lihat: 3x + 4 = 10 → 3x + 4 − 4 = 10 − 4 → 3x = 6" |
| H4 Dicontohkan | Langkah ditunjukkan di timbangan, lalu siswa mengulang di soal kembar | — |

- Hint tampil sebagai **panel bawah** yang tidak menutupi persamaan.
- Pemicu otomatis: 2 kesalahan berturut-turut pada langkah yang sama, dan tombol Bantuan berdenyut halus
  sekali tanpa memaksa (DS02).
- Fading: jika siswa memakai H3/H4 pada soal n, soal n+1 diawali sebagai *completion problem*.
  Jika 2 soal berturut-turut tanpa hint, contoh berikutnya dilewati.

## 7. Umpan balik
- Benar: timbangan seimbang + ✓ + kalimat singkat yang **menyebut prinsipnya** ("Seimbang! Kamu mengurangi
  5 di kedua sisi.").
- Salah: timbangan miring + penjelasan jenis kesalahan sesuai klasifikasi validator, misalnya
  "Kamu hanya mengurangi di ruas kiri." Tidak ada suara gagal dan tidak ada pengurangan poin.

## 8. Konten & bahasa
- Bahasa Indonesia lugas, kalimat aktif, ≤ 15 kata per instruksi.
- Soal cerita: satu informasi per kalimat, konteks dekat dengan siswa (uang saku, iuran kelas, umur, harga
  jajan). Hindari kalimat berbelit seperti yang dikeluhkan pada EL01.
- Istilah konsisten: selalu "ruas kiri/kanan", "kedua ruas", "variabel", "konstanta".

## 9. Aksesibilitas
Target sentuh ≥ 48 dp. Kontras ≥ 4.5:1. Mendukung ukuran font sistem dan mode gelap. Semua aksi timbangan
juga tersedia sebagai tombol (bukan gesture saja). Label TalkBack pada objek penting.

## 10. Yang sengaja **tidak** didesain
Maskot, latar ilustrasi, confetti, papan peringkat, timer hitung mundur, notifikasi push harian, dan
tombol "lihat jawaban".
