import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handle, validate } from '../../supabase/functions/tutor/handler.js';

const INSTALL = '6f1c2a40-0000-4000-8000-000000000001';
const ENV = { AI_API_KEY: 'test-key', AI_MODEL: 'model-a', AI_FALLBACK_MODEL: 'model-b', SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'eyJservice' };

/** Fake fetch: AI replies from a queue; DB counts from `counts`; records every call. */
function fakeFetch({ replies = [], counts = { device: 0, total: 0 }, aiStatus = [] } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.includes('/chat/completions')) {
      const status = aiStatus.length ? aiStatus.shift() : 200;
      if (status !== 200) return new Response('{}', { status });
      return new Response(JSON.stringify({ choices: [{ message: { content: replies.shift() ?? '' } }] }), { status: 200 });
    }
    if (url.includes('/rest/v1/percakapan_tutor?')) {
      const n = url.includes('install_id=eq.') ? counts.device : counts.total;
      return new Response('[]', { status: 206, headers: { 'content-range': `0-0/${n}` } });
    }
    if (url.endsWith('/rest/v1/percakapan_tutor')) return new Response(null, { status: 201 });
    throw new Error(`unexpected ${url}`);
  };
  fn.calls = calls;
  return fn;
}
const req = (body, origin = 'https://hanii0306.github.io') => new Request('https://fn.test/tutor', {
  method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const base = { mode: 'item', itemId: 'T2', message: 'aku bingung', installId: INSTALL, studentCode: 's07', version: '1.7.0' };

describe('Detektif AI edge function', () => {
  it('generated lib is in sync with app/src/engine/tutor.js', () => {
    const src = readFileSync(new URL('../src/engine/tutor.js', import.meta.url), 'utf8');
    const gen = readFileSync(new URL('../../supabase/functions/tutor/lib/tutor.js', import.meta.url), 'utf8');
    expect(gen.endsWith(src)).toBe(true);
  });

  it('validates input', () => {
    expect(validate({ ...base, message: '' }).ok).toBe(false);
    expect(validate({ ...base, message: 'x'.repeat(501) }).ok).toBe(false);
    expect(validate({ ...base, itemId: 'L1-01' }).ok).toBe(false);
    expect(validate({ ...base, installId: 'nope' }).ok).toBe(false);
    expect(validate({ ...base, studentCode: 'Budi Santoso' }).v.studentCode).toBeNull();
    expect(validate(base).v.studentCode).toBe('S07');
  });

  it('503 when the AI key is not configured', async () => {
    const res = await handle(req(base), { ...ENV, AI_API_KEY: '' }, fakeFetch());
    expect(res.status).toBe(503);
  });

  it('answers, logs the conversation, and never sends the student code to the AI provider', async () => {
    const f = fakeFetch({ replies: ['Apa yang diketahui? Lalu susun biaya paket ditambah operasional, lakukan hal sama pada kedua ruas.'] });
    const res = await handle(req(base), ENV, f);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toMatch(/kedua ruas/);
    expect(data.blocked).toBe(false);
    const ai = f.calls.find((c) => c.url.includes('/chat/completions'));
    expect(ai.init.body).not.toMatch(/S07|6f1c2a40/);
    expect(JSON.parse(ai.init.body).messages[0].content).toContain('Rp4.250.000');
    const log = JSON.parse(f.calls.find((c) => c.url.endsWith('/rest/v1/percakapan_tutor')).init.body);
    expect(log).toMatchObject({ kode_siswa: 'S07', item_id: 'T2', pesan_siswa: 'aku bingung', diblokir: false, model: 'model-a' });
    expect(res.headers.get('access-control-allow-origin')).toBe('https://hanii0306.github.io');
  });

  it('blocks a leaked final answer: retries once, then falls back to a safe clue', async () => {
    const f = fakeFetch({ replies: ['Jadi p = 30.', 'Tetap: p = 30.'] });
    const data = await (await handle(req(base), ENV, f)).json();
    expect(data.blocked).toBe(true);
    expect(data.reply).not.toMatch(/p = 30/);
    const log = JSON.parse(f.calls.find((c) => c.url.endsWith('/rest/v1/percakapan_tutor')).init.body);
    expect(log.diblokir).toBe(true);
  });

  it('uses the fallback model on 429 and a safe reply when every model fails', async () => {
    const f = fakeFetch({ aiStatus: [429, 200], replies: ['Coba kurangi 650.000 pada kedua ruas. Berapa hasilnya?'] });
    const ok = await (await handle(req(base), ENV, f)).json();
    expect(ok.reply).toMatch(/kedua ruas/);
    const g = fakeFetch({ aiStatus: [500, 500] });
    const down = await (await handle(req(base), ENV, g)).json();
    expect(down.offline).toBe(true);
    expect(down.reply.length).toBeGreaterThan(10);
  });

  it('enforces per-device and total daily limits', async () => {
    const dev = await handle(req(base), ENV, fakeFetch({ counts: { device: 60, total: 0 } }));
    expect(dev.status).toBe(429);
    const all = await handle(req(base), { ...ENV, TUTOR_LIMIT_TOTAL: '100' }, fakeFetch({ counts: { device: 0, total: 100 } }));
    expect(all.status).toBe(429);
  });

  it('materi mode works without an item; CORS preflight is answered', async () => {
    const f = fakeFetch({ replies: ['SPLSV punya satu variabel berpangkat satu. Contohnya apa menurutmu?'] });
    const res = await handle(req({ ...base, mode: 'materi', itemId: undefined }), ENV, f);
    expect(res.status).toBe(200);
    const pre = await handle(new Request('https://fn.test/tutor', { method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } }), ENV, f);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
  });
});
