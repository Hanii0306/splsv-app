// Short "correct!" burst around the equation (feedback for a right step, ~0.7 s, then gone).
const BITS = [
  { s: '★', x: -120, y: -26, c: 'var(--sun)' },
  { s: '✦', x: 120, y: -30, c: 'var(--primary)' },
  { s: '★', x: -96, y: 30, c: 'var(--primary)' },
  { s: '✦', x: 104, y: 28, c: 'var(--sun)' },
  { s: '♥', x: 0, y: -44, c: 'var(--primary)' },
  { s: '✦', x: -40, y: 40, c: 'var(--op)' },
];

export default function Sparkles() {
  return (
    <span className="sparkles" aria-hidden>
      {BITS.map((b, i) => (
        <span key={i} style={{ '--sx': `${b.x}px`, '--sy': `${b.y}px`, color: b.c, animationDelay: `${i * 0.03}s` }}>{b.s}</span>
      ))}
    </span>
  );
}
