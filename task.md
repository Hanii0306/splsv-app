# Task — Rencana Kerja ADDIE

Format: `[ ]` belum, `[~]` sedang, `[x]` selesai. Setiap task punya ID dan merujuk ke fitur di `prd.md`.

## A. Analysis (lanjutan)
- [x] T-A01 Susun pedoman wawancara CLT (IL/EL/GL)
- [x] T-A02 Wawancara S01 (5 Nov 2026, 35 menit) + matriks temuan → fitur
- [ ] T-A03 Wawancara **S02** dengan variasi kemampuan berbeda, karena pedoman mensyaratkan minimal 2 informan
- [ ] T-A04 Triangulasi: bandingkan dengan artefak (LKS, catatan siswa, soal pemicu) dan dokumentasikan perbedaan antarinforman
- [ ] T-A05 Analisis kurikulum: CP Fase D (Kurikulum Merdeka) untuk persamaan linear, TP, dan ATP
- [ ] T-A06 Wawancara/observasi singkat guru: urutan mengajar, kesalahan umum, ketersediaan HP di kelas
- [ ] T-A07 Survei perangkat siswa (versi Android, RAM, kuota, akses internet)

## B. Design
- [x] T-D01 Draf PRD, desain, arsitektur, API, AGENTS (dokumen ini)
- [x] T-D02 Interview pengembang untuk menutup **Keputusan tertunda** (bagian F)
- [ ] T-D03 Susun bank soal L0–L7 (≥ 8 soal per level) + 10 soal cerita bermetadata literasi
- [ ] T-D04 Tulis teks hint H1–H3 per jenis kesalahan per level
- [ ] T-D05 Storyboard/wireframe layar (Figma atau kertas) untuk 6 layar inti
- [ ] T-D06 Kisi-kisi & butir **tes literasi matematis** pre/post (terpisah dari soal aplikasi), rubrik 3 proses
- [ ] T-D07 Adaptasi kuesioner beban kognitif (Klepsch dkk., 2017) ke bahasa siswa SMP + skala Paas
- [ ] T-D08 Lembar validasi ahli materi & ahli media

## C. Development
### Sprint 0 — Fondasi
- [x] T-V01 Inisialisasi Vite + React (JavaScript) + Vitest
- [~] T-V02 Capacitor Android + debug APK sudah di-build (`apk/`). **Belum dicoba di HP fisik**
- [x] T-V03 Token desain (`styles/tokens.css`) mode terang/gelap

### Sprint 1 — Mesin persamaan (F2)
- [x] T-V10 `fraction.js` + uji
- [x] T-V11 `equation.js` parse/normalize/solve + uji (negatif, kurung, pecahan, variabel di dua ruas)
- [x] T-V12 `transforms.js` + `explainMoveTerm` + uji
- [x] T-V13 `validator.js` dengan 6 kelas hasil + uji kasus IL01 (`−2x = 8`)

### Sprint 2 — Timbangan 3D (F1, F3)
- [x] T-V20 `ScaleScene` low-poly + render-on-demand
- [x] T-V21 Objek InstancedMesh: kotak-x, beban, balon
- [x] T-V22 `ScaleController.apply()` animasi kedua ruas + kemiringan untuk operasi satu ruas
- [x] T-V23 `Fallback2D` SVG + deteksi FPS rendah
- [ ] T-V24 Profil performa di HP fisik RAM 3–6 GB (target §5 architecture.md)

### Sprint 3 — Alur latihan (F2, F6, F7, F8, F9)
- [x] T-V30 Layar latihan "satu langkah per layar" + `EquationLine` dengan sorotan warna
- [x] T-V31 `hintEngine` + `HintPanel` (pemicu 2 salah, H1–H4, fading)
- [x] T-V32 Worked example → completion → practice per level
- [x] T-V33 Verifikasi substitusi + prompt "Mengapa?"
- [x] T-V34 Peta Belajar + `adaptive.isMastered`

