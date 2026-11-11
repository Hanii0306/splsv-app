# Memantau siswa SPLV app dengan Supabase

Setelah ini selesai, setiap siswa yang **mendaftar atau belajar** (lewat link web maupun APK) otomatis
muncul di tabel Supabase Anda: kode siswa, waktu daftar, terakhir aktif, level dikuasai, soal selesai,
nilai kuis, kesalahan dominan, dan platform (web/android). **Tanpa nama siswa.**

## 1. Buat proyek (sekali, ±5 menit)
1. Buka https://supabase.com → **Start your project** → masuk dengan akun GitHub/Google.
2. **New project** → nama `splsv-app` → buat password database (simpan baik-baik) → region **Southeast Asia (Singapore)** → **Create**.
3. Tunggu ±2 menit sampai proyek siap.

## 2. Buat tabel
1. Menu kiri **SQL Editor** → **New query**.
2. Salin seluruh isi file `supabase/schema.sql`, tempel, lalu klik **Run**. Harus muncul "Success".

## 3. Kirim 2 data ini ke pengembang/AI
Menu **Project Settings → API** (atau **Data API / API Keys**):
- **Project URL**, contoh `https://abcdxyz.supabase.co`
- **Publishable key** (`sb_publishable_…`) atau **anon public key** (`eyJ…`)

Kunci ini memang boleh berada di aplikasi: dengan kunci itu orang luar **tidak bisa membaca** tabel siswa,
hanya bisa melapor lewat fungsi `lapor_siswa()` yang memeriksa setiap data.
**Jangan pernah** membagikan **service_role key** atau password database.

## 4. Melihat data siswa
- **Table Editor → siswa** (data lengkap), atau **SQL Editor**:
  ```sql
  select * from ringkasan_siswa;            -- urut dari yang terakhir aktif
  select count(*) from siswa;               -- jumlah siswa terdaftar
  select platform, count(*) from siswa group by platform;
  ```
- Ekspor: di Table Editor klik **Export → CSV** (bisa langsung dianalisis dengan `research/`).

## Catatan
- Satu siswa yang memakai 2 perangkat/browser akan tercatat sebagai 2 baris (kode sama, `install_id` beda).
- Data dikirim saat online; bila offline, terkirim otomatis begitu ada internet.
- Persetujuan orang tua/wali untuk pengumpulan data tetap dikumpulkan di luar aplikasi (etik penelitian).
