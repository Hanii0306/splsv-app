import { describe, expect, it } from 'vitest';
import cases from '../src/content/cases.json';
import { parse, solve } from '../src/engine/equation.js';
import * as F from '../src/engine/fraction.js';
import {
  blanksIn, caseClue, checkBox, expectedOf, maxClueAllowed, parseAnswer, rankFor, totalXp, xpForCase, xpForItem,
} from '../src/engine/cases.js';

const num = (s) => {
  const f = parseAnswer(s);
  return f ? F.toNumber(f) : null;
};

describe('parseAnswer (Indonesian notation)', () => {
  it('handles signs, unicode minus, decimals, thousands and fractions', () => {
    expect(num('-8')).toBe(-8);
    expect(num('−8')).toBe(-8);
    expect(num('+5')).toBe(5);
    expect(num('33,75')).toBe(33.75);
    expect(num('20.000')).toBe(20000);
    expect(num('Rp 1.850.000')).toBe(1850000);
    expect(num('3/4')).toBe(0.75);
    expect(num('-3/4')).toBe(-0.75);
    expect(num('98 m²')).toBe(98);
    expect(num('0')).toBe(0);
  });
  it('rejects garbage', () => {
    expect(parseAnswer('')).toBeNull();
    expect(parseAnswer('x')).toBeNull();
    expect(parseAnswer('1/0')).toBeNull();
    expect(parseAnswer('--3')).toBeNull();
  });
});

describe('checkBox', () => {
  it('numeric boxes compare exactly, per blank', () => {
    expect(checkBox({ text: 'y = □', answer: '-8' }, ['−8']).ok).toBe(true);
    expect(checkBox({ text: 'y = □', answer: '-8' }, ['8'])).toEqual({ ok: false, wrong: [0] });
    expect(checkBox({ text: '□x − □x = 12 + 8', answer: ['7', '3'] }, ['7', '4'])).toEqual({ ok: false, wrong: [1] });
    expect(checkBox({ text: 'x = □', answer: '3/2' }, ['1,5']).ok).toBe(true);
  });
  it('choice boxes compare the picked index', () => {
    const b = { text: 'Pernyataan itu …', choices: ['Benar', 'Salah'], answer: 1 };
    expect(checkBox(b, 1).ok).toBe(true);
    expect(checkBox(b, 0).ok).toBe(false);
  });
});

describe('clue ladder H1→H4', () => {
  const c = cases[0];
  const item = c.items[0];
  it('never shows the worked solution (H4) before an attempt', () => {
    expect(caseClue(item, c, 4, 0)).toBeNull();
    expect(caseClue(item, c, 4, 1).lines).toEqual(item.steps);
    expect(maxClueAllowed(0)).toBe(3);
  });
  it('H1–H3 never contain the final answer of MC items', () => {
    for (const cs of cases) {
      for (const it of cs.items.filter((x) => x.kind === 'mc' && x.eq)) {
        const ans = String(F.fracToString(solve(parse(it.eq))));
        expect(it.clue.includes(`= ${ans}.`)).toBe(false);
      }
    }
  });
});

describe('XP and ranks', () => {
  it('rewards clean work, never goes below the floor', () => {
    expect(xpForItem({ wrongs: 0, maxHint: 0 })).toBe(10);
    expect(xpForItem({ wrongs: 1, maxHint: 1 })).toBe(7);
    expect(xpForItem({ wrongs: 5, maxHint: 4 })).toBe(2);
    expect(xpForCase(Array(10).fill({ wrongs: 0, maxHint: 0 }))).toBe(120);
    expect(xpForCase([])).toBe(0);
  });
  it('total XP sums best-per-case and ranks climb', () => {
    expect(totalXp({ L1: { xp: 120 }, L2: { xp: 90 }, L3: {} })).toBe(210);
    expect(rankFor(0).name).toBe('Rekrut');
    expect(rankFor(210).name).toBe('Agen Lapangan');
    expect(rankFor(840).name).toBe('Master Detective');
    expect(rankFor(840).next).toBeNull();
  });
});

