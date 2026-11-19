// Uji Coba Tes Mathematical Literacy (4 soal, PDF verbatim). Pure: no React, no I/O (AGENTS.md §3).
// Answers are free text per "Tahap" exactly like the PDF; the researcher scores them (max 24).

/** @returns {Record<string, string[]>} one empty string per tahap */
export function emptyAnswers(test) {
  return Object.fromEntries(test.items.map((it) => [it.id, it.tahap.map(() => '')]));
}

/** Merge a saved draft onto the current test shape (ignores unknown/old keys). */
export function restoreAnswers(test, draft) {
  const base = emptyAnswers(test);
  for (const it of test.items) {
    const saved = draft?.[it.id];
    if (Array.isArray(saved)) base[it.id] = it.tahap.map((_, k) => String(saved[k] ?? '').slice(0, 2000));
  }
  return base;
}

const filled = (s) => String(s ?? '').trim().length > 0;

/** @returns {{ filled:number, total:number, perItem: Record<string,{filled:number,total:number}> }} */
export function progressOf(test, answers) {
  const perItem = {};
  let f = 0; let t = 0;
  for (const it of test.items) {
    const a = answers[it.id] || [];
    const n = it.tahap.filter((_, k) => filled(a[k])).length;
    perItem[it.id] = { filled: n, total: it.tahap.length };
    f += n; t += it.tahap.length;
  }
  return { filled: f, total: t, perItem };
}

export const maxTotal = (test) => test.items.reduce((s, it) => s + it.tahap.reduce((a, t) => a + t.max, 0), 0);

/** Nilai = (Total Skor ÷ 24) × 100, one decimal. */
export const nilai = (total, max = 24) => Math.round((total / max) * 1000) / 10;

export const TWIN = [
  'Contoh sejenis: 3 buku dan 1 tas seharga Rp50.000. Harga tas Rp20.000.',
  'Misal harga buku = b: 3b + 20.000 = 50.000',
  'Kurangi 20.000 di kedua ruas: 3b = 30.000 → b = 10.000',
  'Cek: 3 × 10.000 + 20.000 = 50.000 ✓',
];
export const CLUE_TITLE = { 1: 'Pertanyaan pemantik', 2: 'Petunjuk langkah', 3: 'Contoh kasus sejenis', 4: 'Berkas penyelesaian' };

/**
 * Practice-mode clue ladder H1→H4 for one soal. H4 (the worked solution, contains the answer) only after
 * the student wrote something in at least one tahap of this soal (GL03). Test mode never shows clues.
 */
export function testClue(item, level, attempted) {
  if (level < 1 || level > 4) return null;
  if (level === 4 && !attempted) return null;
  const lines = { 1: [item.clue], 2: [item.step], 3: TWIN, 4: item.steps }[level];
  return { level, title: CLUE_TITLE[level], lines };
}

/**
 * Payload for Supabase rpc kirim_jawaban_tes: one row per tahap (researcher fills `skor`).
 * @param {{ kode:string, installId:string, mode:'tes'|'latihan', version:string, start:number, end:number }} meta
 */
export function buildSubmission(test, answers, meta) {
  const rows = [];
  for (const it of test.items) {
    it.tahap.forEach((t, k) => rows.push({
      soal: it.no, tahap: k + 1, label_tahap: t.label, skor_maks: t.max,
      jawaban: String(answers[it.id]?.[k] ?? '').trim().slice(0, 2000),
    }));
  }
  return {
    kode_siswa: meta.kode, install_id: meta.installId, mode: meta.mode, versi_aplikasi: meta.version,
    waktu_mulai: new Date(meta.start).toISOString(), waktu_selesai: new Date(meta.end).toISOString(), jawaban: rows,
  };
}
