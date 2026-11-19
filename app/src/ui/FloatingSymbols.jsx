import { CatFace } from './Cats.jsx';

// Cute doodles drifting slowly behind MENU screens (login, map, briefing, summary, results).
// Problem-solving screens only get a faint STATIC pattern (.solve-bg, v1.8) — never motion (EL03).
// Motion is off for "reduce motion" and old WebViews (.lite); everything hides with Menu peneliti → Animasi.

const SYMBOLS = [
  { s: 'x', left: '6%', top: '10%', size: 34, dur: 9, delay: 0, color: 'var(--var)' },
  { s: '+', left: '86%', top: '7%', size: 30, dur: 11, delay: 1.5, color: 'var(--primary)' },
  { s: '=', left: '91%', top: '44%', size: 28, dur: 10, delay: 3, color: 'var(--op)' },
  { s: '÷', left: '4%', top: '55%', size: 30, dur: 12, delay: 2, color: 'var(--const)' },
  { s: '−', left: '80%', top: '78%', size: 34, dur: 9.5, delay: 4, color: 'var(--primary)' },
  { s: '½', left: '12%', top: '88%', size: 26, dur: 13, delay: 1, color: 'var(--op)' },
  { s: '×', left: '48%', top: '3%', size: 24, dur: 10.5, delay: 5, color: 'var(--const)' },
  { s: '★', left: '30%', top: '18%', size: 18, dur: 8, delay: 2.5, color: 'var(--sun)' },
  { s: '★', left: '70%', top: '30%', size: 14, dur: 9, delay: 0.5, color: 'var(--sun)' },
  { s: '♥', left: '20%', top: '40%', size: 18, dur: 10, delay: 3.5, color: 'var(--primary)' },
  { s: '✦', left: '62%', top: '62%', size: 16, dur: 7.5, delay: 1.2, color: 'var(--op)' },
  { s: '♥', left: '92%', top: '92%', size: 16, dur: 11.5, delay: 4.5, color: 'var(--primary)' },
  { s: '✦', left: '40%', top: '94%', size: 14, dur: 8.5, delay: 2.2, color: 'var(--var)' },
];

/** Small detective doodles (inline SVG, colours from tokens). */
export function Doodle({ kind, size = 30 }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', 'aria-hidden': true };
  switch (kind) {
    case 'glass':
      return (
        <svg {...common}><circle cx="13" cy="13" r="8.5" fill="#DDF3FF" fillOpacity=".6" stroke="var(--var)" strokeWidth="2.8" />
          <path d="M19.5 19.5 L28 28" stroke="var(--sun)" strokeWidth="4" strokeLinecap="round" />
          <path d="M9 10 Q10.5 7.5 13.5 7.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
      );
    case 'print':
      return (
        <svg {...common} fill="none" stroke="var(--op)" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 11a8 8 0 0 1 14 0" /><path d="M7 16c0-5 4-9 9-9s9 4 9 9" /><path d="M10.5 23c-1.3-2-2-4-2-6.5a7.5 7.5 0 0 1 15 0v1" />
          <path d="M13 26c-1.5-2.3-2.3-5-2.3-8.3a5.3 5.3 0 0 1 10.6 0c0 2.4.3 4.5 1 6.5" /><path d="M16 17.7c0 3.8.8 6.8 2.6 9" /></svg>
      );
    case 'paw':
      return (
        <svg {...common} fill="var(--primary)">
          <ellipse cx="16" cy="21" rx="6.5" ry="5.5" /><circle cx="8" cy="13" r="3" /><circle cx="13" cy="8.5" r="3" />
          <circle cx="19" cy="8.5" r="3" /><circle cx="24" cy="13" r="3" /></svg>
      );
    case 'note':
      return (
        <svg {...common}><rect x="4" y="8" width="24" height="17" rx="2.5" fill="#fff" stroke="var(--sun)" strokeWidth="2" />
          <path d="M4 10 L16 18 L28 10" fill="none" stroke="var(--sun)" strokeWidth="2" /><circle cx="16" cy="17" r="3" fill="var(--warn)" /></svg>
      );
    case 'hat':
      return (
        <svg {...common}><path d="M5 20 Q16 2 27 20 Z" fill="#8C6A3F" /><path d="M3 20.5 L29 20.5 Q29 24 16 24 Q3 24 3 20.5 Z" fill="#6E5230" />
          <circle cx="16" cy="9" r="1.8" fill="#6E5230" /></svg>
      );
    default: // question mark
      return <svg {...common}><text x="16" y="25" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--sun)" fontFamily="Fredoka, sans-serif">?</text></svg>;
  }
}

