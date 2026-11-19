// Sends a finished test to Supabase (rpc kirim_jawaban_tes). If offline/failing, the payload stays in
// the device (setting `testPending`) and is retried on the next start or when the network comes back.
import { SUPABASE_KEY, SUPABASE_URL } from '../config.js';
import { getSetting, setSetting } from '../storage/db.js';

const PENDING = 'testPending';

async function post(payload) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/kirim_jawaban_tes`, { method: 'POST', headers, body: JSON.stringify({ p: payload }) });
    return res.ok;
  } catch {
    return false;
  }
}

/** @returns {Promise<'sent'|'queued'>} */
export async function submitTest(payload) {
  if (await post(payload)) return 'sent';
  const queue = (await getSetting(PENDING)) || [];
  queue.push(payload);
  await setSetting(PENDING, queue.slice(-20));
  return 'queued';
}

/** Retry queued submissions; returns how many are still waiting. */
export async function flushPendingTests() {
  const queue = (await getSetting(PENDING)) || [];
  if (!queue.length) return 0;
  const left = [];
  for (const p of queue) if (!(await post(p))) left.push(p);
  await setSetting(PENDING, left);
  return left.length;
}

if (typeof window !== 'undefined') window.addEventListener('online', () => { flushPendingTests(); });
