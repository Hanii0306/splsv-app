import { useEffect, useState } from 'react';
import levels from '../content/levels.json';
import { reinforcementFor } from '../engine/index.js';
import { getProgress } from '../storage/db.js';
import { onSyncStatus } from '../sync/syncWorker.js';
import Badge from '../ui/Badge.jsx';
import Header from '../ui/Header.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Walkers from '../ui/Walkers.jsx';
import Logo from '../ui/Logo.jsx';

const LABEL = { mastered: 'dikuasai ★', active: 'siap dipelajari', locked: 'terkunci' };
export const QUIZ_MIN_MASTERED = 2;

function SyncBadge() {
  const [s, setS] = useState(null);
  useEffect(() => onSyncStatus(setS), []);
  if (!s || s.state === 'local') return null;
  const text = s.state === 'ok' ? 'Tersinkron' : s.state === 'syncing' ? 'Menyinkron…' : `Menunggu internet${s.pending ? ` (${s.pending})` : ''}`;
  return <span className={`sync-badge sync-${s.state}`}>{text}</span>;
}

/** Two-level navigation only: Map → Level (design.md §2). */
export default function LearningMap({ profile, settings, onOpenLevel, onSummary, onFree, onQuiz, onResearch, onSignOut }) {
  const [progress, setProgress] = useState({});
  useEffect(() => { getProgress(profile.studentCode).then(setProgress); }, [profile.studentCode]);

  const statusOf = (id, i) => {
    if (settings.unlockAll) return progress[id]?.status === 'mastered' ? 'mastered' : 'active';
    return progress[id]?.status || (i === 0 ? 'active' : 'locked');
  };
  const statuses = levels.map((lv, i) => statusOf(lv.id, i));
  const mastered = statuses.filter((s) => s === 'mastered').length;
  const quizOpen = settings.unlockAll || mastered >= QUIZ_MIN_MASTERED;

  return (
    <div className="screen cute-bg">
      <FloatingSymbols />
      <Header title="Peta Belajar" right={<button type="button" className="icon-btn" onClick={onResearch} aria-label="Menu peneliti">⚙</button>} />
      <main className="content">
        <section className="hello">
          <div className="hello-top">
            <h2>Halo, {profile.studentCode}!</h2>
            <span className="logo-mini"><Logo size={52} /></span>
            <SyncBadge />
          </div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={levels.length} aria-valuenow={mastered}>
            <span style={{ width: `${(mastered / levels.length) * 100}%` }} />
          </div>
          <div className="who">
            <span className="muted">{mastered} dari {levels.length} lencana terkumpul</span>
            <button type="button" className="mini-btn" onClick={onSignOut}>Bukan {profile.studentCode}? Keluar</button>
          </div>
        </section>

        <ol className="level-list">
          {levels.map((lv, i) => {
            const st = statuses[i];
            const reinforce = st !== 'locked' ? reinforcementFor(profile.prereq, lv.id, profile.reinforced) : null;
            return (
              <li key={lv.id} className={`level-card ${st}`}>
                <button type="button" className={`level-item level-${st}`} disabled={st === 'locked'} onClick={() => onOpenLevel(lv, reinforce)}>
                  <Badge levelId={lv.id} status={st} />
                  <span className="level-text">
                    <strong>{lv.id} · {lv.title}</strong>
                    <small>{LABEL[st]}{reinforce ? ' · ada latihan penguatan dulu' : ''}</small>
                  </span>
                </button>
                {st !== 'locked' && (
                  <div className="level-actions">
                    <button type="button" className="mini-btn" onClick={() => onSummary(lv)}>Ringkasan</button>
                    <button type="button" className="mini-btn" onClick={() => onFree(lv)}>Latihan bebas ∞</button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <button type="button" className="quiz-card" disabled={!quizOpen}
          onClick={() => { const open = levels.filter((_, i) => statuses[i] !== 'locked').map((l) => l.id); onQuiz(open.length > 1 ? open.filter((id) => id !== 'L0') : open); }}>
          <span className="badge mastered" aria-hidden>?</span>
          <span className="level-text">
            <strong>Kuis campuran</strong>
            <small>{quizOpen ? '10 soal dari level yang sudah kamu buka' : `Terbuka setelah ${QUIZ_MIN_MASTERED} lencana terkumpul`}</small>
          </span>
        </button>
        <Walkers />
      </main>
    </div>
  );
}
