import { useEffect, useState } from 'react';
import cases from '../content/cases.json';
import levels from '../content/levels.json';
import { rankFor, totalXp } from '../engine/index.js';
import { getProgress } from '../storage/db.js';
import { onSyncStatus } from '../sync/syncWorker.js';
import Badge from '../ui/Badge.jsx';
import { AgentSays, Stamp } from '../ui/Detective.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Header from '../ui/Header.jsx';
import Logo from '../ui/Logo.jsx';
import Walkers from '../ui/Walkers.jsx';
import { tutorConfigured } from '../sync/tutor.js';
import TutorChat from './TutorChat.jsx';

export const QUIZ_MIN_MASTERED = 2;
const levelMeta = (id) => levels.find((l) => l.id === id);

function SyncBadge() {
  const [s, setS] = useState(null);
  useEffect(() => onSyncStatus(setS), []);
  if (!s || s.state === 'local') return null;
  const text = s.state === 'ok' ? 'Tersinkron' : s.state === 'syncing' ? 'Menyinkron…' : `Menunggu internet${s.pending ? ` (${s.pending})` : ''}`;
  return <span className={`sync-badge sync-${s.state}`}>{text}</span>;
}

function agentLine(code, solved, next) {
  if (solved === 0) return `Selamat datang, Agen ${code}. Kasus pertamamu menunggu.`;
  if (solved >= cases.length) return 'Semua kasus terpecahkan! Ulangi kasus untuk menaikkan XP.';
  return `${solved} kasus terpecahkan. Berikutnya: ${next}.`;
}

/** Two-level navigation only: Map → Case (design.md §2). Every extra feature can be switched off. */
export default function LearningMap({ profile, settings, onOpenLevel, onSummary, onQuiz, onResearch, onSignOut }) {
  const det = settings.detective !== false;
  const [progress, setProgress] = useState({});
  const [chat, setChat] = useState(false);
  const tutorOn = settings.tutor !== false && tutorConfigured();
  useEffect(() => { getProgress(profile.studentCode).then(setProgress); }, [profile.studentCode]);

  const statusOf = (id, i) => {
    if (settings.unlockAll) return progress[id]?.status === 'mastered' ? 'mastered' : 'active';
    return progress[id]?.status || (i === 0 ? 'active' : 'locked');
  };
  const statuses = cases.map((c, i) => statusOf(c.id, i));
  const solved = statuses.filter((s) => s === 'mastered').length;
  const quizOpen = settings.unlockAll || solved >= QUIZ_MIN_MASTERED;
  const xp = totalXp(progress);
  const rank = rankFor(xp);
  const nextCase = cases.find((_, i) => statuses[i] === 'active');
  const stampFor = { mastered: ['Terpecahkan', 'ok'], active: ['Terbuka', 'sun'], locked: ['Terkunci', 'muted'] };

  return (
    <div className="screen cute-bg">
      <FloatingSymbols />
      <Header title={det ? 'Peta Investigasi Kasus' : 'Peta Belajar'}
        right={<button type="button" className="icon-btn" onClick={onResearch} aria-label="Menu peneliti">⚙</button>} />
      <main className="content">
        <section className="hello">
          <div className="hello-top">
            <h2>{det ? `Agen ${profile.studentCode}` : `Halo, ${profile.studentCode}!`}</h2>
            {!det && <span className="logo-mini"><Logo size={52} /></span>}
            <SyncBadge />
          </div>
          {det && settings.agentM !== false && (
            <AgentSays mood="happy">{agentLine(profile.studentCode, solved, nextCase ? nextCase.title : '')}</AgentSays>
          )}
          {settings.xp !== false && (
            <div className="rank-line">
              <span className="rank-name">★ {rank.name}</span>
              <span className="muted">{xp} XP{rank.next ? ` · ${rank.next.min - xp} lagi ke ${rank.next.name}` : ''}</span>
            </div>
          )}
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={cases.length} aria-valuenow={solved}>
            <span style={{ width: `${(solved / cases.length) * 100}%` }} />
          </div>
          {tutorOn && (
            <button type="button" className="mini-btn tutor-open" onClick={() => setChat(true)}>💬 Tanya {det && settings.agentM !== false ? 'Agent M' : 'Detektif AI'} tentang materi</button>
          )}
          <div className="who">
            <span className="muted">{solved} dari {cases.length} {det ? 'kasus terpecahkan' : 'level selesai'}</span>
            <button type="button" className="mini-btn" onClick={onSignOut}>Bukan {profile.studentCode}? Keluar</button>
          </div>
        </section>

        <ol className="level-list case-path">
          {cases.map((c, i) => {
            const st = statuses[i];
            const meta = levelMeta(c.id);
            const best = progress[c.id];
            return (
              <li key={c.id} className={`level-card case-card ${st}`}>
                <button type="button" className={`level-item level-${st}`} disabled={st === 'locked'} onClick={() => onOpenLevel(c)}>
                  {settings.badges !== false ? <Badge levelId={c.id} status={st} /> : <span className="case-no">{i + 1}</span>}
                  <span className="level-text">
                    {det && <span className="case-code">{c.code} · <span className="eq">{c.form}</span></span>}
                    <strong>{det ? c.title : `${c.id} · ${meta?.title || c.form}`}</strong>
                    <span className="count-pill">Jumlah soal: {c.items.length}</span>
                    <small>
                      {det ? <Stamp tone={stampFor[st][1]}>{stampFor[st][0]}</Stamp> : { mastered: 'selesai ★', active: 'siap dipelajari', locked: 'terkunci' }[st]}
                      {st === 'mastered' && settings.badges !== false && det ? ` ${c.badge}` : ''}
                      {best?.firstTry != null ? ` · ${best.firstTry}/10 tepat` : ''}
                    </small>
                  </span>
                </button>
                {st !== 'locked' && settings.summaries !== false && (
                  <div className="level-actions">
                    {settings.summaries !== false && <button type="button" className="mini-btn" onClick={() => onSummary(meta)}>Ringkasan</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {settings.quiz !== false && (
          <button type="button" className="quiz-card" disabled={!quizOpen}
            onClick={() => onQuiz(cases.filter((_, i) => statuses[i] !== 'locked').map((c) => c.id))}>
            <span className="badge mastered" aria-hidden>?</span>
            <span className="level-text">
              <strong>{det ? 'Uji kilat agen (kuis acak)' : 'Kuis campuran'}</strong>
              <span className="count-pill">Jumlah soal: 10</span>
              <small>{quizOpen ? 'Diambil acak dari level yang sudah terbuka' : `Terbuka setelah ${QUIZ_MIN_MASTERED} ${det ? 'kasus terpecahkan' : 'level selesai'}`}</small>
            </span>
          </button>
        )}
        <Walkers />
        {chat && <TutorChat mode="materi" profile={profile} onClose={() => setChat(false)} />}
      </main>
    </div>
  );
}
