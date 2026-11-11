// Exact rational arithmetic (AGENTS.md §3: never use floats for equation coefficients).

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

/** @typedef {{ n: number, d: number }} Fraction */

/** @returns {Fraction} */
export function frac(n, d = 1) {
  if (!Number.isInteger(n) || !Number.isInteger(d)) return fromDecimal(n / d);
  if (d === 0) throw new Error('Pembagian dengan nol');
  if (d < 0) { n = -n; d = -d; }
  if (n === 0) return Object.freeze({ n: 0, d: 1 });
  const g = gcd(n, d);
  return Object.freeze({ n: n / g, d: d / g });
}

export function fromDecimal(x) {
  if (Number.isInteger(x)) return frac(x, 1);
  const s = String(x);
  const dec = s.includes('.') ? s.split('.')[1].length : 0;
  const d = 10 ** Math.min(dec, 9);
  return frac(Math.round(x * d), d);
}

export const ZERO = frac(0);
export const ONE = frac(1);

export const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
export const div = (a, b) => {
  if (b.n === 0) throw new Error('Pembagian dengan nol');
  return frac(a.n * b.d, a.d * b.n);
};
export const neg = (a) => frac(-a.n, a.d);
export const abs = (a) => frac(Math.abs(a.n), a.d);
export const eq = (a, b) => a.n === b.n && a.d === b.d;
export const isZero = (a) => a.n === 0;
export const isOne = (a) => a.n === 1 && a.d === 1;
export const isInt = (a) => a.d === 1;
export const sign = (a) => Math.sign(a.n);
export const toNumber = (a) => a.n / a.d;
export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

/** "3", "-2", "5/2" */
export function fracToString(a) {
  return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
}
