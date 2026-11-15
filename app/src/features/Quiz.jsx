import { useMemo, useState } from 'react';
import cases from '../content/cases.json';
import { quizPool } from '../engine/index.js';
import { db, getProfile } from '../storage/db.js';
import { reportStudent } from '../sync/supabase.js';
import { logEvent } from '../telemetry/log.js';
import Celebrate from '../ui/Celebrate.jsx';
import { Fingerprint } from '../ui/Detective.jsx';
import FloatingSymbols from '../ui/FloatingSymbols.jsx';
import Header from '../ui/Header.jsx';
import Walkers from '../ui/Walkers.jsx';
import { MathText } from './CaseItem.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Mixed quiz = 10 multiple-choice instrument items (PDF) from opened cases. No hints; review at the end. */
export default function Quiz({ openLevels, onExit }) {
  const items = useMemo(() => quizPool(cases, openLevels, Date.now() % 1_000_000), [openLevels]);
  const N = items.length;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const done = answers.length === N && picked == null;

  function pick(k) {
    const it = items[i];
    const ok = k === it.answer;
    setPicked(k);
    logEvent('quiz_answer', { levelId: it.levelId, correct: ok, ind: it.ind }, it.id);
    setAnswers((a) => {
      const all = [...a, { ...it, chosen: k, ok }];
      if (all.length === N) saveScore(Math.round((all.filter((x) => x.ok).length / N) * 100));
      return all;
    });
  }

  async function saveScore(score) {
    const p = await getProfile();
    if (!p) return;
    await db.profile.update(p.studentCode, { quizLast: score, quizBest: Math.max(score, p.quizBest ?? 0) });
    reportStudent({ force: true });
  }
  function next() { setPicked(null); setI((x) => x + 1); }

  if (done) {
    const score = answers.filter((a) => a.ok).length;
    const byLevel = cases.map((c) => {
      const mine = answers.filter((a) => a.levelId === c.id);
      return mine.length ? `${c.code}: ${mine.filter((a) => a.ok).length}/${mine.length}` : null;
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
            <div key={a.id} className="sum-example">
              <strong>{a.label}</strong>
              <ol className="clue-lines">{a.steps.map((s) => <li key={s}><MathText text={s} /></li>)}</ol>
            </div>
          ))}
          <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={onExit}>Ke peta</button></footer>
        </main>
      </div>
    );
  }

  const it = items[i];
  return (
    <div className="screen">
      <Header title="Kuis acak" onBack={onExit} right={<span className="header-meta">{i + 1}/{N}</span>} />
      <main className="content">
        <p className="muted">Tanpa bantuan. Hitung di kertas bila perlu.</p>
        <div className="evidence">
          <strong className="evidence-label">{it.label}</strong>
          {it.prompt.map((p) => <p key={p}><MathText text={p} /></p>)}
        </div>
        <div className="fp-cards">
          {it.options.map((o, k) => {
            const st = picked == null ? '' : k === it.answer ? ' fp-right' : k === picked ? ' fp-wrong' : '';
            return (
              <button key={o} type="button" className={`fp-card${st}`} disabled={picked != null} onClick={() => pick(k)}>
                <span className="fp-letter">{LETTERS[k]}</span>
                <span className="fp-text"><MathText text={o} /></span>
                <span className="fp-chip">{st === ' fp-right' ? '✓' : st === ' fp-wrong' ? '✗' : <Fingerprint size={22} />}</span>
              </button>
            );
          })}
        </div>
        {picked != null && (
          <footer className="action-bar">
            <span className={picked === it.answer ? 'feedback feedback-ok' : 'feedback feedback-warn'}>
              {picked === it.answer ? '✓ Benar!' : `! Jawaban: ${LETTERS[it.answer]}`}
            </span>
            <button type="button" className="btn btn-primary" onClick={next}>{i + 1 < N ? 'Berikutnya →' : 'Lihat hasil'}</button>
          </footer>
        )}
      </main>
    </div>
  );
}
