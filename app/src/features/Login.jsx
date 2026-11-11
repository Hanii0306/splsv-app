import { useEffect, useState } from 'react';
import { CODE_RE, PIN_RE, createAccount, listAccounts, setPin, signIn } from '../storage/accounts.js';
import { saveProfile, setSetting } from '../storage/db.js';
import { joinClass, validateServerUrl } from '../sync/api.js';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Logo from '../ui/Logo.jsx';
import Walkers from '../ui/Walkers.jsx';

/**
 * Each student has their own code + PIN, so one phone/browser can be shared by a whole class.
 * Class code + server stay OPTIONAL (teacher dashboard). No names are asked (privacy).
 */
export default function Login({ onDone }) {
  const [tab, setTab] = useState('masuk');
  const [accounts, setAccounts] = useState([]);
  const [code, setCode] = useState('');
  const [pin, setPinValue] = useState('');
  const [pin2, setPin2] = useState('');
  const [classCode, setClassCode] = useState('');
  const [server, setServer] = useState('');
  const [needPin, setNeedPin] = useState(null); // legacy account without PIN
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listAccounts().then((a) => { setAccounts(a); if (!a.length) setTab('daftar'); });
  }, []);

  async function finish(profile) {
    await saveProfile(profile);
    onDone(profile);
  }

  async function doMasuk(e) {
    e.preventDefault();
    setError('');
    if (!CODE_RE.test(code.trim())) { setError('Tulis kode siswamu, contoh: S01'); return; }
    if (needPin) {
      if (!PIN_RE.test(pin) || pin !== pin2) { setError('Buat PIN 4–6 angka dan ulangi dengan sama.'); return; }
      await setPin(needPin.studentCode, pin);
      await finish({ ...needPin });
      return;
    }
    if (!PIN_RE.test(pin)) { setError('PIN berisi 4–6 angka.'); return; }
    setBusy(true);
    const r = await signIn(code, pin);
    setBusy(false);
    if (r.ok) { onDone(r.profile); return; }
    if (r.reason === 'unknown') setError('Kode ini belum terdaftar di perangkat ini. Pilih "Daftar baru" atau minta akun ke guru.');
    else if (r.reason === 'wrong_pin') setError('PIN salah. Coba lagi.');
    else if (r.reason === 'locked') setError('Terlalu banyak PIN salah. Tunggu 1 menit, atau minta guru mereset PIN.');
    else if (r.reason === 'no_pin') { setNeedPin(r.profile); setPinValue(''); setError(''); }
  }

  async function doDaftar(e) {
    e.preventDefault();
    setError('');
    if (pin !== pin2) { setError('PIN dan ulangan PIN tidak sama.'); return; }
    const cc = classCode.trim().toUpperCase();
    const srv = server.trim().replace(/\/$/, '');
    if (srv) {
      const err = validateServerUrl(srv);
      if (err) { setError(err); return; }
      if (!cc) { setError('Isi juga kode kelas bila memakai server.'); return; }
    }
    setBusy(true);
    try {
      const profile = await createAccount(code, pin, { classCode: cc || null });
      if (srv && cc) {
        await setSetting('apiUrl', srv);
        try {
          const { token } = await joinClass(cc, profile.studentCode);
          await setSetting('deviceToken', token);
          profile.verified = true;
        } catch { /* offline-first: retried later */ }
      }
      await finish(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen cute-bg">
      <FloatingSymbols />
      <main className="content login">
        <div className="brand"><Logo size={104} /></div>
        <h1 className="brand-name">SPLV app</h1>
        <p className="muted brand-sub">Belajar persamaan linear satu variabel bersama si Timbangan.</p>
        <Walkers />

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'masuk'} className={tab === 'masuk' ? 'tab on' : 'tab'} onClick={() => { setTab('masuk'); setError(''); setNeedPin(null); }}>Masuk</button>
          <button type="button" role="tab" aria-selected={tab === 'daftar'} className={tab === 'daftar' ? 'tab on' : 'tab'} onClick={() => { setTab('daftar'); setError(''); setNeedPin(null); }}>Daftar baru</button>
        </div>

        {tab === 'masuk' ? (
          <form onSubmit={doMasuk} className="form card-form">
            {accounts.length > 0 && !needPin && (
              <div className="acct-list" aria-label="Akun di perangkat ini">
                {accounts.slice(0, 40).map((a) => (
                  <button key={a.studentCode} type="button" className={`acct${code.toUpperCase() === a.studentCode ? ' on' : ''}`} onClick={() => setCode(a.studentCode)}>{a.studentCode}</button>
                ))}
              </div>
            )}
            <label>Kode siswa
              <input id="login-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="mis. S01" autoCapitalize="characters" autoComplete="username" required />
            </label>
            {needPin ? (
              <>
                <p className="muted">Akun {needPin.studentCode} belum punya PIN. Buat PIN baru (4–6 angka).</p>
                <label>PIN baru<input id="login-newpin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPinValue(e.target.value)} autoComplete="new-password" /></label>
                <label>Ulangi PIN<input id="login-newpin2" type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value)} autoComplete="new-password" /></label>
              </>
            ) : (
              <label>PIN
                <input id="login-pin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPinValue(e.target.value)} placeholder="4–6 angka" autoComplete="current-password" required />
              </label>
            )}
            {error && <p className="feedback feedback-warn" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memeriksa…' : needPin ? 'Simpan PIN & masuk' : 'Masuk'}</button>
          </form>
        ) : (
          <form onSubmit={doDaftar} className="form card-form">
            <label>Kode siswa
              <input id="reg-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="dari guru, mis. S07" autoCapitalize="characters" autoComplete="off" required />
            </label>
            <label>Buat PIN (4–6 angka)
              <input id="reg-pin" type="password" inputMode="numeric" value={pin} onChange={(e) => setPinValue(e.target.value)} autoComplete="new-password" required />
            </label>
            <label>Ulangi PIN
              <input id="reg-pin2" type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value)} autoComplete="new-password" required />
            </label>
            <details className="server-box">
              <summary>Terhubung ke dashboard guru (opsional)</summary>
              <p className="muted">Kosongkan bila tidak diminta guru/peneliti.</p>
              <input value={classCode} onChange={(e) => setClassCode(e.target.value)} aria-label="Kode kelas" placeholder="Kode kelas, mis. VIIA-P4J7" autoCapitalize="characters" autoComplete="off" style={{ width: '100%', marginBottom: 8 }} />
              <input value={server} onChange={(e) => setServer(e.target.value)} inputMode="url" autoCapitalize="none" autoComplete="off" aria-label="Alamat server" placeholder="https://alamat-server" style={{ textTransform: 'none', width: '100%' }} />
            </details>
            {error && <p className="feedback feedback-warn" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Menyiapkan…' : 'Daftar & mulai belajar'}</button>
          </form>
        )}
      </main>
    </div>
  );
}
