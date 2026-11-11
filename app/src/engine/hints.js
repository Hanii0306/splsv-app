// Fading, tiered hints (prd.md F6, design.md §6).
// H1 question → H2 step directive → H3 worked twin example → H4 demonstrate.

import * as F from './fraction.js';
import { formatLinear, fromLinear, hasFraction, isInequality, isStructured, solve, toText } from './equation.js';
import { apply, bestOp, flipsRelation, opExplanation, opLabel, xSide } from './transforms.js';

export const OFFER_AFTER_WRONG = 2; // DS02: "salah 2 kali berturut-turut"
export const MAX_HINT = 4;

/** @typedef {{ wrongStreak: number, level: number, offered: boolean }} HintState */

export const initialHintState = () => ({ wrongStreak: 0, level: 0, offered: false });

/** Update after an attempt; `ok` is true for valid_progress. */
export function onAttempt(state, ok) {
  if (ok) return { ...state, wrongStreak: 0 };
  const wrongStreak = state.wrongStreak + 1;
  return { ...state, wrongStreak, offered: state.offered || wrongStreak >= OFFER_AFTER_WRONG };
}

/** Moving to a new step keeps nothing but the "already offered" memory off. */
export const nextStepState = () => initialHintState();

export function escalate(state) {
  return { ...state, level: Math.min(MAX_HINT, state.level + 1) };
}

function questionFor(eq) {
  const { left: L, right: R } = eq;
  if (hasFraction(L.lin) || hasFraction(R.lin)) return 'Ada pecahan. Dengan bilangan berapa kedua ruas dikalikan supaya penyebutnya hilang?';
  if (isStructured(L) || isStructured(R)) return 'Ada tanda kurung. Apa yang perlu dibereskan lebih dulu?';
  const side = xSide(eq);
  if (!side) return 'Suku x ada di kedua ruas. Bagaimana caranya mengumpulkan x di satu ruas saja?';
  const s = eq[side].lin;
  const name = side === 'left' ? 'ruas kiri' : 'ruas kanan';
  if (!F.isZero(s.b)) return `Apa yang masih menempel pada ${formatLinear({ a: s.a, b: F.ZERO })} di ${name}? Bagaimana menghilangkannya dari kedua sisi timbangan?`;
  if (isInequality(eq) && F.sign(s.a) < 0) return `${F.fracToString(s.a)} mengalikan x dan bilangannya negatif. Apa yang terjadi pada tanda ${eq.rel} jika kedua ruas dibagi bilangan negatif?`;
  return `${F.fracToString(s.a)} mengalikan x. Operasi apa yang membatalkan perkalian?`;
}

/** Same-shape equation with different numbers, solved one step (H3). */
export function twinExample(eq) {
  const sol = solve(eq);
  if (typeof sol === 'string') return null;
  const { left: L, right: R } = eq;
  if (isStructured(L) || isStructured(R)) return null;
  const s2 = F.add(sol, F.ONE);
  const Lb = F.add(L.lin.b, F.frac(F.sign(L.lin.b) >= 0 ? 1 : -1));
  const Lb2 = F.isZero(L.lin.b) ? F.ZERO : Lb;
  const Rb = F.sub(F.add(F.mul(L.lin.a, s2), Lb2), F.mul(R.lin.a, s2));
  const twin = fromLinear({ a: L.lin.a, b: Lb2 }, { a: R.lin.a, b: Rb }, eq.rel || '=');
  const op = bestOp(twin);
  if (!op) return null;
  const step = apply(twin, op);
  return { equation: toText(twin), op: opLabel(op), intermediate: step.intermediate, after: toText(step.after) };
}

/** @returns {{ level: number, title: string, text: string, example?: object, op?: object }} */
export function hintFor(eq, level) {
  const op = bestOp(eq);
  switch (level) {
    case 1: return { level, title: 'Pertanyaan pemantik', text: questionFor(eq) };
    case 2: return { level, title: 'Petunjuk langkah', text: op ? opExplanation(op) + (flipsRelation(eq, op) ? ' Jangan lupa: tanda pertidaksamaan dibalik!' : '') : 'x sudah sendirian.' };
    case 3: {
      const ex = twinExample(eq);
      return ex
        ? { level, title: 'Contoh sejenis', text: `Perhatikan soal mirip ini: ${ex.equation}`, example: ex }
        : { level, title: 'Contoh sejenis', text: 'Contoh: 3(x + 1) = 9 → 3x + 3 = 9. Kalikan bilangan di depan kurung ke setiap suku di dalamnya.' };
    }
    case 4: return { level, title: 'Ikuti langkah ini', text: op ? `Pilih "${opLabel(op)}".` : '', op };
    default: return { level: 0, title: '', text: '' };
  }
}

/**
 * Fading across items (design.md §6): heavy hints on item n → item n+1 starts as a
 * completion problem; two clean items in a row → the next worked example may be skipped.
 * @param {{maxHint:number, wrongs:number}[]} history  previous items in this level
 * @param {'worked'|'completion'|'practice'} declared
 */
export function planMode(history, declared) {
  const last = history[history.length - 1];
  const last2 = history.slice(-2);
  if (declared === 'practice' && last && last.maxHint >= 3) return 'completion';
  if (declared === 'worked' && last2.length === 2 && last2.every((h) => h.maxHint === 0 && h.wrongs === 0)) return 'practice';
  return declared;
}
