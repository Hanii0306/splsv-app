// Walking strip at the bottom of MENU screens (never on problem-solving screens).
// Detective theme (v1.9): Agent M walks across with a swinging magnifier, leaving shoe prints.
// Pink theme: the three cute cats. Static with Menu peneliti → Kurangi animasi.
import { WalkingCat } from './Cats.jsx';
import { AgentWalking } from './DetectiveScene.jsx';

const CATS = [
  { coat: 'orange', sign: 'x = ?', width: 76, dur: 17, delay: 0 },
  { coat: 'gray', sign: null, width: 64, dur: 22, delay: 7 },
  { coat: 'white', sign: null, width: 58, dur: 19, delay: 12 },
];

const isDetective = () => typeof document !== 'undefined' && document.documentElement.dataset.skin === 'detective';

export default function Walkers() {
  if (isDetective()) {
    return (
      <div className="walkers walkers-det" aria-hidden>
        <span className="walker walker-agent" style={{ animationDuration: '16s', bottom: 0 }}>
          <span className="walker-body"><AgentWalking width={70} /></span>
        </span>
      </div>
    );
  }
  return (
    <div className="walkers" aria-hidden>
      {CATS.map((cat, i) => (
        <span key={cat.coat} className="walker" style={{ animationDuration: `${cat.dur}s`, animationDelay: `-${cat.delay}s`, bottom: 2, left: `${8 + i * 32}%` }}>
          <span className="walker-body"><WalkingCat coat={cat.coat} sign={cat.sign} width={cat.width} /></span>
        </span>
      ))}
    </div>
  );
}