const DETECTIVE = [
  { k: 'glass', left: '6%', top: '9%', size: 34, dur: 9, delay: 0 },
  { k: 'q', left: '86%', top: '6%', size: 30, dur: 8, delay: 1.5 },
  { k: 'print', left: '90%', top: '40%', size: 32, dur: 11, delay: 3 },
  { k: 'note', left: '4%', top: '52%', size: 30, dur: 10, delay: 2 },
  { k: 'hat', left: '78%', top: '76%', size: 34, dur: 9.5, delay: 4 },
  { k: 'q', left: '14%', top: '86%', size: 24, dur: 12, delay: 1 },
  { k: 'glass', left: '50%', top: '3%', size: 24, dur: 10.5, delay: 5 },
  { k: 'paw', left: '30%', top: '20%', size: 18, dur: 8, delay: 2.5 },
  { k: 'paw', left: '68%', top: '28%', size: 16, dur: 9, delay: 0.5 },
  { k: 'print', left: '22%', top: '38%', size: 22, dur: 10, delay: 3.5 },
  { k: 'q', left: '60%', top: '60%', size: 20, dur: 7.5, delay: 1.2 },
  { k: 'paw', left: '93%', top: '92%', size: 16, dur: 11.5, delay: 4.5 },
  { k: 'note', left: '40%', top: '93%', size: 20, dur: 8.5, delay: 2.2 },
];

const CHARS = [
  { coat: 'orange', left: '74%', top: '16%', size: 36, dur: 10, delay: 1 },
  { coat: 'gray', left: '8%', top: '72%', size: 32, dur: 12, delay: 2 },
  { coat: 'white', left: '88%', top: '60%', size: 30, dur: 9, delay: 0 },
  { coat: 'orange', left: '22%', top: '62%', size: 24, dur: 11, delay: 3 },
  { coat: 'gray', left: '56%', top: '84%', size: 26, dur: 10.5, delay: 1.5 },
];

const isDetective = () => typeof document !== 'undefined' && document.documentElement.dataset.skin === 'detective';

export default function FloatingSymbols() {
  const det = isDetective();
  return (
    <div className={`floaty${det ? ' floaty-det' : ''}`} aria-hidden>
      {det
        ? DETECTIVE.map((d, i) => (
          <span key={`d${i}`} className={`doodle doodle-${d.k}`} style={{ left: d.left, top: d.top, animationDuration: `${d.dur}s`, animationDelay: `-${d.delay}s` }}>
            <Doodle kind={d.k} size={d.size} />
          </span>
        ))
        : SYMBOLS.map((d, i) => (
          <span key={`s${i}`} style={{ left: d.left, top: d.top, fontSize: d.size, color: d.color, animationDuration: `${d.dur}s`, animationDelay: `-${d.delay}s` }}>{d.s}</span>
        ))}
      {CHARS.map((d, i) => (
        <span key={`c${i}`} className="doodle" style={{ left: d.left, top: d.top, animationDuration: `${d.dur}s`, animationDelay: `-${d.delay}s` }}>
          <CatFace coat={d.coat} size={d.size} detective={det} />
        </span>
      ))}
    </div>
  );
}
