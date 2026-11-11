// Classify a student's move (architecture.md §3.4). Results feed hints, feedback and research logs.

import * as F from './fraction.js';
import { apply, distance, xSide } from './transforms.js';

/**
 * @typedef {'valid_progress'|'valid_no_progress'|'invalid_one_side'|'invalid_sign'|'invalid_arithmetic'} StepResult
 */

const absN = (f) => Math.abs(F.toNumber(f));

/**
 * Step A: the student picked an operation chip.
 * Every both-sides operation keeps the equation balanced, so "invalid" here means a
 * move that reveals the sign/"pindah ruas" misconception from the interview (IL01).
 * @returns {{ result: StepResult, detail?: string }}
 */
export function classifyOp(eq, op) {
  const side = xSide(eq);
  const after = apply(eq, op).after;

  if (side) {
    const s = eq[side].lin;
    const s2 = after[side].lin;
    if ((op.kind === 'add' || op.kind === 'sub') && F.isZero(op.term.a)) {
      // 2x + 5 = 15 → "+5": constant grows instead of disappearing.
      if (!F.isZero(s.b) && absN(s2.b) > absN(s.b) && F.sign(s2.b) === F.sign(s.b)) {
        return { result: 'invalid_sign', detail: 'wrong_direction' };
      }
      // −2x = 8 → "+2": the coefficient multiplies x, it is not an addend.
      if (F.isZero(s.b) && !F.isOne(F.abs(s.a)) && F.eq(F.abs(op.term.b), F.abs(s.a))) {
        return { result: 'invalid_sign', detail: 'coef_as_addend' };
      }
    }
    if (op.kind === 'div' && F.isZero(s.b) && F.eq(op.k, F.neg(s.a)) && !F.isZero(s.a)) {
      return { result: 'invalid_sign', detail: 'divisor_sign' };
    }
  } else if (!F.isZero(eq.left.lin.a) && !F.isZero(eq.right.lin.a) && (op.kind === 'add' || op.kind === 'sub')) {
    const before = absN(eq.left.lin.a) + absN(eq.right.lin.a);
    const now = absN(after.left.lin.a) + absN(after.right.lin.a);
    if (!F.isZero(op.term.a) && now > before) return { result: 'invalid_sign', detail: 'wrong_direction' };
  }

  return distance(after) < distance(eq)
    ? { result: 'valid_progress' }
    : { result: 'valid_no_progress' };
}

/** Step B: the student picked a resulting equation from resultChoices(). */
export function classifyResult(choice) {
  return choice.kind === 'correct' ? { result: 'valid_progress' } : { result: choice.kind, detail: choice.detail };
}

/** Plain-language feedback, naming the principle rather than just "salah" (design.md §7). */
export function feedbackFor(result, detail) {
  switch (result) {
    case 'valid_progress': return 'Seimbang! Kedua ruas diberi perlakuan yang sama.';
    case 'valid_no_progress': return 'Timbangan tetap seimbang, tetapi x belum lebih sendirian. Coba langkah lain.';
    case 'invalid_one_side': return 'Hanya satu ruas yang diubah, jadi timbangan miring. Ruas lainnya juga harus diubah.';
    case 'invalid_sign':
      if (detail === 'flip') return 'Kedua ruas dikali/dibagi bilangan NEGATIF, jadi tanda pertidaksamaan harus dibalik: < menjadi >, ≤ menjadi ≥.';
      if (detail === 'coef_as_addend') return 'Angka di depan x itu mengalikan x, bukan ditambahkan. Operasi kebalikan perkalian adalah pembagian.';
      if (detail === 'divisor_sign') return 'Perhatikan tandanya: bagi dengan bilangan yang sama persis, termasuk tanda minusnya.';
      if (detail === 'wrong_direction') return 'Bilangannya malah bertambah. Untuk menghilangkan +a, kurangi kedua ruas dengan a (dan sebaliknya).';
      return 'Periksa lagi tanda + dan −. Lakukan operasi yang sama persis pada kedua ruas.';
    case 'invalid_arithmetic': return 'Operasinya sudah benar, tetapi hitungannya keliru. Hitung ulang dengan teliti.';
    default: return '';
  }
}
