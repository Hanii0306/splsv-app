import { describe, expect, it } from 'vitest';
import {
  Fr, apply, bestOp, checkCards, genEquation, genStory, isEquivalent, isSolved, parse, quizItem,
  solutionSteps, solve, allTokens, checkTags,
} from '../src/engine/index.js';

const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L8'];

function autoSolve(text) {
  let eq = parse(text);
  let n = 0;
  while (!isSolved(eq) && n < 10) { eq = apply(eq, bestOp(eq)).after; n++; }
  return { eq, n };
}

describe('generator: unlimited practice', () => {
  for (const lv of LEVELS) {
    it(`${lv}: 300 items have integer solutions and are solvable step by step`, () => {
      const seen = new Set();
      for (let s = 0; s < 300; s++) {
        const text = genEquation(lv, s);
        seen.add(text);
        const sol = solve(parse(text));
        expect(typeof sol, text).toBe('object');
        expect(Fr.isInt(sol), text).toBe(true);
        const { eq, n } = autoSolve(text);
        expect(isSolved(eq), text).toBe(true);
        expect(isEquivalent(eq, parse(text)), text).toBe(true);
        expect(n, text).toBeLessThanOrEqual(6);
      }
      expect(seen.size, `${lv} variety`).toBeGreaterThan(40);
    });
  }

  it('is deterministic per seed', () => {
    expect(genEquation('L3', 42)).toBe(genEquation('L3', 42));
    expect(genEquation('L3', 42)).not.toBe(genEquation('L3', 43));
  });

  it('L0 stays easy (positive, small)', () => {
    for (let s = 0; s < 100; s++) expect(genEquation('L0', s)).toMatch(/^x \+ [1-9] = \d+$/);
  });
});

describe('generator: word problems', () => {
  it('200 stories: cards build the model, keywords exist, integer answer', () => {
    for (let s = 0; s < 200; s++) {
      const st = genStory(s);
      const answer = solve(parse(st.equation));
      expect(Fr.isInt(answer), st.equation).toBe(true);
      expect(Fr.toNumber(answer)).toBeGreaterThan(0);
      expect(checkCards(st, st.equation.split(' ').length && st.cards.slice(0, st.equation.split(' = ')[0].split(' ').length).length ? cardsFor(st) : []).ok, st.equation).toBe(true);
      const keys = allTokens(st).filter((t) => t.key).map((t) => t.id);
      expect(keys.length).toBeGreaterThan(1);
      expect(checkTags(st, keys).missing).toEqual([]);
    }
  });
});

/** Rebuild the target equation from the card bank (greedy, exact token match). */
function cardsFor(st) {
  const target = st.equation.replace(/\(x \+ (\d+)\)/g, '(x+$1)').split(' ').map((t) => t.replace(/\(x\+(\d+)\)/, '(x + $1)'));
  const bank = st.cards.slice();
  return target.map((t) => {
    const i = bank.indexOf(t);
    if (i < 0) throw new Error(`card ${t} missing for ${st.equation}`);
    bank.splice(i, 1);
    return t;
  });
}

describe('quiz & solutions', () => {
  it('quiz items have 4 unique options and one correct answer', () => {
    for (const lv of [...LEVELS, 'L7']) {
      for (let s = 0; s < 50; s++) {
        const q = quizItem(lv, s);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options[q.correct]).toBe(q.answer);
      }
    }
  });
  it('solution steps end at x = c', () => {
    const steps = solutionSteps('3(x - 2) = 12');
    expect(steps[0].text).toBe('3(x - 2) = 12');
    expect(steps.at(-1).text).toBe('x = 6');
    expect(steps[1].op).toMatch(/kedua ruas|Jabarkan/);
  });
});