### Sprint 4 — Diagnostik & soal cerita (F4, F5, F10)
- [x] T-V40 Diagnostik + profil prasyarat + modul penguatan
- [x] T-V41 Soal cerita 4 tahap (baca, tandai, misalkan, susun kartu)
- [x] T-V42 Glosarium kata kunci + cek kewajaran
- [x] T-V43 Kartu pola + soal transfer

### Sprint 5 — Data penelitian (F11)
- [x] T-V50 Dexie schema + `logEvent`
- [x] T-V51 Menu peneliti ber-PIN + ekspor CSV/JSON via Share Sheet
- [x] T-V52 Kuesioner beban kognitif dalam aplikasi

### Sprint 5b — Server, sinkronisasi & dashboard guru (F12)
- [x] T-V55 Pilih & siapkan server (Q13), skema tabel + aturan akses per kelas
- [x] T-V56 `sync/` outbox + SyncWorker + uji offline→online
- [x] T-V57 Alur join kelas di aplikasi siswa
- [x] T-V58 Dashboard guru: login, kelas, tabel siswa × level, grafik jenis kesalahan
- [x] T-V59 Uji privasi: guru A tidak dapat membaca kelas guru B

### Sprint 6 — Pemolesan
- [~] T-V60 Aksesibilitas: reduced motion, target ≥48dp, dan mode gelap sudah ada. TalkBack belum diuji
- [~] T-V61 Uji e2e alur utama: lulus di Chromium 360×740 (login→diagnostik→L0/L2/L5/L7→sinkron→dashboard), tetapi skripnya belum dimasukkan ke repo
- [x] T-V62 Signed release APK 1.0.0 (`apk/SPLV-app-1.0.0.apk`), HTTPS-only + CA lokal terbundel

## D. Implementation (uji coba)
- [ ] T-I01 Validasi ahli materi & media, lalu revisi (Aiken's V)
- [ ] T-I02 Uji perorangan (1–3 siswa): think-aloud dan bandingkan mode 2D vs 3D
- [ ] T-I03 Uji kelompok kecil (6–9 siswa) + angket kepraktisan
- [ ] T-I04 Uji lapangan: pretest → penggunaan aplikasi (± 4 pertemuan) → posttest + kuesioner CL

## E. Evaluation
- [ ] T-E01 Analisis N-gain literasi matematis
- [ ] T-E02 Analisis skor IL/EL/GL + triangulasi dengan log (waktu, kesalahan, hint)
- [ ] T-E03 Analisis kesalahan dominan (invalid_sign, pemodelan) sebelum/sesudah
- [ ] T-E04 Revisi akhir produk & laporan jejak keputusan ADDIE

## F. Keputusan tertunda (ditutup lewat interview)
| ID | Pertanyaan | Default sementara |
|---|---|---|
| Q1 | ✅ Platform | **Capacitor** (interview 10 Nov 2026) |
| Q2 | ✅ Spesifikasi HP siswa | **RAM 4–6 GB** (minimum 3 GB + fallback 2D) |
| Q3 | ✅ Konektivitas | **Offline + online**: offline-first dengan sinkronisasi |
| Q4 | ✅ Dashboard guru | **Ya, di v1** (perlu server) |
| Q13 | ✅ Penyedia server | **Python FastAPI** (diganti dari Supabase atas permintaan pengembang) |
| Q14 | ✅ Pembuat kode kelas & siswa | **Peneliti** membuat kode sebelum uji coba. Guru hanya melihat |
| Q5 | ✅ Perangkat | **1 HP = 1 siswa** (login sekali) |
| Q6 | ✅ Konteks pemakaian | **Di kelas + lanjut di rumah** |
| Q7 | ✅ Durasi sesi | **40+ menit** dibagi menjadi segmen ±12 menit dengan jeda (lihat design.md §2.1) |
| Q8 | ✅ Input jawaban | **Chip aksi + kartu** |
| Q9 | Fitur rekam suara untuk "Mengapa?" | Tidak di v1 |
| Q10 | ✅ Nama aplikasi | **SPLV app** (paket `id.ac.splv.app`) |
| Q11 | Orientasi layar | Potret terkunci |
| Q12 | ✅ Distribusi | **APK sideload** (WhatsApp/Drive), plus panduan instalasi 1 halaman untuk siswa/orang tua |
