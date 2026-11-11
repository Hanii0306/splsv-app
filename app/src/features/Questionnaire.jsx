import { useState } from 'react';
import clq from '../content/clq.json';
import { logEvent } from '../telemetry/log.js';

function Scale({ min, max, value, onChange, minLabel, maxLabel }) {
  const vals = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="likert">
      <div className="likert-row">
        {vals.map((v) => (
          <button key={v} type="button" className={`likert-btn${value === v ? ' on' : ''}`} onClick={() => onChange(v)} aria-pressed={value === v}>{v}</button>
        ))}
      </div>
      <div className="likert-labels"><span>{minLabel}</span><span>{maxLabel}</span></div>
    </div>
  );
}

/** Cognitive-load questionnaire (research mode only; items still need validation — clq.json note). */
export default function Questionnaire({ levelId, onDone }) {
  const [answers, setAnswers] = useState({});
  const all = [...clq.items, clq.paas];
  const complete = all.every((it) => answers[it.id] != null);

  return (
    <div className="questionnaire">
      <h2>Bagaimana rasanya tadi?</h2>
      <p className="muted">Tidak ada jawaban benar atau salah.</p>
      {clq.items.map((it) => (
        <div key={it.id} className="q-item">
          <p>{it.text}</p>
          <Scale {...clq.scale} value={answers[it.id]} onChange={(v) => setAnswers({ ...answers, [it.id]: v })} />
        </div>
      ))}
      <div className="q-item">
        <p>{clq.paas.text}</p>
        <Scale {...clq.paas} value={answers.PAAS} onChange={(v) => setAnswers({ ...answers, PAAS: v })} />
      </div>
      <footer className="action-bar">
        <button type="button" className="btn btn-ghost" onClick={onDone}>Lewati</button>
        <button type="button" className="btn btn-primary" disabled={!complete} onClick={() => { logEvent('cl_questionnaire', { levelId, answers }); onDone(); }}>Kirim</button>
      </footer>
    </div>
  );
}
