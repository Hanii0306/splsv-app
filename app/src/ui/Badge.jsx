// Level badges: each symbol names the level's math idea (not decoration).
export const BADGE_SYMBOL = { L0: '=', L1: '+−', L2: '×÷', L3: '2x', L4: 'x|x', L5: '( )', L6: '½', L7: 'Aa', L8: '<>' };

export default function Badge({ levelId, status }) {
  const label = { mastered: 'dikuasai', active: 'terbuka', locked: 'terkunci' }[status];
  return (
    <span className={`badge ${status}`} role="img" aria-label={`Lencana ${levelId} ${label}`}>
      {BADGE_SYMBOL[levelId]}
    </span>
  );
}
