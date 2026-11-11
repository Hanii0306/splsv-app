import { useEffect } from 'react';
import summaries from '../content/summaries.json';
import { solutionSteps } from '../engine/index.js';
import { logEvent } from '../telemetry/log.js';
import { pretty } from '../ui/EquationLine.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Header from '../ui/Header.jsx';

/** Re-readable summary card per level (worked example + common mistakes from the interview). */
export default function SummaryView({ level, onBack, onStart }) {
  const sum = summaries[level.id];
  const steps = solutionSteps(sum.example);
  useEffect(() => { logEvent('summary_view', { levelId: level.id }); }, [level.id]);

  return (
    <div className="screen cute-bg">
      <FloatingSymbols />
      <Header title={`Ringkasan ${level.id}`} onBack={onBack} />
      <main className="content">
        <h2>{level.title}</h2>
        <p className="sum-idea">{sum.idea}</p>
        {sum.analogy && <p className="sum-analogy"><strong>Bayangkan…</strong> {sum.analogy}</p>}

        <h2>Langkah</h2>
        <ol className="sum-steps">{sum.steps.map((s) => <li key={s}>{s}</li>)}</ol>

        <h2>Contoh</h2>
        <div className="sum-example">
          {steps.map((st, i) => (
            <div key={i}>
              {st.op && <div className="op">↓ {st.op}</div>}
              <div>{pretty(st.text)}</div>
            </div>
          ))}
        </div>

        {sum.keywords && (
          <>
            <h2>Kata kunci</h2>
            <ul className="sum-steps">{sum.keywords.map(([w, op]) => <li key={w}><strong>{op}</strong> ← {w}</li>)}</ul>
          </>
        )}

        <h2>Kesalahan yang sering terjadi</h2>
        {sum.mistakes.map((m) => (
          <div key={m.wrong} className="mistake">
            <span className="w">✗ {pretty(m.wrong)}</span>
            <span className="r">✓ {pretty(m.right)}</span>
          </div>
        ))}

        <footer className="action-bar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>Kembali</button>
          <button type="button" className="btn btn-primary" onClick={onStart}>Belajar {level.id} →</button>
        </footer>
      </main>
    </div>
  );
}
