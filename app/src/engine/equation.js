// Parse & normalise single-variable linear equations (api.md §1–2).
// Each side keeps its display text (so "3(x - 2)" can be taught) plus a normal form a·x + b.

import * as F from './fraction.js';

/** @typedef {import('./fraction.js').Fraction} Fraction */
/** @typedef {{ a: Fraction, b: Fraction }} Linear */
/** @typedef {{ text: string, lin: Linear }} Side */
/** @typedef {{ left: Side, right: Side }} Equation */

export class ParseError extends Error {}

// ------------------------------------------------------------------ tokenizer
function tokenize(src) {
  const s = src.replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/[÷:]/g, '/');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const num = Number(s.slice(i, j));
      if (Number.isNaN(num)) throw new ParseError(`Angka tidak valid: ${s.slice(i, j)}`);
      out.push({ t: 'num', v: F.fromDecimal(num) });
      i = j;
      continue;
    }
    if (c === 'x' || c === 'X') { out.push({ t: 'x' }); i++; continue; }
    if ('+-*/()='.includes(c)) { out.push({ t: c }); i++; continue; }
    throw new ParseError(`Simbol tidak dikenal: "${c}"`);
  }
  return out;
}

// ------------------------------------------------------------------ parser → AST
function parseExpr(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (t) => {
    const tok = tokens[pos];
    if (!tok || (t && tok.t !== t)) throw new ParseError(`Diharapkan "${t}"`);
    pos++;
    return tok;
  };

  function expr() {
    let node = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = take().t;
      node = { t: op === '+' ? 'add' : 'sub', l: node, r: term() };
    }
    return node;
  }
  function term() {
    let node = unary();
    for (;;) {
      const p = peek();
      if (p && (p.t === '*' || p.t === '/')) {
        take();
        node = { t: p.t === '*' ? 'mul' : 'div', l: node, r: unary() };
      } else if (p && (p.t === 'x' || p.t === '(' || p.t === 'num')) {
        node = { t: 'mul', l: node, r: unary() }; // implicit: 2x, 3(x+1), 1/2(x+3)
      } else break;
    }
    return node;
  }
  function unary() {
    const p = peek();
    if (p && p.t === '-') { take(); return { t: 'neg', e: unary() }; }
    if (p && p.t === '+') { take(); return unary(); }
    return primary();
  }
  function primary() {
    const p = peek();
    if (!p) throw new ParseError('Ekspresi tidak lengkap');
    if (p.t === 'num') { take(); return { t: 'num', v: p.v }; }
    if (p.t === 'x') { take(); return { t: 'x' }; }
    if (p.t === '(') {
      take();
      const e = expr();
      take(')');
      return { t: 'group', e };
    }
    throw new ParseError(`Tidak terduga: "${p.t}"`);
  }

  if (tokens.length === 0) throw new ParseError('Ruas kosong');
  const node = expr();
  if (pos !== tokens.length) throw new ParseError('Ada simbol berlebih');
  return node;
}

/** @returns {Linear} */
export function linearize(node) {
  switch (node.t) {
    case 'num': return { a: F.ZERO, b: node.v };
    case 'x': return { a: F.ONE, b: F.ZERO };
    case 'group': return linearize(node.e);
    case 'neg': { const e = linearize(node.e); return { a: F.neg(e.a), b: F.neg(e.b) }; }
    case 'add': case 'sub': {
      const l = linearize(node.l);
      const r = linearize(node.r);
      const f = node.t === 'add' ? F.add : F.sub;
      return { a: f(l.a, r.a), b: f(l.b, r.b) };
    }
    case 'mul': {
      const l = linearize(node.l);
      const r = linearize(node.r);
      if (!F.isZero(l.a) && !F.isZero(r.a)) throw new ParseError('Bukan persamaan linear (x dikali x)');
      const [k, e] = F.isZero(l.a) ? [l.b, r] : [r.b, l];
      return { a: F.mul(k, e.a), b: F.mul(k, e.b) };
    }
    case 'div': {
      const l = linearize(node.l);
      const r = linearize(node.r);
      if (!F.isZero(r.a)) throw new ParseError('Pembagian oleh x tidak didukung');
      if (F.isZero(r.b)) throw new ParseError('Pembagian dengan nol');
      return { a: F.div(l.a, r.b), b: F.div(l.b, r.b) };
    }
    default: throw new ParseError('AST tidak dikenal');
  }
}

export function parseSideAst(text) {
  return parseExpr(tokenize(text));
}

// ------------------------------------------------------------------ formatting
function coefText(a) {
  if (F.isOne(a)) return 'x';
  if (F.eq(a, F.frac(-1))) return '-x';
  if (F.isInt(a)) return `${a.n}x`;
  if (Math.abs(a.n) === 1) return `${a.n < 0 ? '-' : ''}x/${a.d}`;
  return `${a.n < 0 ? '-' : ''}(${Math.abs(a.n)}/${a.d})x`;
}

