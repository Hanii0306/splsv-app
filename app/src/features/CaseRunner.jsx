import { useEffect, useRef, useState } from 'react';
import { setMusicMode } from '../audio/music.js';
import MusicButton from '../ui/MusicButton.jsx';
import levels from '../content/levels.json';
import { firstTryCount, isClean, nextLevel, rankFor, totalXp, xpForCase } from '../engine/index.js';
import { resetSegment, segmentDue } from '../app/session.js';
import { getProgress, updateProgress } from '../storage/db.js';
import { logEvent } from '../telemetry/log.js';
import { BADGE_SYMBOL } from '../ui/Badge.jsx';
import Celebrate from '../ui/Celebrate.jsx';
import { AgentSays, Stamp } from '../ui/Detective.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Header from '../ui/Header.jsx';
import Walkers from '../ui/Walkers.jsx';
import Questionnaire from './Questionnaire.jsx';
import { McItem, StepsItem } from './CaseItem.jsx';
import TutorChat from './TutorChat.jsx';
import { tutorConfigured } from '../sync/tutor.js';

const plainTitle = (id) => levels.find((l) => l.id === id)?.title || id;

/** One case = one level: briefing → 10 instrument items (6 MC + 4 scaffolded) → case closed. */
export default function CaseRunner({ caseInfo, profile, settings, onExit }) {
  const det = settings.detective !== false;
  const [phase, setPhase] = useState('brief');
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [end, setEnd] = useState(null);
  const [chat, setChat] = useState(false);
  const live = useRef({});
  const tutorOn = settings.tutor !== false && tutorConfigured();
  const solving = phase === 'item' || phase === 'break' || phase === 'clq';
  // Music: quiet "focus" version while solving, full tune on briefing / case closed.
  useEffect(() => { setMusicMode(solving ? 'focus' : 'menu'); }, [solving]);
  useEffect(() => () => setMusicMode('menu'), []);
  const item = caseInfo.items[idx];
  const title = det ? `${caseInfo.code} · ${caseInfo.title}` : `${caseInfo.id} · ${plainTitle(caseInfo.id)}`;

  async function finish(all) {
    const xp = xpForCase(all);
    const ft = firstTryCount(all);
    let streak = 0; let best = 0;
    for (const r of all) { streak = isClean(r) ? streak + 1 : 0; best = Math.max(best, streak); }
    const before = await getProgress(profile.studentCode);
    const prev = before[caseInfo.id] || {};
    await updateProgress(profile.studentCode, caseInfo.id, {
      status: 'mastered', bestStreak: best, caseDone: true,
      xp: Math.max(Number(prev.xp) || 0, xp), firstTry: Math.max(Number(prev.firstTry) || 0, ft),
    });
    const nxt = nextLevel(caseInfo.id);
    if (nxt) await updateProgress(profile.studentCode, nxt, { status: 'active' });
    const after = await getProgress(profile.studentCode);
    logEvent('item_complete', { kind: 'level', levelId: caseInfo.id, mastered: true, bestStreak: best, xp, firstTry: ft });
    setEnd({ xp, ft, gained: Math.max(0, xp - (Number(prev.xp) || 0)), total: totalXp(after), firstTime: !prev.caseDone });
    setPhase(settings.clq ? 'clq' : 'done');
  }

  function afterItem(r) {
    logEvent('item_complete', { levelId: caseInfo.id, wrongs: r.wrongs, maxHint: r.maxHint, ms: r.ms, ind: item.ind, kind: item.kind }, item.id);
    const all = [...results, r];
    setResults(all);
    setChat(false);
    if (idx + 1 < caseInfo.items.length) {
      setIdx(idx + 1);
      if (segmentDue()) setPhase('break');
    } else finish(all);
  }

  const meta = '';
  const ItemView = item?.kind === 'mc' ? McItem : StepsItem;
  const rank = end ? rankFor(end.total) : null;

  return (
    <div className={`screen case-screen${phase === 'item' || phase === 'break' || phase === 'clq'
      ? (settings.pattern !== false ? ' solve-bg' : '') : ' cute-bg'}`}>
      {(phase === 'brief' || phase === 'done') && <FloatingSymbols />}
      <Header title={title} onBack={onExit} right={(
        <span className="row-tight">
          {settings.music !== false && <MusicButton />}
          {phase === 'item' && tutorOn
            ? <button type="button" className="icon-btn tutor-btn" onClick={() => setChat(!chat)} aria-label="Tanya Detektif AI">💬</button>
            : <span className="header-meta">{meta}</span>}
        </span>
      )} />
      {phase === 'item' && (
        <div className="count-box">
          <span>Jumlah soal: <strong>{caseInfo.items.length}</strong></span>
        </div>
      )}
      {phase === 'item' && (
        <div className="case-progress" aria-hidden>
          {caseInfo.items.map((it, i) => <span key={it.id} className={i < idx ? 'done' : i === idx ? 'now' : ''} />)}
        </div>
      )}
      <main className="content">
        {phase === 'brief' && (
          <div className="briefing">
            <div className="case-file">
              {det && <Stamp>Top Secret</Stamp>}
              <p className="case-code">{det ? `Berkas ${caseInfo.code}` : caseInfo.id}</p>
              <h2>{det ? caseInfo.title : plainTitle(caseInfo.id)}</h2>
              <p className="case-form">Bentuk: <span className="eq">{caseInfo.form}</span></p>
              {caseInfo.briefing.map((b) => <p key={b}>{b}</p>)}
              <ul className="case-facts">
                <li>Jumlah soal: {caseInfo.items.length} (6 pilihan ganda, 4 isian).</li>
                {settings.clues !== false && <li>Macet? Buka amplop petunjuk.</li>}
                {tutorOn && <li>Bisa juga tanya Detektif AI lewat tombol 💬 di kanan atas.</li>}
              </ul>
            </div>
            {det && settings.agentM !== false && <AgentSays mood="happy">Siap, Agen {profile.studentCode}? Kerjakan satu bukti setiap kali.</AgentSays>}
            <Walkers />
            <footer className="action-bar">
              <span />
              <button type="button" className="btn btn-primary" onClick={() => { logEvent('case_start', { levelId: caseInfo.id }); setPhase('item'); }}>
                {det ? 'Mulai penyelidikan →' : 'Mulai →'}
              </button>
            </footer>
          </div>
        )}

        {phase === 'item' && item && (
          <ItemView key={item.id} item={item} caseInfo={caseInfo} n={idx + 1} settings={settings} onDone={afterItem} live={live} />
        )}
        {phase === 'item' && item && chat && (
          <TutorChat key={item.id} mode="item" item={item} caseInfo={caseInfo} live={live} profile={profile} onClose={() => setChat(false)} />
        )}

        {phase === 'break' && (
          <div className="break-card">
            <h2>Istirahat sebentar?</h2>
            <p>Kamu sudah belajar sekitar 12 menit. Regangkan badan, lalu lanjutkan penyelidikan.</p>
            <footer className="action-bar">
              <button type="button" className="btn btn-ghost" onClick={() => { logEvent('break_taken', { taken: false, levelId: caseInfo.id }); resetSegment(); setPhase('item'); }}>Lanjut saja</button>
              <button type="button" className="btn btn-primary" onClick={() => { logEvent('break_taken', { taken: true, levelId: caseInfo.id }); resetSegment(); setPhase('item'); }}>Sudah istirahat</button>
            </footer>
          </div>
        )}

        {phase === 'clq' && <Questionnaire levelId={caseInfo.id} onDone={() => setPhase('done')} />}

        {phase === 'done' && end && (
          <div className="summary-card case-closed">
            <Celebrate />
            <Stamp tone="ok" big>{det ? 'Kasus terpecahkan' : 'Level selesai'}</Stamp>
            {settings.badges !== false && (
              <div className="medal-row">
                <span className="medal" aria-hidden>{BADGE_SYMBOL[caseInfo.id]}</span>
                <div>
                  <p className="muted">Lencana {end.firstTime ? 'baru' : 'kehormatan'}</p>
                  <strong className="medal-name">{det ? caseInfo.badge : `Lencana ${caseInfo.id}`}</strong>
                </div>
              </div>
            )}
            <p>{end.ft} dari 10 bukti benar pada percobaan pertama.</p>
            {settings.xp !== false && (
              <div className="xp-box">
                <p><strong>+{end.gained} XP</strong>{end.gained === 0 ? ' (skor terbaikmu tetap tersimpan)' : ''}</p>
                <p className="muted">Pangkat: <strong>{rank.name}</strong> · {end.total} XP</p>
                {rank.next && (
                  <div className="progress xp-bar" role="progressbar" aria-valuenow={end.total} aria-valuemin={rank.min} aria-valuemax={rank.next.min}>
                    <span style={{ width: `${Math.min(100, ((end.total - rank.min) / (rank.next.min - rank.min)) * 100)}%` }} />
                  </div>
                )}
              </div>
            )}
            {det && settings.agentM !== false && (
              <AgentSays mood="cheer">
                {caseInfo.id === 'L7' ? 'Luar biasa! Semua kasus terpecahkan. Kamu Master Detective!' : 'Kerja hebat! Berkas kasus berikutnya sudah terbuka.'}
              </AgentSays>
            )}
            <Walkers />
            <footer className="action-bar">
              <span />
              <button type="button" className="btn btn-primary" onClick={onExit}>{det ? 'Ke Peta Investigasi' : 'Ke Peta Belajar'}</button>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
