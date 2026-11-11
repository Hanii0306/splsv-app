import { useMemo } from 'react';

const SYMBOLS = ['x', '=', '+', '−', '×', '÷', '½', '★'];
const COLORS = ['var(--var)', 'var(--const)', 'var(--op)', 'var(--ok)', 'var(--sun)'];

/** Short burst of math symbols, shown ONLY after a level/quiz is finished (never while solving). */
export default function Celebrate({ count = 22 }) {
  const bits = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      s: SYMBOLS[i % SYMBOLS.length],
      left: `${(i * 37) % 100}%`,
      delay: `${((i * 53) % 60) / 100}s`,
      color: COLORS[i % COLORS.length],
    })),
    [count],
  );
  return (
    <div className="celebrate" aria-hidden>
      {bits.map((b, i) => <span key={i} style={{ left: b.left, animationDelay: b.delay, color: b.color }}>{b.s}</span>)}
    </div>
  );
}
