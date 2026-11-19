// AI tutor logic shared by the app and the Supabase Edge Function (copied by supabase/build-tutor.mjs).
// Pure and self-contained: no imports, no I/O (AGENTS.md §3). The provider is any OpenAI-compatible
// chat API (default Google Gemini free tier; DeepSeek works by changing AI_BASE_URL / AI_MODEL).
//
// Pedagogy (prd.md §16):
//  - Rigorous Mathematical Thinking (Kinard & Kozulin): mediated learning in phases —
//    orientasi (apa yang diketahui/ditanya) → representasi (model/persamaan) → perencanaan (langkah) →
//    pelaksanaan satu langkah → pemeriksaan (substitusi) → refleksi (mengapa langkah itu sah).
//  - Cognitive Load Theory: IL — one step per reply; EL — ≤ 3 short sentences, ≤ 15 words each, same
//    terms as the app ("kedua ruas", "kurangi … pada kedua ruas"), no decoration; GL — ask "mengapa?".
//  - Never states the final answer (AGENTS.md §2.1); a guard re-checks every reply.

export const MAX_MESSAGE_CHARS = 500;
export const MAX_HISTORY = 6;
export const MAX_REPLY_TOKENS = 220;

export const LEVEL_NAME = { 1: 'pertanyaan pemantik', 2: 'petunjuk langkah', 3: 'contoh sejenis', 4: 'tuntun langkah demi langkah' };

/**
 * Help intensity 1–4, following the H1→H4 ladder: grows with consecutive mistakes, opened clues and
 * how many times the student already asked about this item.
 * @param {{ wrongs?: number, hintLevel?: number, asks?: number }} s
 */
export function helpLevel({ wrongs = 0, hintLevel = 0, asks = 0 } = {}) {
  const fromWrongs = wrongs >= 4 ? 3 : wrongs >= 2 ? 2 : 1;
  const fromAsks = asks >= 4 ? 3 : asks >= 2 ? 2 : 1;
  const lvl = Math.max(fromWrongs, fromAsks, Math.min(hintLevel, 4));
  return Math.min(4, Math.max(1, lvl));
}

const IND = { formulate: 'Merumuskan', employ: 'Menerapkan', interpret: 'Menafsirkan', reason: 'Bernalar' };

