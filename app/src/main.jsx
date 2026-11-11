import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import './styles/tokens.css';
import './styles/app.css';

/** Any runtime error shows a recoverable screen instead of a blank page. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('SPLV app error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen center" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }} aria-hidden>⚖</div>
        <h2>Ada yang tidak beres</h2>
        <p className="muted">Data belajarmu tetap aman tersimpan di HP.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Muat ulang</button>
        <p className="muted" style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 16 }}>{String(this.state.error?.message || this.state.error)}</p>
      </div>
    );
  }
}

// Old Android WebViews lack flexbox `gap`; enable CSS margin fallbacks (app.css .no-flexgap).
function flexGapSupported() {
  const d = document.createElement('div');
  d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
  d.appendChild(document.createElement('div'));
  d.appendChild(document.createElement('div'));
  document.body.appendChild(d);
  const ok = d.scrollHeight === 1;
  d.remove();
  return ok;
}
if (!flexGapSupported()) document.documentElement.classList.add('no-flexgap');
// Old WebViews render in software (MainActivity): keep decorative motion off there.
const chrome = Number((/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1] || 0);
if (chrome && chrome < 90) document.documentElement.classList.add('lite');

window.__splvReady = true;
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
