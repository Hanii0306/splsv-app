import { describe, expect, it } from 'vitest';
import test from '../src/content/test.json';
import { parse, solve } from '../src/engine/equation.js';
import * as F from '../src/engine/fraction.js';
import { buildSubmission, emptyAnswers, maxTotal, nilai, progressOf, restoreAnswers, testClue } from '../src/engine/test.js';

describe('content/test.json = PDF "Uji Coba Tes Mathematical Literacy" (verbatim)', () => {
  it('exactly 4 soal, indicators and per-tahap scores as in the PDF (total 24)', () => {
    expect(test.items.map((i) => i.title)).toEqual([
      'Memilih Paket Sewa Lapangan Futsal', 'Bantuan Paket Sembako Desa', 'Potongan Pita Dekorasi', 'Pemesanan Kotak Makan Katering',
    ]);
    expect(test.items.map((i) => i.tahap.length)).toEqual([5, 6, 4, 6]);
    expect(test.items.map((i) => i.tahap.map((t) => t.max).join(''))).toEqual(['12111', '111111', '1221', '111111']);
    test.items.forEach((i) => expect(i.tahap.reduce((s, t) => s + t.max, 0)).toBe(i.max));
    expect(maxTotal(test)).toBe(24);
    expect(test.maxTotal).toBe(24);
    expect(test.petunjuk).toHaveLength(4);
  });

  it('key facts in the stems match the kisi-kisi (engine-checked)', () => {
    const sol = (id) => F.toNumber(solve(parse(test.items.find((i) => i.id === id).eq)));
    expect(sol('T2')).toBe(30);
    expect(sol('T3') * 2).toBe(67.5);
    expect(test.items[0].list).toHaveLength(3);
    expect(test.items[3].stem[0]).toContain('22.000n + 50.000 = 900.000');
  });
});

describe('answers, progress, submission', () => {
  it('empty → restore → progress', () => {
    const a = emptyAnswers(test);
    expect(Object.keys(a)).toEqual(['T1', 'T2', 'T3', 'T4']);
    expect(progressOf(test, a)).toMatchObject({ filled: 0, total: 21 });
    const r = restoreAnswers(test, { T1: ['misal x = jam', '', ' '], OLD: ['x'] });
    expect(r.T1).toHaveLength(5);
    expect(progressOf(test, r).filled).toBe(1);
    expect(progressOf(test, r).perItem.T1).toEqual({ filled: 1, total: 5 });
  });

  it('submission has one row per tahap (21) with labels and max scores; no score from the app', () => {
    const a = restoreAnswers(test, { T2: ['dana 4.250.000', 'p = paket'] });
    const s = buildSubmission(test, a, { kode: '7A-01', installId: 'x', mode: 'tes', version: '2.0.0', start: 0, end: 60_000 });
    expect(s.jawaban).toHaveLength(21);
    expect(s.jawaban.reduce((n, r) => n + r.skor_maks, 0)).toBe(24);
    expect(s.jawaban.find((r) => r.soal === 2 && r.tahap === 1)).toMatchObject({ jawaban: 'dana 4.250.000', label_tahap: 'Tahap 1. Menuliskan informasi yang diketahui:' });
    expect(s.jawaban.every((r) => !('skor' in r))).toBe(true);
    expect(s.waktu_selesai).toBe('1970-01-01T00:01:00.000Z');
  });

  it('nilai = total ÷ 24 × 100', () => {
    expect(nilai(24)).toBe(100);
    expect(nilai(18)).toBe(75);
    expect(nilai(7)).toBe(29.2);
  });
});

describe('practice-mode clue ladder', () => {
  it('H1–H3 always, H4 (worked solution) only after the student wrote something', () => {
    const it2 = test.items[1];
    expect(testClue(it2, 1, false).lines).toEqual([it2.clue]);
    expect(testClue(it2, 3, false).lines.length).toBeGreaterThan(1);
    expect(testClue(it2, 4, false)).toBeNull();
    expect(testClue(it2, 4, true).lines).toEqual(it2.steps);
  });
});
