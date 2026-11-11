// Build the web version and publish it to GitHub Pages (https://hanii0306.github.io/splsv-app/).
// Usage:  node app/scripts/deploy-web.mjs "pesan perubahan"
// Needs: git, and a GitHub login (gh auth login) on this computer. Only web/pages/ is pushed:
// no research documents, keys or certificates ever leave this laptop.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = join(appDir, '..', 'web', 'pages');
const msg = process.argv[2] || 'Perbarui SPLSV app';
const run = (cmd, cwd = appDir) => execSync(cmd, { cwd, stdio: 'inherit' });

if (!existsSync(join(pages, '.git'))) throw new Error('web/pages belum terhubung ke GitHub (repo splsv-app).');
run('node scripts/build-web.mjs');
copyFileSync(join(appDir, 'dist-web', 'index.html'), join(pages, 'index.html'));
run('git add index.html', pages);
try {
  const body = `${msg.replace(/"/g, "'")}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  execSync('git commit -F -', { cwd: pages, input: body, stdio: ['pipe', 'inherit', 'inherit'] });
} catch {
  console.log('Tidak ada perubahan untuk diterbitkan.');
  process.exit(0);
}
run('git push', pages);
console.log('Terbit. Dalam 1–2 menit cek: https://hanii0306.github.io/splsv-app/');
