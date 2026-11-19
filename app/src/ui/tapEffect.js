// Detective touch effect (v2.0): every tap leaves a golden fingerprint + an expanding magnifier ring
// at the touch point (≈0.6 s), on all screens (developer decision). Pure DOM, no React re-render.
// Off with Menu peneliti → Kurangi animasi (html.reduce-motion) or the pink theme.

const PRINT = '<svg viewBox="0 0 32 32" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">'
  + '<path d="M9 11a8 8 0 0 1 14 0"/><path d="M7 16c0-5 4-9 9-9s9 4 9 9"/><path d="M10.5 23c-1.3-2-2-4-2-6.5a7.5 7.5 0 0 1 15 0v1"/>'
  + '<path d="M13 26c-1.5-2.3-2.3-5-2.3-8.3a5.3 5.3 0 0 1 10.6 0c0 2.4.3 4.5 1 6.5"/><path d="M16 17.7c0 3.8.8 6.8 2.6 9"/></svg>';

let installed = false;

export function installTapEffect() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('pointerdown', (e) => {
    const root = document.documentElement;
    if (root.dataset.skin !== 'detective' || root.classList.contains('reduce-motion')) return;
    const fx = document.createElement('span');
    fx.className = 'tap-fx';
    fx.style.left = `${e.clientX}px`;
    fx.style.top = `${e.clientY}px`;
    fx.innerHTML = `<span class="tap-ring"></span><span class="tap-print">${PRINT}</span>`;
    document.body.appendChild(fx);
    setTimeout(() => fx.remove(), 700);
  }, { passive: true });
}
