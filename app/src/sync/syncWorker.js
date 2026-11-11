// Offline → online sync (architecture.md §3.11). Learning never waits for the network.
import { db, getProfile, getSetting, saveProfile, setSetting } from '../storage/db.js';
import { ApiError, getApiUrl, joinClass, request } from './api.js';
import { reportStudent } from './supabase.js';

const BATCH = 200;
const INTERVAL_MS = 2 * 60 * 1000;
const backoff = (tries) => Math.min(30_000 * 2 ** tries, 30 * 60_000);

let running = false;
const listeners = new Set();
export const onSyncStatus = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = (s) => listeners.forEach((fn) => fn(s));

async function ensureToken() {
  if (await getSetting('deviceToken')) return true;
  const profile = await getProfile();
  if (!profile?.classCode) return false;
  try {
    const { token } = await joinClass(profile.classCode, profile.studentCode);
    await setSetting('deviceToken', token);
    await saveProfile({ ...profile, verified: true });
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) await saveProfile({ ...profile, verified: false, joinError: e.message });
    return false;
  }
}

export async function syncNow() {
  reportStudent(); // online monitoring (Supabase); fire-and-forget, never blocks learning
  if (running) return;
  // Standalone mode: no server configured → never touch the network.
  const profile = await getProfile();
  if (!(await getApiUrl()) || !profile?.classCode) { emit({ state: 'local' }); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { emit({ state: 'offline', pending: await db.outbox.count() }); return; }
  running = true;
  emit({ state: 'syncing' });
  try {
    if (!(await ensureToken())) {
      emit({ state: 'offline', pending: await db.outbox.count() });
      return;
    }
    const now = Date.now();
    const due = (r) => r.status === 'pending' && (r.nextTryAt || 0) <= now;

    const events = (await db.outbox.where('kind').equals('event').toArray()).filter(due).slice(0, BATCH);
    if (events.length) {
      try {
        await request('/events:batch', {
          method: 'POST',
          body: { events: events.map(({ payload: e }) => ({ clientEventId: e.clientEventId, sessionId: e.sessionId, ts: e.ts, type: e.type, itemId: e.itemId, payload: e.payload })) },
        });
        await db.outbox.bulkDelete(events.map((r) => r.id));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await setSetting('deviceToken', null);
        await Promise.all(events.map((r) => db.outbox.update(r.id, { tries: r.tries + 1, nextTryAt: now + backoff(r.tries) })));
        throw e;
      }
    }

    const prog = (await db.outbox.where('kind').equals('progress').toArray()).filter(due);
    if (prog.length) {
      const latest = new Map(prog.map((r) => [r.payload.levelId, r.payload]));
      await request('/progress', { method: 'PUT', body: { items: [...latest.values()] } });
      await db.outbox.bulkDelete(prog.map((r) => r.id));
    }

    await setSetting('lastSyncAt', Date.now());
    emit({ state: 'ok', pending: await db.outbox.count(), lastSyncAt: Date.now() });
  } catch (e) {
    emit({ state: 'error', message: e.message, pending: await db.outbox.count() });
  } finally {
    running = false;
  }
}

let timer = null;
export function startSync() {
  if (timer) return;
  window.addEventListener('online', syncNow);
  timer = setInterval(syncNow, INTERVAL_MS);
  syncNow();
}
