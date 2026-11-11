// Unlimited practice: seeded generators per level (always an integer solution, solvable by bestOp).
// Pure: no React / DOM. Same seed → same item, so a logged itemId can be reproduced for research.

import * as F from './fraction.js';
import { FLIP, isInequality, parse, solve, solveInequality, toText, isSolved } from './equation.js';
import { apply, bestOp, opLabel, opExplanation } from './transforms.js';

/** Small deterministic PRNG (mulberry32). */
export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const nz = (lo, hi) => { let v = 0; while (v === 0) v = int(lo, hi); return v; };
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const sign = () => (next() < 0.5 ? -1 : 1);
  return { next, int, nz, pick, sign };
}

const term = (c, first = false) => {
  // c·x formatted as part of an expression
  if (c === 1) return first ? 'x' : '+ x';
  if (c === -1) return first ? '-x' : '- x';
  if (first) return `${c}x`;
  return c < 0 ? `- ${-c}x` : `+ ${c}x`;
};
const cst = (b, first = false) => (first ? `${b}` : b < 0 ? `- ${-b}` : `+ ${b}`);

const BUILDERS = {
  // x + a = b (positive, small)
  L0: (r) => { const x = r.int(1, 9); const a = r.int(1, 9); return `x + ${a} = ${x + a}`; },
  // x ± a = b with negatives
  L1: (r) => { const x = r.nz(-9, 12); const a = r.nz(-12, 12); return `x ${cst(a)} = ${x + a}`; },
  // ax = b
  L2: (r) => { const x = r.nz(-10, 10); const a = r.sign() * r.int(2, 9); return `${a}x = ${a * x}`; },
  // ax + b = c (sometimes written c = ax + b)
  L3: (r) => {
    const x = r.nz(-9, 9); const a = r.sign() * r.int(2, 7); const b = r.nz(-15, 15);
    return r.next() < 0.8 ? `${term(a, true)} ${cst(b)} = ${a * x + b}` : `${a * x + b} = ${term(a, true)} ${cst(b)}`;
  },
  // ax + b = cx + d
  L4: (r) => {
    const x = r.nz(-8, 8); let a = r.nz(-6, 9); let c = r.nz(-6, 9);
    while (c === a) c = r.nz(-6, 9);
    const b = r.int(-12, 12); const d = a * x + b - c * x;
    const L = b === 0 ? term(a, true) : `${term(a, true)} ${cst(b)}`;
    const R = d === 0 ? term(c, true) : `${term(c, true)} ${cst(d)}`;
    return `${L} = ${R}`;
  },
  // k(x ± m) = n   or   k(x ± m) = cx + d
  L5: (r) => {
    const x = r.nz(-8, 8); const k = r.sign() * r.int(2, 6); const m = r.nz(-7, 7);
    const inner = `x ${cst(m)}`;
    if (r.next() < 0.6) return `${k}(${inner}) = ${k * (x + m)}`;
    let c = r.nz(-4, 5); while (c === k) c = r.nz(-4, 5);
    const d = k * (x + m) - c * x;
    return `${k}(${inner}) = ${term(c, true)} ${cst(d)}`;
  },
  // x/q + b = c   or   (1/q)(x ± m) = n   or   (p/q)x = n
  L6: (r) => {
    const q = r.int(2, 5); const kind = r.int(0, 2);
    if (kind === 0) { const x = q * r.nz(-6, 6); const b = r.nz(-9, 9); return `x/${q} ${cst(b)} = ${x / q + b}`; }
    if (kind === 1) { const m = r.nz(-6, 6); const x = q * r.nz(-5, 5) - m; return `1/${q}(x ${cst(m)}) = ${(x + m) / q}`; }
    let p = r.int(2, 4); while (p % q === 0 || q % p === 0) p = r.int(2, 4);
    const x = q * r.nz(-5, 5); return `${p}/${q}x = ${(p * x) / q}`;
  },
  // PtLSV: x ± a < b,  ax ≥ b (often negative a),  ax + b ≤ c,  ax + b > cx + d
  L8: (r) => {
    const rel = r.pick(['<', '>', '≤', '≥']);
    const x = r.nz(-8, 8);
    const kind = r.int(0, 3);
    if (kind === 0) { const a = r.nz(-9, 9); return `x ${cst(a)} ${rel} ${x + a}`; }
    if (kind === 1) { const a = r.sign() * r.int(2, 6); return `${a}x ${rel} ${a * x}`; }
    if (kind === 2) { const a = r.sign() * r.int(2, 6); const b = r.nz(-12, 12); return `${term(a, true)} ${cst(b)} ${rel} ${a * x + b}`; }
    let a = r.nz(-5, 6); let c = r.nz(-5, 6);
    while (c === a) c = r.nz(-5, 6);
    const b = r.int(-9, 9); const d = a * x + b - c * x;
    const L = b === 0 ? term(a, true) : `${term(a, true)} ${cst(b)}`;
    const R = d === 0 ? term(c, true) : `${term(c, true)} ${cst(d)}`;
    return `${L} ${rel} ${R}`;
  },
};

