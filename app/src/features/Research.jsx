import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { db, getProfile, getSetting, saveProfile, setSetting } from '../storage/db.js';
import { getApiUrl, validateServerUrl } from '../sync/api.js';
import { onSyncStatus, syncNow } from '../sync/syncWorker.js';
import { exportEvents } from '../telemetry/log.js';
import { createBatch, deleteAccount, listAccounts, randomPin, setPin } from '../storage/accounts.js';
import Header from '../ui/Header.jsx';
import { reasonNo3D } from '../ui/ScaleView.jsx';

// Light obfuscation only; the menu holds no identities, just research toggles and exports.
async function hashPin(pin) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`sx:${pin}`));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0;
  for (const c of `sx:${pin}`) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return `fnv${h}`;
}

async function shareFile(name, content, mime) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const res = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, url: res.uri });
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { /* some web viewers block downloads; the text box below is the fallback */ }
  return 'web';
}

export default function Research({ profile, settings, onSettings, onBack, onLogout }) {
  const [stored, setStored] = useState(undefined);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [sync, setSync] = useState(null);
  const [counts, setCounts] = useState({ events: 0, outbox: 0 });
  const [apiUrl, setApiUrl] = useState('');
  const [apiSaved, setApiSaved] = useState(false);
  const [classCode, setClassCode] = useState(profile.classCode || '');
  const [exportText, setExportText] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [notice3d, setNotice3d] = useState('');
  const [accts, setAccts] = useState([]);
  const [batch, setBatch] = useState({ prefix: 'S', count: 30, start: 1 });
  const [made, setMade] = useState(null);
  const [acctMsg, setAcctMsg] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const reloadAccts = () => listAccounts().then(setAccts);
  useEffect(() => { if (unlocked) reloadAccts(); }, [unlocked]);

  useEffect(() => { getSetting('researchPinHash').then(setStored); getApiUrl().then(setApiUrl); }, []);

  async function saveApiUrl() {
    const v = apiUrl.trim().replace(/\/$/, '');
    const cc = classCode.trim().toUpperCase();
    const err = v ? validateServerUrl(v) : null;
    if (err) { setError(err); return; }
    if (v && !/^[A-Z0-9_-]{2,32}$/.test(cc)) { setError('Isi kode kelas dari peneliti (mis. VIIA-P4J7).'); return; }
    await setSetting('apiUrl', v || null);
    const current = await getProfile();
    await saveProfile({ ...current, classCode: cc || null, verified: false, joinError: null });
    await setSetting('deviceToken', null); // re-join on the new server
    setError('');
    setApiSaved(true);
    syncNow();
  }
  useEffect(() => onSyncStatus(setSync), []);
  useEffect(() => {
    if (!unlocked) return;
    Promise.all([db.events.count(), db.outbox.count()]).then(([events, outbox]) => setCounts({ events, outbox }));
  }, [unlocked, sync]);

  async function submitPin(e) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) { setError('PIN 4–8 angka.'); return; }
    const h = await hashPin(pin);
    if (!stored) { await setSetting('researchPinHash', h); setUnlocked(true); return; }
    if (h === stored) setUnlocked(true); else setError('PIN salah.');
  }

  const toggle = (key) => onSettings({ ...settings, [key]: !settings[key] });
  const stamp = new Date().toISOString().slice(0, 10);

  if (!unlocked) {
    return (
      <div className="screen">
        <Header title="Menu peneliti" onBack={onBack} />
        <main className="content">
          <form className="form" onSubmit={submitPin}>
            <p className="muted">{stored === null ? 'Buat PIN peneliti (pertama kali).' : 'Masukkan PIN peneliti.'}</p>
            <label>PIN<input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" /></label>
            {error && <p className="feedback feedback-warn">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block">Buka</button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="screen">
      <Header title="Menu peneliti" onBack={onBack} />
      <main className="content settings">
        <section>
          <h2>Siswa</h2>
          <p>{profile.studentCode}{profile.classCode ? ` · kelas ${profile.classCode} · ${profile.verified ? 'terverifikasi server' : 'belum terverifikasi'}` : ' · mode mandiri'}</p>
          {profile.joinError && <p className="feedback feedback-warn">{profile.joinError}</p>}
        </section>

        <section>
          <h2>Akun siswa di perangkat ini ({accts.length})</h2>
          <p className="muted">Buat akun sekaligus untuk satu kelas. Bagikan kode + PIN ke tiap siswa (catatan nama ↔ kode disimpan guru, bukan di aplikasi).</p>
          <div className="row">
            <label style={{ flex: 1 }}>Awalan<input id="b-prefix" value={batch.prefix} onChange={(e) => setBatch({ ...batch, prefix: e.target.value.toUpperCase().slice(0, 6) })} /></label>
            <label style={{ flex: 1 }}>Jumlah<input id="b-count" type="number" min="1" max="60" value={batch.count} onChange={(e) => setBatch({ ...batch, count: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} /></label>
            <label style={{ flex: 1 }}>Mulai<input id="b-start" type="number" min="1" value={batch.start} onChange={(e) => setBatch({ ...batch, start: Math.max(1, Number(e.target.value) || 1) })} /></label>
          </div>
          <button type="button" className="btn" onClick={async () => {
            const m = await createBatch(batch.prefix || 'S', batch.count, batch.start);
            setMade(m); setAcctMsg(m.length ? `${m.length} akun dibuat.` : 'Semua kode itu sudah ada.'); reloadAccts();
          }}>Buat akun</button>
          {made && made.length > 0 && (
            <>
              <textarea id="made-list" readOnly rows={6} style={{ width: '100%', fontFamily: 'var(--font-math)' }} value={made.map((m) => `${m.code}\tPIN ${m.pin}`).join('\n')} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn" onClick={() => { const el = document.getElementById('made-list'); (navigator.clipboard?.writeText(el.value) ?? Promise.reject()).then(() => setAcctMsg('Daftar tersalin ✓')).catch(() => { el.focus(); el.select(); }); }}>Salin daftar kode & PIN</button>
            </>
          )}
          {acctMsg && <p className="feedback feedback-ok">{acctMsg}</p>}
          {accts.length > 0 && (
            <table className="acct-table">
              <tbody>
                {accts.map((a) => (
                  <tr key={a.studentCode}>
                    <td><strong>{a.studentCode}</strong>{a.pinHash ? '' : ' (tanpa PIN)'}</td>
                    <td>
                      <button type="button" className="mini-btn" onClick={async () => { const p = randomPin(); await setPin(a.studentCode, p); setAcctMsg(`PIN baru ${a.studentCode}: ${p}`); reloadAccts(); }}>Reset PIN</button>{' '}
                      <button type="button" className="mini-btn" onClick={async () => {
                        if (confirmDel !== a.studentCode) { setConfirmDel(a.studentCode); return; }
                        await deleteAccount(a.studentCode); setConfirmDel(null); setAcctMsg(`Akun ${a.studentCode} dihapus.`); reloadAccts();
                      }}>{confirmDel === a.studentCode ? 'Yakin hapus?' : 'Hapus'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Dashboard guru (opsional)</h2>
          <p className="muted">Kosongkan bila tidak memakai server. Semua data tetap tersimpan di HP dan bisa diekspor.</p>
          <div className="form">
            <label>Kode kelas
              <input value={classCode} onChange={(e) => { setClassCode(e.target.value); setApiSaved(false); }} autoCapitalize="characters" placeholder="VIIA-P4J7" />
            </label>
            <label>Alamat server
              <input value={apiUrl} onChange={(e) => { setApiUrl(e.target.value); setApiSaved(false); }} inputMode="url" autoCapitalize="none" style={{ textTransform: 'none' }} placeholder="https://alamat-server" />
            </label>
            <button type="button" className="btn" onClick={saveApiUrl}>{apiSaved ? 'Tersimpan ✓' : 'Simpan'}</button>
            {error && <p className="feedback feedback-warn">{error}</p>}
          </div>
          <p>{counts.events} aktivitas tercatat · {counts.outbox} menunggu dikirim</p>
          {sync && <p className="muted">Status: {{ local: 'mode mandiri (tanpa server)', ok: 'tersinkron', syncing: 'menyinkron…', offline: 'menunggu server/internet', error: 'gagal' }[sync.state] || sync.state}{sync.message ? ` (${sync.message})` : ''}</p>}
          <button type="button" className="btn" onClick={syncNow}>Sinkron sekarang</button>
        </section>

        <section>
          <h2>Ekspor data</h2>
          <div className="row">
            <button type="button" className="btn" onClick={async () => { const t = await exportEvents('csv'); if ((await shareFile(`splv-app-${profile.studentCode}-${stamp}.csv`, t, 'text/csv')) === 'web') { setExportText(t); setCopied(false); } }}>CSV</button>
            <button type="button" className="btn" onClick={async () => { const t = await exportEvents('json'); if ((await shareFile(`splv-app-${profile.studentCode}-${stamp}.json`, t, 'application/json')) === 'web') { setExportText(t); setCopied(false); } }}>JSON</button>
          </div>
        </section>

        {exportText != null && (
          <section>
            <h2>Data ekspor</h2>
            <p className="muted">Bila file tidak terunduh, salin teks ini lalu tempel ke Notepad/Excel dan simpan sebagai .csv/.json.</p>
            <textarea id="export-text" readOnly value={exportText} rows={8} style={{ width: '100%', fontFamily: 'var(--font-math)', fontSize: 12 }} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn" onClick={() => {
              const el = document.getElementById('export-text');
              (navigator.clipboard?.writeText(exportText) ?? Promise.reject()).then(() => setCopied(true)).catch(() => { el.focus(); el.select(); });
            }}>{copied ? 'Tersalin ✓' : 'Salin teks'}</button>
          </section>
        )}

        <section>
          <h2>Pengaturan</h2>
          {[
            ['light3d', 'Mode ringan (timbangan 2D)'],
            ['reducedMotion', 'Kurangi animasi'],
            ['clq', 'Kuesioner beban kognitif di akhir level'],
            ['unlockAll', 'Buka semua level (uji coba/validasi ahli)'],
          ].map(([k, label]) => (
            <label key={k} className="check">
              <input type="checkbox" checked={!!settings[k]} onChange={() => toggle(k)} />
              <span>{label}</span>
            </label>
          ))}
        </section>

        <section>
          <h2>Timbangan 3D</h2>
          <p className="muted">{reasonNo3D() ? `Saat ini memakai timbangan 2D (${{ crash: 'pernah crash di HP ini', old_webview: 'WebView lama', no_webgl2: 'GPU tidak mendukung WebGL2', init_error: 'gagal dimulai' }[reasonNo3D()] || reasonNo3D()}).` : 'Timbangan 3D aktif.'}</p>
          <button type="button" className="btn" onClick={() => { try { localStorage.removeItem('splv.scale3d.disabled'); localStorage.removeItem('splv.scale3d.pending'); } catch { /* ignore */ } setNotice3d('Deteksi 3D direset. Buka sebuah level untuk mencoba lagi.'); }}>
            Coba lagi timbangan 3D
          </button>
          {notice3d && <p className="feedback feedback-ok">{notice3d}</p>}
        </section>

        <section>
          <h2>Perangkat</h2>
          <button type="button" className="btn btn-danger" onClick={() => (confirmLogout ? onLogout() : setConfirmLogout(true))}>
            {confirmLogout ? 'Ketuk sekali lagi untuk keluar' : 'Ganti kode siswa'}
          </button>
        </section>
      </main>
    </div>
  );
}
