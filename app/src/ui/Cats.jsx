// Cute cats used on MENU screens only (walking strip + floating doodles). Never on problem screens.

export const CAT_COATS = {
  orange: { fur: '#F6A04D', dark: '#D9792A', inner: '#FFC9A3', belly: '#FFE3C8' },
  gray: { fur: '#A7AFC2', dark: '#7F889D', inner: '#F4C6D6', belly: '#E3E7F0' },
  white: { fur: '#FFFBF7', dark: '#E2C8D3', inner: '#FFB3CC', belly: '#FFFFFF' },
};

/** Walking cat seen from the side, facing right. Legs/tail animate via CSS classes. */
export function WalkingCat({ coat = 'orange', sign = null, width = 72 }) {
  const c = CAT_COATS[coat];
  const h = width * (sign ? 0.98 : 0.72);
  return (
    <svg width={width} height={h} viewBox={sign ? '0 -18 72 70' : '0 0 72 52'} aria-hidden>
      {sign && (
        <g>
          <line x1="56" y1="10" x2="56" y2="-6" stroke="#8B6488" strokeWidth="2" />
          <rect x="40" y="-18" width="30" height="14" rx="4" fill="#fff" stroke="#F6BFD6" strokeWidth="1.5" />
          <text x="55" y="-8" textAnchor="middle" fontSize="9" fontWeight="800" fill="#3B5BFD" fontFamily="Fredoka, sans-serif">{sign}</text>
        </g>
      )}
      {/* tail */}
      <path className="cat-tail" d="M14 30 C4 28 2 16 8 10" fill="none" stroke={c.fur} strokeWidth="5" strokeLinecap="round" />
      {/* back legs */}
      <g stroke={c.dark} strokeWidth="4.5" strokeLinecap="round">
        <line className="leg leg-a" x1="20" y1="36" x2="20" y2="47" />
        <line className="leg leg-b" x1="27" y1="36" x2="27" y2="47" />
        <line className="leg leg-b" x1="42" y1="36" x2="42" y2="47" />
        <line className="leg leg-a" x1="49" y1="36" x2="49" y2="47" />
      </g>
      {/* body */}
      <ellipse cx="34" cy="31" rx="20" ry="11" fill={c.fur} stroke={c.dark} strokeWidth="1.2" />
      <ellipse cx="36" cy="35" rx="12" ry="5" fill={c.belly} />
      {coat === 'orange' && (
        <g stroke={c.dark} strokeWidth="2.2" strokeLinecap="round">
          <line x1="26" y1="21" x2="28" y2="27" /><line x1="33" y1="20" x2="34" y2="26" /><line x1="40" y1="21" x2="40" y2="27" />
        </g>
      )}
      {/* head */}
      <path d="M46 12 L48 2 L55 9 Z" fill={c.fur} /><path d="M60 9 L66 2 L67 13 Z" fill={c.fur} />
      <path d="M48.5 9 L49.5 4.5 L53 8 Z" fill={c.inner} /><path d="M61.5 9 L65 5 L65.5 11 Z" fill={c.inner} />
      <circle cx="57" cy="19" r="12" fill={c.fur} stroke={c.dark} strokeWidth="1.2" />
      <ellipse cx="52.5" cy="18" rx="1.8" ry="2.4" fill="#3B2240" /><ellipse cx="61.5" cy="18" rx="1.8" ry="2.4" fill="#3B2240" />
      <circle cx="53" cy="17.2" r="0.7" fill="#fff" /><circle cx="62" cy="17.2" r="0.7" fill="#fff" />
      <path d="M56 21.5 L58 21.5 L57 23 Z" fill="#FF7AA8" />
      <path d="M54.5 24 Q57 26 57 23.5 Q57 26 59.5 24" fill="none" stroke="#3B2240" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="49.5" cy="23" r="2.2" fill="#FFB3CC" opacity="0.8" /><circle cx="64.5" cy="23" r="2.2" fill="#FFB3CC" opacity="0.8" />
      <g stroke="#3B2240" strokeWidth="0.7" opacity="0.55">
        <line x1="47" y1="21" x2="41" y2="20" /><line x1="47" y1="23" x2="41" y2="24" />
        <line x1="67" y1="21" x2="72" y2="20" /><line x1="67" y1="23" x2="72" y2="24" />
      </g>
    </svg>
  );
}

/** Round cat face for the floating background doodles. */
export function CatFace({ coat = 'orange', size = 34 }) {
  const c = CAT_COATS[coat];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d="M6 14 L8 2 L17 9 Z" fill={c.fur} /><path d="M23 9 L32 2 L34 14 Z" fill={c.fur} />
      <path d="M8.5 11 L9.5 5 L14 9 Z" fill={c.inner} /><path d="M26 9 L30.5 5 L31.5 11 Z" fill={c.inner} />
      <circle cx="20" cy="22" r="15" fill={c.fur} stroke={c.dark} strokeWidth="1.2" />
      {coat === 'orange' && <path d="M17 8 L18 13 M20 7.5 L20 13 M23 8 L22 13" stroke={c.dark} strokeWidth="1.6" strokeLinecap="round" />}
      <ellipse cx="14.5" cy="21" rx="2" ry="2.6" fill="#3B2240" /><ellipse cx="25.5" cy="21" rx="2" ry="2.6" fill="#3B2240" />
      <path d="M19 25 L21 25 L20 26.5 Z" fill="#FF7AA8" />
      <path d="M17 28 Q20 30 20 27 Q20 30 23 28" fill="none" stroke="#3B2240" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11" cy="26.5" r="2.4" fill="#FFB3CC" opacity="0.8" /><circle cx="29" cy="26.5" r="2.4" fill="#FFB3CC" opacity="0.8" />
    </svg>
  );
}
