// Pure: turn local data into the monitoring row sent to Supabase (no I/O, unit-tested).

export const ERROR_FIELDS = {
  invalid_sign: 'salah_tanda',
  invalid_one_side: 'salah_satu_ruas',
  invalid_arithmetic: 'salah_hitung',
  modeling: 'salah_pemodelan',
};
export const ERROR_LABELS = {
  salah_tanda: 'Tanda / pindah ruas',
  salah_satu_ruas: 'Hanya satu ruas',
  salah_hitung: 'Salah hitung',
  salah_pemodelan: 'Pemodelan soal cerita',
};

/**
 * @param {{studentCode:string, quizLast?:number, quizBest?:number}} profile
 * @param {{levelId:string, status:string}[]} progressRows
 * @param {{type:string, payload?:object}[]} events   this student's local events
 * @param {{installId:string, platform:'web'|'android', version:string}} meta
 */
export function buildReport(profile, progressRows, events, meta) {
  const errors = { salah_tanda: 0, salah_satu_ruas: 0, salah_hitung: 0, salah_pemodelan: 0 };
  let items = 0;
  for (const e of events) {
    const p = e.payload || {};
    if (e.type === 'step' && ERROR_FIELDS[p.result]) errors[ERROR_FIELDS[p.result]] += 1;
    if (e.type === 'story_cards' && p.ok === false) errors.salah_pemodelan += 1;
    if (e.type === 'item_complete' && p.kind !== 'level' && p.kind !== 'interpret') items += 1;
  }
  const top = Object.entries(errors).sort((a, b) => b[1] - a[1])[0];
  return {
    kode_siswa: profile.studentCode,
    install_id: meta.installId,
    platform: meta.platform,
    versi_aplikasi: meta.version,
    level_dikuasai: progressRows.filter((r) => r.status === 'mastered').map((r) => r.levelId).sort(),
    soal_selesai: items,
    nilai_kuis_terakhir: Number.isFinite(profile.quizLast) ? profile.quizLast : null,
    nilai_kuis_terbaik: Number.isFinite(profile.quizBest) ? profile.quizBest : null,
    ...errors,
    kesalahan_dominan: top && top[1] > 0 ? ERROR_LABELS[top[0]] : null,
  };
}

/** Stable fingerprint to skip sending an unchanged report. */
export const fingerprint = (r) => JSON.stringify(r);
