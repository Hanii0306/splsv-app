// Build the web version into docs/ and push the whole project to GitHub
// (Pages serves docs/ at https://hanii0306.github.io/splsv-app/).
// Usage:  node app/scripts/deploy-web.mjs "pesan perubahan"
// Secrets (keystore, server/.env, server/certs, *.db) are excluded by .gitignore — check `git status` first.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(appDir, '..');
const msg = (process.argv[2] || 'Perbarui SPLSV app').replace(/"/g, "'");
const run = (cmd, cwd = repo) => execSync(cmd, { cwd, stdio: 'inherit' });

if (!existsSync(join(repo, '.git'))) throw new Error('Folder proyek belum terhubung ke GitHub (repo splsv-app).');
run('node scripts/build-web.mjs', appDir);
copyFileSync(join(appDir, 'dist-web', 'index.html'), join(repo, 'docs', 'index.html'));
run('git add -A');
const staged = execSync('git diff --cached --name-only', { cwd: repo }).toString();
if (/keystore|\.jks|(^|\/)\.env$|ca\.key|server\.key|\.db$/m.test(staged)) {
  throw new Error('Berhenti: ada file rahasia yang akan ter-commit. Periksa .gitignore.');
}
if (!staged.trim()) { console.log('Tidak ada perubahan untuk diterbitkan.'); process.exit(0); }
execSync('git commit -F -', { cwd: repo, input: `${msg}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, stdio: ['pipe', 'inherit', 'inherit'] });
run('git push');
console.log('Terbit. Dalam 1–2 menit cek: https://hanii0306.github.io/splsv-app/');
