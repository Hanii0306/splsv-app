# PRD — Product Requirements Document

**Nama kerja produk:** SPLV app — Aplikasi Android belajar SPLSV berbasis pengelolaan beban kognitif
**Versi dokumen:** 0.1 (draf tahap Design ADDIE)
**Tanggal:** 10 November 2026
**Status:** Draf. Bagian bertanda **[ASUMSI]** akan dikonfirmasi lewat sesi interview pengembang.

---

## 1. Latar belakang

Aplikasi ini dikembangkan dalam penelitian pengembangan (R&D) model **ADDIE**. Tahap *Analysis* sudah
dilakukan melalui wawancara mendalam semiterstruktur berbasis *Cognitive Load Theory* (CLT) dengan siswa
kelas VIII yang telah mempelajari **Sistem Persamaan Linear Satu Variabel (SPLSV)** di kelas VII semester 2
(informan **S01**, 5 November 2026, 35 menit).

Temuan utama wawancara (kode mengacu pada pedoman wawancara):

| Kode | Temuan lapangan (ringkas) | Jenis beban |
|---|---|---|
| K01 | Kaget melihat huruf (x, y) dalam matematika; lama-lama paham huruf = bilangan yang belum diketahui | Konteks |
| K02 | Belajar dari papan tulis + catat + LKS; video terlalu cepat | Konteks / EL3 |
| K03, IL04, IL05 | Soal bentuk `3x − 4 = 11` mudah; **soal cerita** dan **pecahan** (`½(x+3)=5`) sulit; bingung memulai pemisalan (`x, x+1, x+2`) | Intrinsic |
| IL01, IL02 | **Aturan pindah ruas** dan **tanda +/−** tertukar; `−2x = 8` dikira "pindah jadi +2"; banyak unsur harus diproses bersamaan | Intrinsic (interaktivitas unsur tinggi) |
| IL03 | Prasyarat: **operasi bilangan bulat** dan **penyederhanaan aljabar** | Intrinsic (prasyarat) |
| EL01, EL05 | Kalimat soal cerita panjang & berbelit; sulit menentukan "x"-nya dan kata kunci (total, selisih, sisa) | Extraneous |
| EL02 | Teks panjang membuat pusing; lebih mudah dengan langkah *step-by-step* berpanah/kotak; **bolak-balik halaman** membingungkan | Extraneous (split-attention) |
| EL03, DS03 | Hiasan/kartun tidak relevan mengganggu; **warna penanda** pada angka yang pindah ruas membantu; tombol jangan banyak | Extraneous (signaling, coherence) |
| EL04 | Penjelasan terlalu cepat di bagian pecahan; perlu diulang pelan | Extraneous (pacing) |
| GL01 | **Visualisasi timbangan** membuat "=" bermakna "seimbang" | Germane |
| GL02 | Memeriksa jawaban dengan **substitusi** | Germane (refleksi) |
| GL03 | **Hint bertahap**, bukan langsung jawaban; contoh soal sejenis | Germane (fading) |
| GL04 | Menjelaskan ke teman membuat alasan perubahan tanda "nempel" | Germane (self-explanation) |
| GL05 | Transfer dengan mengenali **pola dasar** soal cerita | Germane (transfer) |
| DS01–DS03 | Minta latihan interaktif *step-by-step*, **timbangan interaktif**, bantuan muncul setelah **salah 2 kali berturut-turut**, UI simpel, jangan rumus cepat tanpa proses | Rekomendasi desain |

> **Keterbatasan data:** pedoman mensyaratkan **minimal 2 informan**, tetapi baru S01 yang terdokumentasi.
> Semua persyaratan di bawah ini bersifat sementara dan perlu ditriangulasi dengan informan S02, artefak
> belajar, dan observasi (lihat `task.md` T-A03).

## 2. Masalah yang diselesaikan

1. Siswa menghafal "pindah ruas" sebagai trik tanda tanpa memahami prinsip kesetaraan, sehingga tanda dan
   operasi tertukar (IL01, IL02).
2. Siswa kesulitan **merumuskan** situasi soal cerita menjadi model matematika (K03, IL05, EL05). Ini inti
   **literasi matematis**.
