import { describe, expect, it } from 'vitest';
import levels from '../src/content/levels.json';
import stories from '../src/content/stories.json';
import {
  Fr, apply, bestOp, checkCards, checkTags, chipOps, classifyOp, isMastered, isSolved,
  isStructured, onAttempt, initialHintState, parse, planMode, resultChoices, scoreDiagnostic,
  solve, toText, twinExample, allTokens, formatLinear, isEquivalent, hintFor,
} from '../src/engine/index.js';

const sol = (s) => Fr.fracToString(solve(parse(s)));

/** Follow bestOp to the end; returns the visited equations as text. */
function autoSolve(text, max = 10) {
  let eq = parse(text);
  const trail = [toText(eq)];
  for (let i = 0; i < max && !isSolved(eq); i++) {
    const op = bestOp(eq);
    if (!op) break;
    eq = apply(eq, op).after;
    trail.push(toText(eq));
  }
  return { eq, trail };
}

describe('fraction', () => {
  it('reduces and normalises sign', () => {
    expect(Fr.frac(4, -8)).toEqual({ n: -1, d: 2 });
    expect(Fr.fracToString(Fr.add(Fr.frac(1, 2), Fr.frac(1, 3)))).toBe('5/6');
    expect(Fr.fromDecimal(0.25)).toEqual({ n: 1, d: 4 });
  });
  it('rejects division by zero', () => {
    expect(() => Fr.div(Fr.ONE, Fr.ZERO)).toThrow();
  });
});

describe('parse', () => {
  it.each([
    ['2x + 5 = 15', '5'],
    ['-2x = 8', '-4'],
    ['3(x - 2) = 12', '6'],
    ['1/2(x + 3) = 5', '7'],
    ['x/3 + 2 = 6', '12'],
    ['2/3x = 8', '12'],
    ['5x − 3 = 2x + 9', '4'],
    ['-2(x - 3) = 10', '-2'],
    ['x + (x + 1) + (x + 2) = 45', '14'],
  ])('%s → x = %s', (eq, x) => expect(sol(eq)).toBe(x));

  it('detects structure', () => {
    expect(isStructured(parse('3(x - 2) = 12').left)).toBe(true);
    expect(isStructured(parse('2x + 5 = 15').left)).toBe(false);
    expect(isStructured(parse('x/3 + 2 = 6').left)).toBe(false);
  });

  it('formats canonically', () => {
    expect(formatLinear(parse('-x + 3 = 0').left.lin)).toBe('-x + 3');
    expect(formatLinear(parse('x/2 - 1 = 0').left.lin)).toBe('x/2 - 1');
  });

  it('rejects non-linear input', () => {
    expect(() => parse('x * x = 4')).toThrow();
    expect(() => parse('2x + 1')).toThrow();
  });

  it('handles no / infinite solutions', () => {
    expect(solve(parse('x + 1 = x + 2'))).toBe('none');
    expect(solve(parse('2(x + 1) = 2x + 2'))).toBe('all');
  });
});

describe('transforms', () => {
  it('shows both-sides intermediate line (IL01)', () => {
    const step = apply(parse('2x + 5 = 15'), bestOp(parse('2x + 5 = 15')));
    expect(step.intermediate).toBe('2x + 5 - 5 = 15 - 5');
    expect(toText(step.after)).toBe('2x = 10');
  });

  it('every content equation is solvable by bestOp and stays equivalent', () => {
    const all = levels.flatMap((l) => [
      ...(l.items || []).filter((i) => i.equation).map((i) => i.equation),
      ...(l.extra || []),
      ...(l.transfer ? [l.transfer] : []),
    ]).concat(stories.map((s) => s.equation));
    for (const text of all) {
      const { eq, trail } = autoSolve(text);
      expect(isSolved(eq), `${text}: ${trail.join(' → ')}`).toBe(true);
      expect(isEquivalent(eq, parse(text))).toBe(true);
      expect(trail.length).toBeLessThanOrEqual(6);
    }
  });

  it('chips always include the best move and at most 3 options', () => {
    for (const text of ['2x + 5 = 15', '-2x = 8', '5x - 3 = 2x + 9', '3(x - 2) = 12', '1/2(x + 3) = 5']) {
      const eq = parse(text);
      const chips = chipOps(eq);
      expect(chips.length).toBeGreaterThanOrEqual(2);
      expect(chips.length).toBeLessThanOrEqual(3);
      expect(chips.some((c) => classifyOp(eq, c).result === 'valid_progress'), text).toBe(true);
    }
  });

  it('result choices contain exactly one correct option with typed distractors', () => {
    const eq = parse('2x + 5 = 15');
    const choices = resultChoices(eq, bestOp(eq));
    expect(choices.filter((c) => c.kind === 'correct')).toHaveLength(1);
    expect(choices.length).toBeGreaterThanOrEqual(2);
    const texts = choices.map((c) => toText(c.eq));
    expect(new Set(texts).size).toBe(texts.length);
    const sign = choices.find((c) => c.kind === 'invalid_sign');
    if (sign) expect(toText(sign.eq)).toBe('2x = 20');
  });

  it('distributes partially as a typed arithmetic distractor', () => {
    const eq = parse('3(x - 2) = 12');
    const texts = resultChoices(eq, { kind: 'simplify' }).map((c) => `${c.kind}:${toText(c.eq)}`);
    expect(texts).toContain('correct:3x - 6 = 12');
  });
});

