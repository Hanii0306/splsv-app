import { useMemo, useRef, useState } from 'react';
import { Fr, allTokens, checkCards, checkLet, checkTags, parse, seededShuffle, solve, tokenizeChunk } from '../engine/index.js';
import { logEvent } from '../telemetry/log.js';
import Choice from '../ui/Choice.jsx';
import { pretty } from '../ui/EquationLine.jsx';
import Solver from './Solver.jsx';

const GLOSSARY = [
  ['jumlah, total, ditambah, lebih … dari, naik', '+'],
  ['selisih, kurang, sisa, kembalian, turun', '−'],
  ['kali lipat, setiap (diulang)', '×'],
  ['dibagi rata, per', '÷'],
  ['adalah, menjadi, sama dengan', '='],
  ['berurutan', 'x, x + 1, x + 2'],
];

/** Word problem in 4 stages → solve → interpret (prd.md F5, design.md §5). */
export default function StoryTask({ story, levelId, itemId, settings, onDone }) {
  const [stage, setStage] = useState('read');
  const [shown, setShown] = useState(1);
  const [tapped, setTapped] = useState(new Set());
  const [revealKeys, setRevealKeys] = useState(false);
  const [letAnswer, setLetAnswer] = useState(null);
  const [slot, setSlot] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [glossary, setGlossary] = useState(false);
  const [interpret, setInterpret] = useState(null);
  const tries = useRef({ tag: 0, cards: 0, let: 0 });
  const solveStats = useRef(null);
  const tokens = useMemo(() => allTokens(story), [story]);
  const bank = useMemo(() => seededShuffle(story.cards.map((c, i) => ({ c, i })), story.id), [story]);
  const keyTokens = tokens.filter((t) => t.key && tapped.has(t.id));
  const solution = useMemo(() => solve(parse(story.equation)), [story]);

  const InfoCards = () =>
    keyTokens.length > 0 && stage !== 'read' && stage !== 'tag' ? (
      <div className="info-cards" aria-label="Informasi penting">
        {keyTokens.map((t) => <span key={t.id} className={`info-card role-${t.role}`}>{t.text}</span>)}
      </div>
    ) : null;

  function checkTagStage() {
    const r = checkTags(story, [...tapped]);
    const ok = r.missing.length === 0 && r.extra.length === 0;
    logEvent('story_tag', { ok, missing: r.missing.length, extra: r.extra.length, levelId }, itemId);
    if (ok) { setFeedback(null); setStage('let'); return; }
    tries.current.tag += 1;
    if (tries.current.tag >= 2) {
      setRevealKeys(true);
      setTapped(new Set(tokens.filter((t) => t.key).map((t) => t.id)));
      setFeedback({ tone: 'warn', text: 'Ini kata-kata pentingnya (ditandai). Perhatikan, lalu lanjut.' });
      return;
    }
    setFeedback({ tone: 'warn', text: r.missing.length ? `Masih ada ${r.missing.length} informasi penting yang belum ditandai.` : 'Ada kata yang sebenarnya tidak penting. Ketuk lagi untuk membatalkan.' });
  }

  function onLet(i) {
    const ok = checkLet(story, i);
    logEvent('story_let', { ok, choice: i, levelId }, itemId);
    if (ok) { setLetAnswer(i); setFeedback(null); }
    else { tries.current.let += 1; setFeedback({ tone: 'warn', text: 'Yang dimisalkan x adalah hal yang DITANYAKAN dan belum diketahui.' }); }
  }

  function checkCardStage() {
    const r = checkCards(story, slot.map((s) => s.c));
    logEvent('story_cards', { ok: r.ok, text: r.text, levelId }, itemId);
    if (r.ok) { setFeedback({ tone: 'ok', text: `Persamaanmu: ${pretty(r.text)}` }); setStage('solve'); return; }
    tries.current.cards += 1;
    const tip = tries.current.cards >= 2
      ? `Petunjuk: mulai dengan "${story.cards[0]}", lalu terjemahkan setiap kata kunci menjadi operasi.`
      : 'Persamaan belum sesuai cerita. Cek lagi kata kuncinya di kartu informasi.';
    setFeedback({ tone: 'warn', text: tip });
  }

  function onInterpret(i) {
    const ok = i === story.reasonableness.correct;
    setInterpret({ i, ok });
    logEvent('item_complete', { kind: 'interpret', ok, levelId }, itemId);
  }

  const done = () => {
    const s = solveStats.current || { wrongs: 0, maxHint: 0, ms: 0 };
    onDone({ ...s, wrongs: s.wrongs + tries.current.tag + tries.current.cards + tries.current.let, mode: 'practice' });
  };

  return (
    <div className="story">
      <div className="story-stages" aria-hidden>
        {['Baca', 'Tandai', 'Misalkan', 'Susun', 'Selesaikan', 'Tafsirkan'].map((s, i) => {
          const order = ['read', 'tag', 'let', 'cards', 'solve', 'interpret'];
          return <span key={s} className={order.indexOf(stage) >= i ? 'stage-on' : ''}>{s}</span>;
        })}
      </div>

      <InfoCards />

      {(stage === 'read' || stage === 'tag') && (
        <div className="story-text">
          {story.chunks.slice(0, stage === 'read' ? shown : story.chunks.length).map((chunk, ci) => (
            <p key={ci} className="story-chunk">
              {tokenizeChunk(chunk, ci).map((t) =>
                stage === 'tag' && !/^\s+$/.test(t.text) ? (
                  <button key={t.id} type="button"
                    className={`word${tapped.has(t.id) ? ' word-on' : ''}${revealKeys && t.key ? ' word-key' : ''}`}
                    onClick={() => setTapped((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}>
                    {t.text}
                  </button>
                ) : <span key={t.id}>{t.text}</span>,
              )}
            </p>
          ))}
        </div>
      )}

      {stage === 'read' && (
        <footer className="action-bar">
          <button type="button" className="btn btn-ghost" onClick={() => setShown(story.chunks.length)}>Tampilkan semua</button>
          <button type="button" className="btn btn-primary" onClick={() => (shown < story.chunks.length ? setShown(shown + 1) : setStage('tag'))}>
            {shown < story.chunks.length ? 'Kalimat berikutnya →' : 'Lanjut →'}
          </button>
        </footer>
      )}

      {stage === 'tag' && (
        <>
          <p className="instruction">Ketuk bilangan dan kata kunci yang penting.</p>
          {glossary && (
            <ul className="glossary">
              {GLOSSARY.map(([w, op]) => <li key={w}><strong>{op}</strong> ← {w}</li>)}
            </ul>
          )}
          <footer className="action-bar">
            <button type="button" className="btn btn-ghost" onClick={() => setGlossary(!glossary)}>📖 Kamus kata kunci</button>
            <button type="button" className="btn btn-primary" onClick={revealKeys ? () => { setFeedback(null); setStage('let'); } : checkTagStage}>
              {revealKeys ? 'Lanjut →' : 'Cek'}
            </button>
          </footer>
        </>
      )}

      {stage === 'let' && (
        <>
          <p className="instruction">{story.let.question}</p>
          <Choice options={story.let.options} onPick={onLet} disabled={letAnswer != null} state={letAnswer != null ? { [letAnswer]: 'right' } : {}} />
          {letAnswer != null && (
            <>
              <ul className="let-list">{story.let.expressions.map((e) => <li key={e}>{pretty(e)}</li>)}</ul>
              <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={() => setStage('cards')}>Lanjut →</button></footer>
            </>
          )}
        </>
      )}

      {stage === 'cards' && (
        <>
          <p className="instruction">Susun kartu menjadi persamaan yang sesuai cerita.</p>
          <div className="card-slot" aria-label="Persamaanmu">
            {slot.length === 0 && <span className="muted">Ketuk kartu di bawah…</span>}
            {slot.map((s, k) => (
              <button key={k} type="button" className="eq-card eq-card-placed" onClick={() => setSlot(slot.filter((_, j) => j !== k))}>{pretty(s.c)}</button>
            ))}
          </div>
          <div className="card-bank">
            {bank.map((b) => {
              const used = slot.some((s) => s.i === b.i);
              return <button key={b.i} type="button" className="eq-card" disabled={used} onClick={() => setSlot([...slot, b])}>{pretty(b.c)}</button>;
            })}
          </div>
          <footer className="action-bar">
            <button type="button" className="btn btn-ghost" onClick={() => setSlot([])}>Ulangi</button>
            <button type="button" className="btn btn-primary" onClick={checkCardStage} disabled={slot.length < 3}>Cek</button>
          </footer>
        </>
      )}

      {stage === 'solve' && (
        <Solver
          equation={story.equation}
          mode="practice"
          itemId={itemId}
          levelId={levelId}
          scaleMode="compact"
          settings={settings}
          showPindahRuas={false}
          onDone={(s) => { solveStats.current = s; setFeedback(null); setStage('interpret'); }}
        />
      )}

      {stage === 'interpret' && (
        <>
          <div className="answer-box">
            Jawaban: <strong>{pretty(typeof solution === 'object' ? Fr.fracToString(solution) : '?')} {story.answerUnit}</strong>
          </div>
          <p className="instruction">{story.reasonableness.question}</p>
          <Choice options={story.reasonableness.options} onPick={onInterpret} disabled={!!interpret}
            state={interpret ? { [interpret.i]: interpret.ok ? 'right' : 'wrong', [story.reasonableness.correct]: 'right' } : {}} />
          {interpret && (
            <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={done}>Selesai ✓</button></footer>
          )}
        </>
      )}

      {feedback && stage !== 'solve' && <p className={`feedback feedback-${feedback.tone}`} role="status">{pretty(feedback.text)}</p>}
    </div>
  );
}
