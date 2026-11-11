// Word-problem modelling: the "Merumuskan" process of mathematical literacy (prd.md F5).

import { isEquivalent, parse } from './equation.js';

/**
 * Chunk markup: "[[Jumlah|add]] tiga bilangan [[berurutan|consecutive]] adalah [[45|number]]."
 * @returns {{text:string, key?:string, role?:string, id:string}[]}
 */
export function tokenizeChunk(chunk, chunkIdx) {
  const out = [];
  const re = /\[\[([^|\]]+)\|([a-z_]+)\]\]/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(chunk))) {
    if (m.index > last) {
      for (const w of chunk.slice(last, m.index).split(/(\s+)/)) if (w) out.push({ text: w, id: `c${chunkIdx}-p${k++}` });
    }
    out.push({ text: m[1], role: m[2], key: true, id: `c${chunkIdx}-k${k++}` });
    last = re.lastIndex;
  }
  for (const w of chunk.slice(last).split(/(\s+)/)) if (w) out.push({ text: w, id: `c${chunkIdx}-p${k++}` });
  return out;
}

export function allTokens(story) {
  return story.chunks.flatMap((c, i) => tokenizeChunk(c, i));
}

export const ROLE_LABEL = {
  add: 'ditambah (+)',
  sub: 'dikurangi (−)',
  mul: 'dikali (×)',
  number: 'bilangan penting',
  consecutive: 'berurutan → x, x + 1, x + 2',
  equals: 'sama dengan (=)',
  unknown: 'yang ditanyakan (x)',
};

/** @returns {{correct:string[], missing:string[], extra:string[]}} */
export function checkTags(story, tappedIds) {
  const keys = allTokens(story).filter((t) => t.key).map((t) => t.id);
  const tapped = new Set(tappedIds);
  return {
    correct: keys.filter((k) => tapped.has(k)),
    missing: keys.filter((k) => !tapped.has(k)),
    extra: [...tapped].filter((k) => !keys.includes(k)),
  };
}

export function checkLet(story, choiceIdx) {
  return choiceIdx === story.let.correct;
}

/** Cards assembled in order → equation; accepted if equivalent to the target model. */
export function checkCards(story, cards) {
  const text = cards.join(' ');
  try {
    const eq = parse(text);
    const target = parse(story.equation);
    const hasX = /x/.test(text.split('=')[0]) || /x/.test(text.split('=')[1]);
    return { ok: hasX && isEquivalent(eq, target), text, equation: eq };
  } catch {
    return { ok: false, text, equation: null };
  }
}
