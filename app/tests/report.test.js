import { describe, expect, it } from 'vitest';
import { buildReport, fingerprint } from '../src/sync/report.js';

const meta = { installId: '6f1c2a40-0000-4000-8000-000000000001', platform: 'web', version: '1.5.0' };

describe('monitoring report (Supabase row)', () => {
  it('summarises levels, items, quiz and errors without names', () => {
    const r = buildReport(
      { studentCode: 'S07', quizLast: 70, quizBest: 90, name: 'should not leak' },
      [{ levelId: 'L1', status: 'mastered' }, { levelId: 'L0', status: 'mastered' }, { levelId: 'L2', status: 'active' }],
      [
        { type: 'step', payload: { result: 'invalid_sign' } },
        { type: 'step', payload: { result: 'invalid_sign' } },
        { type: 'step', payload: { result: 'invalid_one_side' } },
        { type: 'step', payload: { result: 'valid_progress' } },
        { type: 'story_cards', payload: { ok: false } },
        { type: 'item_complete', payload: { levelId: 'L1' } },
        { type: 'item_complete', payload: { levelId: 'L1' } },
        { type: 'item_complete', payload: { kind: 'level', levelId: 'L1' } },
      ],
      meta,
    );
    expect(r).toEqual({
      kode_siswa: 'S07', install_id: meta.installId, platform: 'web', versi_aplikasi: '1.5.0',
      level_dikuasai: ['L0', 'L1'], soal_selesai: 2, nilai_kuis_terakhir: 70, nilai_kuis_terbaik: 90,
      salah_tanda: 2, salah_satu_ruas: 1, salah_hitung: 0, salah_pemodelan: 1,
      kesalahan_dominan: 'Tanda / pindah ruas',
    });
    expect(JSON.stringify(r)).not.toMatch(/leak/);
  });

  it('new students report empty values', () => {
    const r = buildReport({ studentCode: 'S01' }, [], [], { ...meta, platform: 'android' });
    expect(r.level_dikuasai).toEqual([]);
    expect(r.nilai_kuis_terakhir).toBeNull();
    expect(r.kesalahan_dominan).toBeNull();
    expect(r.platform).toBe('android');
  });

  it('fingerprint changes only when data changes', () => {
    const a = buildReport({ studentCode: 'S01' }, [], [], meta);
    const b = buildReport({ studentCode: 'S01' }, [], [], meta);
    const c = buildReport({ studentCode: 'S01', quizLast: 50 }, [], [], meta);
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint(a)).not.toBe(fingerprint(c));
  });
});
