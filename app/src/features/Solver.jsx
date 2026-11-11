import { useMemo, useRef, useState } from 'react';
import {
  Fr, apply, bestOp, chipOps, classifyOp, classifyResult, defaultWhy, escalate, evalLinear,
  feedbackFor, formatLinear, hintFor, initialHintState, isInequality, isSolved, MAX_HINT, onAttempt, opExplanation,
  opLabel, parse, resultChoices, sameOp, satisfies, seededShuffle, solve, solveInequality, toText,
} from '../engine/index.js';
import { logEvent } from '../telemetry/log.js';
import Choice from '../ui/Choice.jsx';
import EquationLine, { OpLine, pretty } from '../ui/EquationLine.jsx';
import HintPanel from '../ui/HintPanel.jsx';
import Celebrate from '../ui/Celebrate.jsx';
import ScaleView from '../ui/ScaleView.jsx';
import Sparkles from '../ui/Sparkles.jsx';

const fs = Fr.fracToString;

/** Index of the step where the "Mengapa?" prompt is asked: the first ÷/× step, else step 0. */
function whyStepIndex(eq) {
  let e = eq;
  for (let i = 0; i < 8; i++) {
    const op = bestOp(e);
    if (!op) break;
    if (op.kind === 'div' || op.kind === 'mul') return i;
    e = apply(e, op).after;
  }
  return 0;
}

/** Explain "pindah ruas ganti tanda" as what it really is (IL01, design.md §4). */
function pindahRuasNote(op) {
  if ((op.kind === 'add' || op.kind === 'sub') && Fr.isZero(op.term.a)) {
    const t = formatLinear(op.term);
    const [was, now] = op.kind === 'sub' ? [`+${t}`, `−${t}`] : [`−${t}`, `+${t}`];
    return `Inilah "pindah ruas": ${was} hilang dari ruas x dan muncul sebagai ${now} di ruas seberang, karena kedua ruas di${op.kind === 'sub' ? 'kurangi' : 'tambah'} ${t}.`;
  }
  if (op.kind === 'div') {
    return `Bilangan ${pretty(fs(op.k))} yang mengalikan x "pindah" menjadi pembagi di ruas seberang, karena kedua ruas dibagi ${pretty(fs(op.k))}.`;
  }
  return null;
}

/**
 * @param {{
 *  equation: string, mode: 'worked'|'completion'|'practice', itemId: string, levelId: string,
 *  why?: boolean|object, scaleMode?: string, settings: object, showPindahRuas?: boolean,
 *  onDone: (r: {wrongs:number, maxHint:number, ms:number, mode:string}) => void
 * }} props
 */
