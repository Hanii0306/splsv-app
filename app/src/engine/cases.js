// Case-file items (70 instrument items, 7 levels × 10): answer checking, clue ladder, XP and ranks.
// Pure: no React, no I/O (AGENTS.md §3). Exact fractions for every numeric answer.

import * as F from './fraction.js';

/**
 * Parse a typed answer in Indonesian notation into an exact Fraction, or null.
 * Accepts: "-8", "−8", "8,5", "33,75", "20.000", "Rp20.000", "3/4", "-3/4", "+5".
 * @param {string} raw
 * @returns {import('./fraction.js').Fraction | null}
 */
export function parseAnswer(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/^rp/i, '');
  s = s.replace(/(m²|m2|m|cm|tahun|kotak|rak|jam|minggu|buku)$/i, '');
  if (!s) return null;
  const frac = /^([+-]?\d+)\/(\d+)$/.exec(s);
  if (frac) {
    const d = Number(frac[2]);
    return d === 0 ? null : F.frac(Number(frac[1]), d);
  }
  // Thousands separators: 20.000 / 1.850.000 (optionally with a decimal comma).
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const [int, dec = ''] = s.replace(/^\+/, '').split('.');
  const neg = int.startsWith('-');
  const digits = (neg ? int.slice(1) : int) + dec;
  const n = Number(digits || '0') * (neg ? -1 : 1);
  return F.frac(n, 10 ** dec.length);
}

/** Number of blanks (□) in a box template. */
export const blanksIn = (text) => (String(text).match(/□/g) || []).length;

/** Expected answers of a box as an array (one per □), for numeric boxes. */
export const expectedOf = (box) => (Array.isArray(box.answer) ? box.answer : [box.answer]);

/**
 * Check one scaffolded box.
 * @param {{text:string, answer:string|string[]|number, choices?:string[]}} box
 * @param {string[]|number} given  typed values (numeric box) or picked index (choice box)
 * @returns {{ ok: boolean, wrong: number[] }}  `wrong` lists the blank indexes that are wrong
 */
export function checkBox(box, given) {
  if (box.choices) {
    const ok = Number(given) === box.answer;
    return { ok, wrong: ok ? [] : [0] };
  }
  const exp = expectedOf(box);
  const vals = Array.isArray(given) ? given : [given];
  const wrong = [];
  exp.forEach((e, i) => {
    const a = parseAnswer(vals[i]);
    const b = parseAnswer(e);
    if (!a || !b || !F.eq(a, b)) wrong.push(i);
  });
  return { ok: wrong.length === 0, wrong };
}

/** Correct option text for a multiple-choice item. */
export const mcCorrectText = (item) => item.options[item.answer];

export const CLUE_TITLE = { 1: 'Pertanyaan pemantik', 2: 'Petunjuk langkah', 3: 'Contoh kasus sejenis', 4: 'Berkas penyelesaian' };

/**
 * Clue envelope ladder H1→H4 (AGENTS.md §2.9, mirrors engine/hints.js):
 * H1 question, H2 step directive, H3 twin example of the case, H4 full worked solution.
 * H4 contains the final answer, so it is only available after at least one attempt (GL03).
 * @returns {{ level:number, title:string, lines:string[] } | null}
 */
export function caseClue(item, caseInfo, level, attempts) {
  if (level < 1 || level > 4) return null;
  if (level === 4 && attempts < 1) return null;
  const lines = {
    1: [item.clue],
    2: [item.step],
    3: caseInfo.twin,
    4: item.steps,
  }[level];
  return { level, title: CLUE_TITLE[level], lines };
}

/** Highest clue level that may be opened right now. */
export const maxClueAllowed = (attempts) => (attempts >= 1 ? 4 : 3);

// --- XP & ranks (gamification layer; can be switched off in Menu peneliti) ---------------

export const XP_ITEM_MAX = 10;
export const XP_CASE_BONUS = 20;

/**
 * XP for one item: rewards effort, never punishes below the floor (no "sanksi" that lowers XP).
 * @param {{ wrongs:number, maxHint:number }} r
 */
export function xpForItem({ wrongs, maxHint }) {
  if (wrongs === 0 && maxHint === 0) return 10;
  if (wrongs <= 1 && maxHint <= 1) return 7;
  if (maxHint <= 3) return 4;
  return 2;
}

/** XP for a whole case run (10 items + completion bonus). */
export function xpForCase(results) {
  return results.reduce((s, r) => s + xpForItem(r), 0) + (results.length ? XP_CASE_BONUS : 0);
}

/** Total XP = sum of the BEST run of each case (replaying never farms XP). */
export function totalXp(progress) {
  return Object.values(progress || {}).reduce((s, p) => s + (Number(p?.xp) || 0), 0);
}

export const RANKS = [
  { min: 0, name: 'Rekrut' },
  { min: 80, name: 'Agen Junior' },
  { min: 200, name: 'Agen Lapangan' },
  { min: 350, name: 'Agen Senior' },
  { min: 520, name: 'Kepala Detektif' },
  { min: 700, name: 'Master Detective' },
];

/** @returns {{ name:string, min:number, next: {name:string, min:number} | null }} */
export function rankFor(xp) {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].min) i++;
  return { ...RANKS[i], next: RANKS[i + 1] || null };
}

/** Items answered correctly at the first try (rubric-free summary for the end screen). */
export const firstTryCount = (results) => results.filter((r) => r.wrongs === 0).length;
