import { describe, expect, it } from 'vitest';
import test from '../src/content/test.json';
import {
  buildMessages, fallbackReply, helpLevel, leaksAnswer, MAX_HISTORY, protectedAnswers, quickPrompts, systemPrompt,
} from '../src/engine/tutor.js';

const item = (id) => test.items.find((i) => i.id === id);
const caseOf = () => ({ id: 'UJI', title: test.title, form: 'soal cerita' });

describe('helpLevel follows the H1→H4 ladder', () => {
  it('starts at 1 and grows with mistakes, opened clues and repeated asks', () => {
    expect(helpLevel({})).toBe(1);
    expect(helpLevel({ wrongs: 2 })).toBe(2);
    expect(helpLevel({ wrongs: 5 })).toBe(3);
    expect(helpLevel({ asks: 2 })).toBe(2);
    expect(helpLevel({ hintLevel: 4 })).toBe(4);
    expect(helpLevel({ hintLevel: 9, wrongs: 9 })).toBe(4);
  });
});

describe('answer-leak guard (AGENTS.md §2.1) on the 4 PDF soal', () => {
  it('Soal 1: the decision "Gelanggang C" is protected, comparing options is fine', () => {
    const s1 = item('T1');
    expect(leaksAnswer('Pilihan terbaik adalah Gelanggang C.', s1)).toBe(true);
    expect(leaksAnswer('Jawabannya: Gelanggang C', s1)).toBe(true);
    expect(leaksAnswer('Bandingkan biaya Gelanggang A, B, dan C untuk 4 jam. Mana yang lebih murah?', s1)).toBe(false);
  });
  it('Soal 2: p = 30 is protected, the model with given numbers is fine', () => {
    const s2 = item('T2');
    expect(leaksAnswer('Jadi p = 30.', s2)).toBe(true);
    expect(leaksAnswer('Hasilnya 30 paket.', s2)).toBe(true);
    expect(leaksAnswer('Kurangi 650.000 pada kedua ruas. Berapa sisanya?', s2)).toBe(false);
  });
  it('Soal 3: 67,50 cm protected in any notation', () => {
    const s3 = item('T3');
    expect(leaksAnswer('Panjangnya menjadi 67,5 cm', s3)).toBe(true);
    expect(leaksAnswer('Diperoleh x = 33,75', s3)).toBe(true);
    expect(leaksAnswer('Susun: x + (x + 15) + 2x = 150. Apa langkah berikutnya?', s3)).toBe(false);
  });
  it('Soal 4: 38 kotak / Rp14.000 / "tidak setuju" protected; quoting n = 38,636 is fine', () => {
    const s4 = item('T4');
    expect(leaksAnswer('Maksimal pesanan adalah 38 kotak.', s4)).toBe(true);
    expect(leaksAnswer('Sisanya Rp14.000', s4)).toBe(true);
    expect(leaksAnswer('Jawabanmu: Tidak setuju', s4)).toBe(true);
    expect(leaksAnswer('Kamu dapat n = 38,636. Apakah jumlah kotak boleh pecahan?', s4)).toBe(false);
  });
  it('protectedAnswers reads the kisi-kisi keys of essay soal', () => {
    expect(protectedAnswers(item('T2')).numbers).toContain('30');
    expect(protectedAnswers(item('T1')).texts).toEqual(['Gelanggang C']);
  });
});

describe('prompt building (RMT + CLT, no student data)', () => {
  it('system prompt forbids final answers and new questions, uses "kedua ruas"', () => {
    const s = systemPrompt('item', 1);
    expect(s).toMatch(/JANGAN PERNAH menyebut jawaban akhir/);
    expect(s).toMatch(/Jangan membuat soal latihan baru/);
    expect(s).toMatch(/kedua ruas/);
    expect(s).toMatch(/Rigorous Mathematical Thinking/);
    expect(s).toMatch(/15 kata/);
  });
  it('item mode includes the verbatim PDF question; history is trimmed', () => {
    const it2 = item('T2');
    const history = Array.from({ length: 10 }, (_, k) => ({ role: k % 2 ? 'assistant' : 'user', content: `pesan ${k}` }));
    const m = buildMessages({ mode: 'item', item: it2, caseInfo: caseOf(), level: 2, history, message: 'bingung' });
    expect(m[0].role).toBe('system');
    expect(m[0].content).toContain(it2.stem[0]);
    expect(m[0].content).toContain(it2.tahap[3].label);
    expect(m).toHaveLength(1 + MAX_HISTORY + 1);
    expect(m.at(-1)).toEqual({ role: 'user', content: 'bingung' });
    expect(JSON.stringify(m)).not.toMatch(/S0\d|studentCode|kode_siswa/);
  });
  it('fallback and quick prompts stay short and never contain the key', () => {
    for (const i of test.items) {
      expect(leaksAnswer(fallbackReply(i, 1), i)).toBe(false);
      expect(quickPrompts('item', i).length).toBeLessThanOrEqual(3);
    }
    expect(quickPrompts('materi')).toHaveLength(3);
  });
});
