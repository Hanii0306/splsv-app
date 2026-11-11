import { CatFace } from './Cats.jsx';

// Cute doodles drifting slowly behind MENU screens (login, map, summary, quiz result).
// Problem-solving screens stay clean (EL03); motion is off for "reduce motion" and old WebViews (.lite).

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

const CHARS = [
  { coat: 'orange', left: '74%', top: '16%', size: 36, dur: 10, delay: 1 },
  { coat: 'gray', left: '8%', top: '72%', size: 32, dur: 12, delay: 2 },
  { coat: 'white', left: '88%', top: '60%', size: 30, dur: 9, delay: 0 },
  { coat: 'orange', left: '22%', top: '62%', size: 24, dur: 11, delay: 3 },
  { coat: 'gray', left: '56%', top: '84%', size: 26, dur: 10.5, delay: 1.5 },
];

export default function FloatingSymbols() {
  return (
    <div className="floaty" aria-hidden>
      {SYMBOLS.map((d, i) => (
        <span key={`s${i}`} style={{ left: d.left, top: d.top, fontSize: d.size, color: d.color, animationDuration: `${d.dur}s`, animationDelay: `-${d.delay}s` }}>{d.s}</span>
      ))}
      {CHARS.map((d, i) => (
        <span key={`c${i}`} className="doodle" style={{ left: d.left, top: d.top, animationDuration: `${d.dur}s`, animationDelay: `-${d.delay}s` }}><CatFace coat={d.coat} size={d.size} /></span>
      ))}
    </div>
  );
}

