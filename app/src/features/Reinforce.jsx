import { useState } from 'react';
import reinforcement from '../content/reinforcement.json';
import { saveProfile } from '../storage/db.js';
import { logEvent } from '../telemetry/log.js';
import Choice from '../ui/Choice.jsx';
import Header from '../ui/Header.jsx';

/** Short prerequisite module (pre-training principle, design.md §1). */
export default function Reinforce({ skill, profile, onDone, onBack }) {
  const mod = reinforcement[skill];
  const [i, setI] = useState(-1);
  const [picked, setPicked] = useState(null);

  async function finish() {
    const p = { ...profile, reinforced: [...(profile.reinforced || []), skill] };
    await saveProfile(p);
    onDone(p);
  }

  const it = i >= 0 ? mod.items[i] : null;
  return (
    <div className="screen">
      <Header title={mod.title} onBack={onBack} right={<span className="header-meta">{i >= 0 ? `${i + 1}/${mod.items.length}` : ''}</span>} />
      <main className="content">
        {i < 0 ? (
          <div className="pattern-card">
            <p className="lead">{mod.tip}</p>
            <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={() => setI(0)}>Mulai →</button></footer>
          </div>
        ) : (
          <>
            <div className="diag-prompt">{it.prompt}</div>
            <Choice key={i} options={it.options} disabled={picked != null}
              state={picked != null ? { [picked]: picked === it.correct ? 'right' : 'wrong', [it.correct]: 'right' } : {}}
              onPick={(c) => { setPicked(c); logEvent('reinforcement_answer', { skill, correct: c === it.correct }, `R-${skill}-${i}`); }} />
            {picked != null && (
              <>
                <p className={`feedback feedback-${picked === it.correct ? 'ok' : 'warn'}`}>{it.explain}</p>
                <footer className="action-bar"><span />
                  <button type="button" className="btn btn-primary" onClick={() => (i + 1 < mod.items.length ? (setI(i + 1), setPicked(null)) : finish())}>
                    {i + 1 < mod.items.length ? 'Lanjut →' : 'Selesai ✓'}
                  </button>
                </footer>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
