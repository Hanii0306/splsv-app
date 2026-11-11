// Offline-first local store (api.md §5). Only researcher-issued codes — never names.
import Dexie from 'dexie';

export const db = new Dexie('splv-app');

db.version(1).stores({
  profile: 'studentCode',
  progress: '[studentCode+levelId], studentCode',
  attempts: '++id, studentCode, itemId',
  events: '++id, studentCode, sessionId, type',
  outbox: '++id, status, kind',
  settings: 'key',
});

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

export async function getProfile() {
  const code = await getSetting('currentStudent');
  return code ? db.profile.get(code) : null;
}

export async function saveProfile(profile) {
  await db.profile.put(profile);
  await setSetting('currentStudent', profile.studentCode);
}

export async function getProgress(studentCode) {
  const rows = await db.progress.where('studentCode').equals(studentCode).toArray();
  return Object.fromEntries(rows.map((r) => [r.levelId, r]));
}

const RANK = { locked: 0, active: 1, mastered: 2 };

/** Never downgrade a level (mirrors the server merge rule). */
export async function updateProgress(studentCode, levelId, patch) {
  const prev = (await db.progress.get([studentCode, levelId])) || { studentCode, levelId, status: 'locked', bestStreak: 0 };
  const status = RANK[patch.status ?? prev.status] > RANK[prev.status] ? patch.status : prev.status;
  const row = {
    ...prev,
    ...patch,
    status,
    bestStreak: Math.max(prev.bestStreak || 0, patch.bestStreak || 0),
    updatedAt: Date.now(),
  };
  await db.progress.put(row);
  await db.outbox.add({ kind: 'progress', status: 'pending', payload: { levelId, status: row.status, bestStreak: row.bestStreak }, tries: 0, nextTryAt: 0 });
  return row;
}