3. Bahan ajar yang ada menambah beban yang tidak perlu: teks panjang, informasi terpisah, hiasan, dan tempo
   terlalu cepat (EL01–EL04).

## 3. Tujuan produk

| ID | Tujuan | Indikator keberhasilan (sementara) |
|---|---|---|
| G1 | Meningkatkan **literasi matematis** siswa pada konteks SPLSV | Peningkatan skor tes literasi (pre/post, instrumen terpisah dari aplikasi), N-gain ≥ 0,3 (sedang) **[ASUMSI target]** |
| G2 | Menurunkan *extraneous load* | Skor EL pada kuesioner beban kognitif (adaptasi Klepsch dkk., 2017) lebih rendah dari pembanding / di bawah titik tengah skala |
| G3 | Mengelola *intrinsic load* lewat urutan dan pemecahan langkah | Tingkat penyelesaian level naik bertahap, tanpa lonjakan kesalahan di batas level |
| G4 | Mendorong proses *germane* (penjelasan diri, verifikasi, transfer) | Persentase langkah "Mengapa?" dijawab benar, penggunaan verifikasi substitusi, kebutuhan hint menurun antarsoal |
| G5 | Kepraktisan & kelayakan (syarat ADDIE) | Validasi ahli materi/media "layak", uji kepraktisan siswa & guru "praktis" |

### Non-tujuan (versi 1)
- Tidak mencakup SPLDV, pertidaksamaan, atau materi lain.
- Tidak ada fitur sosial/chat, papan peringkat kompetitif, atau gamifikasi berat (berisiko menambah extraneous load).
- Tidak menyediakan "pemecah soal otomatis" yang langsung menampilkan jawaban (bertentangan dengan GL03, DS03).

## 4. Kerangka literasi matematis

Mengacu pada kerangka PISA 2022 (OECD) dan selaras dengan AKM Numerasi. Setiap soal cerita di aplikasi
dipetakan ke **proses** dan **konteks**:

| Proses literasi | Wujud di SPLSV | Fitur pendukung |
|---|---|---|
| **Merumuskan** (formulate) | Menentukan apa yang dimisalkan `x`, menerjemahkan kata kunci jadi operasi, menyusun persamaan | F5 Pemodelan Soal Cerita |
| **Menggunakan** (employ) | Menyelesaikan persamaan dengan operasi setara pada kedua ruas | F1 Timbangan 3D, F2 Langkah Terpandu |
| **Menafsirkan & mengevaluasi** (interpret) | Substitusi balik, mengecek kewajaran jawaban dalam konteks (umur tidak negatif, jumlah barang bulat) | F7 Verifikasi & Kewajaran |
| **Bernalar** (reasoning, inti PISA 2022) | Menjelaskan *mengapa* suatu langkah sah | F8 Prompt "Mengapa?" |

Konteks soal: **pribadi** (uang saku, umur), **pekerjaan** (harga dagangan), **sosial** (iuran kelas),
**ilmiah** (suhu, jarak). Variasi konteks dengan pola dasar yang sama mendukung transfer (GL05).

## 5. Pengguna

| Persona | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Siswa SMP kelas VII** (utama) | 12–13 tahun, belajar SPLSV pertama kali; kemampuan prasyarat beragam | Langkah jelas, bantuan saat macet, tampilan tidak ramai |
| **Siswa kelas VIII/IX** (remedial) | Sudah belajar tetapi masih keliru tanda/pemodelan (seperti S01) | Diagnostik cepat, langsung ke bagian lemah |
| **Guru matematika** (sekunder) | Memantau kemajuan kelas lewat dashboard | Ringkasan kesalahan umum per siswa (kode, tanpa nama), siswa yang macet, level kelas |
| **Peneliti** (internal) | Mengumpulkan data uji coba | Ekspor log aktivitas & skor tanpa identitas |

## 6. Ruang lingkup fitur (versi 1)

Setiap fitur wajib punya **bukti temuan**, **rasional teori**, **perilaku yang diharapkan**, dan
**indikator uji** (sesuai Bagian H pedoman wawancara).

### F1 — Timbangan 3D Interaktif (Three.js)
- **Bukti:** GL01, DS01, IL01.
- **Rasional:** representasi konkret kesetaraan; mengubah "pindah ruas" menjadi "lakukan operasi yang sama
  pada kedua ruas". Ini membangun skema yang benar dan bukan hafalan aturan tanda.
