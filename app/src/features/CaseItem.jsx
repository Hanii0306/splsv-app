import { useRef, useState } from 'react';
import { caseClue, checkBox, maxClueAllowed, onAttempt, initialHintState } from '../engine/index.js';
import { logEvent } from '../telemetry/log.js';
import { Envelope, Fingerprint, Stamp } from '../ui/Detective.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];
// Keep an equation like "x + 9 = 17" on one line (text and maths stay readable together, EL02).
const EQ_RUN = /[^\s]+(?:\s[=+−×:<>≤≥-]\s[^\s]+)+/g;
export function MathText({ text }) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(EQ_RUN)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<span key={m.index} className="nowrap">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

export const IND_LABEL = { formulate: 'Merumuskan', employ: 'Menerapkan', interpret: 'Menafsirkan', reason: 'Bernalar' };

/** Clue envelope sheet: H1→H4, never covers the question (sticky bottom sheet). */
function ClueSheet({ clue, canMore, lockedH4, onMore, onClose }) {
  if (!clue) return null;
  return (
    <div className="hint-panel clue-sheet" role="dialog" aria-label="Amplop petunjuk">
      <div className="hint-head">
        <Envelope open size={22} />
        <span className="hint-level">H{clue.level}</span>
        <strong>{clue.title}</strong>
      </div>
      {clue.lines.length > 1
        ? <ol className="clue-lines">{clue.lines.map((l) => <li key={l}><MathText text={l} /></li>)}</ol>
        : <p><MathText text={clue.lines[0]} /></p>}
      {lockedH4 && <p className="muted">Coba jawab sekali dulu untuk membuka berkas penyelesaian.</p>}
      <div className="hint-actions">
        {canMore && <button type="button" className="btn btn-ghost" onClick={onMore}>Buka amplop berikutnya</button>}
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
      </div>
    </div>
  );
}

/** Shared attempt / clue bookkeeping for one item. */
function useItemState(item, caseInfo, settings, live) {
  const stats = useRef({ wrongs: 0, maxHint: 0, attempts: 0, t0: Date.now() });
  const [hint, setHint] = useState(initialHintState);
  const [clueLevel, setClueLevel] = useState(0);
  const [clue, setClue] = useState(null);

  function attempt(ok, detail) {
    stats.current.attempts += 1;
    if (!ok) stats.current.wrongs += 1;
    logEvent('case_answer', { levelId: caseInfo.id, ok, ind: item.ind, kind: item.kind, ...detail }, item.id);
    setHint((h) => {
      const n = onAttempt(h, ok);
      if (n.offered && !h.offered) logEvent('hint_offered', { levelId: caseInfo.id, wrongStreak: n.wrongStreak }, item.id);
      return n;
    });
  }

  function openClue() {
    const next = Math.min(clueLevel + 1, maxClueAllowed(stats.current.attempts));
    const c = caseClue(item, caseInfo, next, stats.current.attempts);
    if (!c) return;
    setClueLevel(next);
    stats.current.maxHint = Math.max(stats.current.maxHint, next);
    logEvent('hint_opened', { level: next, levelId: caseInfo.id }, item.id);
    setClue(c);
  }

  const result = () => ({ wrongs: stats.current.wrongs, maxHint: stats.current.maxHint, ms: Date.now() - stats.current.t0 });
  const cluesOn = settings.clues !== false;
  const sheet = cluesOn && (
    <ClueSheet clue={clue}
      canMore={clueLevel < maxClueAllowed(stats.current.attempts)}
      lockedH4={clueLevel === 3 && stats.current.attempts === 0}
      onMore={openClue} onClose={() => setClue(null)} />
  );
  const envBtn = cluesOn && (
    <button type="button" className={`btn btn-ghost env-btn${hint.offered && !clue ? ' btn-pulse' : ''}`} onClick={openClue}
      disabled={clueLevel >= maxClueAllowed(stats.current.attempts) && !!clue}>
      <Envelope size={20} /> Amplop petunjuk
    </button>
  );
  // Live state for the Detektif AI chat (read when the student asks; no re-render needed).
  if (live) Object.assign(live.current, { itemId: item.id, wrongs: stats.current.wrongs, hintLevel: clueLevel });
  return { attempt, result, sheet, envBtn, hint, stats, cluesOn };
}

