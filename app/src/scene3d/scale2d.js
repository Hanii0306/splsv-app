// SVG fallback with the same API as scale3d (used when WebGL fails, FPS is low, or "mode ringan").
import { formatLinear } from '../engine/index.js';
import { MAX_TILT, prefersReducedMotion, readColors, sideObjects } from './layout.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 360;
const H = 220;
const PX = 180;
const PY = 70;
const ARM = 120;
const HANG = 70;

const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

export function createScale2D(container) {
  const c = readColors();
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scale-svg', role: 'img' });
  container.appendChild(svg);

  svg.append(
    el('rect', { x: PX - 40, y: H - 18, width: 80, height: 10, rx: 4, fill: c.frame }),
    el('rect', { x: PX - 4, y: PY, width: 8, height: H - 18 - PY, fill: c.frame }),
  );
  const beam = el('line', { x1: PX - ARM, y1: PY, x2: PX + ARM, y2: PY, stroke: c.frame, 'stroke-width': 6, 'stroke-linecap': 'round' });
  // Face on the pivot: smiles when balanced, worried when tilted (feedback, not decoration).
  const face = el('g', { transform: `translate(${PX} ${PY - 2})` });
  const head = el('circle', { cx: 0, cy: 0, r: 15, fill: c.ok, stroke: '#fff', 'stroke-width': 2 });
  const eyeL = el('circle', { cx: -5, cy: -3, r: 2.2, fill: '#fff' });
  const eyeR = el('circle', { cx: 5, cy: -3, r: 2.2, fill: '#fff' });
  const mouth = el('path', { d: 'M-6 3 Q0 9 6 3', fill: 'none', stroke: '#fff', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  face.append(head, eyeL, eyeR, mouth);
  svg.append(beam, face);

  const makePan = () => {
    const g = el('g');
    const ring = el('ellipse', { cx: 0, cy: HANG + 4, rx: 54, ry: 9, fill: 'none', stroke: c.opC, 'stroke-width': 4, opacity: 0 });
    g.append(
      el('line', { x1: 0, y1: 0, x2: -46, y2: HANG, stroke: c.frame, 'stroke-width': 1.5 }),
      el('line', { x1: 0, y1: 0, x2: 46, y2: HANG, stroke: c.frame, 'stroke-width': 1.5 }),
      el('path', { d: `M-52 ${HANG} L52 ${HANG} L42 ${HANG + 8} L-42 ${HANG + 8} Z`, fill: c.frame }),
      ring,
    );
    const items = el('g');
    g.append(items);
    svg.append(g);
    return { g, items, ring };
  };
  const pans = { left: makePan(), right: makePan() };

  let angle = 0;
  let target = 0;
  let raf = 0;
  let reduced = prefersReducedMotion();

  function place() {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const lx = PX - ARM * cos;
    const ly = PY + ARM * sin;
    const rx = PX + ARM * cos;
    const ry = PY - ARM * sin;
    beam.setAttribute('x1', lx); beam.setAttribute('y1', ly);
    beam.setAttribute('x2', rx); beam.setAttribute('y2', ry);
    pans.left.g.setAttribute('transform', `translate(${lx} ${ly})`);
    pans.right.g.setAttribute('transform', `translate(${rx} ${ry})`);
    const tilted = Math.abs(target) > 0.01;
    head.setAttribute('fill', tilted ? c.warn : c.ok);
    mouth.setAttribute('d', tilted ? 'M-6 7 Q0 1 6 7' : 'M-6 3 Q0 9 6 3');
    face.setAttribute('aria-label', tilted ? 'timbangan miring' : 'timbangan seimbang');
  }

  function loop() {
    angle += (target - angle) * 0.18;
    place();
    if (Math.abs(target - angle) > 0.001) raf = requestAnimationFrame(loop);
    else { angle = target; place(); raf = 0; }
  }

  function drawSide(side, lin) {
    const { items } = pans[side];
    while (items.firstChild) items.removeChild(items.firstChild); // replaceChildren() needs Chrome 86+
    const objs = sideObjects(lin);
    if (!objs) {
      const t = el('text', { x: 0, y: HANG - 10, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: c.text, 'font-family': 'ui-monospace, monospace' });
      t.textContent = formatLinear(lin).replace(/-/g, '−');
      items.append(t);
      return;
    }
    // Flat rows of 5 (no pseudo-depth) so the x-box is never hidden behind weights.
    const pos = (i) => ({ x: ((i % 5) - 2) * 20, y: HANG - 11 - Math.floor(i / 5) * 19 });
    let i = 0;
    for (let k = 0; k < objs.xBoxes; k++, i++) {
      const p = pos(i);
      items.append(el('rect', { x: p.x - 9, y: p.y - 9, width: 18, height: 18, rx: 3, fill: c.varC }));
      const t = el('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', 'font-size': 13, fill: '#fff', 'font-weight': 700 });
      t.textContent = 'x';
      items.append(t);
    }
    for (let k = 0; k < objs.units; k++, i++) {
      const p = pos(i);
      items.append(el('rect', { x: p.x - 7, y: p.y - 4, width: 14, height: 12, rx: 6, fill: c.constC }));
    }
    let b = 0;
    const bpos = (j) => ({ x: ((j % 5) - 2) * 20, y: -8 - Math.floor(j / 5) * 22 });
    for (let k = 0; k < objs.xBalloons; k++, b++) {
      const p = bpos(b);
      items.append(el('line', { x1: p.x, y1: p.y + 10, x2: p.x, y2: HANG, stroke: c.muted, 'stroke-width': 1 }));
      items.append(el('circle', { cx: p.x, cy: p.y, r: 10, fill: c.varC, opacity: 0.8 }));
      const t = el('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', 'font-size': 12, fill: '#fff', 'font-weight': 700 });
      t.textContent = 'x';
      items.append(t);
    }
    for (let k = 0; k < objs.balloons; k++, b++) {
      const p = bpos(b);
      items.append(el('line', { x1: p.x, y1: p.y + 9, x2: p.x, y2: HANG, stroke: c.muted, 'stroke-width': 1 }));
      items.append(el('circle', { cx: p.x, cy: p.y, r: 9, fill: c.balloon }));
    }
  }

  place();

  return {
    kind: '2d',
    setEquation(eq) {
      drawSide('left', eq.left.lin);
      drawSide('right', eq.right.lin);
      svg.setAttribute('aria-label', `Timbangan: ${eq.left.text} di kiri, ${eq.right.text} di kanan`);
    },
    flash() {
      for (const p of Object.values(pans)) {
        p.ring.setAttribute('opacity', 0.9);
        setTimeout(() => p.ring.setAttribute('opacity', 0), reduced ? 300 : 650);
      }
    },
    setTilt(dir) {
      target = dir * MAX_TILT;
      if (reduced) { angle = target; place(); } else if (!raf) raf = requestAnimationFrame(loop);
    },
    setReducedMotion(on) { reduced = on; },
    dispose() { cancelAnimationFrame(raf); svg.remove(); },
  };
}