- **Perilaku:** siswa melihat timbangan dengan kotak-`x` dan beban satuan. Siswa memilih aksi (mis.
  "ambil 5 dari kedua sisi") dan timbangan tetap seimbang. Jika aksi hanya dilakukan di satu sisi,
  timbangan miring (umpan balik visual langsung). Nilai negatif ditampilkan sebagai **balon** (gaya angkat).
- **Kriteria terima:**
  - Persamaan bentuk `ax + b = c` dan `ax + b = cx + d` dengan bilangan bulat |nilai| ≤ 20 dapat ditampilkan.
  - Setiap aksi pada timbangan sinkron dengan baris persamaan simbolik di bawahnya (teks & visual berdekatan, EL02).
  - Animasi ≤ 600 ms per aksi, dapat diulang, tidak berjalan otomatis.
  - Ada fallback 2D (SVG) jika WebGL tidak tersedia atau perangkat lambat.
- **Uji:** siswa diminta menjelaskan hubungan kedua ruas setelah memakai fitur.

### F2 — Langkah Terpandu "Satu Langkah per Layar"
- **Bukti:** IL02, EL02, EL04, DS02, matriks H baris 1.
- **Rasional:** memecah unsur yang saling berinteraksi (segmenting), siswa yang mengatur tempo (learner-paced).
- **Perilaku:** satu transformasi per layar: pilih operasi → terapkan ke kedua ruas → sederhanakan.
  Ada tombol **Ulangi langkah** dan **Kembali**. Riwayat langkah selalu terlihat ringkas di atas
  (tidak perlu bolak-balik, EL02).
- **Kriteria terima:** maksimal 3 tombol aksi utama per layar. Tidak ada auto-advance.

### F3 — Penanda Warna Konsisten (Signaling)
- **Bukti:** EL03.
- **Perilaku:** warna tetap untuk peran: suku variabel, konstanta, **operasi yang sedang diterapkan**.
  Suku yang "berpindah" disorot dan dianimasikan beserta perubahan tandanya.
- **Kriteria terima:** maksimal 3 warna penanda. Warna tidak menjadi satu-satunya pembeda (ada ikon/garis
  bawah untuk buta warna).

### F4 — Diagnostik Prasyarat & Jalur Adaptif
- **Bukti:** IL03, matriks D IL3.
- **Perilaku:** 6–8 butir cepat (operasi bilangan bulat, pecahan sederhana, penyederhanaan aljabar).
  Hasilnya menentukan titik mulai dan menyisipkan **modul penguatan** singkat jika prasyarat lemah.
- **Kriteria terima:** selesai ≤ 5 menit. Hasil dapat diulang.

### F5 — Pemodelan Soal Cerita (Literasi: Merumuskan)
- **Bukti:** K03, IL04, IL05, EL01, EL05, GL05, DS02.
- **Rasional:** soal cerita panjang dipecah per kalimat (chunking). Siswa menandai informasi penting.
  Kata kunci dipetakan ke operasi.
- **Perilaku (4 tahap):**
  1. **Baca per potongan:** kalimat muncul satu per satu (bisa ditampilkan utuh).
  2. **Tandai:** siswa mengetuk angka & kata kunci (*total, selisih, sisa, lebih, kurang, berurutan*).
     Setelah 2 kali salah, aplikasi menyorot otomatis.
  3. **Misalkan:** "Apa yang belum diketahui? → itu `x`". Pilihan ganda singkat. Untuk bilangan berurutan:
     susun `x, x+1, x+2`.
  4. **Susun persamaan:** menyusun kartu (drag) dan bukan mengetik bebas, untuk mengurangi beban mengetik di HP.
- **Kriteria terima:** setiap soal cerita punya metadata konteks & proses literasi. Kalimat ≤ 20 kata.
  Bahasa lugas tanpa kalimat berbelit (EL01).

