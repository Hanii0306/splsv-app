import { useEffect, useRef, useState } from 'react';
import { createScale2D } from '../scene3d/scale2d.js';
import { logEvent } from '../telemetry/log.js';

// A buggy GPU driver can crash the WHOLE app natively while three.js sets up WebGL2
// (seen on Android 8 / WebView 69: SIGSEGV in the GPU thread). JS cannot catch that, so:
//  1) skip 3D on old WebViews (Chrome < 90), and
//  2) remember a crash during 3D start-up and use the 2D scale from then on.
const PENDING_KEY = 'splv.scale3d.pending';
const DISABLED_KEY = 'splv.scale3d.disabled';
const MIN_CHROME_FOR_3D = 90;

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

function chromeMajor() {
  const m = /Chrome\/(\d+)/.exec(navigator.userAgent || '');
  return m ? Number(m[1]) : 0;
}

/** @returns {string|null} reason to avoid 3D, or null when 3D is allowed */
export function reasonNo3D() {
  if (store.get(DISABLED_KEY)) return store.get(DISABLED_KEY);
  if (store.get(PENDING_KEY)) {
    // The previous run never finished starting 3D → it crashed. Never try again on this device.
    store.set(DISABLED_KEY, 'crash');
    store.del(PENDING_KEY);
    return 'crash';
  }
  const v = chromeMajor();
  if (v && v < MIN_CHROME_FOR_3D) return 'old_webview';
  try {
    const c = document.createElement('canvas');
    if (!c.getContext('webgl2')) return 'no_webgl2'; // three.js r163+ needs WebGL2
  } catch {
    return 'no_webgl2';
  }
  return null;
}

/**
 * Balance scale. Three.js is loaded lazily; falls back to SVG (architecture.md §3.8).
 * @param {{equation: object, flashKey?: number, tilt?: number, mode?: 'full'|'compact'|'hidden', light?: boolean, reducedMotion?: boolean}} props
 */
let sessionLogged = false;

export default function ScaleView({ equation, flashKey = 0, tilt = 0, mode = 'full', light = false, reducedMotion = false }) {
  const host = useRef(null);
  const ctl = useRef(null);
  const eqRef = useRef(equation);
  const [visible, setVisible] = useState(mode !== 'hidden');
  const [force2d, setForce2d] = useState(false);
  eqRef.current = equation;

  useEffect(() => setVisible(mode !== 'hidden'), [mode]);

  useEffect(() => {
    if (!visible || !host.current) return undefined;
    let disposed = false;
    (async () => {
      let c = null;
      const why = light ? 'light_mode' : force2d ? 'low_fps' : reasonNo3D();
      if (!why) {
        store.set(PENDING_KEY, String(Date.now()));
        try {
          const { createScale3D } = await import('../scene3d/scale3d.js');
          if (disposed) { store.del(PENDING_KEY); return; }
          c = createScale3D(host.current, {
            onFallback: (reason) => { logEvent('scale_fallback', { reason }); setForce2d(true); },
          });
          // Survived context + first frames → 3D is safe on this device.
          setTimeout(() => store.del(PENDING_KEY), 2500);
        } catch (e) {
          store.del(PENDING_KEY);
          store.set(DISABLED_KEY, 'init_error');
          logEvent('scale_fallback', { reason: 'init_error', message: String(e?.message || e) });
        }
      } else if (why !== 'light_mode' && why !== 'low_fps' && !sessionLogged) {
        sessionLogged = true;
        logEvent('scale_fallback', { reason: why, chrome: chromeMajor() });
      }
      if (disposed) { c?.dispose(); return; }
      if (!c) c = createScale2D(host.current);
      c.setReducedMotion(reducedMotion);
      c.setEquation(eqRef.current, { animate: false });
      ctl.current = c;
    })();
    return () => {
      disposed = true;
      ctl.current?.dispose();
      ctl.current = null;
    };
  }, [visible, light, force2d, reducedMotion]);

  useEffect(() => { ctl.current?.setEquation(equation); }, [equation]);
  useEffect(() => { if (flashKey) ctl.current?.flash(); }, [flashKey]);
  useEffect(() => { ctl.current?.setTilt(tilt); }, [tilt]);

  if (!visible) {
    return (
      <button type="button" className="scale-toggle" onClick={() => setVisible(true)}>
        ⚖ Lihat timbangan
      </button>
    );
  }
  return (
    <div className={`scale-host scale-${mode}`} ref={host}>
      {mode === 'hidden' && (
        <button type="button" className="scale-hide" onClick={() => setVisible(false)} aria-label="Sembunyikan timbangan">×</button>
      )}
    </div>
  );
}
