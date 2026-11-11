// Student accounts on THIS device: researcher-style code (S01…) + a short PIN.
// Many students can share one phone/browser without mixing data (prd.md F17). No names are stored.
import { db, getSetting, saveProfile, setSetting } from './db.js';

export const CODE_RE = /^[A-Za-z0-9_-]{2,32}$/;
export const PIN_RE = /^\d{4,6}$/;

/** Light hashing (salted with the code). The PIN only separates classmates on a shared device. */
export async function hashPin(code, pin) {
  const text = `splv:${code}:${pin}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return `fnv${h >>> 0}`;
}

export const listAccounts = async () => (await db.profile.toArray()).sort((a, b) => a.studentCode.localeCompare(b.studentCode, 'id', { numeric: true }));

export const getAccount = (code) => db.profile.get(code.trim().toUpperCase());

export async function createAccount(code, pin, extra = {}) {
  const studentCode = code.trim().toUpperCase();
  if (!CODE_RE.test(studentCode)) throw new Error('Kode hanya huruf/angka, 2–32 karakter. Contoh: S01');
  if (!PIN_RE.test(pin)) throw new Error('PIN harus 4–6 angka.');
  if (await db.profile.get(studentCode)) throw new Error(`Kode ${studentCode} sudah dipakai di perangkat ini. Pilih kode lain atau masuk.`);
  const profile = { studentCode, classCode: null, verified: false, consent: true, createdAt: Date.now(), prereq: null, reinforced: [], ...extra, pinHash: await hashPin(studentCode, pin) };
  await db.profile.put(profile);
  return profile;
}

/** @returns {Promise<{ok: true, profile: object} | {ok: false, reason: 'unknown'|'wrong_pin'|'no_pin'|'locked', profile?: object}>} */
export async function signIn(code, pin) {
  const studentCode = code.trim().toUpperCase();
  const profile = await db.profile.get(studentCode);
  if (!profile) return { ok: false, reason: 'unknown' };
  if (!profile.pinHash) return { ok: false, reason: 'no_pin', profile }; // accounts from v1.2 and earlier
  const lockUntil = profile.lockUntil || 0;
  if (Date.now() < lockUntil) return { ok: false, reason: 'locked', profile };
  if ((await hashPin(studentCode, pin)) !== profile.pinHash) {
    const fails = (profile.fails || 0) + 1;
    await db.profile.update(studentCode, { fails, lockUntil: fails >= 5 ? Date.now() + 60_000 : 0 });
    return { ok: false, reason: fails >= 5 ? 'locked' : 'wrong_pin' };
  }
  await db.profile.update(studentCode, { fails: 0, lockUntil: 0 });
  const fresh = await db.profile.get(studentCode);
  await saveProfile(fresh);
  return { ok: true, profile: fresh };
}

export async function setPin(code, pin) {
  if (!PIN_RE.test(pin)) throw new Error('PIN harus 4–6 angka.');
  await db.profile.update(code, { pinHash: await hashPin(code, pin), fails: 0, lockUntil: 0 });
}

export const randomPin = () => {
  const a = new Uint32Array(1);
  (globalThis.crypto?.getRandomValues ? crypto.getRandomValues(a) : (a[0] = Math.floor(Math.random() * 1e9)));
  return String(a[0] % 10000).padStart(4, '0');
};

/** Teacher/researcher: make S01…Sn accounts with random PINs; existing codes are skipped. */
export async function createBatch(prefix, count, start = 1) {
  const width = Math.max(2, String(start + count - 1).length);
  const made = [];
  for (let i = start; i < start + count; i++) {
    const code = `${prefix}${String(i).padStart(width, '0')}`.toUpperCase();
    if (await db.profile.get(code)) continue;
    const pin = randomPin();
    await createAccount(code, pin);
    made.push({ code, pin });
  }
  return made;
}

/** Remove the account and its progress (learning events are kept for research). */
export async function deleteAccount(code) {
  await db.profile.delete(code);
  await db.progress.where('studentCode').equals(code).delete();
  if ((await getSetting('currentStudent')) === code) await setSetting('currentStudent', null);
}

export const signOut = () => setSetting('currentStudent', null);
