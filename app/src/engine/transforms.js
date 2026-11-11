// Legal "do the same to both sides" operations (architecture.md §3.3).
// "Pindah ruas" is never a primitive: it is always explained as an operation on both sides (IL01).

import * as F from './fraction.js';
import {
  FLIP, formatLinear, fromLinear, hasFraction, isInequality, isStructured, parseSideAst, linearize, sideFromLinear,
} from './equation.js';

/** @typedef {import('./equation.js').Equation} Equation */
/** @typedef {import('./equation.js').Linear} Linear */
/**
 * @typedef {{kind:'add'|'sub', term: Linear} | {kind:'mul'|'div', k: import('./fraction.js').Fraction} | {kind:'simplify'}} Op
 */

export const constTerm = (c) => ({ a: F.ZERO, b: typeof c === 'number' ? F.frac(c) : c });
export const xTerm = (c) => ({ a: typeof c === 'number' ? F.frac(c) : c, b: F.ZERO });

const linAdd = (p, q) => ({ a: F.add(p.a, q.a), b: F.add(p.b, q.b) });
const linSub = (p, q) => ({ a: F.sub(p.a, q.a), b: F.sub(p.b, q.b) });
const linMul = (p, k) => ({ a: F.mul(p.a, k), b: F.mul(p.b, k) });
const linDiv = (p, k) => ({ a: F.div(p.a, k), b: F.div(p.b, k) });
export const linNeg = (p) => ({ a: F.neg(p.a), b: F.neg(p.b) });

function applyToLinear(p, op) {
  switch (op.kind) {
    case 'add': return linAdd(p, op.term);
    case 'sub': return linSub(p, op.term);
    case 'mul': return linMul(p, op.k);
    case 'div': return linDiv(p, op.k);
    case 'simplify': return p;
    default: throw new Error('Operasi tidak dikenal');
  }
}

const kText = (k) => (F.sign(k) < 0 ? `(${F.fracToString(k)})` : F.fracToString(k));
const needsParens = (text) => /[+-]/.test(text.replace(/^-/, ''));
const wrap = (text) => (needsParens(text) ? `(${text})` : text);

/** Short label for an action chip, e.g. "−5 kedua ruas". */
export function opLabel(op) {
  switch (op.kind) {
    case 'add': return `+${formatLinear(op.term)} kedua ruas`;
    case 'sub': return `−${formatLinear(op.term)} kedua ruas`;
    case 'mul': return `×${kText(op.k)} kedua ruas`;
    case 'div': return `÷${kText(op.k)} kedua ruas`;
    case 'simplify': return 'Jabarkan / sederhanakan';
    default: return '?';
  }
}

export function opExplanation(op) {
  switch (op.kind) {
    case 'add': return `Tambahkan ${formatLinear(op.term)} ke kedua ruas.`;
    case 'sub': return `Kurangi kedua ruas dengan ${formatLinear(op.term)}.`;
    case 'mul': return `Kalikan kedua ruas dengan ${kText(op.k)}.`;
    case 'div': return `Bagi kedua ruas dengan ${kText(op.k)}.`;
    case 'simplify': return 'Jabarkan kurung lalu sederhanakan setiap ruas.';
    default: return '';
  }
}

/** Multiplying/dividing an inequality by a negative number reverses it. */
export const flipsRelation = (eq, op) => isInequality(eq) && (op.kind === 'mul' || op.kind === 'div') && F.sign(op.k) < 0;
const relAfter = (eq, op) => (flipsRelation(eq, op) ? FLIP[eq.rel] : eq.rel || '=');

/** The "both sides" line shown in purple, e.g. "2x + 5 − 5 = 15 − 5". */
export function intermediateText(eq, op) {
  const L = eq.left.text;
  const R = eq.right.text;
  const r = eq.rel || '=';
  switch (op.kind) {
    case 'add': return `${L} + ${formatLinear(op.term)} ${r} ${R} + ${formatLinear(op.term)}`;
    case 'sub': return `${L} - ${formatLinear(op.term)} ${r} ${R} - ${formatLinear(op.term)}`;
    case 'mul': return `${kText(op.k)} × ${wrap(L)} ${r} ${kText(op.k)} × ${wrap(R)}`;
    case 'div': return `${wrap(L)} ÷ ${kText(op.k)} ${r} ${wrap(R)} ÷ ${kText(op.k)}`;
    default: return null;
  }
}

/** @returns {{before: Equation, op: Op, after: Equation, intermediate: string|null, explanation: string}} */
export function apply(eq, op) {
  if ((op.kind === 'mul' || op.kind === 'div') && F.isZero(op.k)) throw new Error('Tidak boleh dengan nol');
  const after = fromLinear(applyToLinear(eq.left.lin, op), applyToLinear(eq.right.lin, op), relAfter(eq, op));
  const flipNote = flipsRelation(eq, op) ? ' Karena bilangannya negatif, tanda pertidaksamaan DIBALIK.' : '';
  return { before: eq, op, after, intermediate: intermediateText(eq, op), explanation: opExplanation(op) + flipNote };
}

