# AGENTS.md — Panduan untuk AI Coding Agent

File ini wajib dibaca oleh setiap AI agent (Claude Code, Copilot, Cursor, dll.) sebelum mengubah kode di
repositori ini. Proyek ini dikembangkan secara *vibe coding* oleh mahasiswa Pendidikan Matematika. Karena
itu, keputusan pedagogis lebih penting daripada selera teknis agent.

## 1. Konteks wajib
- Baca dulu [prd.md](prd.md) (apa & mengapa), [design.md](design.md) (bagaimana tampil),
  [architecture.md](architecture.md) (di mana kode berada), dan [api.md](api.md) (kontrak antarmodul).
- Ambil pekerjaan dari [task.md](task.md). Kerjakan satu task ID per perubahan, dan setelah selesai
  tandai `[x]` disertai catatan singkat.
- Bahasa UI: **Bahasa Indonesia**. Bahasa kode (nama variabel, fungsi, komentar): **Inggris**.

## 2. Aturan pedagogis (tidak boleh dilanggar)
Setiap aturan mengacu pada kode temuan wawancara.

1. **Jangan tampilkan jawaban akhir** sebelum siswa mencoba minimal 1 kali (GL03, DS03).
2. **Jangan tambahkan dekorasi** (maskot, kartun, partikel, confetti, latar bergambar) yang tidak membawa
   informasi matematika (EL03, DS03). Konfirmasi keberhasilan cukup berupa animasi kecil yang bermakna
   (misalnya timbangan seimbang + centang).
   Diizinkan sejak v1.2 karena membawa informasi: wajah timbangan (senyum = seimbang, cemas = miring),
   lencana bersimbol konsep level, dan perayaan simbol matematika **hanya** di layar akhir level/kuis.
3. **Satu langkah per layar.** Jangan menggabungkan beberapa transformasi dalam satu interaksi (IL02, EL04).
4. **Tidak ada auto-advance / autoplay.** Siswa selalu yang menekan "Lanjut" (EL04, K02 "video cepet banget").
5. **Teks dan visual berdekatan.** Persamaan simbolik selalu tampil tepat di bawah atau di atas timbangan,
   dan siswa tidak boleh perlu menggulir untuk mencocokkannya (EL02).
6. **Maksimal 3 tombol aksi utama** per layar (DS03).
7. **Warna penanda** hanya dari token di `design.md` §3. Jangan menambah warna semantik baru.
8. **"Pindah ruas" selalu dijelaskan sebagai operasi yang sama pada kedua ruas.** Jangan menulis aturan
   hafalan "pindah ruas ganti tanda" tanpa visual kesetaraan (IL01).
9. **Hint mengikuti tangga H1→H4** dan pemicu "2 kesalahan berturut-turut" (DS02). Jangan mengubah ambang
   ini tanpa mengubah `prd.md`.
10. Kalimat instruksi ≤ 15 kata, dan kalimat soal cerita ≤ 20 kata per potongan (EL01).

Jika sebuah permintaan bertentangan dengan aturan di atas, **berhenti dan tanyakan** kepada pengembang.
Jangan diam-diam mengikuti permintaan itu.

## 3. Aturan teknis
- Bahasa: **JavaScript** (React + Vite) di `app/`, **Python** (FastAPI) di `server/`. Jangan menambah
  TypeScript atau bahasa lain. Dokumentasikan tipe dengan JSDoc (JS) dan type hints (Python).
- Server: setiap endpoint yang membaca data kelas wajib memeriksa kepemilikan guru (`_owned_class`) dan
  wajib punya uji pytest.
- **Mesin persamaan (`src/engine/`) harus murni**: tanpa React, tanpa Three.js, tanpa I/O. Setiap fungsi
  publik wajib punya uji Vitest, termasuk kasus tanda negatif, pecahan, dan variabel di kedua ruas.
- Aritmetika memakai **pecahan eksak** (`Fraction`), bukan `number` floating point, untuk koefisien persamaan.
- Three.js hanya boleh berada di `src/scene3d/`. Komponen UI berkomunikasi dengan scene lewat
  `ScaleController` (lihat `api.md` §3). Jangan mengimpor `three` dari luar folder itu.
- Scene 3D wajib: render-on-demand (bukan loop terus-menerus), `pixelRatio` ≤ 2, `dispose()` saat unmount,
  dan fallback 2D bila WebGL gagal.
- Konten (soal, hint, teks) disimpan di `content/*.json` sesuai skema `api.md` §2. Jangan menulis soal
  di dalam komponen.
- Semua event belajar dicatat lewat `logEvent()` (`api.md` §4). Jangan mencatat nama, lokasi, atau ID
  perangkat.
- Tidak boleh ada dependensi baru tanpa alasan tertulis di commit message. Hindari library UI besar.
- Jalankan `npm run lint && npm test` sebelum menyatakan task selesai. Laporkan hasilnya apa adanya.

## 4. Struktur folder (ringkas)
```
src/
  app/        shell, routing, provider
  features/   layar per fitur (diagnostic, lesson, practice, story, review)
  engine/     mesin persamaan, hint, adaptif (murni, teruji)
  scene3d/    Three.js: timbangan, objek, kontroler
  ui/         komponen UI dasar (Button, EquationLine, HintPanel)
  storage/    Dexie: progres, log
  telemetry/  logEvent, ekspor
content/      JSON soal & hint per level
```

## 5. Privasi
- Jangan pernah meng-commit transkrip wawancara, foto, atau data uji coba siswa.
- Kode siswa (S01…) saja yang boleh muncul di data. Jangan menempelkan data siswa ke prompt layanan eksternal.

## 6. Definisi selesai (Definition of Done)
- [ ] Kriteria terima di `prd.md` untuk fitur terkait terpenuhi
- [ ] Lint & uji lulus
- [ ] Dicoba di emulator Android (atau HP) dengan layar 360×640 dp
- [ ] Tidak melanggar aturan pedagogis §2
- [ ] `task.md` diperbarui
