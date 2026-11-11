import { describe, expect, it } from 'vitest';
import levels from '../src/content/levels.json';
import summaries from '../src/content/summaries.json';
import { parse } from '../src/engine/index.js';

describe('content v1.4', () => {
  it('has L0–L7 only (no inequality level)', () => {
    expect(levels.map((l) => l.id)).toEqual(['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7']);
    expect(Object.keys(summaries)).not.toContain('L8');
  });
  it('every level has explanation cards whose equations parse', () => {
    for (const l of levels) {
      expect(l.intro?.length, l.id).toBeGreaterThanOrEqual(4);
      for (const c of l.intro) { expect(c.text.length).toBeGreaterThan(20); expect(() => parse(c.equation), c.equation).not.toThrow(); }
    }
  });
  it('every summary has an analogy', () => {
    for (const k of Object.keys(summaries)) expect(summaries[k].analogy, k).toBeTruthy();
  });
});
