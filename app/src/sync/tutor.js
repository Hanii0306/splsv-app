// Client for the Detektif AI Edge Function (supabase/functions/tutor). The AI key never reaches the app.
import { APP_VERSION, SUPABASE_KEY, SUPABASE_URL } from '../config.js';
import { installId } from './supabase.js';

export const tutorConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

/**
 * @param {{ mode:'item'|'materi', itemId?:string, message:string, history:{role:string,content:string}[],
 *           box?:number, wrongs?:number, hintLevel?:number, asks?:number, work?:string, studentCode?:string }} p
 * @returns {Promise<{ reply:string, level:number, blocked:boolean, offline?:boolean }>}
 */
export async function askTutor(p) {
  if (!tutorConfigured()) throw new Error('Detektif AI belum disiapkan.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Kamu sedang offline. Sambungkan internet dulu, ya.');
  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 30_000) : null;
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/tutor`, {
      method: 'POST',
      headers,
      signal: ctrl?.signal,
      body: JSON.stringify({ ...p, installId: await installId(), version: APP_VERSION }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Detektif AI sedang tidak bisa dihubungi.');
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Jawaban terlalu lama. Coba kirim lagi.');
    throw e instanceof Error && e.message ? e : new Error('Detektif AI sedang tidak bisa dihubungi.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}
