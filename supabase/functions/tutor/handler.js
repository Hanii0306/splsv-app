// Detektif AI — request handler for the Supabase Edge Function `tutor` (Deno) and for Vitest (Node).
// Secrets live in Supabase (supabase secrets set …), never in the app:
//   AI_API_KEY          provider key (Google AI Studio for Gemini; or DeepSeek)
//   AI_BASE_URL         OpenAI-compatible base, default Gemini: https://generativelanguage.googleapis.com/v1beta/openai
//   AI_MODEL            e.g. a Gemini Flash-Lite model id; AI_FALLBACK_MODEL used on 429/404/5xx/empty
//   AI_EXTRA_JSON       optional extra body fields, e.g. {"reasoning_effort":"none"}
//   TUTOR_LIMIT_DEVICE  questions per install per 24 h (default 60); TUTOR_LIMIT_TOTAL all students (default 1200)
// SUPABASE_URL and the service key are injected by Supabase and only used to log/count conversations.

import { buildMessages, fallbackReply, helpLevel, leaksAnswer, MAX_HISTORY, MAX_MESSAGE_CHARS, MAX_REPLY_TOKENS } from './lib/tutor.js';
import { CASES } from './lib/items.js';

export const ORIGINS = ['https://hanii0306.github.io', 'capacitor://localhost', 'https://localhost', 'http://localhost', 'http://localhost:5173'];
const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[A-Z0-9_-]{2,32}$/;

const ITEMS = Object.fromEntries(CASES.flatMap((c) => c.items.map((i) => [i.id, { item: i, caseInfo: c }])));
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : lo));

function serviceKey(env) {
  if (env.SUPABASE_SERVICE_ROLE_KEY) return env.SUPABASE_SERVICE_ROLE_KEY;
  try { const k = JSON.parse(env.SUPABASE_SECRET_KEYS || '{}'); return Object.values(k)[0] || ''; } catch { return ''; }
}
function dbHeaders(key, extra = {}) {
  const h = { apikey: key, 'Content-Type': 'application/json', ...extra };
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

/** Validate and normalise the request body. @returns {{ok:true, v:object}|{ok:false, error:string}} */
export function validate(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Format permintaan salah.' };
  const message = String(body.message ?? '').trim();
  if (!message) return { ok: false, error: 'Pesan kosong.' };
  if (message.length > MAX_MESSAGE_CHARS) return { ok: false, error: `Pesan maksimal ${MAX_MESSAGE_CHARS} karakter.` };
  const mode = body.mode === 'item' ? 'item' : 'materi';
  const found = mode === 'item' ? ITEMS[String(body.itemId || '')] : null;
  if (mode === 'item' && !found) return { ok: false, error: 'Soal tidak dikenal.' };
  if (!UUID.test(String(body.installId || ''))) return { ok: false, error: 'installId tidak valid.' };
  const code = String(body.studentCode || '').toUpperCase();
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY).map((h) => ({
    role: h?.role === 'assistant' ? 'assistant' : 'user', content: String(h?.content ?? '').slice(0, 600),
  })) : [];
  return {
    ok: true,
    v: {
      message, mode, history, item: found?.item, caseInfo: found?.caseInfo,
      box: int(body.box, 0, 9), wrongs: int(body.wrongs, 0, 99), hintLevel: int(body.hintLevel, 0, 4), asks: int(body.asks, 0, 99),
      work: String(body.work ?? '').slice(0, 120), installId: String(body.installId),
      studentCode: CODE.test(code) ? code : null, version: String(body.version ?? '').slice(0, 20),
    },
  };
}

