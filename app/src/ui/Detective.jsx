// Detective-theme visuals (v1.6). Every piece carries information (AGENTS.md §2.2):
// fingerprint = answer option, envelope = clue ladder, stamp = case status, Agent M = guide on MAP/END screens only.

/** Agent M: original detective guide (fedora, round glasses, trench collar). Never rendered on solving screens. */
export function AgentM({ size = 72, mood = 'happy' }) {
  const mouth = {
    happy: 'M41 63 Q50 71 59 63',
    think: 'M43 66 L57 64',
    cheer: 'M40 61 Q50 75 60 61 Z',
  }[mood] || 'M41 63 Q50 71 59 63';
  return (
    <svg className="agent-m" width={size} height={size * 1.1} viewBox="0 0 100 110" role="img" aria-label="Agent M">
      {/* coat */}
      <path d="M18 110 Q20 84 50 80 Q80 84 82 110 Z" fill="#8C6A3F" />
      <path d="M50 80 L36 110 L30 110 Q32 90 50 80 Z M50 80 L64 110 L70 110 Q68 90 50 80 Z" fill="#A9834F" />
      <path d="M44 82 L50 96 L56 82 Z" fill="#E6EDF7" />
      <path d="M47 84 L50 100 L53 84 Z" fill="#10B981" />
      {/* face */}
      <circle cx="50" cy="54" r="22" fill="#F2C9A0" />
      {/* glasses */}
      <circle cx="41" cy="52" r="7" fill="#E6EDF7" fillOpacity=".35" stroke="#1B2A44" strokeWidth="2.5" />
      <circle cx="59" cy="52" r="7" fill="#E6EDF7" fillOpacity=".35" stroke="#1B2A44" strokeWidth="2.5" />
      <path d="M48 52 L52 52" stroke="#1B2A44" strokeWidth="2.5" />
      <circle cx="41" cy="53" r="2.2" fill="#1B2A44" />
      <circle cx="59" cy="53" r="2.2" fill="#1B2A44" />
      <path d={mouth} stroke="#7A3B2E" strokeWidth="2.5" fill={mood === 'cheer' ? '#7A3B2E' : 'none'} strokeLinecap="round" />
      {/* fedora */}
      <ellipse cx="50" cy="36" rx="34" ry="7" fill="#2E4263" />
      <path d="M30 36 Q30 14 50 14 Q70 14 70 36 Z" fill="#3A5277" />
      <path d="M30.5 30 L69.5 30 L70 36 L30 36 Z" fill="#F5B942" />
      <path d="M44 15 Q50 22 56 15" stroke="#2E4263" strokeWidth="2" fill="none" />
    </svg>
  );
}

/** Agent M with a speech bubble (map / end screens). */
export function AgentSays({ mood, children }) {
  return (
    <div className="agent-says">
      <AgentM mood={mood} size={64} />
      <p className="agent-bubble">{children}</p>
    </div>
  );
}

export function Fingerprint({ size = 26 }) {
  return (
    <svg className="fp-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M6.5 8.5a6 6 0 0 1 11 0" />
      <path d="M5 13c0-4 3-7 7-7s7 3 7 7" />
      <path d="M8 18c-1-1.6-1.5-3.2-1.5-5a5.5 5.5 0 0 1 11 0v1" />
      <path d="M10 20c-1.2-1.8-1.8-4-1.8-6.5a3.8 3.8 0 0 1 7.6 0c0 1.8.2 3.4.8 5" />
      <path d="M12 13.5c0 3 .6 5.2 2 7" />
    </svg>
  );
}

export function Envelope({ size = 24, open = false }) {
  return (
    <svg className="env-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      {open ? <path d="M3 9 L12 2 L21 9" /> : <path d="M3 8 L12 14 L21 8" />}
      <circle cx="12" cy={open ? 8 : 14} r="2.6" fill="var(--sun)" stroke="none" />
    </svg>
  );
}

/** Rubber stamp label: TOP SECRET / TERPECAHKAN / TERKUNCI. */
export function Stamp({ children, tone = 'warn', big = false }) {
  return <span className={`stamp stamp-${tone}${big ? ' stamp-big' : ''}`}>{children}</span>;
}
