// Three cute cats walking across the bottom of MENU screens (never on problem-solving screens).
// Legs swing, tails wag, bodies bob; each cat has its own pace. Static on "reduce motion" / old WebView.
import { WalkingCat } from './Cats.jsx';

const CATS = [
  { coat: 'orange', sign: 'x = ?', width: 76, dur: 17, delay: 0, bottom: 2 },
  { coat: 'gray', sign: null, width: 64, dur: 22, delay: 7, bottom: 2 },
  { coat: 'white', sign: null, width: 58, dur: 19, delay: 12, bottom: 2 },
];

export default function Walkers() {
  return (
    <div className="walkers" aria-hidden>
      {CATS.map((cat, i) => (
        <span key={cat.coat} className="walker" style={{ animationDuration: `${cat.dur}s`, animationDelay: `-${cat.delay}s`, bottom: cat.bottom, left: `${8 + i * 32}%` }}>
          <span className="walker-body"><WalkingCat coat={cat.coat} sign={cat.sign} width={cat.width} /></span>
        </span>
      ))}
    </div>
  );
}