async function countSince(env, fetchImpl, filter) {
  const key = serviceKey(env);
  if (!env.SUPABASE_URL || !key) return 0;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const url = `${env.SUPABASE_URL}/rest/v1/percakapan_tutor?select=id&waktu=gte.${encodeURIComponent(since)}${filter}`;
  const res = await fetchImpl(url, { headers: dbHeaders(key, { Prefer: 'count=exact', Range: '0-0' }) });
  const total = Number((res.headers.get('content-range') || '').split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

async function logRow(env, fetchImpl, row) {
  const key = serviceKey(env);
  if (!env.SUPABASE_URL || !key) return;
  try {
    await fetchImpl(`${env.SUPABASE_URL}/rest/v1/percakapan_tutor`, { method: 'POST', headers: dbHeaders(key, { Prefer: 'return=minimal' }), body: JSON.stringify(row) });
  } catch { /* logging never blocks the student */ }
}

async function callModel(env, fetchImpl, messages) {
  const base = (env.AI_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  let extra = {};
  try { extra = JSON.parse(env.AI_EXTRA_JSON || '{}'); } catch { extra = {}; }
  for (const model of [env.AI_MODEL, env.AI_FALLBACK_MODEL].filter(Boolean)) {
    try {
      const res = await fetchImpl(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.AI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: MAX_REPLY_TOKENS * 2, temperature: 0.4, ...extra }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
      if (text) return { text, model };
    } catch { /* try the next model */ }
  }
  return null;
}

/**
 * @param {Request} req
 * @param {Record<string,string>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handle(req, env, fetchImpl = fetch) {
  const origin = req.headers.get('origin') || '';
  const cors = {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Gunakan POST.' });

  const raw = await req.text();
  if (raw.length > 12_000) return json(413, { error: 'Permintaan terlalu besar.' });
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'Format permintaan salah.' }); }
  const r = validate(body);
  if (!r.ok) return json(400, { error: r.error });
  const v = r.v;
  if (!env.AI_API_KEY || !env.AI_MODEL) return json(503, { error: 'Detektif AI belum diaktifkan oleh guru.' });

  const perDevice = int(env.TUTOR_LIMIT_DEVICE ?? 60, 1, 10_000);
  const total = int(env.TUTOR_LIMIT_TOTAL ?? 1200, 1, 1_000_000);
  if (await countSince(env, fetchImpl, `&install_id=eq.${v.installId}`) >= perDevice) {
    return json(429, { error: 'Kuota tanya hari ini sudah habis. Coba lagi besok, atau buka amplop petunjuk.' });
  }
  if (await countSince(env, fetchImpl, '') >= total) {
    return json(429, { error: 'Detektif AI sedang penuh hari ini. Pakai amplop petunjuk dulu, ya.' });
  }

  const level = helpLevel({ wrongs: v.wrongs, hintLevel: v.hintLevel, asks: v.asks });
  const messages = buildMessages({ mode: v.mode, item: v.item, caseInfo: v.caseInfo, box: v.box, level, history: v.history, message: v.message, studentWork: v.work });

  let out = await callModel(env, fetchImpl, messages);
  let blocked = false;
  if (out && v.item && leaksAnswer(out.text, v.item, v.box)) {
    const again = await callModel(env, fetchImpl, [...messages, { role: 'assistant', content: out.text },
      { role: 'user', content: 'Balasanmu menyebut jawaban akhir. Tulis ulang tanpa jawaban akhir; ajukan satu pertanyaan pemandu.' }]);
    if (again && !leaksAnswer(again.text, v.item, v.box)) out = again;
    else { blocked = true; out = { text: fallbackReply(v.item, level), model: out.model }; }
  }
  const source = out ? out.model : 'fallback';
  const reply = (out ? out.text : fallbackReply(v.item, level)).slice(0, 700);

  await logRow(env, fetchImpl, {
    kode_siswa: v.studentCode, install_id: v.installId, versi_aplikasi: v.version, mode: v.mode,
    item_id: v.item?.id ?? null, kotak: v.mode === 'item' ? v.box + 1 : null, salah: v.wrongs, tingkat_bantuan: level,
    pesan_siswa: v.message, balasan_ai: reply, diblokir: blocked, model: source,
  });
  return json(200, { reply, level, blocked, offline: !out });
}
