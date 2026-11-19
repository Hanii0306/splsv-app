-- SPLV app v2.0 — jawaban "Uji Coba Tes Mathematical Literacy" (4 soal, 21 tahap, skor maks 24).
-- Satu baris per tahap. Peneliti mengisi kolom `skor` di Table Editor; view `rekap_tes` menjumlahkan otomatis.
-- Privasi: hanya kode siswa (mis. 7A-01), tanpa nama. Publik tidak bisa membaca; aplikasi hanya bisa mengirim lewat RPC.

create table if not exists public.jawaban_tes (
  id              bigint generated always as identity primary key,
  dikirim_pada    timestamptz not null default now(),
  kode_siswa      text        not null check (kode_siswa ~ '^[A-Z0-9_-]{2,32}$'),
  install_id      uuid        not null,
  mode            text        not null check (mode in ('tes', 'latihan')),
  versi_aplikasi  text        check (char_length(versi_aplikasi) <= 20),
  waktu_mulai     timestamptz not null,
  waktu_selesai   timestamptz not null,
  soal            int         not null check (soal between 1 and 4),
  tahap           int         not null check (tahap between 1 and 6),
  label_tahap     text        not null check (char_length(label_tahap) <= 200),
  jawaban         text        not null default '' check (char_length(jawaban) <= 2000),
  skor_maks       int         not null check (skor_maks between 1 and 2),
  skor            int         check (skor between 0 and 2),        -- DIISI PENELITI
  catatan_peneliti text,
  unique (kode_siswa, install_id, waktu_mulai, soal, tahap),
  check (skor is null or skor <= skor_maks)
);

comment on table public.jawaban_tes is 'Jawaban tes ML per tahap. Isi kolom skor (0..skor_maks). Tanpa nama siswa.';
create index if not exists jawaban_tes_kode on public.jawaban_tes (kode_siswa, waktu_mulai);

alter table public.jawaban_tes enable row level security;
revoke all on public.jawaban_tes from anon, authenticated;

-- Satu-satunya pintu masuk dari aplikasi.
create or replace function public.kirim_jawaban_tes(p jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kode    text        := upper(coalesce(p->>'kode_siswa', ''));
  v_install uuid        := (p->>'install_id')::uuid;
  v_mode    text        := coalesce(p->>'mode', '');
  v_mulai   timestamptz := (p->>'waktu_mulai')::timestamptz;
  v_selesai timestamptz := (p->>'waktu_selesai')::timestamptz;
  v_rows    jsonb       := coalesce(p->'jawaban', '[]'::jsonb);
  r jsonb;
  n int := 0;
begin
  if v_kode !~ '^[A-Z0-9_-]{2,32}$' then raise exception 'kode_siswa tidak valid'; end if;
  if v_mode not in ('tes', 'latihan') then raise exception 'mode tidak valid'; end if;
  if jsonb_typeof(v_rows) <> 'array' or jsonb_array_length(v_rows) > 30 then raise exception 'jawaban tidak valid'; end if;
  for r in select * from jsonb_array_elements(v_rows) loop
    insert into jawaban_tes (kode_siswa, install_id, mode, versi_aplikasi, waktu_mulai, waktu_selesai,
                             soal, tahap, label_tahap, jawaban, skor_maks)
    values (v_kode, v_install, v_mode, left(p->>'versi_aplikasi', 20), v_mulai, v_selesai,
            (r->>'soal')::int, (r->>'tahap')::int, left(r->>'label_tahap', 200), left(coalesce(r->>'jawaban', ''), 2000),
            (r->>'skor_maks')::int)
    on conflict (kode_siswa, install_id, waktu_mulai, soal, tahap) do update
      set jawaban = excluded.jawaban, waktu_selesai = excluded.waktu_selesai, dikirim_pada = now();
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.kirim_jawaban_tes(jsonb) from public;
grant execute on function public.kirim_jawaban_tes(jsonb) to anon, authenticated;

-- Rekap per siswa per pengerjaan: Nilai = (Total Skor ÷ 24) × 100.
create or replace view public.rekap_tes
with (security_invoker = true) as
select kode_siswa,
       mode,
       waktu_mulai,
       max(waktu_selesai)                                   as waktu_selesai,
       count(*) filter (where jawaban <> '')                as tahap_terisi,
       count(skor)                                          as tahap_dinilai,
       sum(skor) filter (where soal = 1)                    as skor_soal_1,
       sum(skor) filter (where soal = 2)                    as skor_soal_2,
       sum(skor) filter (where soal = 3)                    as skor_soal_3,
       sum(skor) filter (where soal = 4)                    as skor_soal_4,
       coalesce(sum(skor), 0)                               as total_skor,
       round(coalesce(sum(skor), 0) / 24.0 * 100, 1)        as nilai
from public.jawaban_tes
group by kode_siswa, mode, waktu_mulai
order by waktu_mulai desc;

revoke all on public.rekap_tes from anon, authenticated;

-- Detektif AI (v2.0): soal kini T1–T4.
alter table public.percakapan_tutor drop constraint if exists percakapan_tutor_item_id_check;
alter table public.percakapan_tutor add constraint percakapan_tutor_item_id_check check (item_id ~ '^(L[0-9]-[0-9]{2}|T[1-4])$');

notify pgrst, 'reload schema';