describe('content/cases.json (instrument: 7 levels × 10 items)', () => {
  it('has 7 cases L1–L7 with 6 MC + 4 scaffolded items each', () => {
    expect(cases.map((c) => c.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']);
    for (const c of cases) {
      expect(c.items).toHaveLength(10);
      expect(c.items.slice(0, 6).every((i) => i.kind === 'mc')).toBe(true);
      expect(c.items.slice(6).every((i) => i.kind === 'steps')).toBe(true);
      expect(new Set(c.items.map((i) => i.id)).size).toBe(10);
    }
  });

  it('every item has a full clue ladder and a valid indicator', () => {
    for (const c of cases) {
      expect(c.twin.length).toBeGreaterThan(1);
      for (const i of c.items) {
        expect(['employ', 'formulate', 'interpret', 'reason']).toContain(i.ind);
        expect(i.clue && i.step && i.steps.length >= 3).toBeTruthy();
      }
    }
  });

  it('MC answer keys match the equation engine', () => {
    for (const c of cases) {
      for (const i of c.items.filter((x) => x.kind === 'mc')) {
        expect(i.options).toHaveLength(4);
        expect(i.answer).toBeGreaterThanOrEqual(0);
        expect(i.answer).toBeLessThan(4);
        if (!i.eq || c.id === 'L7') continue;
        const sol = solve(parse(i.eq));
        const opt = i.options[i.answer].replace(/^[a-z]\s*=\s*/, '');
        expect(F.eq(parseAnswer(opt), sol), `${i.id}: ${i.options[i.answer]}`).toBe(true);
        // distractors must be wrong
        i.options.forEach((o, k) => {
          if (k === i.answer) return;
          const v = parseAnswer(o.replace(/^[a-z]\s*=\s*/, ''));
          expect(v && F.eq(v, sol), `${i.id} distractor ${o}`).toBeFalsy();
        });
      }
    }
  });

  it('the final numeric box of each scaffolded equation item is the engine solution', () => {
    for (const c of cases.slice(0, 6)) {
      for (const i of c.items.filter((x) => x.kind === 'steps')) {
        const sol = solve(parse(i.eq));
        const finalBox = i.boxes.filter((b) => !b.choices && blanksIn(b.text) === 1).find((b) => /^[a-z] = □$|^x = □|= □$/.test(b.text) && /^(Nilai |Langkah 2: |Penyelesaian yang tepat: |Jika .*maka )?[a-z] = □$/.test(b.text.replace(/^Nilai x yang (tepat|benar) = □$/, 'x = □').replace(/^Nilai x yang memenuhi = □$/, 'x = □')));
        expect(finalBox, i.id).toBeTruthy();
        expect(F.eq(parseAnswer(finalBox.answer), sol), i.id).toBe(true);
      }
    }
  });

  it('story items model the right equation (L7)', () => {
    const l7 = cases[6].items;
    const sol = (id) => F.toNumber(solve(parse(l7.find((i) => i.id === id).eq)));
    expect(sol('L7-02')).toBe(30);
    expect(sol('L7-03')).toBe(18);
    expect(sol('L7-04') * 2).toBe(67.5);
    expect(sol('L7-05') + 4).toBe(28);
    expect(sol('L7-07')).toBe(4);
    expect(sol('L7-09')).toBe(12);
    expect(sol('L7-10')).toBe(20000);
  });

  it('every box has as many answers as blanks, and every answer parses', () => {
    for (const c of cases) {
      for (const i of c.items.filter((x) => x.kind === 'steps')) {
        for (const b of i.boxes) {
          if (b.choices) { expect(b.answer).toBeLessThan(b.choices.length); continue; }
          expect(expectedOf(b)).toHaveLength(blanksIn(b.text));
          expectedOf(b).forEach((a) => expect(parseAnswer(a), `${i.id} ${b.text}`).not.toBeNull());
        }
      }
    }
  });

  it('story chunks stay ≤ 20 words (EL01)', () => {
    for (const c of cases) {
      for (const line of [...c.briefing, ...c.items.flatMap((i) => i.prompt)]) {
        expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(20);
      }
    }
  });
});
