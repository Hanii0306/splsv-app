import { describe, expect, it } from 'vitest';
import cases from '../src/content/cases.json';
import {
  buildMessages, fallbackReply, helpLevel, leaksAnswer, MAX_HISTORY, protectedAnswers, quickPrompts, systemPrompt,
} from '../src/engine/tutor.js';

const item = (id) => cases.flatMap((c) => c.items).find((i) => i.id === id);
const caseOf = (id) => cases.find((c) => c.id === id.slice(0, 2));

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

describe('answer-leak guard (AGENTS.md §2.1)', () => {
  it('MC: blocks the correct letter and the value, allows question numbers', () => {
    const it1 = item('L1-01'); // x + 9 = 17 → B (8)
    expect(leaksAnswer('Jawabannya B.', it1)).toBe(true);
    expect(leaksAnswer('Pilihan yang benar adalah (B).', it1)).toBe(true);
    expect(leaksAnswer('B benar karena…', it1)).toBe(true);
    expect(leaksAnswer('Jadi x = 8.', it1)).toBe(true);
    expect(leaksAnswer('Hasilnya 8', it1)).toBe(true);
    expect(leaksAnswer('Apa yang menempel pada x? Kurangi 9 pada kedua ruas.', it1)).toBe(false);
    expect(leaksAnswer('Berapa 17 − 9?', it1)).toBe(false);
  });
  it('negative numbers in any minus style', () => {
    const it4 = item('L1-04'); // m = −11
    expect(leaksAnswer('Maka m = −11.', it4)).toBe(true);
    expect(leaksAnswer('nilai m adalah -11', it4)).toBe(true);
    expect(leaksAnswer('Tambahkan 8 pada kedua ruas: m = −19 + 8. Berapa hasilnya?', it4)).toBe(false);
  });
  it('scaffolded: protects the current and later boxes, not solved ones', () => {
    const s = item('L1-07'); // boxes 14, 14, −8
    expect(protectedAnswers(s, 2).numbers).toEqual(['-8']);
    expect(leaksAnswer('Jadi y = −8.', s, 2)).toBe(true);
    expect(leaksAnswer('Kamu sudah benar: dikurangi 14. Sekarang hitung 6 − 14.', s, 2)).toBe(false);
  });
  it('money and fractions with Indonesian separators', () => {
    const t = item('L7-10'); // 20000 and 35000
    expect(leaksAnswer('Harga tiket anak adalah Rp20.000', t)).toBe(true);
    expect(leaksAnswer('Harga tiket anak = 20 000', t)).toBe(true);
    expect(leaksAnswer('Misalkan harga tiket anak a. Tiket dewasa a + 15.000.', t)).toBe(false);
    const ribbon = item('L7-04'); // 67,50 cm
    expect(leaksAnswer('Panjangnya menjadi 67,50 cm', ribbon)).toBe(true);
  });
  it('choice boxes (Benar/Salah) are protected', () => {
    const bs = item('L1-09');
    expect(leaksAnswer('Jawabannya "Salah".', bs, 0)).toBe(true);
    expect(leaksAnswer('Coba substitusi x = 8 ke persamaan. Apakah hasilnya 10?', bs, 0)).toBe(false);
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
    const it2 = item('L2-02');
    const history = Array.from({ length: 10 }, (_, k) => ({ role: k % 2 ? 'assistant' : 'user', content: `pesan ${k}` }));
    const m = buildMessages({ mode: 'item', item: it2, caseInfo: caseOf('L2-02'), level: 2, history, message: 'bingung' });
    expect(m[0].role).toBe('system');
    expect(m[0].content).toContain(it2.prompt[0]);
    expect(m).toHaveLength(1 + MAX_HISTORY + 1);
    expect(m.at(-1)).toEqual({ role: 'user', content: 'bingung' });
    expect(JSON.stringify(m)).not.toMatch(/S0\d|studentCode|kode_siswa/);
  });
  it('fallback and quick prompts stay short and never contain the key', () => {
    for (const c of cases) {
      for (const i of c.items) {
        expect(leaksAnswer(fallbackReply(i, 1), i)).toBe(false);
        expect(quickPrompts('item', i).length).toBeLessThanOrEqual(3);
      }
    }
    expect(quickPrompts('materi')).toHaveLength(3);
  });
});