function Evidence({ item, n }) {
  return (
    <>
      <div className="case-tag">
        <span>{item.kind === 'mc' ? 'Pilihan ganda' : 'Isian'}</span>
        <span className="ind-tag">{IND_LABEL[item.ind]}</span>
      </div>
      <div className="evidence">
        <strong className="evidence-label">{item.label}</strong>
        {item.prompt.map((p) => <p key={p}><MathText text={p} /></p>)}
      </div>
    </>
  );
}

function Solved({ item, onNext }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <p className="feedback feedback-ok solved-line"><Stamp tone="ok">Terpecahkan</Stamp> Bukti cocok. Kerja bagus, Agen!</p>
      {show && <ol className="clue-lines solution">{item.steps.map((s) => <li key={s}><MathText text={s} /></li>)}</ol>}
      <footer className="action-bar">
        <button type="button" className="btn btn-ghost" onClick={() => setShow(!show)}>{show ? 'Tutup berkas' : 'Lihat berkas penyelesaian'}</button>
        <button type="button" className="btn btn-primary" onClick={onNext}>Lanjut →</button>
      </footer>
    </>
  );
}

/** Multiple choice as fingerprint cards (A–D). Wrong cards are marked, never removed silently. */
export function McItem({ item, caseInfo, n, settings, onDone, live }) {
  const s = useItemState(item, caseInfo, settings, live);
  if (live) Object.assign(live.current, { box: 0, work: '' });
  const [marks, setMarks] = useState({});
  const [solved, setSolved] = useState(false);
  const [msg, setMsg] = useState(null);

  function pick(i) {
    if (solved || marks[i]) return;
    const ok = i === item.answer;
    s.attempt(ok, { pick: i });
    setMarks({ ...marks, [i]: ok ? 'right' : 'wrong' });
    if (ok) setSolved(true);
    else setMsg(s.hint.wrongStreak + 1 >= 2 && s.cluesOn ? 'Belum cocok. Amplop petunjuk siap dibuka.' : 'Belum cocok. Periksa lagi langkahmu, kamu pasti bisa.');
  }

  return (
    <div className="case-item">
      <Evidence item={item} n={n} />
      <div className="fp-cards">
        {item.options.map((o, i) => (
          <button key={o} type="button" className={`fp-card${marks[i] ? ` fp-${marks[i]}` : ''}`} disabled={solved || !!marks[i]} onClick={() => pick(i)}>
            <span className="fp-letter">{LETTERS[i]}</span>
            <span className="fp-text"><MathText text={o} /></span>
            <span className="fp-chip">{marks[i] === 'right' ? '✓' : marks[i] === 'wrong' ? '✗' : <Fingerprint size={22} />}</span>
          </button>
        ))}
      </div>
      {solved ? <Solved item={item} onNext={() => onDone(s.result())} /> : (
        <>
          {msg && <p className="feedback feedback-warn">{msg}</p>}
          <footer className="action-bar">{s.envBtn || <span />}<span /></footer>
        </>
      )}
      {!solved && s.sheet}
    </div>
  );
}

/** Renders "y = 6 − □" with inputs in place of the blanks. */
function BoxText({ text, values, onChange, active, wrong, done, inputRefs }) {
  const parts = text.split('□');
  return (
    <span className="box-text">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            done ? <span className="box-val">{values[i]}</span> : (
              <input
                ref={(el) => { if (inputRefs) inputRefs.current[i] = el; }}
                className={`box-input${wrong.includes(i) ? ' box-wrong' : ''}`}
                value={values[i] || ''} disabled={!active} inputMode="decimal" autoComplete="off"
                aria-label={`Isian ${i + 1}`} placeholder="?"
                onChange={(e) => onChange(i, e.target.value)} />
            )
          )}
        </span>
      ))}
    </span>
  );
}

