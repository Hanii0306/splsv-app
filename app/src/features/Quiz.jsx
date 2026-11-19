import { useMemo, useState } from 'react';
import cases from '../content/cases.json';
import { checkBox, expectedOf, quizPool } from '../engine/index.js';
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
// Faint static pattern behind questions (v1.8); follows Menu peneliti → Pola latar (html.no-pattern).
const settingsPattern = () => typeof document === 'undefined' || !document.documentElement.classList.contains('no-pattern');

/** Box text with inputs for the blanks; after checking, shows the given value (✓) or the key (!). */
function QuizBoxText({ box, values, onChange, state }) {
  const parts = box.text.split('□');
  const key = box.choices || box.free ? [] : expectedOf(box);
  return (
    <span className="box-text">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (state === 'active'
            ? <input className="box-input" value={values[i] || ''} inputMode="decimal" autoComplete="off" placeholder="?"
                aria-label={`Isian ${i + 1}`} onChange={(e) => onChange(i, e.target.value)} />
            : state === 'later'
              ? <input className="box-input" disabled placeholder="?" aria-label={`Isian ${i + 1}`} />
              : <span className={`box-val${state.wrong?.includes(i) ? ' box-val-wrong' : ''}`}>
                  {state.wrong?.includes(i) ? `${values[i] || '–'} → ${key[i]}` : values[i]}
                </span>)}
        </span>
      ))}
    </span>
  );
}

