import { describe, expect, it } from 'vitest';
import {
  Fr, apply, bestOp, classifyResult, defaultWhy, feedbackFor, isEquivalent, isSolved, parse, resultChoices,
  satisfies, solveInequality, toText,
} from '../src/engine/index.js';

const sol = (t) => { const s = solveInequality(parse(t)); return `x ${s.rel} ${Fr.fracToString(s.value)}`; };

describe('PtLSV (L8)', () => {
  it.each([
    ['x + 3 < 7', 'x < 4'],
    ['-2x < 8', 'x > -4'],
    ['3x - 4 ≥ 11', 'x ≥ 5'],
    ['-3x <= 12', 'x ≥ -4'],
    ['4x + 1 ≥ 2x + 9', 'x ≥ 4'],
    ['2x - 3 ≤ 5x + 6', 'x ≥ -3'],
  ])('%s → %s', (t, want) => expect(sol(t)).toBe(want));

  it('dividing by a negative number flips the relation', () => {
    const eq = parse('-2x < 8');
    const step = apply(eq, bestOp(eq));
    expect(toText(step.after)).toBe('x > -4');
    expect(step.explanation).toMatch(/DIBALIK/);
  });

  it('adding does not flip the relation', () => {
    const eq = parse('x - 5 > -2');
    expect(toText(apply(eq, bestOp(eq)).after)).toBe('x > 3');
  });

  it('offers the "forgot to flip" distractor with its own feedback', () => {
    const eq = parse('-3x ≤ 12');
    const choices = resultChoices(eq, bestOp(eq));
    const flip = choices.find((c) => c.kind === 'invalid_sign' && c.detail === 'flip');
    expect(flip && toText(flip.eq)).toBe('x ≤ -4');
    const r = classifyResult(flip);
    expect(feedbackFor(r.result, r.detail)).toMatch(/dibalik/);
    expect(choices.find((c) => c.kind === 'correct').eq.rel).toBe('≥');
  });

  it('auto-solves and stays equivalent', () => {
    for (const t of ['-2x + 5 < 11', '4x + 1 ≥ 2x + 9', '-x + 4 > 1', '2x - 3 ≤ 5x + 6']) {
      let eq = parse(t);
      for (let i = 0; i < 8 && !isSolved(eq); i++) eq = apply(eq, bestOp(eq)).after;
      expect(isSolved(eq), t).toBe(true);
      expect(isEquivalent(eq, parse(t)), t).toBe(true);
    }
  });

  it('satisfies() checks a candidate value', () => {
    const eq = parse('-2x < 8');
    expect(satisfies(eq, Fr.frac(0))).toBe(true);
    expect(satisfies(eq, Fr.frac(-5))).toBe(false);
  });

  it('why-prompt asks about flipping', () => {
    expect(defaultWhy({ kind: 'div', k: Fr.frac(-2) }, '<').question).toMatch(/dibalik/);
    expect(defaultWhy({ kind: 'div', k: Fr.frac(-2) }, '=').question).toMatch(/dibagi/);
  });

  it('equations still work as before', () => {
    expect(toText(parse('2x + 5 = 15'))).toBe('2x + 5 = 15');
    expect(() => parse('x < 3 < 5')).toThrow();
  });
});
