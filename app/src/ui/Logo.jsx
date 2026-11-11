/** App logo: the balance with a smiling face (the same face that gives feedback in the lessons). */
export default function Logo({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="SPLV app">
      <circle cx="60" cy="60" r="56" fill="var(--surface)" stroke="var(--border)" strokeWidth="4" />
      <rect x="57" y="40" width="6" height="52" rx="3" fill="var(--scale-frame)" />
      <rect x="40" y="90" width="40" height="8" rx="4" fill="var(--scale-frame)" />
      <rect x="18" y="38" width="84" height="6" rx="3" fill="var(--scale-frame)" />
      <path d="M22 44 L12 70 H40 Z" fill="none" stroke="var(--scale-frame)" strokeWidth="2" />
      <path d="M98 44 L80 70 H108 Z" fill="none" stroke="var(--scale-frame)" strokeWidth="2" />
      <rect x="10" y="68" width="32" height="6" rx="3" fill="var(--scale-frame)" />
      <rect x="78" y="68" width="32" height="6" rx="3" fill="var(--scale-frame)" />
      <rect x="18" y="56" width="12" height="12" rx="3" fill="var(--var)" />
      <text x="24" y="65.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="Fredoka, sans-serif">x</text>
      <circle cx="88" cy="63" r="5" fill="var(--const)" />
      <circle cx="99" cy="63" r="5" fill="var(--const)" />
      {/* cat ears on the smiling face */}
      <path d="M47 27 L46 13 L57 21 Z" fill="var(--primary)" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M63 21 L74 13 L73 27 Z" fill="var(--primary)" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M49 23 L48.5 17 L53.5 21 Z" fill="#FFB3D1" />
      <path d="M66.5 21 L71.5 17 L71 23 Z" fill="#FFB3D1" />
      <circle cx="60" cy="34" r="15" fill="var(--primary)" stroke="#fff" strokeWidth="3" />
      <circle cx="55" cy="31" r="2.4" fill="#fff" />
      <circle cx="65" cy="31" r="2.4" fill="#fff" />
      <path d="M53 37 Q60 44 67 37" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="49" cy="37" r="2.6" fill="#FFB3D1" />
      <circle cx="71" cy="37" r="2.6" fill="#FFB3D1" />
    </svg>
  );
}
