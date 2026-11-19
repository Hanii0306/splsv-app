import { useEffect, useRef, useState } from 'react';
import test from '../content/test.json';
import { buildSubmission, progressOf, restoreAnswers, testClue } from '../engine/index.js';
import { setMusicMode } from '../audio/music.js';
import { APP_VERSION } from '../config.js';
import { getSetting, setSetting } from '../storage/db.js';
import { installId } from '../sync/supabase.js';
import { submitTest } from '../sync/testSubmit.js';
import { tutorConfigured } from '../sync/tutor.js';
import { logEvent } from '../telemetry/log.js';
import Celebrate from '../ui/Celebrate.jsx';
import { AgentSays, Envelope, Stamp } from '../ui/Detective.jsx';
import { CaseBanner } from '../ui/DetectiveScene.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Header from '../ui/Header.jsx';
import MathText from '../ui/MathText.jsx';
import MusicButton from '../ui/MusicButton.jsx';
import Walkers from '../ui/Walkers.jsx';
import Questionnaire from './Questionnaire.jsx';
import TutorChat from './TutorChat.jsx';

const fmtTime = (t) => (t ? new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '');
const fmtDate = (t) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const draftKey = (code) => `testDraft:${code}`;

/** Practice-mode clue sheet (H1→H4) for one soal. */
function ClueSheet({ clue, canMore, lockedH4, onMore, onClose }) {
  if (!clue) return null;
  return (
    <div className="hint-panel clue-sheet" role="dialog" aria-label="Amplop petunjuk">
      <div className="hint-head"><Envelope open size={22} /><span className="hint-level">H{clue.level}</span><strong>{clue.title}</strong></div>
      {clue.lines.length > 1 ? <ol className="clue-lines">{clue.lines.map((l) => <li key={l}><MathText text={l} /></li>)}</ol> : <p><MathText text={clue.lines[0]} /></p>}
      {lockedH4 && <p className="muted">Tulis dulu jawabanmu di salah satu tahap untuk membuka berkas penyelesaian.</p>}
      <div className="hint-actions">
        {canMore && <button type="button" className="btn btn-ghost" onClick={onMore}>Buka amplop berikutnya</button>}
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
      </div>
    </div>
  );
}

/**
 * The PDF test, verbatim: cover (identitas, petunjuk, rekap skor) → Soal 1–4 with free-text Tahap boxes → kirim.
 * settings.testMode: 'tes' (no help, for research) | 'latihan' (Amplop Petunjuk + Detektif AI, pembahasan after).
 */
