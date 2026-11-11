// Guards against DOM/Web APIs that the legacy polyfills do NOT cover and that crash or
// silently fail on old Android System WebView (Chrome 61–85). Found on the Android 8 emulator.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(jsx?|css)$/.test(f) ? [p] : [];
  });
}

const BANNED_JS = [
  [/\.replaceChildren\(/, 'replaceChildren() needs Chrome 86'],
  [/structuredClone\(/, 'structuredClone needs Chrome 98'],
  [/\.showModal\(/, '<dialog> needs Chrome 37+ but is unreliable in WebView'],
  [/navigator\.clipboard\.(?!writeText)|navigator\.clipboard\.writeText(?![^\n]*\?\?)/, 'clipboard API must be guarded (navigator.clipboard?.writeText … ?? fallback)'],
  [/(?<!\?\.)randomUUID\(/, 'crypto.randomUUID needs Chrome 92 (use the guarded helper)'],
];
const BANNED_CSS = [
  [/:has\(/, ':has() needs Chrome 105'],
  [/@container/, 'container queries need Chrome 105'],
  [/\binset\s*:/, 'inset shorthand needs Chrome 87'],
  [/aspect-ratio\s*:/, 'aspect-ratio needs Chrome 88'],
];

describe('old WebView compatibility', () => {
  for (const f of files(SRC)) {
    const text = readFileSync(f, 'utf8');
    const rules = f.endsWith('.css') ? BANNED_CSS : BANNED_JS;
    it(f.slice(SRC.length), () => {
      for (const [re, why] of rules) expect(re.test(text), `${why}`).toBe(false);
    });
  }

  it('3D is skipped on WebView older than Chrome 90 and after a crash', () => {
    const src = readFileSync(join(SRC, 'ui/ScaleView.jsx'), 'utf8');
    expect(src).toMatch(/MIN_CHROME_FOR_3D = 90/);
    expect(src).toMatch(/splv\.scale3d\.pending/);
  });
});