/** Scaffolded input: every box visible, only one active; the next opens after the current one is right. */
export function StepsItem({ item, caseInfo, n, settings, onDone, live }) {
  const s = useItemState(item, caseInfo, settings, live);
  const [cur, setCur] = useState(0);
  const [vals, setVals] = useState(() => item.boxes.map(() => []));
  const [wrong, setWrong] = useState([]);
  const [boxWrongs, setBoxWrongs] = useState(0);
  const [msg, setMsg] = useState(null);
  const inputRefs = useRef([]);
  const solved = cur >= item.boxes.length;
  const box = item.boxes[cur];
  if (live) Object.assign(live.current, { box: Math.min(cur, item.boxes.length - 1), work: (vals[cur] || []).filter(Boolean).join(', ') });

  function setVal(bi, i, v) {
    setVals((all) => all.map((row, k) => (k === bi ? Object.assign([...row], { [i]: v }) : row)));
    setWrong((w) => w.filter((x) => x !== i));
  }

  function check(given) {
    const r = checkBox(box, box.free ? given[0] : given);
    // Free explanations are stored verbatim for the researcher (student code only, no names).
    s.attempt(r.ok, box.free ? { box: cur, explanation: String(given[0] || '').slice(0, 500) } : { box: cur });
    if (r.ok) {
      if (box.choices) setVals((all) => all.map((row, k) => (k === cur ? [box.choices[given]] : row)));
      setCur(cur + 1); setWrong([]); setBoxWrongs(0); setMsg(null);
      setTimeout(() => inputRefs.current[0]?.focus?.(), 0);
    } else {
      setWrong(r.wrong); setBoxWrongs(boxWrongs + 1);
      setMsg(box.free ? 'Tulis alasanmu minimal 3 kata.' : s.hint.wrongStreak + 1 >= 2 && s.cluesOn ? 'Belum tepat. Amplop petunjuk siap dibuka.' : 'Belum tepat. Cek tanda dan hitunganmu.');
    }
  }

  const filled = box && !box.choices && (box.free
    ? String(vals[cur][0] || '').trim().length > 0
    : (vals[cur] || []).filter((v) => String(v || '').trim()).length === (box.text.match(/□/g) || []).length);
  const flipSign = () => {
    const i = Math.max(0, inputRefs.current.findIndex((el) => el === document.activeElement));
    const v = String(vals[cur][i] || '');
    setVal(cur, i, v.startsWith('-') || v.startsWith('−') ? v.slice(1) : `-${v}`);
  };

  return (
    <div className="case-item">
      <Evidence item={item} n={n} />
      <ol className="boxes">
        {item.boxes.map((b, bi) => {
          const state = bi < cur ? 'done' : bi === cur ? 'active' : 'later';
          return (
            <li key={bi} className={`box box-${state}`}>
              <span className="box-no">{bi < cur ? '✓' : bi + 1}</span>
              <div className="box-body">
                {b.free ? (
                  <>
                    <span className="box-text">{b.text}</span>
                    {state === 'done'
                      ? <span className="box-free-done">{vals[bi][0]}</span>
                      : <textarea className="box-free" rows={3} disabled={state !== 'active'} value={vals[bi][0] || ''}
                          placeholder="Tulis alasanmu…" onChange={(e) => setVal(bi, 0, e.target.value)} />}
                  </>
                ) : b.choices && state !== 'done' ? (
                  <>
                    <span className="box-text">{b.text}</span>
                    <div className="box-choices">
                      {b.choices.map((c, ci) => (
                        <button key={c} type="button" className="mini-btn" disabled={state !== 'active'} onClick={() => check(ci)}>{c}</button>
                      ))}
                    </div>
                  </>
                ) : b.choices ? (
                  <span className="box-text">{b.text} <span className="box-val">{vals[bi][0]}</span></span>
                ) : (
                  <BoxText text={b.text} values={vals[bi]} active={state === 'active'} done={state === 'done'}
                    wrong={state === 'active' ? wrong : []} inputRefs={state === 'active' ? inputRefs : null}
                    onChange={(i, v) => setVal(bi, i, v)} />
                )}
                {state === 'active' && !b.choices && !s.cluesOn && boxWrongs >= 3 && (
                  <p className="muted">Jawaban kotak ini: {[].concat(b.answer).join(' dan ')}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {solved ? <Solved item={item} onNext={() => onDone(s.result())} /> : (
        <>
          {msg && <p className="feedback feedback-warn">{msg}</p>}
          <footer className="action-bar">
            {s.envBtn || <span />}
            {!box.choices && (
              <span className="row-tight">
                {!box.free && <button type="button" className="btn btn-ghost sign-btn" onMouseDown={(e) => e.preventDefault()} onClick={flipSign} aria-label="Ganti tanda plus/minus">±</button>}
                <button type="button" className="btn btn-primary" disabled={!filled} onClick={() => check(vals[cur])}>Periksa</button>
              </span>
            )}
          </footer>
        </>
      )}
      {!solved && s.sheet}
    </div>
  );
}
