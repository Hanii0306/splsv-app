// Big, full-viewport detective animation for MENU screens (v1.9). Fills the whole window on laptops too.
// Never rendered on problem screens (they only get the static .solve-bg pattern, EL03).
// Palette = detective props (not semantic maths colours): navy, trench-coat khaki, brown, gold, case-string red.

// v1.11 noir: props are lighter so they read on the dark night background.
export const DET = { navy: '#4A5D8A', navy2: '#6178AE', khaki: '#C9A46A', khaki2: '#9C7A47', brown: '#8A6A3E', gold: '#F2B33D', red: '#E04A3A', paper: '#FFF8EA', glass: '#DDF3FF', print: '#D9C49A' };

/** Agent M walking, side view facing right (legs, arm and magnifier swing via CSS). */
export function AgentWalking({ width = 84 }) {
  return (
    <svg width={width} height={width * 1.45} viewBox="0 0 80 116" aria-hidden className="agent-walk">
      {/* back leg */}
      <g className="aw-leg aw-leg-b"><rect x="33" y="78" width="7" height="28" rx="3" fill={DET.navy} /><path d="M31 104 h14 a4 4 0 0 1 0 7 h-14 z" fill="#1E1B18" /></g>
      {/* trench coat */}
      <path d="M26 44 Q40 36 54 44 L58 86 Q40 92 22 86 Z" fill={DET.khaki} />
      <path d="M40 42 L40 88" stroke={DET.khaki2} strokeWidth="1.5" />
      <rect x="24" y="64" width="33" height="5" rx="2" fill={DET.brown} />
      <rect x="38" y="63.5" width="6" height="6" rx="1" fill={DET.gold} />
      <path d="M34 44 L40 54 L46 44 Z" fill={DET.paper} />
      {/* front leg */}
      <g className="aw-leg aw-leg-a"><rect x="40" y="78" width="7" height="28" rx="3" fill={DET.navy2} /><path d="M38 104 h15 a4 4 0 0 1 0 7 h-15 z" fill="#1E1B18" /></g>
      {/* head */}
      <circle cx="44" cy="30" r="12" fill="#F2C9A0" />
      <circle cx="49" cy="29" r="4.2" fill={DET.glass} fillOpacity=".5" stroke="#1B2A44" strokeWidth="1.6" />
      <circle cx="50" cy="29.5" r="1.4" fill="#1B2A44" className="aw-eye" />
      <path d="M48 36 Q51 38 54 35.5" stroke="#7A3B2E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* fedora */}
      <ellipse cx="43" cy="20" rx="17" ry="3.6" fill={DET.navy} />
      <path d="M32 20 Q32 7 43 7 Q54 7 54 20 Z" fill={DET.navy2} />
      <rect x="32" y="16" width="22" height="3.6" fill={DET.gold} />
      {/* arm + magnifier */}
      <g className="aw-arm">
        <path d="M44 48 Q56 56 62 52" stroke={DET.khaki2} strokeWidth="6" fill="none" strokeLinecap="round" />
        <line x1="62" y1="52" x2="67" y2="45" stroke={DET.brown} strokeWidth="3" strokeLinecap="round" />
        <circle cx="71" cy="39" r="7" fill={DET.glass} fillOpacity=".75" stroke={DET.navy2} strokeWidth="2.6" />
        <path d="M67.5 36.5 Q69 34.5 71.5 34.5" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function ShoePrint({ size = 18 }) {
  return (
    <svg width={size} height={size * 1.8} viewBox="0 0 20 36" aria-hidden>
      <path d="M10 1 C16 1 18 7 17 13 C16 18 13 20 10 20 C6 20 3 17 3 12 C3 6 5 1 10 1 Z" fill={DET.print} />
      <path d="M10 24 C14 24 15 27 15 30 C15 33 13 35 10 35 C7 35 5 33 5 30 C5 27 6 24 10 24 Z" fill={DET.print} />
    </svg>
  );
}

/** Case board side panel (polaroids, pins, red string that keeps drawing itself). */
function CaseBoard({ side }) {
  return (
    <svg className={`case-board case-board-${side}`} viewBox="0 0 220 420" aria-hidden>
      <path className="board-string" d="M50 60 L160 150 L60 250 L150 350" fill="none" stroke={DET.red} strokeWidth="3" strokeDasharray="10 7" />
      {[[20, 25, -6], [125, 115, 5], [28, 215, -3], [118, 315, 7]].map(([x, y, r], i) => (
        <g key={i} className="polaroid" style={{ animationDelay: `${i * 0.7}s` }}><g transform={`rotate(${r} ${x + 35} ${y + 40})`}>
          <rect x={x} y={y} width="70" height="82" rx="3" fill={DET.paper} stroke="#D8C9A8" />
          <rect x={x + 7} y={y + 7} width="56" height="50" fill={i % 2 ? '#CFC3E9' : '#E7D9B8'} />
          <circle cx={x + 35} cy={y + 26} r="9" fill={DET.navy2} opacity=".55" />
          <path d={`M${x + 20} ${y + 57} Q${x + 35} ${y + 37} ${x + 50} ${y + 57} Z`} fill={DET.navy2} opacity=".55" />
          <text x={x + 35} y={y + 74} textAnchor="middle" fontSize="11" fontWeight="800" fill={DET.brown} fontFamily="Fredoka, sans-serif">{['x = ?', 'BUKTI', '2x + 3', 'KASUS'][i]}</text>
          <circle cx={x + 35} cy={y + 3} r="5" fill={DET.red} />
        </g></g>
      ))}
    </svg>
  );
}

const FLOAT = [
  { k: 'q', left: '7%', top: '12%', size: 40, dur: 7, delay: 0 },
  { k: 'print', left: '84%', top: '10%', size: 44, dur: 10, delay: 2 },
  { k: 'note', left: '88%', top: '52%', size: 40, dur: 9, delay: 1 },
  { k: 'hat', left: '5%', top: '58%', size: 46, dur: 11, delay: 3 },
  { k: 'q', left: '62%', top: '80%', size: 30, dur: 8, delay: 4 },
  { k: 'print', left: '28%', top: '30%', size: 26, dur: 12, delay: 1.5 },
  { k: 'note', left: '40%', top: '6%', size: 26, dur: 9.5, delay: 3.5 },
  { k: 'glass', left: '92%', top: '78%', size: 34, dur: 8.5, delay: 2.5 },
  { k: 'q', left: '18%', top: '90%', size: 26, dur: 9, delay: 5 },
  { k: 'hat', left: '70%', top: '35%', size: 28, dur: 13, delay: 6 },
  { k: 'print', left: '50%', top: '92%', size: 24, dur: 10, delay: 0.8 },
  { k: 'q', left: '95%', top: '28%', size: 22, dur: 7.5, delay: 3 },
  { k: 'note', left: '2%', top: '35%', size: 24, dur: 11, delay: 4.2 },
];

const DUST = Array.from({ length: 18 }, (_, i) => ({ left: `${(i * 53) % 100}%`, size: 3 + (i % 4), dur: 7 + (i % 6), delay: (i * 0.9) % 9 }));

export function Doodle({ kind, size = 30 }) {
  const common = { width: size, height: size, viewBox: '0 0 32 32', 'aria-hidden': true };
  switch (kind) {
    case 'print':
      return (
        <svg {...common} fill="none" stroke={DET.print} strokeWidth="1.8" strokeLinecap="round">
          <path d="M9 11a8 8 0 0 1 14 0" /><path d="M7 16c0-5 4-9 9-9s9 4 9 9" /><path d="M10.5 23c-1.3-2-2-4-2-6.5a7.5 7.5 0 0 1 15 0v1" />
          <path d="M13 26c-1.5-2.3-2.3-5-2.3-8.3a5.3 5.3 0 0 1 10.6 0c0 2.4.3 4.5 1 6.5" /><path d="M16 17.7c0 3.8.8 6.8 2.6 9" /></svg>
      );
    case 'note':
      return (
        <svg {...common}><rect x="4" y="8" width="24" height="17" rx="2.5" fill={DET.paper} stroke={DET.khaki2} strokeWidth="2" />
          <path d="M4 10 L16 18 L28 10" fill="none" stroke={DET.khaki2} strokeWidth="2" /><circle cx="16" cy="17" r="3" fill={DET.red} /></svg>
      );
    case 'hat':
      return (
        <svg {...common}><ellipse cx="16" cy="21" rx="14" ry="3.2" fill={DET.navy} /><path d="M7 21 Q7 8 16 8 Q25 8 25 21 Z" fill={DET.navy2} />
          <rect x="7" y="17" width="18" height="3" fill={DET.gold} /></svg>
      );
    case 'glass':
      return (
        <svg {...common}><circle cx="13" cy="13" r="8.5" fill={DET.glass} fillOpacity=".6" stroke={DET.navy2} strokeWidth="2.8" />
          <path d="M19.5 19.5 L28 28" stroke={DET.brown} strokeWidth="4" strokeLinecap="round" /></svg>
      );
    default:
      return <svg {...common}><text x="16" y="26" textAnchor="middle" fontSize="28" fontWeight="800" fill={DET.gold} fontFamily="Fredoka, sans-serif">?</text></svg>;
  }
}

/** Full-window animated detective background (spotlight, roaming magnifier, case boards, shoe prints). */
export default function DetectiveScene() {
  return (
    <div className="det-scene" aria-hidden>
      <div className="rain" />
      {DUST.map((d, i) => (
        <span key={`dust${i}`} className="dust" style={{ left: d.left, width: d.size, height: d.size, animationDuration: `${d.dur}s`, animationDelay: `-${d.delay}s` }} />
      ))}
      <div className="spotlight spotlight-a" />
      <div className="spotlight spotlight-b" />
      <CaseBoard side="left" />
      <CaseBoard side="right" />
      {FLOAT.map((d, i) => (
        <span key={i} className={`det-float det-float-${d.k}`} style={{ left: d.left, top: d.top, animationDuration: `${d.dur}s`, animationDelay: `-${d.delay}s` }}>
          <Doodle kind={d.k} size={d.size} />
        </span>
      ))}
      <div className="roam-glass">
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle cx="50" cy="50" r="36" fill={DET.glass} fillOpacity=".45" stroke={DET.navy2} strokeWidth="9" />
          <circle cx="50" cy="50" r="31" fill="none" stroke={DET.gold} strokeWidth="2.5" />
          <path d="M30 38 Q36 26 50 24" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".9" />
          <text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="800" fill={DET.navy2} opacity=".55" fontFamily="Fredoka, sans-serif">x</text>
          <path d="M77 77 L108 108" stroke={DET.brown} strokeWidth="13" strokeLinecap="round" />
          <path d="M77 77 L86 86" stroke={DET.gold} strokeWidth="13" />
        </svg>
      </div>
      <div className="shoe-trail">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className={`shoe ${i % 2 ? 'shoe-r' : 'shoe-l'}`} style={{ left: `${2 + i * 7}%`, animationDelay: `${i * 0.35}s` }}>
            <ShoePrint size={14} />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Animated case-board banner placed IN the page flow (top of Map, Login, briefing), so the detective
 * animation is clearly visible on phones where the full-window scene sits behind the cards.
 */
export function CaseBanner({ title = 'BERKAS RAHASIA' }) {
  return (
    <div className="case-banner" aria-hidden>
      <div className="cb-light" />
      <svg className="cb-board" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice">
        <path className="board-string" d="M40 34 L120 92 L200 30 L282 88 L338 36" fill="none" stroke={DET.red} strokeWidth="2.6" strokeDasharray="9 6" />
        {[[14, 12, -7, 'x = ?'], [94, 70, 5, '2x + 3'], [176, 8, -4, 'BUKTI'], [256, 66, 6, 'KASUS'], [312, 14, -5, '?']].map(([x, y, r, t], i) => (
          <g key={i} className="polaroid" style={{ animationDelay: `${i * 0.6}s` }}><g transform={`rotate(${r} ${x + 26} ${y + 30})`}>
            <rect x={x} y={y} width="52" height="60" rx="2.5" fill={DET.paper} />
            <rect x={x + 5} y={y + 5} width="42" height="36" fill={i % 2 ? '#CFC3E9' : '#E7D9B8'} />
            <circle cx={x + 26} cy={y + 18} r="7" fill="#3A5277" opacity=".55" />
            <path d={`M${x + 14} ${y + 41} Q${x + 26} ${y + 27} ${x + 38} ${y + 41} Z`} fill="#3A5277" opacity=".55" />
            <text x={x + 26} y={y + 54} textAnchor="middle" fontSize="9" fontWeight="800" fill="#6E5230" fontFamily="Fredoka, sans-serif">{t}</text>
            <circle cx={x + 26} cy={y + 2} r="4" fill={DET.red} />
          </g></g>
        ))}
      </svg>
      {[0, 1, 2].map((i) => <span key={i} className="cb-print" style={{ left: `${18 + i * 30}%`, animationDelay: `${i * 1.3}s` }}><Doodle kind="print" size={26} /></span>)}
      <span className="cb-stamp">{title}</span>
      <div className="cb-glass">
        <svg viewBox="0 0 120 120"><circle cx="50" cy="50" r="34" fill={DET.glass} fillOpacity=".35" stroke={DET.gold} strokeWidth="8" />
          <path d="M30 38 Q36 26 50 24" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M76 76 L106 106" stroke={DET.brown} strokeWidth="12" strokeLinecap="round" /></svg>
      </div>
      <span className="cb-agent"><AgentWalking width={44} /></span>
    </div>
  );
}
