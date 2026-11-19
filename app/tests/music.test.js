import { describe, expect, it } from 'vitest';
import { buildLoop, freq, STEPS } from '../src/audio/music.js';

describe('detective tune (pure parts)', () => {
  it('equal-temperament frequencies', () => {
    expect(freq('A4')).toBeCloseTo(440, 5);
    expect(freq('A2')).toBeCloseTo(110, 5);
    expect(freq('C5')).toBeCloseTo(523.251, 2);
    expect(() => freq('H4')).toThrow();
  });
  it('8-bar loop: bass on quarters, snaps on beats 2 & 4, every note valid', () => {
    const loop = buildLoop();
    expect(loop).toHaveLength(STEPS);
    loop.forEach((s, i) => {
      if (i % 2 === 1) expect(s.bass).toBeNull();
      expect(s.snap).toBe(i % 8 === 2 || i % 8 === 6);
      for (const n of [s.bass, s.melody]) if (n) expect(freq(n)).toBeGreaterThan(60);
    });
    expect(loop.filter((s) => s.melody).length).toBeGreaterThan(20);
  });
});
