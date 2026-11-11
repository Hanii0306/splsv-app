// Equation with consistent colour signalling (design.md §3.1): x-terms blue, constants orange,
// the operation being applied to both sides purple + underlined (never colour alone).

const pretty = (s) => s.replace(/(^|[\s(])-/g, '$1−').replace(/ - /g, ' − ').replace(/\*/g, '·');

function Token({ t }) {
  if (/x/.test(t)) return <span className="tk-var">{pretty(t)}</span>;
  if (/\d/.test(t)) return <span className="tk-const">{pretty(t)}</span>;
  if (t === '=') return <span className="tk-eq">=</span>;
  return <span className="tk-op">{pretty(t)}</span>;
}

export function Expr({ text }) {
  const tokens = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <Token t={t} />
        </span>
      ))}
    </>
  );
}

const REL_WORD = { '=': 'sama dengan', '<': 'kurang dari', '>': 'lebih dari', '≤': 'kurang dari atau sama dengan', '≥': 'lebih dari atau sama dengan' };

export default function EquationLine({ eq, size = 'lg', muted = false }) {
  return (
    <div className={`eq eq-${size}${muted ? ' eq-muted' : ''}`} aria-label={`${eq.left.text} ${REL_WORD[eq.rel || '=']} ${eq.right.text}`}>
      <Expr text={eq.left.text} /> <span className={eq.rel && eq.rel !== '=' ? 'tk-rel' : 'tk-eq'}>{eq.rel || '='}</span> <Expr text={eq.right.text} />
    </div>
  );
}

const K = (k) => (k.n < 0 ? `(${k.d === 1 ? k.n : `${k.n}/${k.d}`})` : k.d === 1 ? `${k.n}` : `${k.n}/${k.d}`);
const needsParens = (t) => /[+-]/.test(t.replace(/^-/, ''));
const wrap = (t) => (needsParens(t) ? `(${t})` : t);

/** "2x + 5 −5 = 15 −5" with the operation highlighted on BOTH sides. */
export function OpLine({ eq, op, termText }) {
  if (!op || op.kind === 'simplify') return null;
  const side = (s) => {
    if (op.kind === 'add' || op.kind === 'sub') {
      return (<><Expr text={s} /> <mark className="tk-opmark">{op.kind === 'add' ? '+' : '−'} {pretty(termText)}</mark></>);
    }
    if (op.kind === 'mul') return (<><mark className="tk-opmark">{pretty(K(op.k))} ×</mark> <Expr text={wrap(s)} /></>);
    return (<><Expr text={wrap(s)} /> <mark className="tk-opmark">÷ {pretty(K(op.k))}</mark></>);
  };
  return (
    <div className="eq eq-md eq-opline">
      {side(eq.left.text)} <span className="tk-eq">{eq.rel || '='}</span> {side(eq.right.text)}
    </div>
  );
}

export { pretty };