/** Plain equation for a level (L0–L6). */
export function genEquation(levelId, seed) {
  const r = rng(`${levelId}:${seed}`);
  for (let tries = 0; tries < 20; tries++) {
    const text = BUILDERS[levelId](r);
    const eq = parse(text);
    const sol = isInequality(eq) ? solveInequality(eq) : solve(eq);
    const v = isInequality(eq) ? sol.value : sol;
    if (typeof sol === 'object' && v && F.isInt(v)) return text;
  }
  return BUILDERS.L0(r);
}

// ------------------------------------------------------------------ word problems (L7)
const NAMES = ['Rina', 'Budi', 'Sari', 'Dimas', 'Ayu', 'Fajar', 'Nisa', 'Raka'];

const STORIES = [
  (r) => {
    const x = r.int(3, 30); const S = 3 * x + 3;
    return {
      context: 'pribadi',
      chunks: [`[[Jumlah|add]] tiga bilangan [[berurutan|consecutive]] adalah [[${S}|number]].`, 'Berapakah [[bilangan terkecil|unknown]]?'],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: ['Bilangan terkecil', `Jumlahnya, yaitu ${S}`, 'Banyaknya bilangan, yaitu 3'], correct: 0,
        expressions: ['x = bilangan terkecil', 'x + 1 = bilangan kedua', 'x + 2 = bilangan ketiga'] },
      cards: ['x', '+', '(x + 1)', '+', '(x + 2)', '=', `${S}`, '3'],
      equation: `x + (x + 1) + (x + 2) = ${S}`, answerUnit: '',
      reasonableness: { question: `Jika x = ${x}, apakah ${x} + ${x + 1} + ${x + 2} = ${S}?`, options: [`Ya, jumlahnya ${S}`, 'Tidak'], correct: 0 },
    };
  },
  (r) => {
    const n = r.pick(NAMES); const d = r.int(2, 8); const x = r.int(5, 15); const s = 2 * x + d;
    return {
      context: 'pribadi',
      chunks: [`Umur kakak ${n} [[${d}|number]] tahun [[lebih tua dari|add]] umur ${n}.`, `[[Jumlah|add]] umur mereka [[${s}|number]] tahun.`, `Berapa [[umur ${n}|unknown]]?`],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: [`Umur ${n}`, 'Jumlah umur mereka', 'Selisih umur'], correct: 0,
        expressions: [`x = umur ${n}`, `x + ${d} = umur kakak`] },
      cards: ['x', '+', `(x + ${d})`, '=', `${s}`, '-', `${d}`],
      equation: `x + (x + ${d}) = ${s}`, answerUnit: 'tahun',
      reasonableness: { question: `${n} ${x} tahun dan kakaknya ${x + d} tahun. Masuk akal?`, options: [`Ya: selisih ${d} dan jumlah ${s}`, 'Tidak masuk akal'], correct: 0 },
    };
  },
  (r) => {
    const n = r.pick(NAMES); const k = r.int(2, 5); const x = r.int(2, 8); const back = r.int(1, 9); const P = k * x + back;
    return {
      context: 'pekerjaan',
      chunks: [`${n} membeli [[${k}|number]] buku tulis yang harganya sama.`, `Ia membayar dengan uang [[${P}|number]] ribu rupiah.`, `Uang [[kembaliannya|sub]] [[${back}|number]] ribu rupiah.`, 'Berapa [[harga satu buku|unknown]]?'],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: ['Harga satu buku (ribu rupiah)', `Harga ${k} buku`, 'Uang kembalian'], correct: 0,
        expressions: ['x = harga satu buku', `${k}x = harga ${k} buku`] },
      cards: [`${P}`, '-', `${k}x`, '=', `${back}`, '+', 'x'],
      equation: `${P} - ${k}x = ${back}`, answerUnit: 'ribu rupiah',
      reasonableness: { question: `Harga satu buku ${x} ribu. Apakah ${k} × ${x} + ${back} = ${P}?`, options: ['Ya, cocok', 'Tidak cocok'], correct: 0 },
    };
  },
  (r) => {
    const a = r.int(5, 20); const k = r.int(2, 5); const x = r.int(3, 15); const t = a + k * x;
    return {
      context: 'sosial',
      chunks: [`Kas kelas awalnya [[${a}|number]] ribu rupiah.`, `Setiap minggu kas [[bertambah|add]] [[${k}|number]] ribu rupiah.`, `Sekarang kas [[menjadi|equals]] [[${t}|number]] ribu rupiah.`, 'Sudah [[berapa minggu|unknown]]?'],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: ['Banyak minggu', 'Jumlah kas sekarang', 'Iuran per minggu'], correct: 0,
        expressions: ['x = banyak minggu', `${k}x = tambahan kas selama x minggu`] },
      cards: [`${a}`, '+', `${k}x`, '=', `${t}`, '-', 'x'],
      equation: `${a} + ${k}x = ${t}`, answerUnit: 'minggu',
      reasonableness: { question: `Setelah ${x} minggu, apakah ${a} + ${k} × ${x} = ${t}?`, options: ['Ya', 'Tidak'], correct: 0 },
    };
  },
  (r) => {
    const s0 = r.nz(-6, 5); const k = r.int(2, 4); const x = r.int(2, 7); const t = s0 + k * x;
    const s0txt = s0 < 0 ? `−${-s0}` : `${s0}`;
    return {
      context: 'ilmiah',
      chunks: [`Suhu pagi di sebuah desa [[${s0txt}|number]] °C.`, `Setiap jam suhu [[naik|add]] [[${k}|number]] °C.`, `[[Setelah berapa jam|unknown]] suhunya [[menjadi|equals]] [[${t}|number]] °C?`],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: ['Banyak jam', 'Suhu akhir', 'Kenaikan suhu per jam'], correct: 0,
        expressions: ['x = banyak jam', `${k}x = kenaikan suhu selama x jam`] },
      cards: [`${s0}`, '+', `${k}x`, '=', `${t}`, '-', 'x'],
      equation: `${s0} + ${k}x = ${t}`, answerUnit: 'jam',
      reasonableness: { question: `Setelah ${x} jam, apakah ${s0} + ${k * x} = ${t}?`, options: ['Ya', 'Tidak'], correct: 0 },
    };
  },
  (r) => {
    const n = r.pick(NAMES); const k = r.int(3, 6); const x = r.int(2, 9); const total = k * x;
    return {
      context: 'pribadi',
      chunks: [`${n} membagi [[${total}|number]] permen [[sama banyak|mul]] kepada [[${k}|number]] temannya.`, '[[Berapa permen|unknown]] yang diterima setiap teman?'],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: ['Banyak permen tiap teman', 'Jumlah semua permen', 'Banyak teman'], correct: 0,
        expressions: ['x = permen tiap teman', `${k}x = permen untuk ${k} teman`] },
      cards: [`${k}x`, '=', `${total}`, '+', `${k}`, 'x'],
      equation: `${k}x = ${total}`, answerUnit: 'permen',
      reasonableness: { question: `Apakah ${k} × ${x} = ${total}?`, options: ['Ya', 'Tidak'], correct: 0 },
    };
  },
  (r) => {
    const k = r.int(2, 6); const x = r.int(3, 12); const K = 4 * x + 2 * k;
    return {
      context: 'sosial',
      chunks: [`Panjang sebuah taman [[${k}|number]] meter [[lebih dari|add]] lebarnya.`, `[[Keliling|add]] taman itu [[${K}|number]] meter.`, 'Berapa [[lebar taman|unknown]]?'],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: ['Lebar taman', 'Keliling taman', 'Selisih panjang dan lebar'], correct: 0,
        expressions: ['x = lebar', `x + ${k} = panjang`, 'Keliling = 2 × lebar + 2 × panjang'] },
      cards: ['2x', '+', `2(x + ${k})`, '=', `${K}`, 'x', '4'],
      equation: `2x + 2(x + ${k}) = ${K}`, answerUnit: 'meter',
      reasonableness: { question: `Lebar ${x} m dan panjang ${x + k} m. Apakah 2 × ${x} + 2 × ${x + k} = ${K}?`, options: ['Ya', 'Tidak'], correct: 0 },
    };
  },
  (r) => {
    const n = r.pick(NAMES); const m = r.int(3, 5); const x = r.int(5, 12); const S = (m + 1) * x;
    return {
      context: 'pribadi',
      chunks: [`Umur ayah [[${m} kali|mul]] umur ${n}.`, `[[Jumlah|add]] umur mereka [[${S}|number]] tahun.`, `Berapa [[umur ${n}|unknown]]?`],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: [`Umur ${n}`, 'Umur ayah', 'Jumlah umur mereka'], correct: 0,
        expressions: [`x = umur ${n}`, `${m}x = umur ayah`] },
      cards: ['x', '+', `${m}x`, '=', `${S}`, '-', `${m}`],
      equation: `x + ${m}x = ${S}`, answerUnit: 'tahun',
      reasonableness: { question: `${n} ${x} tahun dan ayah ${m * x} tahun. Masuk akal?`, options: ['Ya, masuk akal', 'Tidak, ayah terlalu muda'], correct: 0 },
    };
  },
  (r) => {
    const price = r.int(3, 8); const park = r.int(5, 15); const x = r.int(4, 15); const T = price * x + park;
    return {
      context: 'sosial',
      chunks: [`Tiket museum [[${price}|number]] ribu rupiah [[per orang|mul]].`, `Rombongan juga [[membayar parkir|add]] [[${park}|number]] ribu rupiah.`, `[[Total|equals]] yang dibayar [[${T}|number]] ribu rupiah.`, 'Ada [[berapa orang|unknown]] dalam rombongan?'],
      let: { question: 'Apa yang kita misalkan sebagai x?', options: ['Banyak orang', 'Harga tiket', 'Total bayar'], correct: 0,
        expressions: ['x = banyak orang', `${price}x = harga tiket semua orang`] },
      cards: [`${price}x`, '+', `${park}`, '=', `${T}`, '-', 'x'],
      equation: `${price}x + ${park} = ${T}`, answerUnit: 'orang',
      reasonableness: { question: `Untuk ${x} orang: apakah ${price} × ${x} + ${park} = ${T}?`, options: ['Ya', 'Tidak'], correct: 0 },
    };
  },
];