### F6 — Petunjuk Bertingkat yang Memudar (Fading Hints)
- **Bukti:** GL03, DS01, DS02.
- **Perilaku:**
  - Tombol **Bantuan** selalu tersedia. Setelah **2 kesalahan berturut-turut** pada langkah yang sama,
    tombol itu menyala dan menawarkan hint (tidak memaksa).
  - Tingkat hint: **H1** pertanyaan pemantik → **H2** petunjuk langkah ("Kumpulkan suku ber-x di ruas
    kiri") → **H3** contoh sejenis yang sudah dikerjakan → **H4** langkah dicontohkan, lalu siswa mengulang
    pada soal kembar.
  - **Fading:** pada soal berikutnya yang setipe, contoh lengkap berkurang (worked example → completion
    problem → mandiri).
- **Kriteria terima:** jawaban akhir tidak pernah ditampilkan sebelum siswa mencoba minimal 1 kali.

### F7 — Verifikasi Substitusi & Cek Kewajaran (Literasi: Menafsirkan)
- **Bukti:** GL02.
- **Perilaku:** setelah menemukan `x`, siswa diajak memasukkan kembali nilai ke persamaan awal dengan
  tampilan ruas kiri = ruas kanan. Pada soal cerita, ada pertanyaan kewajaran ("Apakah umur 3,5 tahun
  masuk akal untuk soal ini?").

### F8 — Prompt "Mengapa?" (Self-explanation)
- **Bukti:** GL04, matriks H baris 4.
- **Perilaku:** pada langkah kunci (mis. membagi dengan −2), siswa memilih alasan dari 3 opsi.
  Opsional: merekam/mengetik penjelasan singkat "seolah mengajari teman".
- **Kriteria terima:** maksimal 1 prompt per soal agar tidak menambah beban.

### F9 — Jenjang Materi (Sequencing simple-to-complex)
| Level | Bentuk | Contoh |
|---|---|---|
| L0 | Makna variabel & "=" sebagai seimbang | timbangan saja |
| L1 | `x + a = b` | `x + 5 = 12` |
| L2 | `ax = b` (termasuk a negatif) | `−2x = 8` |
| L3 | `ax + b = c` | `2x + 5 = 15` |
| L4 | Variabel di kedua ruas | `5x − 3 = 2x + 9` |
| L5 | Tanda kurung | `3(x − 2) = 12` |
| L6 | Pecahan | `½(x + 3) = 5` (diajarkan pelan, EL04) |
| L7 | Soal cerita (literasi) | bilangan berurutan, umur, harga |

Pola tiap level: **contoh dikerjakan → soal pasangan → latihan mandiri** (example–problem pairs).

### F10 — Ringkasan Pola & Refleksi Akhir Level
- **Bukti:** GL05.
- **Perilaku:** kartu "Pola dasar" (contoh: *cari tahu yang dimisalkan x → susun persamaan → selesaikan →
  cek*), lalu 1 soal transfer dengan konteks berbeda.

### F12 — Dashboard Guru (v1)
- **Bukti:** keputusan interview pengembang (10 Nov 2026); K02 (pembelajaran berpusat di kelas, guru tetap
  sumber penjelasan utama).
- **Konteks pakai (interview):** di kelas dipandu guru, lalu dilanjutkan di rumah. 1 HP = 1 siswa.
  Input jawaban memakai chip aksi + kartu.
- **Perilaku:** **peneliti** membuat kode kelas & kode siswa sebelum uji coba, lalu menautkan guru ke kelasnya.
  Siswa memasukkan kode kelas + kode siswa satu kali di HP-nya. Dashboard
  (web, dapat dibuka di HP/laptop) menampilkan:
  - peta level per siswa (terkunci/sedang/kuasai),
  - **jenis kesalahan dominan** per siswa & kelas (tanda/pindah ruas, satu ruas, hitung, pemodelan cerita),
  - siswa yang macet (≥ 3 hint H3/H4 pada satu level),
  - hasil diagnostik prasyarat.
- **Kriteria terima:** tidak ada nama siswa tersimpan di server. Data siswa hanya bisa dilihat guru kelas
  itu. Dashboard tetap berguna walau data sebagian siswa tertunda sinkron (ditandai "terakhir sinkron").
- **Uji:** wawancara guru tentang kebermanfaatan informasi untuk tindak lanjut di kelas.

### F11 — Mode Peneliti / Ekspor Data
- Login memakai **kode siswa** (S01, S02, …), tanpa nama.
- Ekspor log (CSV/JSON) berisi waktu per langkah, jumlah kesalahan, hint terpakai, dan jawaban "Mengapa?".
- Kuesioner beban kognitif singkat (adaptasi, perlu validasi) dapat ditampilkan di akhir sesi.

## 7. Persyaratan non-fungsional

| ID | Persyaratan |
|---|---|
| NF1 | Android 8.0 (API 26)+. Target perangkat **RAM 4–6 GB**: 3D ≥ 50 fps. Batas minimum RAM 3 GB: ≥ 30 fps atau fallback 2D |
| NF2 | **Offline-first + sinkronisasi**: semua materi & latihan berjalan tanpa internet. Progres & log diantrekan lokal lalu dikirim otomatis saat online |
| NF3 | Ukuran APK ≤ 30 MB |
| NF4 | Waktu buka aplikasi ≤ 3 detik; scene 3D dimuat *lazy* |
| NF5 | Bahasa Indonesia baku tetapi ramah; kalimat instruksi ≤ 15 kata |
| NF6 | Aksesibilitas: target sentuh ≥ 48 dp, kontras teks ≥ 4.5:1, ukuran huruf dapat diperbesar |
| NF7 | Privasi: tanpa nama/foto siswa; data identitas hanya kode; persetujuan orang tua sebelum uji coba |
| NF8 | Tanpa iklan, tanpa pelacak pihak ketiga |

## 8. Prinsip desain CLT (ringkas, detail di `design.md`)

1. **Coherence:** tanpa dekorasi yang tidak relevan (EL03, DS03).
2. **Signaling:** warna konsisten untuk suku yang berubah (EL03).
3. **Spatial contiguity:** teks, persamaan, dan visual dalam satu layar berdekatan (EL02).
4. **Segmenting & learner pacing:** satu langkah per layar, siswa mengatur tempo (EL04, IL02).
5. **Worked example & fading:** contoh → lengkapi → mandiri (GL03).
6. **Pre-training:** prasyarat diperkuat dulu (IL03).
7. **Self-explanation & verifikasi:** "Mengapa?" dan substitusi (GL02, GL04).
8. **Expertise reversal:** siswa yang sudah mahir dapat melewati contoh dan langsung berlatih.

## 9. Evaluasi (tahap Implementation & Evaluation ADDIE)

| Aspek | Instrumen | Catatan |
|---|---|---|
| Kevalidan | Lembar validasi ahli materi & ahli media (Aiken's V) | 2–3 ahli |
| Kepraktisan | Angket respons siswa & guru, observasi keterlaksanaan | Uji perorangan → kelompok kecil → lapangan |
| Efektivitas: literasi | Tes literasi matematis pre/post (soal kontekstual, rubrik 3 proses) | Instrumen terpisah dari soal aplikasi |
| Beban kognitif | Kuesioner IL/EL/GL (adaptasi Klepsch dkk., 2017 / Leppink dkk., 2013) + skala Paas (1992) | Wajib diadaptasi & divalidasi untuk siswa SMP |
| Proses | Log aplikasi (waktu, kesalahan, hint) | Bahan triangulasi, bukan ukuran beban langsung |

## 10. Risiko

| Risiko | Mitigasi |
|---|---|
| Data analisis baru 1 informan | Wawancara S02 (variasi kemampuan), triangulasi artefak |
| Animasi 3D justru menambah extraneous load | 3D hanya untuk timbangan (bermakna), kontrol tempo, uji A/B 2D vs 3D di uji perorangan |
| HP siswa lambat | Fallback 2D, render-on-demand, profil performa |
| Model timbangan lemah untuk bilangan negatif | Metafora balon + transisi ke representasi simbolik di L2–L4 |
| Hint dipakai untuk "menembak" jawaban | Hint bertingkat, jawaban akhir tidak pernah langsung diberikan, log pemakaian hint |

## 11. Pertanyaan terbuka (diselesaikan lewat interview)
Lihat daftar di `task.md` bagian **"Keputusan tertunda"**.

## 12. Tambahan v1.2 (permintaan pengembang, 11 Nov 2026)

| ID | Fitur | Bukti / rasional | Batas CLT |
|---|---|---|---|
| F13 | **Latihan bebas ∞**: soal dibangkitkan otomatis per level (L0–L6) + 6 templat soal cerita acak (L7). Lencana bisa didapat di sini | GL03, GL05 (latihan bervariasi → transfer); DS01 (latihan interaktif) | Bantuan memudar tetap berlaku; soal selalu berjawaban bulat dan ≤ 6 langkah (teruji 2.100 soal) |
| F14 | **Ringkasan materi** per level: ide inti, langkah, contoh bertahap, kesalahan umum | EL02 (tidak bolak-balik halaman), IL01/IL05 (kesalahan tanda & pemodelan) | Satu layar, bisa dibuka ulang kapan saja |
| F15 | **Kuis campuran** 10 soal dari level terbuka, tanpa hint, pembahasan di akhir | GL02 (memeriksa), evaluasi mandiri | Tidak ada timer; terbuka setelah 2 lencana |
| F16 | **Tampilan ramah** ("lucu tapi bermakna"): timbangan berwajah (senyum = seimbang, cemas = miring), lencana bersimbol konsep, warna ceria, huruf bulat, perayaan simbol matematika hanya setelah level/kuis selesai | Permintaan pengembang; dijaga agar tetap selaras EL03/DS03: tidak ada hiasan yang tidak membawa informasi matematika **saat mengerjakan soal** | Ekspresi wajah = umpan balik kesetaraan, bukan dekorasi |

## 13. Tambahan v1.3 (permintaan pengembang, 11 Nov 2026)

| ID | Fitur | Catatan |
|---|---|---|
| F17 | **Akun per siswa (kode + PIN 4–6 angka)**: banyak siswa bisa berbagi satu HP/browser tanpa data tercampur. Guru membuat akun massal (S01–Sn + PIN acak), reset PIN, hapus akun dari menu peneliti. 5× PIN salah → jeda 1 menit | PIN hanya pemisah antar-teman di perangkat yang sama, bukan keamanan tingkat tinggi. Tidak ada nama yang disimpan |
| F18 | **L8 Pertidaksamaan Linear Satu Variabel (PtLSV)**: <, >, ≤, ≥; aturan membalik tanda saat ×/÷ bilangan negatif; pengecoh "lupa membalik" dengan umpan balik khusus; cek akhir = memilih bilangan yang memenuhi; latihan bebas & kuis | Lanjutan alami SPLSV di kelas VII. Timbangan tidak ditampilkan pada L8 karena metafora "seimbang" tidak berlaku |
| F19 | **3 templat soal cerita baru** (keliling taman, umur ayah, tiket museum) → total 9 templat acak | Menambah variasi konteks (GL05) |
| F20 | **Lambang matematika melayang** (7 simbol, transparan, gerak lambat) di layar menu saja | Tidak tampil saat mengerjakan soal (EL03); mati otomatis pada "kurangi animasi" dan WebView lama |
| — | Tema **pink muda** + huruf bulat Fredoka/Nunito + logo si Timbangan | Warna semantik matematika (x biru, konstanta oranye, operasi ungu) tetap |

## 14. Perubahan v1.4 (permintaan pengembang, 11 Nov 2026)

- **L8 Pertidaksamaan dihapus dari materi** (mesin tetap mendukung tanda <, >, ≤, ≥ untuk pengembangan berikutnya).
- **Materi diperjelas:** 34 kartu penjelasan bertahap dengan timbangan (4–5 kartu per level L0–L7) sebelum contoh soal, dan **analogi sehari-hari** di setiap ringkasan.
- **Animasi saat menjawab** (umpan balik singkat ≤ 0,8 detik): langkah benar → persamaan memantul + percikan bintang; salah → tombol bergoyang; soal selesai → perayaan kecil. Mati pada pengaturan "kurangi animasi".
- **Lebih banyak gambar lucu di latar menu** (13 simbol + 5 karakter: kotak-x, beban, balon yang tersenyum) dan parade karakter di Peta Belajar. Layar soal tetap tanpa gambar latar (EL03).
- **Centang persetujuan orang tua/wali dihapus dari aplikasi.** Persetujuan tetap wajib secara etik penelitian dan dikumpulkan di luar aplikasi (lembar persetujuan kertas).
