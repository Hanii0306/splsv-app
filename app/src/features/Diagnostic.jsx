import { useState } from 'react';
import diagnostic from '../content/diagnostic.json';
import { SKILL_LABEL, scoreDiagnostic } from '../engine/index.js';
import { saveProfile } from '../storage/db.js';
import { logEvent } from '../telemetry/log.js';
import Choice from '../ui/Choice.jsx';
import Header from '../ui/Header.jsx';

const STATUS = { lemah: 'perlu diperkuat', cukup: 'cukup', kuat: 'kuat' };

/** Prerequisite check (prd.md F4, IL03). No right/wrong feedback during the check. */
export default function Diagnostic({ profile, onDone }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const items = diagnostic.items;

  async function pick(choice) {
    const it = items[i];
    const a = { skill: it.skill, correct: choice === it.correct };
    logEvent('diagnostic_answer', { ...a, choice }, it.id);
    const next = [...answers, a];
    setAnswers(next);
    if (i + 1 < items.length) { setI(i + 1); return; }
    const prereq = scoreDiagnostic(next);
    const p = { ...profile, prereq, reinforced: [] };
    await saveProfile(p);
    setResult({ prereq, profile: p });
  }

  return (
    <div className="screen cute-bg">
      <Header title="Cek kesiapan" right={<span className="header-meta">{result ? '' : `${i + 1}/${items.length}`}</span>} />
      <main className="content">
        {!result ? (
          <>
            <p className="muted">Sebelum mulai, jawab beberapa soal singkat. Kerjakan sebisanya.</p>
            <div className="diag-prompt">{items[i].prompt}</div>
            <Choice key={i} options={items[i].options} onPick={pick} />
          </>
        ) : (
          <div className="summary-card">
            <h2>Hasil cek kesiapan</h2>
            <ul className="skill-list">
              {Object.entries(result.prereq).map(([k, v]) => (
                <li key={k}><span>{SKILL_LABEL[k]}</span><span className={`skill-${v}`}>{STATUS[v]}</span></li>
              ))}
            </ul>
            <p>Bagian yang perlu diperkuat akan muncul sebagai latihan singkat sebelum level terkait.</p>
            <footer className="action-bar"><span /><button type="button" className="btn btn-primary" onClick={() => onDone(result.profile)}>Mulai belajar →</button></footer>
          </div>
        )}
      </main>
    </div>
  );
}
