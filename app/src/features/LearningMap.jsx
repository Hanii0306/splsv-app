import { useEffect, useState } from 'react';
import test from '../content/test.json';
import { progressOf, restoreAnswers } from '../engine/index.js';
import { getSetting } from '../storage/db.js';
import { onSyncStatus } from '../sync/syncWorker.js';
import { flushPendingTests } from '../sync/testSubmit.js';
import { tutorConfigured } from '../sync/tutor.js';
import { AgentSays, Stamp } from '../ui/Detective.jsx';
import { CaseBanner } from '../ui/DetectiveScene.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Header from '../ui/Header.jsx';
import Logo from '../ui/Logo.jsx';
import MusicButton from '../ui/MusicButton.jsx';
import Walkers from '../ui/Walkers.jsx';
import TutorChat from './TutorChat.jsx';

function SyncBadge() {
  const [s, setS] = useState(null);
  useEffect(() => onSyncStatus(setS), []);
  if (!s || s.state === 'local') return null;
  const text = s.state === 'ok' ? 'Tersinkron' : s.state === 'syncing' ? 'Menyinkron…' : `Menunggu internet${s.pending ? ` (${s.pending})` : ''}`;
  return <span className={`sync-badge sync-${s.state}`}>{text}</span>;
}

/** Map → the single test case (4 soal from the PDF). */
export default function LearningMap({ profile, settings, onOpenTest, onResearch, onSignOut }) {
  const det = settings.detective !== false;
  const practice = settings.testMode === 'latihan';
  const [draft, setDraft] = useState(null);
  const [done, setDone] = useState(null);
  const [pending, setPending] = useState(0);
  const [chat, setChat] = useState(false);
  const tutorOn = practice && settings.tutor !== false && tutorConfigured();

  useEffect(() => {
    getSetting(`testDraft:${profile.studentCode}`).then(setDraft);
    getSetting(`testDone:${profile.studentCode}`).then(setDone);
    flushPendingTests().then(setPending);
  }, [profile.studentCode]);

  const prog = progressOf(test, restoreAnswers(test, draft?.answers));
  const status = draft?.start ? 'draft' : done ? 'done' : 'new';
  const line = status === 'done' ? 'Berkasmu sudah terkirim. Terima kasih, Agen!'
    : status === 'draft' ? `Lanjutkan penyelidikan: ${prog.filled} dari ${prog.total} tahap terisi.`
      : `Selamat datang, Agen ${profile.studentCode}. Ada 4 kasus menunggumu.`;

  return (
    <div className="screen cute-bg">
      <FloatingSymbols />
      <Header title={det ? 'Peta Investigasi Kasus' : 'Peta Belajar'}
        right={<span className="row-tight">{settings.music !== false && <MusicButton />}<button type="button" className="icon-btn" onClick={onResearch} aria-label="Menu peneliti">⚙</button></span>} />
      <main className="content">
        {det && <CaseBanner title="TOP SECRET" />}
        <section className="hello">
          <div className="hello-top">
            <h2>{det ? `Agen ${profile.studentCode}` : `Halo, ${profile.studentCode}!`}</h2>
            {!det && <span className="logo-mini"><Logo size={52} /></span>}
            <SyncBadge />
          </div>
          {det && settings.agentM !== false && <AgentSays mood="happy">{line}</AgentSays>}
          {tutorOn && <button type="button" className="mini-btn tutor-open" onClick={() => setChat(true)}>💬 Tanya {det && settings.agentM !== false ? 'Agent M' : 'Detektif AI'} tentang materi</button>}
          {pending > 0 && <p className="muted">{pending} berkas menunggu internet untuk dikirim.</p>}
          <div className="who">
            <span className="muted">{status === 'done' ? 'Tes sudah dikirim' : `${prog.filled}/${prog.total} tahap terisi`}</span>
            <button type="button" className="mini-btn" onClick={onSignOut}>Bukan {profile.studentCode}? Keluar</button>
          </div>
        </section>

        <ol className="level-list case-path">
          {test.items.map((it, i) => {
            const p = prog.perItem[it.id];
            const st = status === 'done' ? 'mastered' : 'active';
            return (
              <li key={it.id} className={`level-card case-card test-card ${st}`}>
                <button type="button" className="level-item" onClick={() => onOpenTest(i)}>
                  <span className="badge active" aria-hidden>{it.no}</span>
                  <span className="level-text">
                    <span className="case-code">KASUS {it.no} · {it.indicator}</span>
                    <strong>{it.title}</strong>
                    <span className="count-pill">{p.filled}/{p.total} tahap terisi · skor maks {it.max}</span>
                    <small><Stamp tone={status === 'done' ? 'ok' : p.filled ? 'sun' : 'warn'}>{status === 'done' ? 'Terkirim' : p.filled ? 'Dikerjakan' : 'Top secret'}</Stamp> {practice ? 'mode latihan' : 'mode tes'}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <Walkers />
        {chat && <TutorChat mode="materi" profile={profile} onClose={() => setChat(false)} />}
      </main>
    </div>
  );
}
