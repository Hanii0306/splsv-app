import { useMemo, useState } from 'react';
import levels from '../content/levels.json';
import { quizItem, solutionSteps } from '../engine/index.js';
import { logEvent } from '../telemetry/log.js';
import Celebrate from '../ui/Celebrate.jsx';
import Choice from '../ui/Choice.jsx';
import { pretty } from '../ui/EquationLine.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Header from '../ui/Header.jsx';
import Walkers from '../ui/Walkers.jsx';

const N = 10;

/** Mixed quiz from the opened levels. No hints (it checks independent skill); review at the end. */
export default function Quiz({ openLevels, onExit }) {
  const items = useMemo(() => {
    const pool = openLevels.length ? openLevels : ['L1'];
    const seed = Date.now() % 1_000_000;
    return Array.from({ length: N }, (_, i) => quizItem(pool[i % pool.length], seed + i));
  }, [openLevels]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const done = answers.length === N && picked == null;

  function pick(k) {
    const it = items[i];
    const ok = k === it.correct;
    setPicked(k);
    logEvent('quiz_answer', { levelId: it.levelId, correct: ok, equation: it.equation }, `Q-${i}`);
    setAnswers((a) => [...a, { ...it, chosen: k, ok }]);
  }
  function next() { setPicked(null); setI((x) => x + 1); }

  if (done) {
    const score = answers.filter((a) => a.ok).length;
    const byLevel = levels.map((lv) => {
      const mine = answers.filter((a) => a.levelId === lv.id);
      return mine.length ? `${lv.id}: ${mine.filter((a) => a.ok).length}/${mine.length}` : null;
    }).filter(Boolean);
    const wrong = answers.filter((a) => !a.ok);
    return (
      <div className="screen cute-bg">
        <FloatingSymbols />
        {score >= 7 && <Celebrate />}
        <Header title="Hasil kuis" onBack={onExit} />
        <main className="content">
          <div className="score">{score}/{N}</div>
          <Walkers />
          <p style={{ textAlign: 'center' }}>{score >= 9 ? 'Luar biasa!' : score >= 7 ? 'Bagus sekali!' : 'Terus berlatih, kamu pasti bisa!'}</p>
          <div className="counter">{byLevel.map((t) => <span key={t} className="pill">{t}</span>)}</div>
          {wrong.length > 0 && <h2>Pembahasan soal yang salah</h2>}
          {wrong.map((a) => (
            <div key={a.equation} className="sum-example">
              {solutionSteps(a.equation).map((st, k) => (
                <div key={k}>{st.op && <div className="op">↓ {st.op}</div>}<div>{pretty(st.text)}</div></div>
              ))}
            </div>
          ))}
          <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={onExit}>Ke Peta Belajar</button></footer>
        </main>
      </div>
    );
  }

  const it = items[i];
  return (
    <div className="screen">
      <Header title="Kuis campuran" onBack={onExit} right={<span className="header-meta">{i + 1}/{N}</span>} />
      <main className="content">
        <p className="muted">Tanpa bantuan. Hitung di kertas bila perlu, lalu pilih nilai x.</p>
        <div className="quiz-eq">{pretty(it.equation)}</div>
        <Choice key={i} options={it.optionsText ? it.optionsText.map(pretty) : it.options.map((v) => pretty(`x = ${v}`))} onPick={pick} disabled={picked != null}
          state={picked != null ? { [picked]: picked === it.correct ? 'right' : 'wrong', [it.correct]: 'right' } : {}} />
        {picked != null && (
          <footer className="action-bar">
            <span className={picked === it.correct ? 'feedback feedback-ok' : 'feedback feedback-warn'}>{picked === it.correct ? 'Benar!' : `Jawaban: ${it.optionsText ? pretty(it.answer) : `x = ${pretty(String(it.answer))}`}`}</span>
            <button type="button" className="btn btn-primary" onClick={next}>{i + 1 < N ? 'Berikutnya →' : 'Lihat hasil'}</button>
          </footer>
        )}
      </main>
    </div>
  );
}