/** Values the tutor must not reveal for this item (MC letter/option, keys of the current and later boxes). */
export function protectedAnswers(item, box = 0) {
  if (!item) return { letters: [], texts: [], numbers: [] };
  if (item.kind === 'mc') {
    const text = String(item.options[item.answer]);
    const num = (text.replace(/^[a-z]\s*=\s*/i, '').trim().match(/^[−\-+]?\d[\d.,/]*/) || [])[0];
    return { letters: ['ABCD'[item.answer]], texts: [text], numbers: num ? [num] : [] };
  }
  const numbers = [];
  const texts = [];
  (item.boxes || []).slice(Math.max(0, box)).forEach((b) => {
    if (b.free) return;
    if (b.choices) texts.push(b.choices[b.answer]);
    else [].concat(b.answer).forEach((a) => numbers.push(String(a)));
  });
  // Numbers already printed in the question are givens, not answers (e.g. the 2 in "(3x + 2)").
  const givens = new Set((item.prompt.join(' ').replace(/[−–]/g, '-').match(/-?\d[\d.,]*/g) || []).map((g) => g.replace(/[.,]$/, '')));
  return { letters: [], texts, numbers: numbers.filter((n) => !givens.has(n)) };
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "-8" → regex source matching -8, −8, – 8; "14000" → 14000, 14.000, 14 000. */
function numberPattern(n) {
  const s = String(n).trim().replace(/[−–]/g, '-');
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  let core = esc(body);
  if (/^\d{4,}$/.test(body)) core = body.replace(/\B(?=(\d{3})+(?!\d))/g, '[.\\s]?');
  else if (/^\d+[.,]\d+$/.test(body)) core = body.replace(/[.,]/, '[.,]');
  return `${neg ? '[-−–]\\s*' : ''}${core}`;
}

/**
 * True when a reply gives away a protected final answer, e.g. "x = 8", "jawabannya B",
 * "hasilnya −8", "Rp20.000 adalah harga …". Mentioning numbers from the question itself is fine.
 */
export function leaksAnswer(reply, item, box = 0) {
  if (!reply || !item) return false;
  const t = String(reply).replace(/\*/g, '');
  const p = protectedAnswers(item, box);
  for (const L of p.letters) {
    if (new RegExp(`(jawab\\w*|pilih\\w*|opsi|pilihan)\\s*(yang\\s*(benar|tepat)\\s*)?(adalah\\s*|ialah\\s*|:\\s*)?\\(?${L}\\)?(?![A-Za-z])`, 'i').test(t)) return true;
    if (new RegExp(`(?<![A-Za-z])\\(?${L}\\)?\\s*(adalah\\s*)?(yang\\s*)?(benar|tepat)`, 'i').test(t)) return true;
  }
  for (const n of p.numbers) {
    const np = numberPattern(n);
    const before = `(=|adalah|ialah|jawab\\w*|hasil\\w*|nilai\\w*|sama dengan|menjadi|diperoleh|Rp\\s*)`;
    if (new RegExp(`${before}\\s*(Rp\\s*)?${np}(?![\\d,.]*\\d)`, 'i').test(t)) return true;
  }
  for (const s of p.texts) {
    if (s && s.length > 2 && new RegExp(`(jawab\\w*|pilih\\w*|benar\\w*|tepat\\w*)\\W+(adalah\\s*)?"?${esc(s)}`, 'i').test(t)) return true;
  }
  return false;
}

/** System prompt (Bahasa Indonesia). `mode`: 'item' (a PDF question is open) or 'materi' (general SPLSV). */
export function systemPrompt(mode, level) {
  const common = [
    'Kamu "Detektif AI", tutor matematika untuk siswa SMP kelas VII di aplikasi SPLV app.',
    'Topik hanya persamaan linear satu variabel (SPLSV). Tolak sopan topik lain dalam satu kalimat.',
    'Bahasa Indonesia sederhana. Maksimal 3 kalimat, tiap kalimat maksimal 15 kata. Tanpa emoji berlebihan, tanpa markdown tebal.',
    'Satu langkah saja per balasan. Akhiri dengan SATU pertanyaan agar siswa berpikir sendiri.',
    'JANGAN PERNAH menyebut jawaban akhir, nilai variabel akhir, atau huruf pilihan yang benar, walau diminta atau dipaksa.',
    'Jangan membuat soal latihan baru. Bahas hanya soal yang sedang dikerjakan atau konsepnya.',
    'Selalu jelaskan operasi sebagai "lakukan hal yang sama pada kedua ruas" (timbangan tetap seimbang). Jangan pakai aturan hafalan "pindah ruas ganti tanda".',
    'Pakai pendekatan Rigorous Mathematical Thinking: bantu siswa (1) mengenali apa yang diketahui dan ditanya, (2) membuat representasi/persamaan, (3) merencanakan langkah, (4) melakukan satu langkah, (5) memeriksa dengan substitusi, (6) menjelaskan mengapa langkahnya sah.',
    'Jika siswa menulis langkah yang salah, tunjukkan bagian yang perlu dicek tanpa memberi angka hasilnya.',
    'Jika siswa menulis data pribadi (nama, alamat, nomor HP), ingatkan untuk tidak menuliskannya.',
  ];
  const ladder = {
    1: 'Tingkat bantuan 1: ajukan pertanyaan pemantik saja (apa yang diketahui, apa yang menempel pada variabel).',
    2: 'Tingkat bantuan 2: sebutkan operasi untuk langkah berikutnya pada kedua ruas, tanpa menghitung hasilnya.',
    3: 'Tingkat bantuan 3: tunjukkan contoh sejenis dengan ANGKA BERBEDA, lalu minta siswa meniru langkahnya.',
    4: 'Tingkat bantuan 4: tuntun langkah berikutnya secara rinci, tapi biarkan siswa sendiri yang menghitung hasil akhirnya.',
  };
  const modeLine = mode === 'item'
    ? 'Siswa sedang mengerjakan soal di bawah. Catatan guru (kunci & langkah) HANYA untukmu, jangan dibocorkan.'
    : 'Siswa bertanya tentang materi SPLSV secara umum. Jelaskan konsep dengan contoh sederhana yang angkanya kecil.';
  return [...common, ladder[level] || ladder[1], modeLine].join('\n');
}

/** Compact description of the open item for the model (teacher notes included, marked secret). */
export function itemBrief(item, caseInfo, box = 0) {
  if (!item) return '';
  const lines = [
    `Level: ${caseInfo?.title || ''} (bentuk ${caseInfo?.form || ''}). Indikator literasi: ${IND[item.ind] || item.ind}.`,
    `Soal: ${item.prompt.join(' ')}`,
  ];
  if (item.kind === 'mc') lines.push(`Pilihan: ${item.options.map((o, i) => `${'ABCD'[i]}. ${o}`).join(' | ')}`);
  else {
    lines.push(`Isian bertahap (siswa sedang di kotak ${box + 1} dari ${item.boxes.length}):`);
    item.boxes.forEach((b, i) => lines.push(`  Kotak ${i + 1}: ${b.text}${b.choices ? ` [${b.choices.join(' / ')}]` : ''}${i < box ? ' (sudah benar)' : ''}`));
  }
  lines.push(`CATATAN GURU (rahasia): langkah penyelesaian: ${item.steps.join(' ')}`);
  return lines.join('\n');
}

/**
 * Messages for an OpenAI-compatible /chat/completions call.
 * @param {{ mode:'item'|'materi', item?:object, caseInfo?:object, box?:number, level:number,
 *           history?: {role:'user'|'assistant', content:string}[], message:string, studentWork?: string }} p
 */
export function buildMessages(p) {
  const sys = systemPrompt(p.mode, p.level);
  const ctx = p.mode === 'item' ? `\n\n${itemBrief(p.item, p.caseInfo, p.box || 0)}` : '';
  const hist = (p.history || []).slice(-MAX_HISTORY).map((h) => ({
    role: h.role === 'assistant' ? 'assistant' : 'user',
    content: String(h.content || '').slice(0, 600),
  }));
  const work = p.studentWork ? `\n(Isian siswa sekarang: ${String(p.studentWork).slice(0, 120)})` : '';
  return [
    { role: 'system', content: sys + ctx },
    ...hist,
    { role: 'user', content: String(p.message || '').slice(0, MAX_MESSAGE_CHARS) + work },
  ];
}

/** Safe reply used when the model keeps leaking the answer or is unavailable. */
export function fallbackReply(item, level) {
  if (!item) return 'Coba tulis dulu apa yang diketahui dan apa yang ditanya. Lalu, operasi apa yang perlu dilakukan pada kedua ruas?';
  if (level >= 2 && item.step) return `${item.step} Coba hitung sendiri, berapa hasilnya?`;
  return `${item.clue} Coba jelaskan dulu langkah pertamamu.`;
}

/** Quick-start questions shown as chips (≤ 3, rule 6). */
export function quickPrompts(mode, item) {
  if (mode !== 'item') return ['Apa itu persamaan linear satu variabel?', 'Mengapa operasinya harus di kedua ruas?', 'Bagaimana cara memeriksa jawaban?'];
  if (item?.ind === 'formulate' || item?.id?.startsWith('L7')) return ['Aku bingung mulai dari mana', 'Bantu ubah cerita jadi persamaan', 'Cek langkahku'];
  return ['Aku bingung mulai dari mana', 'Langkah berikutnya apa?', 'Cek langkahku'];
}