describe('validator — misconceptions from interview IL01/IL02', () => {
  it('−2x = 8 with "+2" is the coefficient-as-addend error', () => {
    const r = classifyOp(parse('-2x = 8'), { kind: 'add', term: { a: Fr.ZERO, b: Fr.frac(2) } });
    expect(r).toEqual({ result: 'invalid_sign', detail: 'coef_as_addend' });
  });
  it('−2x = 8 with "÷2" is a divisor sign error', () => {
    expect(classifyOp(parse('-2x = 8'), { kind: 'div', k: Fr.frac(2) }).detail).toBe('divisor_sign');
  });
  it('2x + 5 = 15 with "+5" is the wrong direction', () => {
    const r = classifyOp(parse('2x + 5 = 15'), { kind: 'add', term: { a: Fr.ZERO, b: Fr.frac(5) } });
    expect(r.detail).toBe('wrong_direction');
  });
  it('5x − 3 = 2x + 9 with "+2x" is the wrong direction', () => {
    const r = classifyOp(parse('5x - 3 = 2x + 9'), { kind: 'add', term: { a: Fr.frac(2), b: Fr.ZERO } });
    expect(r.result).toBe('invalid_sign');
  });
  it('2x + 5 = 15 with "−15" is balanced but no progress', () => {
    const r = classifyOp(parse('2x + 5 = 15'), { kind: 'sub', term: { a: Fr.ZERO, b: Fr.frac(15) } });
    expect(r.result).toBe('valid_no_progress');
  });
  it('the textbook move is progress', () => {
    const eq = parse('5x - 3 = 2x + 9');
    expect(classifyOp(eq, bestOp(eq)).result).toBe('valid_progress');
  });
});

describe('hints', () => {
  it('offers help after 2 consecutive wrong attempts (DS02)', () => {
    let s = initialHintState();
    s = onAttempt(s, false);
    expect(s.offered).toBe(false);
    s = onAttempt(s, false);
    expect(s.offered).toBe(true);
  });
  it('a correct attempt resets the streak', () => {
    let s = onAttempt(initialHintState(), false);
    s = onAttempt(s, true);
    s = onAttempt(s, false);
    expect(s.offered).toBe(false);
  });
  it('twin example keeps the shape and has an integer solution', () => {
    const ex = twinExample(parse('2x + 5 = 15'));
    expect(ex.equation).toBe('2x + 6 = 18');
    expect(ex.after).toBe('2x = 12');
  });
  it('H1–H4 texts exist', () => {
    for (let l = 1; l <= 4; l++) expect(hintFor(parse('3x - 4 = 11'), l).text.length).toBeGreaterThan(5);
  });
  it('fading: heavy hint → completion; two clean → skip example', () => {
    expect(planMode([{ maxHint: 3, wrongs: 2 }], 'practice')).toBe('completion');
    expect(planMode([{ maxHint: 0, wrongs: 0 }, { maxHint: 0, wrongs: 0 }], 'worked')).toBe('practice');
    expect(planMode([], 'worked')).toBe('worked');
  });
});

describe('adaptive', () => {
  it('scores diagnostic per skill', () => {
    const p = scoreDiagnostic([
      { skill: 'integerOps', correct: false }, { skill: 'integerOps', correct: false }, { skill: 'integerOps', correct: true },
      { skill: 'fractions', correct: true }, { skill: 'fractions', correct: true },
    ]);
    expect(p).toEqual({ integerOps: 'lemah', fractions: 'kuat', algebraSimplify: 'kuat' });
  });
  it('mastery needs 3 clean practice items in a row', () => {
    const c = { mode: 'practice', wrongs: 0, maxHint: 0 };
    const bad = { mode: 'practice', wrongs: 3, maxHint: 2 };
    expect(isMastered([c, c, c])).toBe(true);
    expect(isMastered([c, bad, c, c])).toBe(false);
    expect(isMastered([{ mode: 'worked', wrongs: 0, maxHint: 0 }, c, c])).toBe(false);
  });
});

describe('stories', () => {
  it('every story has keywords and its cards can build the model', () => {
    for (const s of stories) {
      expect(allTokens(s).some((t) => t.key), s.id).toBe(true);
      const checked = checkTags(s, allTokens(s).filter((t) => t.key).map((t) => t.id));
      expect(checked.missing).toEqual([]);
      expect(typeof solve(parse(s.equation))).toBe('object');
    }
  });
  it('accepts an equivalent card arrangement and rejects a wrong one', () => {
    const s = stories.find((x) => x.id === 'S-berurutan');
    expect(checkCards(s, ['x', '+', '(x + 1)', '+', '(x + 2)', '=', '45']).ok).toBe(true);
    expect(checkCards(s, ['x', '+', '(x + 1)', '=', '45']).ok).toBe(false);
  });
});
