import { useMemo, useState } from 'react';
import { genEquation, genStory, isClean, isMastered, nextLevel, planMode } from '../engine/index.js';
import { updateProgress } from '../storage/db.js';
import { logEvent } from '../telemetry/log.js';
import Header from '../ui/Header.jsx';
import Solver from './Solver.jsx';
import StoryTask from './StoryTask.jsx';

/** Unlimited generated practice for one level; hints still fade, mastery still counts. */
export default function FreePractice({ level, profile, settings, onExit }) {
  const base = useMemo(() => Date.now() % 1_000_000, []);
  const [n, setN] = useState(0);
  const [results, setResults] = useState([]);
  const [masteredNow, setMasteredNow] = useState(false);
  const seed = base + n;
  const itemId = `${level.id}-G${seed}`;
  const isStory = level.id === 'L7';
  const equation = useMemo(() => (isStory ? null : genEquation(level.id, seed)), [isStory, level.id, seed]);
  const story = useMemo(() => (isStory ? genStory(seed) : null), [isStory, seed]);
  const mode = isStory ? 'practice' : planMode(results, 'practice');

  const streak = (() => { let s = 0; for (let i = results.length - 1; i >= 0 && isClean(results[i]); i--) s++; return s; })();

  async function done(r) {
    const res = { ...r, mode };
    logEvent('item_complete', { levelId: level.id, wrongs: r.wrongs, maxHint: r.maxHint, ms: r.ms, mode, free: true, seed }, itemId);
    const all = [...results, res];
    setResults(all);
    if (!masteredNow && isMastered(all)) {
      setMasteredNow(true);
      await updateProgress(profile.studentCode, level.id, { status: 'mastered', bestStreak: 3 });
      const nxt = nextLevel(level.id);
      if (nxt) await updateProgress(profile.studentCode, nxt, { status: 'active' });
    }
    setN((k) => k + 1);
  }

  return (
    <div className="screen">
      <Header title={`Latihan bebas · ${level.id}`} onBack={onExit} right={<span className="header-meta">Soal {n + 1}</span>} />
      <main className="content">
        <div className="counter">
          <span className="pill">Selesai: {results.length}</span>
          <span className="pill sun">Beruntun rapi: {streak}</span>
          {masteredNow && <span className="pill sun">★ Lencana {level.id} didapat!</span>}
        </div>
        {isStory ? (
          <StoryTask key={itemId} story={story} levelId={level.id} itemId={itemId} settings={settings} onDone={done} />
        ) : (
          <Solver key={itemId} equation={equation} mode={mode} itemId={itemId} levelId={level.id} scaleMode={level.scale}
            settings={settings} showPindahRuas={['L1', 'L2', 'L3', 'L4'].includes(level.id)} onDone={done} />
        )}
      </main>
    </div>
  );
}
