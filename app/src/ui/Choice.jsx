/** Single-select list of large tappable options (≥48dp). */
export default function Choice({ options, onPick, disabled, highlight, state = {} }) {
  return (
    <div className="choices">
      {options.map((o, i) => (
        <button
          key={i}
          type="button"
          className={`choice${highlight === i ? ' choice-hint' : ''}${state[i] ? ` choice-${state[i]}` : ''}`}
          disabled={disabled || state[i] === 'wrong'}
          onClick={() => onPick(i)}
        >
          {state[i] === 'right' && <span aria-hidden>✓ </span>}
          {state[i] === 'wrong' && <span aria-hidden>! </span>}
          {o}
        </button>
      ))}
    </div>
  );
}
