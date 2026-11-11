import { useMemo, useRef, useState } from 'react';
import storiesData from '../content/stories.json';
import { bestStreak, isMastered, nextLevel, parse, planMode } from '../engine/index.js';
import { resetSegment, segmentDue } from '../app/session.js';
import { updateProgress } from '../storage/db.js';
import { logEvent } from '../telemetry/log.js';
import EquationLine from '../ui/EquationLine.jsx';
import Celebrate from '../ui/Celebrate.jsx';
import Header from '../ui/Header.jsx';
import Walkers from '../ui/Walkers.jsx';
import ScaleView from '../ui/ScaleView.jsx';
import Questionnaire from './Questionnaire.jsx';
import Solver from './Solver.jsx';
import StoryTask from './StoryTask.jsx';

const stories = Object.fromEntries(storiesData.map((s) => [s.id, s]));
const MODE_LABEL = { worked: 'Contoh', completion: 'Lengkapi', practice: 'Latihan' };

export default function LevelRunner({ level, profile, settings, onExit }) {
  const [phase, setPhase] = useState(level.intro ? 'intro' : 'item');
  const [introIdx, setIntroIdx] = useState(0);
  const [queue, setQueue] = useState(() => level.items.slice());
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const extraLeft = useRef((level.extra || []).slice());

  const item = queue[idx];
  const mode = useMemo(() => (item && item.type !== 'story' ? planMode(results, item.type) : 'practice'), [item, results]);

  function afterItem(r, it = item, m = mode) {
    const res = { ...r, itemId: it.id, mode: m };
    logEvent('item_complete', { levelId: level.id, wrongs: r.wrongs, maxHint: r.maxHint, ms: r.ms, mode: m, skipped: !!r.skipped }, it.id);
    const all = [...results, res];
    setResults(all);

    let q = queue;
    if (idx + 1 >= queue.length && phase === 'item' && !isMastered(all) && extraLeft.current.length) {
      const eqText = extraLeft.current.shift();
      q = [...queue, { id: `${level.id}-X${queue.length}`, type: 'practice', equation: eqText }];
      setQueue(q);
    }
    if (idx + 1 < q.length) {
      setIdx(idx + 1);
      if (segmentDue()) setPhase('break');
    } else {
      setPhase('pattern');
    }
  }

  async function finishLevel(transferResult) {
    const all = transferResult ? [...results, { ...transferResult, mode: 'practice' }] : results;
    // Mastery is judged on the level's practice items; the transfer item is a learning activity.
    const mastered = isMastered(results);
    const streak = bestStreak(all);
    await updateProgress(profile.studentCode, level.id, { status: mastered ? 'mastered' : 'active', bestStreak: streak });
    const nxt = nextLevel(level.id);
    if (mastered && nxt) await updateProgress(profile.studentCode, nxt, { status: 'active' });
    logEvent('item_complete', { kind: 'level', levelId: level.id, mastered, bestStreak: streak });
    setSummary({ mastered, streak, items: all.length, hints: all.filter((r) => r.maxHint > 0).length });
    setPhase(settings.clq ? 'clq' : 'summary');
  }

  const title = `${level.id} · ${level.title}`;
  const progressText = phase === 'item' ? `${MODE_LABEL[mode] || 'Soal'} ${idx + 1}/${queue.length}` : '';

  return (
    <div className="screen">
      <Header title={title} onBack={onExit} right={<span className="header-meta">{progressText}</span>} />
      <main className="content">
        {phase === 'intro' && (
          <div className="intro">
            {level.scale !== 'none' && (
              <ScaleView equation={parse(level.intro[introIdx].equation)} mode="full" light={settings.light3d} reducedMotion={settings.reducedMotion} />
            )}
            <EquationLine eq={parse(level.intro[introIdx].equation)} />
            <p className="lead">{level.intro[introIdx].text}</p>
            <footer className="action-bar">
              <span className="muted">{introIdx + 1}/{level.intro.length}</span>
              <button type="button" className="btn btn-primary" onClick={() => (introIdx + 1 < level.intro.length ? setIntroIdx(introIdx + 1) : setPhase('item'))}>Lanjut →</button>
            </footer>
          </div>
        )}

        {phase === 'item' && item && item.type === 'story' && (
          <StoryTask key={item.id} story={stories[item.story]} levelId={level.id} itemId={item.id} settings={settings} onDone={(r) => afterItem(r, item, 'practice')} />
        )}

        {phase === 'item' && item && item.type !== 'story' && (
          <>
            {mode === 'worked' && results.length === 0 && (
              <button type="button" className="link-btn" onClick={() => afterItem({ wrongs: 0, maxHint: 0, ms: 0, skipped: true }, item, 'worked')}>
                Saya sudah paham, lewati contoh
              </button>
            )}
            {level.slow && mode === 'worked' && <p className="slow-note">Bagian ini kita kerjakan pelan-pelan. Ketuk Lanjut kapan pun kamu siap.</p>}
            <Solver
              key={`${idx}-${item.id}`}
              equation={item.equation}
              mode={mode}
              itemId={item.id}
              levelId={level.id}
              why={item.why}
              scaleMode={level.scale}
              settings={settings}
              showPindahRuas={['L1', 'L2', 'L3', 'L4'].includes(level.id)}
              onDone={(r) => afterItem(r)}
            />
          </>
        )}

        {phase === 'break' && (
          <div className="break-card">
            <h2>Istirahat sebentar?</h2>
            <p>Kamu sudah belajar sekitar 12 menit. Tarik napas, regangkan badan, atau ceritakan ke teman sebangku langkah yang baru kamu pelajari.</p>
            <footer className="action-bar">
              <button type="button" className="btn btn-ghost" onClick={() => { logEvent('break_taken', { taken: false, levelId: level.id }); resetSegment(); setPhase('item'); }}>Lanjut saja</button>
              <button type="button" className="btn btn-primary" onClick={() => { logEvent('break_taken', { taken: true, levelId: level.id }); resetSegment(); setPhase('item'); }}>Sudah istirahat</button>
            </footer>
          </div>
        )}

        {phase === 'pattern' && (
          <div className="pattern-card">
            <h2>Pola dasar</h2>
            <ol>{level.pattern.map((p) => <li key={p}>{p}</li>)}</ol>
            <p className="muted">Sekarang coba satu soal dengan bentuk berbeda.</p>
            <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={() => setPhase('transfer')}>Coba →</button></footer>
          </div>
        )}

        {phase === 'transfer' && level.transfer && (
          <Solver key="transfer" equation={level.transfer} mode="practice" itemId={`${level.id}-T`} levelId={level.id}
            scaleMode={level.scale} settings={settings} showPindahRuas={false} onDone={(r) => finishLevel({ ...r, transfer: true })} />
        )}
        {phase === 'transfer' && level.transferStory && (
          <StoryTask key="transfer" story={stories[level.transferStory]} levelId={level.id} itemId={`${level.id}-T`} settings={settings}
            onDone={(r) => finishLevel({ ...r, transfer: true })} />
        )}

        {phase === 'clq' && (
          <Questionnaire levelId={level.id} onDone={() => setPhase('summary')} />
        )}

        {phase === 'summary' && summary && (
          <div className="summary-card">
            {summary.mastered && <Celebrate />}
            <Walkers />
            <h2>{summary.mastered ? `★ Lencana ${level.id} kamu dapatkan!` : 'Kerja bagus, terus berlatih!'}</h2>
            <p>{summary.mastered
              ? 'Kamu menyelesaikan tiga soal berturut-turut dengan sedikit bantuan. Level berikutnya terbuka.'
              : 'Coba "Latihan bebas ∞" di Peta Belajar: soalnya tidak pernah habis, dan lencana bisa didapat di sana.'}</p>
            <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={onExit}>Ke Peta Belajar</button></footer>
          </div>
        )}
      </main>
    </div>
  );
}
