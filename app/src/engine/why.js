// "Mengapa?" self-explanation prompts (prd.md F8, interview GL04).
// Items in content/ may override with their own whyPrompt.

import * as F from './fraction.js';
import { formatLinear } from './equation.js';

const K = (k) => (F.sign(k) < 0 ? `(${F.fracToString(k)})` : F.fracToString(k));

/** @returns {{question:string, options:string[], correct:number}} */
export function defaultWhy(op, rel = '=') {
  if (rel !== '=' && (op.kind === 'div' || op.kind === 'mul') && F.sign(op.k) < 0) {
    return {
      question: 'Mengapa tanda pertidaksamaannya dibalik?',
      options: [
        'Karena kedua ruas dikali/dibagi bilangan negatif, urutan bilangan terbalik (contoh: 2 < 3 tetapi −2 > −3).',
        'Karena x harus selalu berada di ruas kiri.',
        'Karena tanda minus pindah ruas menjadi plus.',
      ],
      correct: 0,
    };
  }
  switch (op.kind) {
    case 'div':
      return {
        question: `Mengapa kedua ruas dibagi ${K(op.k)}?`,
        options: [
          `Karena ${K(op.k)} mengalikan x, dan pembagian membatalkan perkalian.`,
          `Karena ${K(op.k)} pindah ruas menjadi ${K(F.neg(op.k))}.`,
          'Karena tanda minus selalu harus dihilangkan.',
        ],
        correct: 0,
      };
    case 'mul':
      return {
        question: `Mengapa kedua ruas dikalikan ${K(op.k)}?`,
        options: [
          'Agar penyebut pecahan hilang, dan timbangan tetap seimbang karena kedua ruas dikali sama.',
          'Agar hasilnya menjadi lebih besar.',
          'Karena pecahan pindah ruas menjadi perkalian di satu ruas saja.',
        ],
        correct: 0,
      };
    case 'simplify':
      return {
        question: 'Mengapa kurung dijabarkan lebih dulu?',
        options: [
          'Agar suku x dan konstanta terlihat terpisah sehingga bisa dikumpulkan.',
          'Karena kurung tidak boleh ada dalam persamaan.',
          'Agar bilangan di depan kurung hanya dikalikan ke suku pertama.',
        ],
        correct: 0,
      };
    default: {
      const t = formatLinear(op.term);
      const verb = op.kind === 'sub' ? `dikurangi ${t}` : `ditambah ${t}`;
      return {
        question: `Mengapa kedua ruas ${verb}?`,
        options: [
          `Supaya ${t} hilang dari ruas yang memuat x, dan timbangan tetap seimbang karena kedua sisi diubah sama.`,
          'Karena bilangan yang pindah ruas tandanya tetap.',
          'Supaya hanya ruas kanan yang berubah.',
        ],
        correct: 0,
      };
    }
  }
}
