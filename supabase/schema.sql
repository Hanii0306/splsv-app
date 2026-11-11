-- SPLV app — database pemantauan siswa (Supabase / PostgreSQL)
-- Cara pakai: Supabase → SQL Editor → New query → tempel seluruh file ini → Run.
--
-- Privasi: hanya kode siswa (S01…), TANPA nama. Data dibaca guru/peneliti lewat Table Editor
-- (login pemilik proyek). Publik dengan kunci "anon/publishable" TIDAK bisa membaca tabel ini;
-- aplikasi hanya bisa melapor lewat fungsi lapor_siswa() yang memvalidasi setiap kolom.

create table if not exists public.siswa (
  id                     bigint generated always as identity primary key,
  kode_siswa             text        not null check (kode_siswa ~ '^[A-Z0-9_-]{2,32}$'),
  install_id             uuid        not null,           -- acak per pemasangan/browser, bukan ID perangkat
  platform               text        not null check (platform in ('web', 'android')),
  versi_aplikasi         text        check (char_length(versi_aplikasi) <= 20),
  terdaftar_pada         timestamptz not null default now(),
  terakhir_aktif         timestamptz not null default now(),
  level_dikuasai         text[]      not null default '{}',
  jumlah_level_dikuasai  int         generated always as (cardinality(level_dikuasai)) stored,
  soal_selesai           int         not null default 0 check (soal_selesai between 0 and 100000),
  nilai_kuis_terakhir    int         check (nilai_kuis_terakhir between 0 and 100),
  nilai_kuis_terbaik     int         check (nilai_kuis_terbaik between 0 and 100),
  salah_tanda            int         not null default 0 check (salah_tanda >= 0),
  salah_satu_ruas        int         not null default 0 check (salah_satu_ruas >= 0),
  salah_hitung           int         not null default 0 check (salah_hitung >= 0),
  salah_pemodelan        int         not null default 0 check (salah_pemodelan >= 0),
  kesalahan_dominan      text,
  unique (kode_siswa, install_id)
);

comment on table public.siswa is 'SPLV app: satu baris per kode siswa per perangkat/browser. Tanpa nama siswa.';

-- RLS aktif tanpa policy = tidak ada akses langsung untuk anon/authenticated (baca maupun tulis).
alter table public.siswa enable row level security;
revoke all on public.siswa from anon, authenticated;

-- Satu-satunya pintu masuk dari aplikasi. SECURITY DEFINER + validasi ketat.
create or replace function public.lapor_siswa(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kode    text   := upper(coalesce(p->>'kode_siswa', ''));
  v_install uuid   := (p->>'install_id')::uuid;
  v_plat    text   := coalesce(p->>'platform', '');
  v_levels  text[] := coalesce(array(select jsonb_array_elements_text(p->'level_dikuasai')), '{}');
  v_quiz    int    := nullif(p->>'nilai_kuis_terakhir', '')::int;
  v_best    int    := nullif(p->>'nilai_kuis_terbaik', '')::int;
begin
  if v_kode !~ '^[A-Z0-9_-]{2,32}$' then raise exception 'kode_siswa tidak valid'; end if;
  if v_plat not in ('web', 'android') then raise exception 'platform tidak valid'; end if;
  if cardinality(v_levels) > 20 or exists (select 1 from unnest(v_levels) l where l !~ '^L[0-9]{1,2}$') then
    raise exception 'level tidak valid';
  end if;

  insert into siswa as s (kode_siswa, install_id, platform, versi_aplikasi, level_dikuasai, soal_selesai,
                          nilai_kuis_terakhir, nilai_kuis_terbaik, salah_tanda, salah_satu_ruas,
                          salah_hitung, salah_pemodelan, kesalahan_dominan)
  values (v_kode, v_install, v_plat, left(p->>'versi_aplikasi', 20), v_levels,
          least(greatest(coalesce((p->>'soal_selesai')::int, 0), 0), 100000),
          v_quiz, v_best,
          greatest(coalesce((p->>'salah_tanda')::int, 0), 0), greatest(coalesce((p->>'salah_satu_ruas')::int, 0), 0),
          greatest(coalesce((p->>'salah_hitung')::int, 0), 0), greatest(coalesce((p->>'salah_pemodelan')::int, 0), 0),
          left(p->>'kesalahan_dominan', 40))
  on conflict (kode_siswa, install_id) do update set
    terakhir_aktif      = now(),
    platform            = excluded.platform,
    versi_aplikasi      = excluded.versi_aplikasi,
    level_dikuasai      = (select array(select distinct unnest(s.level_dikuasai || excluded.level_dikuasai) order by 1)),
    soal_selesai        = greatest(s.soal_selesai, excluded.soal_selesai),
    nilai_kuis_terakhir = coalesce(excluded.nilai_kuis_terakhir, s.nilai_kuis_terakhir),
    nilai_kuis_terbaik  = greatest(s.nilai_kuis_terbaik, excluded.nilai_kuis_terbaik),
    salah_tanda         = greatest(s.salah_tanda, excluded.salah_tanda),
    salah_satu_ruas     = greatest(s.salah_satu_ruas, excluded.salah_satu_ruas),
    salah_hitung        = greatest(s.salah_hitung, excluded.salah_hitung),
    salah_pemodelan     = greatest(s.salah_pemodelan, excluded.salah_pemodelan),
    kesalahan_dominan   = coalesce(excluded.kesalahan_dominan, s.kesalahan_dominan);
end;
$$;

revoke all on function public.lapor_siswa(jsonb) from public;
grant execute on function public.lapor_siswa(jsonb) to anon, authenticated;

-- Tampilan ringkas untuk guru/peneliti (buka di Table Editor atau SQL Editor).
create or replace view public.ringkasan_siswa
with (security_invoker = true) as
select kode_siswa,
       platform,
       terdaftar_pada,
       terakhir_aktif,
       jumlah_level_dikuasai,
       array_to_string(level_dikuasai, ' ') as level_dikuasai,
       soal_selesai,
       nilai_kuis_terakhir,
       nilai_kuis_terbaik,
       kesalahan_dominan
from public.siswa
order by terakhir_aktif desc;

revoke all on public.ringkasan_siswa from anon, authenticated;
