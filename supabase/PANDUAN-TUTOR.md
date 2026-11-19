# Panduan memasang Detektif AI (chatbot) — gratis

Chatbot memakai **Google Gemini (paket gratis)** lewat **Supabase Edge Function** `tutor`.
Kunci AI disimpan sebagai *secret* di Supabase. Kunci tidak ada di aplikasi, tidak ada di GitHub.

## 1. Buat kunci Gemini (gratis, tanpa kartu)
1. Buka https://aistudio.google.com/apikey dan masuk dengan akun Google.
2. Klik **Create API key**. Pilih atau buat project, lalu salin kunci (diawali `AIza…`).

## 2. Buat token Supabase (sementara)
1. Buka https://supabase.com/dashboard/account/tokens, lalu klik **Generate new token**.
2. Pilih izin **Read and write**. Setelah pemasangan selesai, token ini dicabut (**Revoke**).

## 3. Pemasangan (dijalankan oleh Claude atau pengembang)
- `supabase/tutor.sql` → membuat tabel `percakapan_tutor` (RLS aktif, publik tidak bisa membaca).
- `node supabase/build-tutor.mjs` → menyalin logika tutor dan 70 soal ke fungsi.
- Deploy fungsi `tutor` dengan `verify_jwt = false`. Fungsi memeriksa sendiri isi permintaan dan membatasi kuota.
- Secret yang diisi:

| Secret | Isi |
|---|---|
| `AI_API_KEY` | kunci Gemini `AIza…` |
| `AI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` |
| `AI_MODEL` | model Gemini gratis yang tersedia di akun (dipilih dari daftar model saat pemasangan) |
| `AI_FALLBACK_MODEL` | model gratis cadangan bila kuota model utama habis |
| `TUTOR_LIMIT_DEVICE` | batas tanya per perangkat per 24 jam (bawaan 60) |
| `TUTOR_LIMIT_TOTAL` | batas tanya semua siswa per 24 jam (bawaan 1200; sesuaikan dengan kuota gratis) |

**Pindah ke DeepSeek nanti:** cukup ubah `AI_API_KEY`, `AI_BASE_URL=https://api.deepseek.com`, dan `AI_MODEL=deepseek-chat`. Kode tidak perlu diubah.

## 4. Melihat percakapan (data penelitian)
Supabase → **Table Editor** → `percakapan_tutor`. Kolomnya:
- `kode_siswa`, `waktu`, `item_id` (soal), `kotak`
- `salah` (jumlah salah sebelum bertanya)
- `tingkat_bantuan` (1–4)
- `pesan_siswa`, `balasan_ai`
- `diblokir` (true = AI sempat menyebut jawaban akhir, lalu diganti petunjuk aman)

Klik **Export → CSV** untuk mengunduh. Percakapan juga tercatat di ekspor data aplikasi (event `tutor_chat`).

## Privasi
- Yang dikirim ke Google **hanya** bunyi soal dan pesan siswa. **Kode siswa tidak dikirim.**
- Pada paket gratis, Google boleh memakai isi percakapan untuk meningkatkan layanannya. Cantumkan hal ini di
  lembar persetujuan orang tua/sekolah. Ingatkan siswa untuk tidak menulis nama atau data pribadi
  (aplikasi juga menampilkan pengingat ini).
