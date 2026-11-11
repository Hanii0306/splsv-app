export default function Header({ title, onBack, right }) {
  return (
    <header className="app-header">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Kembali">←</button>
      ) : <span className="icon-btn-spacer" />}
      <h1>{title}</h1>
      {right || <span className="icon-btn-spacer" />}
    </header>
  );
}