/** Canonical text for a·x + b, e.g. "2x + 5", "-x - 3", "x/2 + 1", "7". */
export function formatLinear({ a, b }) {
  const parts = [];
  if (!F.isZero(a)) parts.push(coefText(a));
  if (!F.isZero(b)) {
    if (parts.length === 0) parts.push(F.fracToString(b));
    else parts.push(`${F.sign(b) < 0 ? '-' : '+'} ${F.fracToString(F.abs(b))}`);
  }
  return parts.length ? parts.join(' ') : '0';
}

/** Single term (for op labels): "5", "-2", "3x". */
export function formatTerm(lin) {
  return formatLinear(lin);
}

const squash = (t) => t.replace(/\s+/g, '').replace(/[−–]/g, '-');

// ------------------------------------------------------------------ public API
/** @returns {Side} */
export function makeSide(text) {
  const t = text.trim();
  return { text: t, lin: linearize(parseSideAst(t)) };
}

/** @returns {Side} */
export function sideFromLinear(lin) {
  return { text: formatLinear(lin), lin };
}

// Relations: "=" for equations (SPLSV) and <, >, ≤, ≥ for inequalities (PtLSV, level L8).
const REL_RE = /(<=|>=|≤|≥|<|>|=)/;
const NORM_REL = { '<=': '≤', '>=': '≥', '≤': '≤', '≥': '≥', '<': '<', '>': '>', '=': '=' };
/** Relation after multiplying/dividing both sides by a NEGATIVE number. */
export const FLIP = { '<': '>', '>': '<', '≤': '≥', '≥': '≤', '=': '=' };
export const isInequality = (eq) => !!eq.rel && eq.rel !== '=';

/** @returns {Equation} */
export function parse(input) {
  const parts = input.split(REL_RE);
  if (parts.length !== 3) throw new ParseError('Harus ada tepat satu tanda =, <, >, ≤, atau ≥');
  return { left: makeSide(parts[0]), right: makeSide(parts[2]), rel: NORM_REL[parts[1]] };
}

export function fromLinear(L, R, rel = '=') {
  return { left: sideFromLinear(L), right: sideFromLinear(R), rel };
}

export function toText(eq) {
  return `${eq.left.text} ${eq.rel || '='} ${eq.right.text}`;
}

/** Side is "structured" when its text still has brackets/products that normalising would change. */
export function isStructured(side) {
  return squash(side.text) !== squash(formatLinear(side.lin));
}

export const hasFraction = (lin) => !F.isInt(lin.a) || !F.isInt(lin.b);

/** @returns {Fraction | 'none' | 'all'} */
export function solve(eq) {
  const A = F.sub(eq.left.lin.a, eq.right.lin.a);
  const B = F.sub(eq.right.lin.b, eq.left.lin.b);
  if (F.isZero(A)) return F.isZero(B) ? 'all' : 'none';
  return F.div(B, A);
}

/** Inequality in normal form "x rel value" (or 'all' / 'none'). */
export function solveInequality(eq) {
  const rel = eq.rel || '=';
  const A = F.sub(eq.left.lin.a, eq.right.lin.a);
  const B = F.sub(eq.right.lin.b, eq.left.lin.b);
  if (F.isZero(A)) return compare(F.ZERO, rel, B) ? 'all' : 'none';
  const value = F.div(B, A);
  return { rel: F.sign(A) < 0 ? FLIP[rel] : rel, value };
}

/** a rel b for fractions. */
export function compare(a, rel, b) {
  const d = F.toNumber(F.sub(a, b));
  return { '=': d === 0, '<': d < 0, '>': d > 0, '≤': d <= 0, '≥': d >= 0 }[rel];
}

/** Does x make the (in)equation true? */
export const satisfies = (eq, x) => compare(evalLinear(eq.left.lin, x), eq.rel || '=', evalLinear(eq.right.lin, x));

export function isEquivalent(e1, e2) {
  if (isInequality(e1) || isInequality(e2)) {
    const a = solveInequality(e1);
    const b = solveInequality(e2);
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    return a.rel === b.rel && F.eq(a.value, b.value);
  }
  const s1 = solve(e1);
  const s2 = solve(e2);
  if (typeof s1 === 'string' || typeof s2 === 'string') return s1 === s2;
  return F.eq(s1, s2);
}

export function evalLinear(lin, x) { return F.add(F.mul(lin.a, x), lin.b); }

/** True when the equation reads x = c or c = x. */
export function isSolved(eq) {
  const { left: L, right: R } = eq;
  const unit = (s) => F.isOne(s.lin.a) && F.isZero(s.lin.b) && !isStructured(s);
  const constant = (s) => F.isZero(s.lin.a) && !isStructured(s);
  return (unit(L) && constant(R)) || (unit(R) && constant(L));
}
