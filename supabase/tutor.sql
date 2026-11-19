-- SPLV app — log percakapan Detektif AI (untuk data penelitian).
-- Ditulis HANYA oleh Edge Function `tutor` (kunci service). Publik/aplikasi tidak bisa membaca atau menulis langsung.
-- Privasi: hanya kode siswa (S01…), tanpa nama. Kode siswa TIDAK dikirim ke penyedia AI.

create table if not exists public.percakapan_tutor (
  id               bigint generated always as identity primary key,
  waktu            timestamptz not null default now(),
  kode_siswa       text        check (kode_siswa ~ '^[A-Z0-9_-]{2,32}$'),
  install_id       uuid        not null,
  versi_aplikasi   text        check (char_length(versi_aplikasi) <= 20),
  mode             text        not null check (mode in ('item', 'materi')),
  item_id          text        check (item_id ~ '^L[0-9]-[0-9]{2}$'),
  kotak            int,
  salah            int,
  tingkat_bantuan  int         check (tingkat_bantuan between 1 and 4),
  pesan_siswa      text        not null check (char_length(pesan_siswa) <= 500),
  balasan_ai       text        not null check (char_length(balasan_ai) <= 700),
  diblokir         boolean     not null default false,   -- true = balasan AI menyebut jawaban akhir, diganti petunjuk aman
  model            text
);

create index if not exists percakapan_tutor_install_waktu on public.percakapan_tutor (install_id, waktu desc);
create index if not exists percakapan_tutor_waktu on public.percakapan_tutor (waktu desc);

comment on table public.percakapan_tutor is 'SPLV app: percakapan siswa dengan Detektif AI (Gemini). Tanpa nama siswa.';

alter table public.percakapan_tutor enable row level security;
revoke all on public.percakapan_tutor from anon, authenticated;

notify pgrst, 'reload schema';
