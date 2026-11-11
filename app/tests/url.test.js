import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => globalThis.__native === true } }));
vi.mock('../src/storage/db.js', () => ({ getSetting: async () => null }));

const { validateServerUrl } = await import('../src/sync/api.js');

describe('validateServerUrl (HTTPS only)', () => {
  it('accepts https with IP and port', () => {
    expect(validateServerUrl('https://192.168.1.10:8443')).toBeNull();
    expect(validateServerUrl('https://splv.sekolah.sch.id')).toBeNull();
  });
  it('rejects plain http on a LAN address', () => {
    expect(validateServerUrl('http://192.168.1.10:8000')).toMatch(/https/);
  });
  it('allows http://localhost only in the desktop browser', () => {
    globalThis.__native = false;
    expect(validateServerUrl('http://localhost:8000')).toBeNull();
    globalThis.__native = true;
    expect(validateServerUrl('http://localhost:8000')).toMatch(/https/);
    globalThis.__native = false;
  });
  it('rejects garbage', () => {
    expect(validateServerUrl('192.168.1.10')).toMatch(/tidak valid/);
  });
});