/** Wrong move used for distractors and the tilting-scale feedback. */
export function applyOneSide(eq, op, side) {
  const L = side === 'left' ? applyToLinear(eq.left.lin, op) : eq.left.lin;
  const R = side === 'right' ? applyToLinear(eq.right.lin, op) : eq.right.lin;
  return fromLinear(L, R, eq.rel || '=');
}

/** Which side holds x (null if both or none). */
export function xSide(eq) {
  const l = !F.isZero(eq.left.lin.a);
  const r = !F.isZero(eq.right.lin.a);
  if (l && !r) return 'left';
  if (r && !l) return 'right';
  return null;
}
export const other = (side) => (side === 'left' ? 'right' : 'left');

/** Pedagogical distance to "x = c". Lower is better. */
export function distance(eq) {
  const { left: L, right: R } = eq;
  let d = 0;
  for (const s of [L, R]) {
    if (isStructured(s)) d += 2;
    if (hasFraction(s.lin)) d += 2;
  }
  const lx = !F.isZero(L.lin.a);
  const rx = !F.isZero(R.lin.a);
  if (lx && rx) d += 3;
  for (const s of [L, R]) if (!F.isZero(s.lin.a) && !F.isZero(s.lin.b)) d += 1;
  if (lx !== rx) {
    const s = lx ? L : R;
    if (!F.isOne(s.lin.a)) d += 1;
  }
  return d;
}

/** Remove a term from both sides: +5 → "−5 kedua ruas", −3 → "+3 kedua ruas". */
export function removeTermOp(term) {
  const negative = F.sign(term.a) < 0 || (F.isZero(term.a) && F.sign(term.b) < 0);
  return negative ? { kind: 'add', term: linNeg(term) } : { kind: 'sub', term };
}

/** The textbook next step (used for worked examples and H2/H4 hints). */
export function bestOp(eq) {
  const { left: L, right: R } = eq;
  if (hasFraction(L.lin) || hasFraction(R.lin)) {
    const k = [L.lin.a, L.lin.b, R.lin.a, R.lin.b].reduce((m, f) => F.lcm(m, f.d), 1);
    return { kind: 'mul', k: F.frac(k) };
  }
  if (isStructured(L) || isStructured(R)) return { kind: 'simplify' };
  const lx = !F.isZero(L.lin.a);
  const rx = !F.isZero(R.lin.a);
  if (lx && rx) {
    // Collect x on the side with the larger coefficient so it stays positive.
    const from = F.toNumber(L.lin.a) >= F.toNumber(R.lin.a) ? R : L;
    return removeTermOp(xTerm(from.lin.a));
  }
  if (!lx && !rx) return null;
  const s = lx ? L : R;
  if (!F.isZero(s.lin.b)) return removeTermOp(constTerm(s.lin.b));
  if (!F.isOne(s.lin.a)) return { kind: 'div', k: s.lin.a };
  if (isStructured(lx ? R : L)) return { kind: 'simplify' };
  return null;
}

export function sameOp(p, q) {
  if (p.kind !== q.kind) return false;
  if (p.kind === 'add' || p.kind === 'sub') return F.eq(p.term.a, q.term.a) && F.eq(p.term.b, q.term.b);
  if (p.kind === 'mul' || p.kind === 'div') return F.eq(p.k, q.k);
  return true;
}

// ------------------------------------------------------------------ chips
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = hash(String(seed)) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Three action chips: the best move plus distractors that mirror the misconceptions
 * found in the interview (IL01/IL02: wrong direction, coefficient treated as addend).
 */
