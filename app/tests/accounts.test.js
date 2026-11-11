import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAccount, createBatch, deleteAccount, listAccounts, setPin, signIn } from '../src/storage/accounts.js';
import { db, getSetting } from '../src/storage/db.js';

beforeEach(async () => {
  await db.profile.clear();
  await db.progress.clear();
  await db.settings.clear();
});

describe('student accounts with PIN', () => {
  it('registers and signs in with the right PIN only', async () => {
    await createAccount('s07', '2468');
    expect((await signIn('S07', '1111')).reason).toBe('wrong_pin');
    const ok = await signIn('s07', '2468');
    expect(ok.ok).toBe(true);
    expect(await getSetting('currentStudent')).toBe('S07');
  });

  it('keeps classmates apart on one device', async () => {
    await createAccount('S01', '1111');
    await createAccount('S02', '2222');
    expect((await signIn('S01', '2222')).ok).toBe(false);
    expect((await signIn('S02', '2222')).profile.studentCode).toBe('S02');
  });

  it('rejects duplicates, bad codes and bad PINs', async () => {
    await createAccount('S01', '1111');
    await expect(createAccount('s01', '9999')).rejects.toThrow(/sudah dipakai/);
    await expect(createAccount('S 1', '9999')).rejects.toThrow(/Kode/);
    await expect(createAccount('S03', '12')).rejects.toThrow(/PIN/);
  });

  it('locks for a minute after 5 wrong PINs', async () => {
    await createAccount('S05', '5555');
    for (let i = 0; i < 4; i++) expect((await signIn('S05', '0000')).reason).toBe('wrong_pin');
    expect((await signIn('S05', '0000')).reason).toBe('locked');
    expect((await signIn('S05', '5555')).reason).toBe('locked');
  });

  it('teacher batch creates S01…Sn with 4-digit PINs and skips existing codes', async () => {
    await createAccount('S02', '2222');
    const made = await createBatch('S', 5, 1);
    expect(made.map((m) => m.code)).toEqual(['S01', 'S03', 'S04', 'S05']);
    for (const m of made) {
      expect(m.pin).toMatch(/^\d{4}$/);
      expect((await signIn(m.code, m.pin)).ok).toBe(true);
    }
    expect((await listAccounts()).map((a) => a.studentCode)).toEqual(['S01', 'S02', 'S03', 'S04', 'S05']);
  });

  it('legacy accounts without a PIN must set one; reset and delete work', async () => {
    await db.profile.put({ studentCode: 'S09', prereq: null });
    expect((await signIn('S09', '1234')).reason).toBe('no_pin');
    await setPin('S09', '4321');
    expect((await signIn('S09', '4321')).ok).toBe(true);
    await deleteAccount('S09');
    expect((await signIn('S09', '4321')).reason).toBe('unknown');
  });
});
