// Research event log (api.md §6). Writes locally and queues for sync.
import { db } from '../storage/db.js';

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

let sessionId = uuid();
let studentCode = null;

export function startSession(code) {
  studentCode = code;
  sessionId = uuid();
  logEvent('session_start', {});
}

export const currentSessionId = () => sessionId;

/**
 * @param {string} type  one of api.md §6 event types
 * @param {object} payload  never include names, location or device ids
 * @param {string} [itemId]
 */
export async function logEvent(type, payload = {}, itemId) {
  if (!studentCode) return;
  const ev = { clientEventId: uuid(), studentCode, sessionId, ts: Date.now(), type, itemId, payload };
  try {
    await db.events.add(ev);
    await db.outbox.add({ kind: 'event', status: 'pending', payload: ev, tries: 0, nextTryAt: 0 });
  } catch (e) {
    console.warn('logEvent gagal', e);
  }
}

function csvCell(v) {
  const s = typeof v === 'object' ? JSON.stringify(v ?? '') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportEvents(format = 'csv') {
  const rows = await db.events.orderBy('id').toArray();
  if (format === 'json') return JSON.stringify(rows, null, 1);
  const cols = ['studentCode', 'sessionId', 'ts', 'type', 'itemId', 'payload'];
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
}