export default function Solver({ equation, mode, itemId, levelId, why, scaleMode = 'full', settings, showPindahRuas = true, onDone }) {
  const original = useMemo(() => parse(equation), [equation]);
  const ineq = isInequality(original);
  const solution = useMemo(() => solve(original), [original]); // for inequalities: the boundary value
  const whyAt = useMemo(() => (why ? whyStepIndex(original) : -1), [original, why]);

  const phaseFor = (e, idx) => {
    if (isSolved(e)) return 'verify';
    if (mode === 'worked' || (mode === 'completion' && idx === 0)) return 'worked';
    return 'op';
  };

  const [eq, setEq] = useState(original);
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState(() => phaseFor(original, 0));
  const [reveal, setReveal] = useState(0);
  const [pending, setPending] = useState(null);
  const [history, setHistory] = useState([]);
  const [hint, setHint] = useState(initialHintState);
  const [hintView, setHintView] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [flashKey, setFlashKey] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [marks, setMarks] = useState({});
  const [whyState, setWhyState] = useState(null);
  const [verifyOk, setVerifyOk] = useState(false);
  const [fx, setFx] = useState({ kind: null, key: 0 }); // short answer animations
  const stats = useRef({ wrongs: 0, maxHint: 0, t0: Date.now(), stepT0: Date.now(), offeredLogged: false });

  const chips = useMemo(() => (phase === 'op' ? chipOps(eq) : []), [eq, phase]);
  const choices = useMemo(() => (phase === 'result' && pending ? resultChoices(eq, pending) : []), [eq, phase, pending]);
  const workedOp = useMemo(() => (phase === 'worked' ? bestOp(eq) : null), [eq, phase]);

  const elapsed = () => {
    const now = Date.now();
    const ms = now - stats.current.stepT0;
    stats.current.stepT0 = now;
    return ms;
  };

  function registerWrong() {
    stats.current.wrongs += 1;
    setHint((h) => {
      const next = onAttempt(h, false);
      if (next.offered && !h.offered) logEvent('hint_offered', { levelId, wrongStreak: next.wrongStreak }, itemId);
      return next;
    });
  }

  function goNext(after, idx, op) {
    const nextPhase = phaseFor(after, idx);
    if (op && idx - 1 === whyAt && mode !== 'worked' && !whyState) {
      const prompt = typeof why === 'object' ? why : defaultWhy(op, eq.rel);
      const order = seededShuffle(prompt.options.map((_, i) => i), itemId);
      setWhyState({ prompt, order, answered: null, then: nextPhase });
      setPhase('why');
      return;
    }
    setPhase(nextPhase);
  }

  function commit(op) {
    const step = apply(eq, op);
    setTilt(0); // a correct step always leaves the scale balanced (and smiling)
    setFlashKey((k) => k + 1);
    setHistory((h) => [...h, { text: toText(eq), label: opLabel(op) }]);
    setEq(step.after);
    setPending(null);
    setMarks({});
    setReveal(0);
    setHint(initialHintState());
    setHintView(null);
    const idx = stepIdx + 1;
    setStepIdx(idx);
    const note = showPindahRuas ? pindahRuasNote(op) : null;
    setFeedback(mode === 'worked' ? null : { tone: 'ok', text: feedbackFor('valid_progress') + (note ? ` ${note}` : '') });
    if (mode !== 'worked') setFx((f) => ({ kind: 'ok', key: f.key + 1 }));
    goNext(step.after, idx, op);
  }

  // ------------------------------------------------------------ handlers
  function onChip(op, i) {
    const ms = elapsed();
    const r = classifyOp(eq, op);
    logEvent('step', { phase: 'op', result: r.result, detail: r.detail, op: opLabel(op), ms, levelId, step: stepIdx }, itemId);
    if (r.result === 'valid_progress') {
      setPending(op);
      setFlashKey((k) => k + 1);
      setFeedback(null);
      setMarks({});
      setHintView(null);
      setPhase('result');
    } else {
      setFeedback({ tone: 'warn', text: feedbackFor(r.result, r.detail) });
      setMarks((m) => ({ ...m, [i]: 'wrong' }));
      setFx((f) => ({ kind: 'bad', key: f.key + 1 }));
      registerWrong();
    }
  }

  function onResult(i) {
    const c = choices[i];
    const ms = elapsed();
    const r = classifyResult(c);
    logEvent('step', { phase: 'result', result: r.result, op: opLabel(pending), ms, levelId, step: stepIdx }, itemId);
    if (c.kind === 'correct') { commit(pending); return; }
    if (c.kind === 'invalid_one_side' && typeof solution === 'object') {
      const d = Fr.toNumber(Fr.sub(evalLinear(c.eq.left.lin, solution), evalLinear(c.eq.right.lin, solution)));
      setTilt(Math.sign(d));
      setTimeout(() => setTilt(0), 1400);
    }
    setFeedback({ tone: 'warn', text: feedbackFor(r.result, r.detail) });
    setMarks((m) => ({ ...m, [i]: 'wrong' }));
    setFx((f) => ({ kind: 'bad', key: f.key + 1 }));
    registerWrong();
  }

  function resultHint(level) {
    const step = apply(eq, pending);
    switch (level) {
      case 1: return { level, title: 'Pertanyaan pemantik', text: 'Hitung ruas kiri dan ruas kanan secara terpisah. Berapa hasil masing-masing?' };
      case 2: return pending.kind === 'simplify'
        ? { level, title: 'Petunjuk langkah', text: 'Kalikan bilangan di depan kurung ke SETIAP suku di dalam kurung, lalu kumpulkan suku sejenis.' }
        : { level, title: 'Petunjuk langkah', text: `Tuliskan dulu: ${step.intermediate}. Lalu sederhanakan setiap ruas.` };
      case 3: return hintFor(eq, 3);
      default: return { level, title: 'Ikuti langkah ini', text: 'Pilihan yang benar sudah ditandai. Perhatikan mengapa pilihan itu benar.' };
    }
  }

  function openHint() {
    const level = Math.min(MAX_HINT, hint.level + 1);
    setHint((h) => escalate(h));
    stats.current.maxHint = Math.max(stats.current.maxHint, level);
    logEvent('hint_opened', { level, levelId, phase }, itemId);
    setHintView(phase === 'result' ? resultHint(level) : hintFor(eq, level));
  }

  // ------------------------------------------------------------ verify (F7)
  const verify = useMemo(() => {
    if (phase !== 'verify' || typeof solution !== 'object') return null;
    if (ineq) {
      // PtLSV: pick a number that belongs to the solution set, then check it in the original.
      const s = solveInequality(original);
      const v = Fr.toNumber(s.value);
      const up = s.rel === '>' || s.rel === '≥';
      const good = String(up ? v + 2 : v - 2);
      const bad1 = String(up ? v - 1 : v + 1);
      const bad2 = String(up ? v - 3 : v + 3);
      const options = seededShuffle([good, bad1, bad2], itemId + 'v');
      const g = Fr.frac(Number(good));
      const L = Fr.fracToString(evalLinear(original.left.lin, g));
      const R = Fr.fracToString(evalLinear(original.right.lin, g));
      return { ineq: true, sv: `${s.rel} ${Fr.fracToString(s.value)}`, good, L, R, options, holds: satisfies(original, g) };
    }
    const sv = fs(solution);
    const subst = (t) => t.replace(/(\d|\))x/g, '$1·x').replace(/x/g, `(${sv})`);
    const L = fs(evalLinear(original.left.lin, solution));
    const R = fs(evalLinear(original.right.lin, solution));
    const wrong = [Fr.add(evalLinear(original.left.lin, solution), Fr.ONE), Fr.sub(evalLinear(original.left.lin, solution), Fr.frac(2))].map(fs);
    const options = seededShuffle([L, ...wrong], itemId + 'v');
    return { sv, leftSub: subst(original.left.text), rightSub: subst(original.right.text), L, R, options };
  }, [phase, solution, original, itemId]);

  function onVerify(i) {
    if (verify.ineq) {
      const okI = verify.options[i] === verify.good;
      logEvent('verify_substitution', { correct: okI, levelId, ineq: true }, itemId);
      if (okI) {
        setVerifyOk(true);
        setFx((f) => ({ kind: 'done', key: f.key + 1 }));
        setMarks({ [i]: 'right' });
        setFeedback({ tone: 'ok', text: `Cek x = ${pretty(verify.good)}: ${pretty(verify.L)} ${original.rel} ${pretty(verify.R)} ✓ benar.` });
      } else {
        setMarks((m) => ({ ...m, [i]: 'wrong' }));
        setFeedback({ tone: 'warn', text: `Bilangan itu tidak memenuhi x ${pretty(verify.sv)}. Coba yang lain.` });
      }
      return;
    }
    const ok = verify.options[i] === verify.L;
    logEvent('verify_substitution', { correct: ok, levelId }, itemId);
    if (ok) { setVerifyOk(true); setFx((f) => ({ kind: 'done', key: f.key + 1 })); setFeedback({ tone: 'ok', text: `Ruas kiri = ${pretty(verify.L)} dan ruas kanan = ${pretty(verify.R)}. Seimbang ✓` }); setMarks({ [i]: 'right' }); }
    else { setMarks((m) => ({ ...m, [i]: 'wrong' })); setFeedback({ tone: 'warn', text: 'Hitung lagi: ganti setiap x dengan nilainya, lalu kerjakan perkalian dulu.' }); }
  }

  function onWhy(pos) {
    const idx = whyState.order[pos];
    const ok = idx === whyState.prompt.correct;
    logEvent('why_answer', { correct: ok, levelId, choice: idx }, itemId);
    setWhyState((w) => ({ ...w, answered: { pos, ok } }));
    setFeedback(ok
      ? { tone: 'ok', text: 'Tepat! Alasan inilah yang membuat langkahnya sah.' }
      : { tone: 'warn', text: `Alasan yang tepat: ${whyState.prompt.options[whyState.prompt.correct]}` });
  }

  function finish() {
    onDone({ wrongs: stats.current.wrongs, maxHint: stats.current.maxHint, ms: Date.now() - stats.current.t0, mode });
  }

  // ------------------------------------------------------------ render
  const scaleEq = phase === 'worked' && reveal === 1 && workedOp ? apply(eq, workedOp).after : eq;
  const showHelp = phase === 'op' || phase === 'result';
  const h4Chip = hintView?.level === 4 && phase === 'op' ? chips.findIndex((c) => hintView.op && sameOp(c, hintView.op)) : -1;
  const h4Choice = hintView?.level === 4 && phase === 'result' ? choices.findIndex((c) => c.kind === 'correct') : -1;

  let instruction = '';
  if (phase === 'op') instruction = `Langkah ${stepIdx + 1}: apa yang kita lakukan pada kedua ruas?`;
  if (phase === 'result') instruction = 'Hasilnya menjadi apa?';
  if (phase === 'worked') instruction = mode === 'completion' ? 'Langkah pertama dicontohkan dulu.' : `Contoh, langkah ${stepIdx + 1}.`;
  if (phase === 'verify') instruction = verify?.ineq
    ? `x ${pretty(verify.sv)}. Pilih satu bilangan yang termasuk penyelesaian.`
    : `x = ${pretty(verify?.sv ?? '?')}. Cek dengan substitusi.`;
  if (phase === 'why') instruction = whyState?.prompt.question ?? '';

  return (
    <div className="solver">
      {!ineq && scaleMode !== 'none' && (
        <ScaleView equation={scaleEq} flashKey={flashKey} tilt={tilt} mode={scaleMode} light={settings.light3d} reducedMotion={settings.reducedMotion} />
      )}

      {history.length > 0 && (
        <div className="history" aria-label="Riwayat langkah">
          {history.map((h, i) => <span key={i} className="history-item">{pretty(h.text)}</span>)}
        </div>
      )}

      <div key={fx.key} className={`eq-wrap${fx.kind ? ` fx-${fx.kind}` : ''}`}>
        <EquationLine eq={eq} />
        {(fx.kind === 'ok' || fx.kind === 'done') && <Sparkles />}
      </div>
      {fx.kind === 'done' && <Celebrate count={14} />}
      {phase === 'result' && pending && <OpLine eq={eq} op={pending} termText={pending.term ? formatLinear(pending.term) : ''} />}
      {phase === 'worked' && workedOp && (
        <div className="worked">
          <div className="worked-op"><mark className="tk-opmark">{opLabel(workedOp)}</mark></div>
          <p className="muted">{opExplanation(workedOp)}</p>
          <OpLine eq={eq} op={workedOp} termText={workedOp.term ? formatLinear(workedOp.term) : ''} />
          {reveal === 1 && <EquationLine eq={apply(eq, workedOp).after} size="md" />}
        </div>
      )}

      <p className="instruction">{instruction}</p>

      {phase === 'op' && (
        <div className="chips">
          {chips.map((c, i) => (
            <button key={opLabel(c)} type="button" className={`chip${marks[i] === 'wrong' ? ' chip-wrong' : ''}${h4Chip === i ? ' chip-hint' : ''}`} disabled={marks[i] === 'wrong'} onClick={() => onChip(c, i)}>
              {opLabel(c)}
            </button>
          ))}
        </div>
      )}

      {phase === 'result' && (
        <Choice options={choices.map((c) => pretty(toText(c.eq)))} onPick={onResult} highlight={h4Choice} state={marks} />
      )}

      {phase === 'verify' && verify && verify.ineq && (
        <div className="verify">
          <Choice options={verify.options.map((o) => `x = ${pretty(o)}`)} onPick={onVerify} disabled={verifyOk} state={marks} />
        </div>
      )}
      {phase === 'verify' && verify && !verify.ineq && (
        <div className="verify">
          <div className="eq eq-md">{pretty(verify.leftSub)} = {pretty(verify.rightSub)}</div>
          <p className="muted">Berapa nilai ruas kiri?</p>
          <Choice options={verify.options.map(pretty)} onPick={onVerify} disabled={verifyOk} state={marks} />
        </div>
      )}

      {phase === 'why' && whyState && (
        <Choice
          options={whyState.order.map((i) => whyState.prompt.options[i])}
          onPick={onWhy}
          disabled={!!whyState.answered}
          state={whyState.answered ? { [whyState.answered.pos]: whyState.answered.ok ? 'right' : 'wrong' } : {}}
        />
      )}

      {feedback && <p className={`feedback feedback-${feedback.tone}`} role="status">{feedback.tone === 'ok' ? '✓ ' : '! '}{pretty(feedback.text)}</p>}

      <footer className="action-bar">
        {showHelp ? (
          <button type="button" className={`btn btn-ghost${hint.offered && !hintView ? ' btn-pulse' : ''}`} onClick={openHint} disabled={hint.level >= MAX_HINT && !!hintView}>
            💡 Bantuan
          </button>
        ) : <span />}
        {phase === 'worked' && (
          <button type="button" className="btn btn-primary" onClick={() => {
            if (reveal === 0) { setReveal(1); setFlashKey((k) => k + 1); } else commit(workedOp);
          }}>Lanjut →</button>
        )}
        {phase === 'why' && whyState?.answered && (
          <button type="button" className="btn btn-primary" onClick={() => { setFeedback(null); setPhase(whyState.then); }}>Lanjut →</button>
        )}
        {phase === 'verify' && (verifyOk || !verify) && (
          <button type="button" className="btn btn-primary" onClick={finish}>Selesai ✓</button>
        )}
      </footer>

      <HintPanel hint={hintView} canMore={hint.level < MAX_HINT} onMore={openHint} onClose={() => setHintView(null)} />
    </div>
  );
}
