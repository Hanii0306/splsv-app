import { useMemo, useState } from 'react';
import cases from '../content/cases.json';
import { isClean, isMastered, nextLevel, planMode, practiceEquations } from '../engine/index.js';
import { updateProgress } from '../storage/db.js';
import { logEvent } from '../telemetry/log.js';
import Header from '../ui/Header.jsx';
import Solver from './Solver.jsx';

/**
 * Scale practice: the case's own instrument equations (PDF) solved step by step on the balance,
 * repeated in a fresh random order every round. Hints still fade, mastery still counts.
 */
export default function FreePractice({ level, profile, settings, onExit }) {
  const caseInfo = cases.find((c) => c.id === level.id) || cases[0];
  const base = useMemo(() => Date.now() % 1_000_000, []);
  const [n, setN] = useState(0);
  const [results, setResults] = useState([]);
  const [masteredNow, setMasteredNow] = useState(false);
  const round = Math.floor(n / Math.max(1, practiceEquations(caseInfo, 0).length));
  const list = useMemo(() => practiceEquations(caseInfo, base + round), [caseInfo, base, round]);
  const item = list[n % list.length];
  const itemId = `${item.id}-S${n}`;
  const mode = planMode(results, 'practice');

  const streak = (() => { let s = 0; for (let i = results.length - 1; i >= 0 && isClean(results[i]); i--) s++; return s; })();

  async function done(r) {
    const res = { ...r, mode };
    logEvent('item_complete', { levelId: level.id, wrongs: r.wrongs, maxHint: r.maxHint, ms: r.ms, mode, free: true, source: item.id }, itemId);
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
      <Header title={`Latihan timbangan · ${caseInfo.code}`} onBack={onExit} right={<span className="header-meta">Soal {n + 1}</span>} />
      <main className="content">
        <div className="counter">
          <span className="pill">Bukti {item.id.slice(3)} · {item.label}</span>
          <span className="pill sun">Beruntun rapi: {streak}</span>
          {masteredNow && <span className="pill sun">★ Kasus {caseInfo.code} dikuasai!</span>}
        </div>
        <Solver key={itemId} equation={item.eq} mode={mode} itemId={itemId} levelId={level.id} scaleMode={level.scale}
          settings={settings} showPindahRuas={['L1', 'L2', 'L3', 'L4'].includes(level.id)} onDone={done} />
      </main>
    </div>
  );
}