export function chipOps(eq) {
  const best = bestOp(eq);
  if (!best) return [];
  const { left: L, right: R } = eq;
  const cands = [best];
  const side = xSide(eq);
  const s = side ? eq[side] : null;

  if (best.kind === 'sub' || best.kind === 'add') {
    cands.push({ kind: best.kind === 'sub' ? 'add' : 'sub', term: best.term }); // wrong direction
    if (s && F.isZero(best.term.a)) {
      const otherB = eq[other(side)].lin.b;
      if (!F.isZero(otherB)) cands.push(removeTermOp(constTerm(otherB)));
      if (!F.isOne(F.abs(s.lin.a))) cands.push({ kind: 'div', k: F.abs(s.lin.a) });
    } else {
      cands.push(removeTermOp(constTerm(!F.isZero(R.lin.b) ? R.lin.b : L.lin.b.n ? L.lin.b : F.ONE)));
    }
  } else if (best.kind === 'div') {
    const a = best.k;
    if (F.sign(a) < 0) cands.push({ kind: 'div', k: F.neg(a) });
    cands.push({ kind: F.sign(a) < 0 ? 'add' : 'sub', term: constTerm(F.abs(a)) }); // coef as addend
    cands.push({ kind: 'mul', k: F.abs(a) });
  } else if (best.kind === 'mul') {
    cands.push({ kind: 'div', k: best.k });
    const b = !F.isZero(L.lin.b) ? L.lin.b : R.lin.b;
    if (!F.isZero(b)) cands.push(removeTermOp(constTerm(F.isInt(b) ? b : F.frac(Math.round(F.toNumber(b)) || 1))));
  } else if (best.kind === 'simplify') {
    const structured = isStructured(L) ? L : R;
    const k = structured.lin.a;
    if (!F.isZero(k) && !F.isOne(F.abs(k))) cands.push({ kind: 'div', k });
    const b = (isStructured(L) ? R : L).lin.b;
    if (!F.isZero(b)) cands.push(removeTermOp(constTerm(b)));
    cands.push({ kind: 'add', term: constTerm(1) });
  }

  const uniq = [];
  for (const c of cands) {
    if (uniq.length >= 3) break;
    try { apply(eq, c); } catch { continue; }
    if (!uniq.some((u) => sameOp(u, c))) uniq.push(c);
  }
  return seededShuffle(uniq, formatLinear(L.lin) + '|' + formatLinear(R.lin));
}

// ------------------------------------------------------------------ result choices
function partialDistribute(text) {
  try {
    let node = parseSideAst(text);
    if (node.t === 'mul' && node.r.t === 'group' && (node.r.e.t === 'add' || node.r.e.t === 'sub')) {
      const k = linearize(node.l).b;
      const first = linearize(node.r.e.l);
      const second = linearize(node.r.e.r);
      const lhs = { a: F.mul(k, first.a), b: F.mul(k, first.b) };
      return node.r.e.t === 'add' ? linAdd(lhs, second) : linSub(lhs, second);
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * Options for "Hasilnya?" (step B). Each wrong option is a typed error so the
 * validator, hints and teacher dashboard can name it.
 * @returns {{eq: Equation, kind: 'correct'|'invalid_sign'|'invalid_one_side'|'invalid_arithmetic'}[]}
 */
export function resultChoices(eq, op) {
  const correct = apply(eq, op).after;
  const opts = [{ eq: correct, kind: 'correct' }];
  const side = xSide(eq) || 'left';
  const o = other(side);
  const cs = correct[side].lin;
  const co = correct[o].lin;
  const rel = correct.rel;
  const build = (sLin, oLin, r = rel) => (side === 'left' ? fromLinear(sLin, oLin, r) : fromLinear(oLin, sLin, r));
  // PtLSV: the classic error is forgetting to reverse the sign after ×/÷ by a negative number.
  if (flipsRelation(eq, op)) opts.push({ eq: build(cs, co, eq.rel), kind: 'invalid_sign', detail: 'flip' });

  if (op.kind === 'simplify') {
    const target = isStructured(eq.left) ? 'left' : 'right';
    const part = partialDistribute(eq[target].text);
    const otherLin = correct[other(target)].lin;
    const mk = (tLin) => (target === 'left' ? fromLinear(tLin, otherLin, rel) : fromLinear(otherLin, tLin, rel));
    const t = correct[target].lin;
    opts.push({ eq: mk({ a: t.a, b: F.neg(t.b) }), kind: 'invalid_sign' });
    if (part) opts.push({ eq: mk(part), kind: 'invalid_arithmetic' });
    opts.push({ eq: mk({ a: t.a, b: F.add(t.b, F.ONE) }), kind: 'invalid_arithmetic' });
  } else {
    let signEq;
    if (op.kind === 'add' || op.kind === 'sub') {
      const opposite = { kind: op.kind === 'add' ? 'sub' : 'add', term: op.term };
      signEq = build(cs, applyToLinear(eq[o].lin, opposite));
    } else {
      signEq = build(cs, linNeg(co));
    }
    opts.push({ eq: signEq, kind: 'invalid_sign' });
    opts.push({ eq: applyOneSide(eq, op, side), kind: 'invalid_one_side' });
    opts.push({ eq: build(cs, { a: co.a, b: F.add(co.b, F.ONE) }), kind: 'invalid_arithmetic' });
  }

  const seen = new Set();
  const uniq = [];
  for (const x of opts) {
    const key = formatLinear(x.eq.left.lin) + x.eq.rel + formatLinear(x.eq.right.lin);
    if (seen.has(key) || uniq.length >= 3) continue;
    seen.add(key);
    uniq.push(x);
  }
  return seededShuffle(uniq, sideFromLinear(cs).text + opLabel(op));
}
