// Build SPLV app as ONE self-contained HTML page (all JS/CSS inlined) for the web link.
// Usage:  node scripts/build-web.mjs      → ../web/splv-app.html
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(appDir, '..', 'web');

execSync('npx vite build', { cwd: appDir, stdio: 'inherit', env: { ...process.env, SPLV_WEB: '1' } });

let html = readFileSync(join(appDir, 'dist-web', 'index.html'), 'utf8');
// The web host wraps the page in its own <!doctype><html><head><body> skeleton:
// keep only what goes inside (title, meta, styles, markup, scripts).
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset="UTF-8"\s*\/?>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .trim();
// Title first (only the first 8 KB are scanned for it).
const title = html.match(/<title>[\s\S]*?<\/title>/i)[0];
html = `${title}\n${html.replace(title, '')}`;

mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'splv-app.html');
writeFileSync(out, html);
console.log(`Web page: ${out} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
