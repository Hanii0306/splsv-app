import { pretty } from './EquationLine.jsx';

/** Bottom sheet that never covers the equation (design.md §6). */
export default function HintPanel({ hint, canMore, onMore, onClose }) {
  if (!hint) return null;
  return (
    <div className="hint-panel" role="dialog" aria-label="Bantuan">
      <div className="hint-head">
        <span className="hint-level">H{hint.level}</span>
        <strong>{hint.title}</strong>
      </div>
      <p>{pretty(hint.text)}</p>
      {hint.example && (
        <div className="hint-example">
          <div>{pretty(hint.example.equation)}</div>
          <div className="hint-arrow">↓ {hint.example.op}</div>
          {hint.example.intermediate && <div className="op-text">{pretty(hint.example.intermediate)}</div>}
          <div>{pretty(hint.example.after)}</div>
        </div>
      )}
      <div className="hint-actions">
        {canMore && <button type="button" className="btn btn-ghost" onClick={onMore}>Petunjuk berikutnya</button>}
        <button type="button" className="btn" onClick={onClose}>Tutup</button>
      </div>
    </div>
  );
}
