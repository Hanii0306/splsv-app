// Shared, renderer-agnostic helpers for 3D and 2D scales.
import { Fr } from '../engine/index.js';

export const MAX_X = 10;
export const MAX_UNITS = 20;
export const MAX_TILT = 0.2; // ≈ 11.5° (design.md §4: max 12°)

/**
 * Concrete objects for one side: x-boxes, unit weights, and balloons (negatives).
 * Returns null when the side cannot be drawn concretely (fractions / too many) → label mode.
 */
export function sideObjects(lin) {
  if (!Fr.isInt(lin.a) || !Fr.isInt(lin.b)) return null;
  const a = lin.a.n;
  const b = lin.b.n;
  if (Math.abs(a) > MAX_X || Math.abs(b) > MAX_UNITS) return null;
  return {
    xBoxes: Math.max(a, 0),
    xBalloons: Math.max(-a, 0),
    units: Math.max(b, 0),
    balloons: Math.max(-b, 0),
  };
}

export function readColors() {
  const cs = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement) : null;
  const v = (name, fb) => (cs?.getPropertyValue(name).trim() || fb);
  return {
    varC: v('--var', '#2563EB'),
    constC: v('--const', '#B45309'),
    opC: v('--op', '#7C3AED'),
    ok: v('--ok', '#15803D'),
    warn: v('--warn', '#B91C1C'),
    text: v('--text', '#1F2328'),
    muted: v('--text-muted', '#5B6470'),
    frame: v('--scale-frame', '#8A919C'),
    balloon: v('--balloon', '#F4A6C4'),
  };
}

/** Grid slots on a pan: 5 columns × 2 rows per layer (front row first), stacked upward. */
export function slot(i, spacing = 0.42) {
  const perLayer = 10;
  const layer = Math.floor(i / perLayer);
  const k = i % perLayer;
  const col = k % 5;
  const row = Math.floor(k / 5);
  return { x: (col - 2) * spacing, z: (0.5 - row) * spacing, layer };
}

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
