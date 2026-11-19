// Cute cats walking across the bottom of MENU screens (never on problem-solving screens).
// Detective theme (v1.8): deerstalker hats, swinging magnifying glasses, and a paw-print trail that
// appears step by step. Static on "reduce motion" / old WebView.
import { WalkingCat } from './Cats.jsx';
import { Doodle } from './FloatingSymbols.jsx';

const CATS = [
  { coat: 'orange', sign: 'x = ?', width: 96, dur: 17, delay: 0, hat: '#8C6A3F' },
  { coat: 'gray', sign: null, width: 90, dur: 22, delay: 7, hat: '#5B4A7A' },
  { coat: 'white', sign: null, width: 84, dur: 19, delay: 12, hat: '#3A5277' },
];

const isDetective = () => typeof document !== 'undefined' && document.documentElement.dataset.skin === 'detective';

export default function Walkers() {
  const det = isDetective();
  return (
    <div className={`walkers${det ? ' walkers-det' : ''}`} aria-hidden>
      {det && (
        <div className="paw-trail">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={`paw paw-${i % 2 ? 'up' : 'down'}`} style={{ left: `${4 + i * 11}%`, animationDelay: `${i * 0.45}s` }}>
              <Doodle kind="paw" size={14} />
            </span>
          ))}
        </div>
      )}
      {CATS.map((cat, i) => (
        <span key={cat.coat} className="walker" style={{ animationDuration: `${cat.dur}s`, animationDelay: `-${cat.delay}s`, bottom: 2, left: `${8 + i * 32}%` }}>
          <span className="walker-body"><WalkingCat coat={cat.coat} sign={cat.sign} width={cat.width} detective={det} hat={cat.hat} /></span>
        </span>
      ))}
    </div>
  );
}