/** A scaffolded PDF item in quiz mode: one check per box, no clues; wrong boxes reveal the key afterwards. */
function QuizSteps({ item, onDone }) {
  const [cur, setCur] = useState(0);
  const [vals, setVals] = useState(() => item.boxes.map(() => []));
  const [marks, setMarks] = useState([]); // per box: { ok, wrong: [] }
  const box = item.boxes[cur];
  const finished = cur >= item.boxes.length;

  const setVal = (i, v) => setVals((all) => all.map((row, k) => (k === cur ? Object.assign([...row], { [i]: v }) : row)));
  function check(given) {
    const r = checkBox(box, box.free ? given[0] : given);
    if (box.choices) setVals((all) => all.map((row, k) => (k === cur ? [given] : row)));
    const m = [...marks, box.free ? { ok: true, wrong: [] } : r];
    setMarks(m);
    setCur(cur + 1);
    if (cur + 1 >= item.boxes.length) {
      const scored = m.filter((_, k) => !item.boxes[k].free);
      onDone(scored.every((x) => x.ok), { boxes: m.map((x) => x.ok), explanation: box.free ? String(given[0] || '').slice(0, 500) : undefined });
    }
  }
  const filled = box && !box.choices && (box.free
    ? String(vals[cur][0] || '').trim().split(/\s+/).filter(Boolean).length >= 3
    : (vals[cur] || []).filter((v) => String(v || '').trim()).length === (box.text.match(/□/g) || []).length);
  const flipSign = () => {
    const v = String(vals[cur][0] || '');
    setVal(0, v.startsWith('-') || v.startsWith('−') ? v.slice(1) : `-${v}`);
  };

  return (
    <>
      <ol className="boxes">
        {item.boxes.map((b, bi) => {
          const st = bi < cur ? marks[bi] : bi === cur ? 'active' : 'later';
          const cls = bi < cur ? (marks[bi].ok ? 'done' : 'missed') : bi === cur ? 'active' : 'later';
          return (
            <li key={bi} className={`box box-${cls}`}>
              <span className="box-no">{bi < cur ? (marks[bi].ok ? '✓' : '!') : bi + 1}</span>
              <div className="box-body">
                {b.free ? (
                  <>
                    <span className="box-text">{b.text}</span>
                    {bi < cur ? <span className="box-free-done">{vals[bi][0]}</span>
                      : <textarea className="box-free" rows={3} disabled={bi !== cur} value={vals[bi][0] || ''}
                          placeholder="Tulis alasanmu (minimal 3 kata)…" onChange={(e) => setVal(0, e.target.value)} />}
                  </>
                ) : b.choices ? (
                  <>
                    <span className="box-text">{b.text} {bi < cur && (
                      <span className={`box-val${marks[bi].ok ? '' : ' box-val-wrong'}`}>
                        {marks[bi].ok ? b.choices[vals[bi][0]] : `${b.choices[vals[bi][0]]} → ${b.choices[b.answer]}`}
                      </span>)}
                    </span>
                    {bi >= cur && (
                      <div className="box-choices">
                        {b.choices.map((c, ci) => <button key={c} type="button" className="mini-btn" disabled={bi !== cur} onClick={() => check(ci)}>{c}</button>)}
                      </div>
                    )}
                  </>
                ) : (
                  <QuizBoxText box={b} values={vals[bi]} onChange={setVal} state={st} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {!finished && !box.choices && (
        <footer className="action-bar">
          {!box.free ? <button type="button" className="btn btn-ghost sign-btn" onClick={flipSign} aria-label="Ganti tanda plus/minus">±</button> : <span />}
          <button type="button" className="btn btn-primary" disabled={!filled} onClick={() => check(vals[cur])}>Periksa</button>
        </footer>
      )}
    </>
  );
}

/** Random quiz = 10 PDF instrument items (verbatim, MC and scaffolded) from opened cases. No hints. */
export default function Quiz({ openLevels, onExit }) {
  const items = useMemo(() => quizPool(cases, openLevels, Date.now() % 1_000_000), [openLevels]);
  const N = items.length;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const [stepsDone, setStepsDone] = useState(null);
  const it = items[i];
  const answered = it?.kind === 'mc' ? picked != null : stepsDone != null;
  const done = answers.length === N && !answered;

  function record(ok, detail) {
    logEvent('quiz_answer', { levelId: it.levelId, correct: ok, ind: it.ind, kind: it.kind, ...detail }, it.id);
    setAnswers((a) => {
      const all = [...a, { ...it, ok }];
      if (all.length === N) saveScore(Math.round((all.filter((x) => x.ok).length / N) * 100));
      return all;
    });
  }
  function pick(k) { setPicked(k); record(k === it.answer, { pick: k }); }

  async function saveScore(score) {
    const p = await getProfile();
    if (!p) return;
    await db.profile.update(p.studentCode, { quizLast: score, quizBest: Math.max(score, p.quizBest ?? 0) });
    reportStudent({ force: true });
  }
  function next() { setPicked(null); setStepsDone(null); setI((x) => x + 1); }

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

  return (
    <div className={`screen${settingsPattern() ? ' solve-bg' : ''}`}>
      <Header title="Kuis acak" onBack={onExit} />
      <div className="count-box">
        <span>Jumlah soal: <strong>{N}</strong></span>
        <span>Selesai: <strong>{answers.length}</strong></span>
      </div>
      <main className="content">
        <p className="muted">Tanpa bantuan. Hitung di kertas bila perlu.</p>
        <div className="evidence">
          <strong className="evidence-label">{it.label}</strong>
          {it.prompt.map((p) => <p key={p}><MathText text={p} /></p>)}
        </div>
        {it.kind === 'mc' ? (
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
        ) : (
          <QuizSteps key={it.id} item={it} onDone={(ok, detail) => { setStepsDone(ok); record(ok, detail); }} />
        )}
        {answered && (
          <footer className="action-bar">
            <span className={(it.kind === 'mc' ? picked === it.answer : stepsDone) ? 'feedback feedback-ok' : 'feedback feedback-warn'}>
              {it.kind === 'mc'
                ? (picked === it.answer ? '✓ Benar!' : `! Jawaban: ${LETTERS[it.answer]}`)
                : (stepsDone ? '✓ Semua kotak benar!' : '! Lihat kunci di kotak bertanda !')}
            </span>
            <button type="button" className="btn btn-primary" onClick={next}>{i + 1 < N ? 'Berikutnya →' : 'Lihat hasil'}</button>
          </footer>
        )}
      </main>
    </div>
  );
}