export default function TestRunner({ profile, settings, onExit, startIdx = 0 }) {
  const practice = settings.testMode === 'latihan';
  const det = settings.detective !== false;
  const [phase, setPhase] = useState('cover');
  const [idx, setIdx] = useState(startIdx);
  const [answers, setAnswers] = useState(() => restoreAnswers(test, null));
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [sendState, setSendState] = useState(null);
  const [clueLevel, setClueLevel] = useState({});
  const [clue, setClue] = useState(null);
  const [chat, setChat] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const live = useRef({});
  const focus = useRef(0);
  const item = test.items[idx];
  const prog = progressOf(test, answers);
  const tutorOn = practice && settings.tutor !== false && tutorConfigured();

  useEffect(() => {
    getSetting(draftKey(profile.studentCode)).then((d) => {
      if (d?.answers) setAnswers(restoreAnswers(test, d.answers));
      if (d?.start) setStart(d.start);
    });
  }, [profile.studentCode]);
  useEffect(() => { setMusicMode(phase === 'soal' ? 'focus' : 'menu'); }, [phase]);
  useEffect(() => () => setMusicMode('menu'), []);
  useEffect(() => { setClue(null); setChat(false); }, [idx]);

  function write(k, value) {
    const next = { ...answers, [item.id]: answers[item.id].map((v, i) => (i === k ? value : v)) };
    setAnswers(next);
    setSetting(draftKey(profile.studentCode), { answers: next, start });
  }

  function begin() {
    const t = start || Date.now();
    setStart(t);
    setSetting(draftKey(profile.studentCode), { answers, start: t });
    logEvent('test_start', { mode: settings.testMode || 'tes', resumed: !!start });
    setPhase('soal');
  }

  function openClue() {
    const attempted = answers[item.id].some((a) => a.trim());
    const cur = clueLevel[item.id] || 0;
    const next = Math.min(cur + 1, attempted ? 4 : 3);
    const c = testClue(item, next, attempted);
    if (!c) return;
    setClueLevel({ ...clueLevel, [item.id]: next });
    logEvent('hint_opened', { level: next, levelId: 'UJI' }, item.id);
    setClue(c);
  }

  async function send() {
    const t = Date.now();
    setEnd(t);
    const payload = buildSubmission({ ...test, items: [item] }, answers, {
      kode: profile.studentCode, installId: await installId(), mode: practice ? 'latihan' : 'tes', version: APP_VERSION, start: start || t, end: t,
    });
    logEvent('test_submit', { mode: payload.mode, filled: prog.filled, total: prog.total, start: payload.waktu_mulai, end: payload.waktu_selesai, answers });
    logEvent('item_complete', { levelId: 'UJI', kind: 'essay', ind: item.ind, filled: prog.perItem[item.id].filled }, item.id);
    setSendState(await submitTest(payload));
    await setSetting(draftKey(profile.studentCode), null);
    await setSetting(`testDone:${profile.studentCode}:${item.id}`, { at: t, mode: payload.mode });
    setPhase(settings.clq ? 'clq' : 'done');
  }

  const attemptedHere = item && answers[item.id].some((a) => a.trim());
  const myLevel = item ? clueLevel[item.id] || 0 : 0;
  live.current = { itemId: item?.id, box: focus.current, wrongs: 0, hintLevel: myLevel, work: item ? answers[item.id][focus.current] || '' : '' };

  return (
    <div className={`screen test-screen${phase === 'soal' ? (settings.pattern !== false ? ' solve-bg' : '') : ' cute-bg'}`}>
      {phase !== 'soal' && <FloatingSymbols />}
      <Header title={`Soal ${item.no}. ${item.title}`} onBack={onExit} right={(
        <span className="row-tight">
          {settings.music !== false && <MusicButton />}
          {phase === 'soal' && tutorOn && <button type="button" className="icon-btn tutor-btn" onClick={() => setChat(!chat)} aria-label="Tanya Detektif AI">💬</button>}
        </span>
      )} />
      <main className="content">
        {phase === 'cover' && (
          <div className="briefing">
            {det && <CaseBanner title={practice ? 'LATIHAN' : 'TOP SECRET'} />}
            <div className="case-file test-cover">
              <Stamp tone={practice ? 'sun' : 'warn'}>{practice ? 'Mode latihan' : 'Mode tes'}</Stamp>
              <p className="case-code">★ Instrumen uji coba • Petualangan aljabar SPLSV ★</p>
              <h2>{test.title}</h2>
              <p className="muted">{test.subtitle}</p>
              <table className="id-table"><tbody>
                <tr><td>Kode Siswa: <strong>{profile.studentCode}</strong></td><td>Tanggal: <strong>{fmtDate(Date.now())}</strong></td></tr>
                <tr><td>Kelas: {test.kelas}</td><td>Jam Mulai: <strong>{fmtTime(start)}</strong></td></tr>
                <tr><td>Jenis Tes: {test.jenis}</td><td>Jam Selesai: <strong>{fmtTime(end)}</strong></td></tr>
              </tbody></table>
              <p className="muted small">{test.kodeNote}</p>
              <p className="motivation">{test.motivation}</p>
              <h3>★ Petunjuk Pengerjaan</h3>
              <ol className="petunjuk">{test.petunjuk.map((p) => <li key={p}>{p}</li>)}</ol>
              <h3>★ Rekap Skor (Diisi Peneliti)</h3>
              <table className="score-table">
                <thead><tr><th>Nomor &amp; Judul Soal</th><th>Indikator</th><th>Maks.</th></tr></thead>
                <tbody>
                  {test.items.map((it) => <tr key={it.id}><td>Soal {it.no}. {it.title}</td><td>{it.indicator}</td><td>{it.max}</td></tr>)}
                  <tr><td colSpan={2}><strong>Total Skor</strong></td><td><strong>{test.maxTotal}</strong></td></tr>
                  <tr><td colSpan={2}>{test.nilaiRumus}</td><td>100</td></tr>
                </tbody>
              </table>
              <div className="count-box inline"><span>Jumlah soal: <strong>{test.items.length}</strong></span><span>Terisi: <strong>{prog.filled}/{prog.total} tahap</strong></span></div>
            </div>
            <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={begin}>{start ? 'Lanjutkan mengerjakan →' : 'Mulai mengerjakan →'}</button></footer>
          </div>
        )}

        {phase === 'soal' && item && (
          <div className="case-item">
            <div className="case-tag"><span>Soal {item.no}</span><span className="ind-tag">{item.indicator}</span></div>
            <div className="evidence">
              <strong className="evidence-label">★ Soal {item.no}. {item.title}</strong>
              {item.stem.map((p) => <p key={p}><MathText text={p} /></p>)}
              {item.list && <ul className="stem-list">{item.list.map((l) => <li key={l}><MathText text={l} /></li>)}</ul>}
              {item.ask && item.ask.map((p) => <p key={p}><MathText text={p} /></p>)}
            </div>
            <div className="tahap-table">
              <div className="tahap-head"><span>Tahapan Penyelesaian Soal {item.no}</span><span>Skor</span></div>
              {item.tahap.map((t, k) => (
                <label key={t.label} className="tahap-row">
                  <span className="tahap-label">{t.label}</span>
                  <span className="tahap-body">
                    <textarea rows={3} maxLength={2000} value={answers[item.id][k]} placeholder="Tulis langkahmu di sini…"
                      onFocus={() => { focus.current = k; }} onChange={(e) => write(k, e.target.value)} />
                    <span className="tahap-score" title="Diisi peneliti">/ {t.max}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="footer-note"><span>{item.footer}</span><span>Skor Soal {item.no} (diisi peneliti): ______ / {item.max}</span></p>
            <footer className="action-bar">
              <button type="button" className="btn btn-ghost" onClick={onExit}>← Peta</button>
              {practice && settings.clues !== false && (
                <button type="button" className="btn btn-ghost env-btn" onClick={openClue} disabled={myLevel >= (attemptedHere ? 4 : 3) && !!clue}><Envelope size={20} /> Amplop</button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setPhase('confirm')}>Kirim Soal {item.no}</button>
            </footer>
            {practice && clue && (
              <ClueSheet clue={clue} canMore={myLevel < (attemptedHere ? 4 : 3)} lockedH4={myLevel === 3 && !attemptedHere} onMore={openClue} onClose={() => setClue(null)} />
            )}
            {chat && <TutorChat key={item.id} mode="item" item={item} caseInfo={{ id: 'UJI', title: test.title, form: 'soal cerita' }} live={live} profile={profile} onClose={() => setChat(false)} />}
          </div>
        )}

        {phase === 'confirm' && (
          <div className="break-card">
            <h2>Kirim jawaban sekarang?</h2>
            <p>Terisi {prog.perItem[item.id].filled} dari {prog.perItem[item.id].total} tahap.{prog.perItem[item.id].filled < prog.perItem[item.id].total ? ' Masih ada tahap yang kosong. Kamu boleh kembali dan melengkapinya.' : ''}</p>
            <footer className="action-bar">
              <button type="button" className="btn btn-ghost" onClick={() => setPhase('soal')}>← Periksa lagi</button>
              <button type="button" className="btn btn-primary" onClick={send}>Ya, kirim</button>
            </footer>
          </div>
        )}

        {phase === 'clq' && <Questionnaire levelId="UJI" onDone={() => setPhase('done')} />}

        {phase === 'done' && (
          <div className="summary-card case-closed">
            <Celebrate />
            <Stamp tone="ok" big>Berkas terkirim</Stamp>
            <p>Soal {item.no} · jam mulai {fmtTime(start)} · jam selesai {fmtTime(end)} · {prog.perItem[item.id].filled}/{prog.perItem[item.id].total} tahap terisi.</p>
            <p className="muted">{sendState === 'sent' ? 'Jawabanmu sudah diterima peneliti. Skor diisi oleh peneliti.' : 'Jawaban tersimpan di perangkat dan akan terkirim otomatis saat ada internet.'}</p>
            {practice && (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => setShowKey(!showKey)}>{showKey ? 'Tutup pembahasan' : 'Lihat pembahasan'}</button>
                {showKey && [item].map((it) => (
                  <div key={it.id} className="sum-example"><strong>Soal {it.no}. {it.title}</strong>
                    <ol className="clue-lines">{it.steps.map((s) => <li key={s}><MathText text={s} /></li>)}</ol></div>
                ))}
              </>
            )}
            {det && settings.agentM !== false && <AgentSays mood="cheer">Kerja hebat, Agen {profile.studentCode}! Berkasmu sudah masuk ke markas.</AgentSays>}
            <Walkers />
            <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={onExit}>Ke Peta Investigasi</button></footer>
          </div>
        )}
      </main>
    </div>
  );
}