/** Word problem compatible with StoryTask (content/stories.json shape). */
export function genStory(seed) {
  const r = rng(`L7:${seed}`);
  const s = r.pick(STORIES)(r);
  return { id: `GEN-${seed}`, literacy: { process: ['formulate', 'employ', 'interpret'], context: s.context }, ...s };
}

// ------------------------------------------------------------------ quiz & worked solutions
/** Textbook solution trail, used for quiz feedback and the summary cards. */
export function solutionSteps(text, max = 8) {
  let eq = parse(text);
  const steps = [{ text: toText(eq), op: null }];
  for (let i = 0; i < max && !isSolved(eq); i++) {
    const op = bestOp(eq);
    if (!op) break;
    eq = apply(eq, op).after;
    steps.push({ text: toText(eq), op: opLabel(op), why: opExplanation(op) });
  }
  return steps;
}

/** Multiple-choice quiz item; distractors mirror the interview misconceptions (sign, one side). */
export function quizItem(levelId, seed) {
  const r = rng(`Q:${levelId}:${seed}`);
  if (levelId === 'L8') {
    const equation = genEquation('L8', seed);
    const { rel, value } = solveInequality(parse(equation));
    const v = F.toNumber(value);
    const show = (rr, vv) => `x ${rr} ${vv}`;
    const answerText = show(rel, v);
    const pool = [show(FLIP[rel], v), show(rel, -v), show(FLIP[rel], -v), show(rel, v + 1), show(rel, v - 1)];
    const optionsText = [answerText];
    for (const o of pool) if (optionsText.length < 4 && !optionsText.includes(o)) optionsText.push(o);
    for (let i = optionsText.length - 1; i > 0; i--) { const j = r.int(0, i); [optionsText[i], optionsText[j]] = [optionsText[j], optionsText[i]]; }
    return { levelId, equation, answer: answerText, optionsText, options: optionsText, correct: optionsText.indexOf(answerText) };
  }
  const equation = levelId === 'L7' ? genStory(seed).equation : genEquation(levelId, seed);
  const x = F.toNumber(solve(parse(equation)));
  const pool = [-x, x + 1, x - 1, x + 2, 2 * x, x - 2].filter((v) => v !== x);
  const opts = [x];
  while (opts.length < 4) {
    const v = r.pick(pool);
    if (!opts.includes(v)) opts.push(v);
  }
  // shuffle
  for (let i = opts.length - 1; i > 0; i--) { const j = r.int(0, i); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return { levelId, equation, answer: x, options: opts, correct: opts.indexOf(x) };
}
