// Send the monitoring row to Supabase (rpc lapor_siswa). Never blocks learning; retried on next trigger.
import { Capacitor } from '@capacitor/core';
import { APP_VERSION, SUPABASE_KEY, SUPABASE_URL } from '../config.js';
import { db, getProfile, getSetting, setSetting } from '../storage/db.js';
import { buildReport, fingerprint } from './report.js';

const MIN_INTERVAL_MS = 60_000; // at most once a minute unless something changed

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

/** Random id per installation/browser (NOT a hardware/device identifier). */
async function installId() {
  let id = await getSetting('installId');
  if (!id) { id = uuid(); await setSetting('installId', id); }
  return id;
}

export const monitoringEnabled = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

let busy = false;

/** @param {{force?: boolean}} [opts] */
export async function reportStudent(opts = {}) {
  if (!monitoringEnabled() || busy) return 'off';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  busy = true;
  try {
    const profile = await getProfile();
    if (!profile?.studentCode) return 'no_profile';
    const [progress, events] = await Promise.all([
      db.progress.where('studentCode').equals(profile.studentCode).toArray(),
      db.events.where('studentCode').equals(profile.studentCode).toArray(),
    ]);
    const report = buildReport(profile, progress, events, {
      installId: await installId(),
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      version: APP_VERSION,
    });
    const key = `monitor:${profile.studentCode}`;
    const last = (await getSetting(key)) || {};
    const fp = fingerprint(report);
    if (!opts.force && last.fp === fp && Date.now() - (last.at || 0) < 10 * 60_000) return 'unchanged';
    if (!opts.force && Date.now() - (last.at || 0) < MIN_INTERVAL_MS && last.fp === fp) return 'throttled';

    const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
    if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`; // legacy anon JWT
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/lapor_siswa`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p: report }),
    });
    if (!res.ok) return `error_${res.status}`;
    await setSetting(key, { fp, at: Date.now() });
    return 'sent';
  } catch {
    return 'network_error';
  } finally {
    busy = false;
  }
}
