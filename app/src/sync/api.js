// HTTP client for the FastAPI server (api.md §7).
import { Capacitor } from '@capacitor/core';
import { getSetting } from '../storage/db.js';

/** Empty by default: the app is fully standalone; a server is optional (research/dashboard). */
export const DEFAULT_API_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');

/**
 * HTTPS only. Plain http is accepted solely for localhost while developing in a desktop browser;
 * the Android build blocks cleartext traffic entirely (network_security_config.xml).
 * @returns {string|null} error message, or null when valid
 */
export function validateServerUrl(value) {
  let u;
  try { u = new URL(value); } catch { return 'Alamat server tidak valid. Contoh: https://192.168.1.10:8443'; }
  if (u.protocol === 'https:') return null;
  const local = ['localhost', '127.0.0.1'].includes(u.hostname);
  if (u.protocol === 'http:' && local && !Capacitor.isNativePlatform()) return null;
  return 'Alamat server harus diawali https:// demi keamanan data siswa.';
}

/** Server address set at login or in the research menu; '' means standalone (no network use). */
export async function getApiUrl() {
  const custom = await getSetting('apiUrl');
  return (custom || DEFAULT_API_URL || '').replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function request(path, { method = 'GET', body, auth = true, timeoutMs = 10000 } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getSetting('deviceToken');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const base = await getApiUrl();
  if (!base) throw new ApiError(0, 'Server belum diatur');
  let timer;
  // Promise.race: native HTTP (CapacitorHttp) may ignore AbortSignal, so enforce the timeout here.
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new ApiError(0, 'Server tidak menjawab')), timeoutMs); });
  try {
    const res = await Promise.race([
      fetch(`${base}/api/v1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }),
      timeout,
    ]);
    if (!res.ok) {
      const detail = (await res.json().catch(() => ({}))).detail;
      throw new ApiError(res.status, typeof detail === 'string' ? detail : res.statusText);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const joinClass = (classCode, studentCode) =>
  request(`/classes/${encodeURIComponent(classCode)}/join`, { method: 'POST', body: { studentCode }, auth: false });
