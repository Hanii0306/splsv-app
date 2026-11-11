// Low-poly 3D balance scale (design.md §4). The only file that imports three (AGENTS.md §3).
// Render-on-demand: frames are drawn only while something is moving.
import * as THREE from 'three';
import { formatLinear } from '../engine/index.js';
import { MAX_TILT, MAX_UNITS, prefersReducedMotion, readColors, sideObjects, slot } from './layout.js';

const PIVOT_Y = 2.9;
const ARM = 3.0;
const HANG = 1.45;

function labelTexture(text, bg, fg, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  g.fillStyle = fg;
  g.font = `bold ${size * 0.62}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, size / 2, size / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function textSprite(color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(3.2, 0.8, 1);
  sprite.userData.draw = (text) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = color;
    g.font = 'bold 64px "JetBrains Mono", ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text.replace(/-/g, '−'), c.width / 2, c.height / 2);
    tex.needsUpdate = true;
  };
  return sprite;
}

/**
 * @param {HTMLElement} container
 * @param {{ onFallback?: (reason: string) => void }} [opts]
 */
export function createScale3D(container, opts = {}) {
  const colors = readColors();
  const canvas = document.createElement('canvas');
  canvas.className = 'scale-canvas';
  canvas.setAttribute('role', 'img');
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: 'low-power' });
  if (!renderer.getContext()) throw new Error('no_webgl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(3, 8, 6);
  scene.add(sun);

  const disposables = [];
  const track = (x) => (disposables.push(x), x);
  const lambert = (color, extra = {}) => track(new THREE.MeshLambertMaterial({ color, ...extra }));

  const root = new THREE.Group();
  scene.add(root);

  // ---- frame
  const frameMat = lambert(colors.frame);
  const base = new THREE.Mesh(track(new THREE.CylinderGeometry(1.1, 1.3, 0.25, 24)), frameMat);
  base.position.y = 0.125;
  const pillar = new THREE.Mesh(track(new THREE.BoxGeometry(0.22, PIVOT_Y - 0.25, 0.22)), frameMat);
  pillar.position.y = 0.25 + (PIVOT_Y - 0.25) / 2;
  const pivot = new THREE.Group();
  pivot.position.y = PIVOT_Y;
  const beam = new THREE.Mesh(track(new THREE.BoxGeometry(ARM * 2 + 0.3, 0.14, 0.2)), frameMat);
  // Face sprite on the pivot: smiles when balanced, worried when tilted (feedback, not decoration).
  const faceTex = (color, worried) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = color; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(44, 52, 8, 0, Math.PI * 2); g.arc(84, 52, 8, 0, Math.PI * 2); g.fill();
    g.lineWidth = 8; g.lineCap = 'round'; g.beginPath();
    if (worried) { g.moveTo(40, 92); g.quadraticCurveTo(64, 70, 88, 92); } else { g.moveTo(40, 78); g.quadraticCurveTo(64, 102, 88, 78); }
    g.stroke();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return track(t);
  };
  const faceHappy = faceTex(colors.ok, false);
  const faceWorried = faceTex(colors.warn, true);
  const needle = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: faceHappy, depthTest: false })));
  needle.scale.set(0.75, 0.75, 1);
  needle.position.y = 0.55;
  pivot.add(beam, needle);
  root.add(base, pillar, pivot);

  // ---- pans
  const geoX = track(new THREE.BoxGeometry(0.4, 0.4, 0.4));
  const geoUnit = track(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 16));
  const geoBalloon = track(new THREE.SphereGeometry(0.22, 14, 10));
  const xTex = track(labelTexture('x', colors.varC, '#ffffff'));
  const matX = lambert(0xffffff, { map: xTex });
  const matUnit = lambert(colors.constC);
  const matBalloon = lambert(colors.balloon);
  const matXBalloon = lambert(0xffffff, { map: xTex, transparent: true, opacity: 0.85 });
  const ringMat = track(new THREE.MeshBasicMaterial({ color: colors.opC, transparent: true, opacity: 0 }));
  const geoRing = track(new THREE.TorusGeometry(1.2, 0.05, 8, 40));
  const plateMat = lambert(colors.frame);
  const geoPlate = track(new THREE.CylinderGeometry(1.2, 1.0, 0.12, 28));
  const lineMat = track(new THREE.LineBasicMaterial({ color: colors.frame }));

  function makePan() {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(geoPlate, plateMat);
    plate.position.y = -HANG;
    const strings = new THREE.LineSegments(
      track(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1.1, -HANG + 0.06, 0),
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.1, -HANG + 0.06, 0),
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -HANG + 0.06, 0.9),
      ])),
      lineMat,
    );
    const ring = new THREE.Mesh(geoRing, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -HANG - 0.02;
    const inst = {
      xBoxes: new THREE.InstancedMesh(geoX, matX, MAX_UNITS),
      units: new THREE.InstancedMesh(geoUnit, matUnit, MAX_UNITS),
      balloons: new THREE.InstancedMesh(geoBalloon, matBalloon, MAX_UNITS),
      xBalloons: new THREE.InstancedMesh(geoBalloon, matXBalloon, MAX_UNITS),
    };
    Object.values(inst).forEach((m) => { m.count = 0; g.add(m); });
    const label = textSprite(colors.text);
    label.position.y = -HANG + 0.6;
    label.visible = false;
    g.add(plate, strings, ring, label);
    root.add(g);
    return { g, inst, label, popScale: 1 };
  }
  const pans = { left: makePan(), right: makePan() };

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();

  function layoutPan(pan, objs, side) {
    const s = pan.popScale;
    sc.set(s, s, s);
    let i = 0;
    const top = -HANG + 0.06;
    const put = (mesh, idx, n, y) => {
      for (let k = 0; k < n; k++) {
        const p = slot(idx + k);
        v.set(p.x, y(p.layer), p.z);
        mesh.setMatrixAt(k, m4.compose(v, q, sc));
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    put(pan.inst.xBoxes, 0, objs.xBoxes, (l) => top + 0.2 + l * 0.42);
    i = objs.xBoxes;
    put(pan.inst.units, i, objs.units, (l) => top + 0.1 + l * 0.42);
    // Balloons float above the pan, pulling it up (negative values).
    const floatY = (l) => 0.9 - HANG + l * 0.45 + 0.6;
    put(pan.inst.xBalloons, 0, objs.xBalloons, floatY);
    const bOffset = objs.xBalloons;
    const bm = pan.inst.balloons;
    for (let k = 0; k < objs.balloons; k++) {
      const p = slot(bOffset + k);
      v.set(p.x, floatY(p.layer), p.z);
      bm.setMatrixAt(k, m4.compose(v, q, sc));
    }
    bm.count = objs.balloons;
    bm.instanceMatrix.needsUpdate = true;
    pan.g.userData.side = side;
  }

  // ---- state & animation
  let angle = 0;
  let targetAngle = 0;
  let reduced = prefersReducedMotion();
  let current = null;
  const tweens = [];
  let raf = 0;
  let lastT = 0;
  let fpsSamples = [];
  let fellBack = false;

  function placePans() {
    pivot.rotation.z = angle;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    pans.left.g.position.set(-ARM * c, PIVOT_Y - ARM * s, 0);
    pans.right.g.position.set(ARM * c, PIVOT_Y + ARM * s, 0);
    const wantFace = Math.abs(targetAngle) > 0.01 || Math.abs(angle) > 0.03 ? faceWorried : faceHappy;
    if (needle.material.map !== wantFace) { needle.material.map = wantFace; needle.material.needsUpdate = true; }
  }

  function render() {
    placePans();
    renderer.render(scene, camera);
  }

  function frame(t) {
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016;
    lastT = t;
    fpsSamples.push(dt);
    if (fpsSamples.length > 120) {
      const avg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
      fpsSamples = [];
      if (1 / avg < 20 && !fellBack) { fellBack = true; opts.onFallback?.('low_fps'); }
    }
    angle += (targetAngle - angle) * Math.min(1, dt * 7);
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const p = Math.min(1, (t - tw.t0) / tw.dur);
      tw.update(p);
      if (p >= 1) tweens.splice(i, 1);
    }
    render();
    if (tweens.length || Math.abs(targetAngle - angle) > 0.0005 || dragging) raf = requestAnimationFrame(frame);
    else { raf = 0; lastT = 0; angle = targetAngle; render(); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const tween = (dur, update) => {
    if (reduced) { update(1); render(); return; }
    tweens.push({ t0: performance.now(), dur, update });
    kick();
  };

  function resize() {
    const w = container.clientWidth || 320;
    const h = container.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the full width (both pans) and look slightly down so back-row objects stay visible.
    const hHalf = Math.atan(Math.tan(THREE.MathUtils.degToRad(17.5)) * camera.aspect);
    const dist = Math.max(7.5, 8.8 / 2 / Math.tan(hHalf));
    camera.position.set(0, 4.6, dist);
    camera.lookAt(0, 1.85, 0);
    camera.updateProjectionMatrix();
    render();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ---- gentle drag to rotate ±30°, springs back (design.md §4)
  let dragging = false;
  let startX = 0;
  let startRot = 0;
  const down = (e) => { dragging = true; startX = e.clientX; startRot = root.rotation.y; kick(); };
  const move = (e) => {
    if (!dragging) return;
    root.rotation.y = THREE.MathUtils.clamp(startRot + (e.clientX - startX) * 0.008, -0.52, 0.52);
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    const from = root.rotation.y;
    tween(500, (p) => { root.rotation.y = from * (1 - p) * (1 - p); });
  };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);

  function setSide(side, lin) {
    const pan = pans[side];
    const objs = sideObjects(lin);
    if (objs) {
      pan.label.visible = false;
      layoutPan(pan, objs, side);
    } else {
      Object.values(pan.inst).forEach((m) => { m.count = 0; });
      pan.label.visible = true;
      pan.label.userData.draw(formatLinear(lin));
    }
    return objs;
  }

  return {
    kind: '3d',
    /** @param {import('../engine/equation.js').Equation} eq */
    setEquation(eq, { animate = true } = {}) {
      current = eq;
      const doPop = animate && !reduced;
      for (const side of ['left', 'right']) {
        const pan = pans[side];
        if (doPop) pan.popScale = 0.6;
        setSide(side, eq[side].lin);
      }
      canvas.setAttribute('aria-label', `Timbangan: ${eq.left.text} di kiri, ${eq.right.text} di kanan`);
      if (doPop) {
        tween(260, (p) => {
          const s = 0.6 + 0.4 * (1 - (1 - p) ** 3);
          for (const side of ['left', 'right']) { pans[side].popScale = s; setSide(side, current[side].lin); }
        });
      } else render();
    },
    /** Purple ring on BOTH pans: the same operation is applied to both sides. */
    flash() {
      tween(650, (p) => { ringMat.opacity = Math.sin(p * Math.PI) * 0.9; });
    },
    /** -1 right heavier, 0 balanced, 1 left heavier. */
    setTilt(dir) {
      targetAngle = dir * MAX_TILT;
      if (reduced) { angle = targetAngle; render(); } else kick();
    },
    setReducedMotion(on) { reduced = on; },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      Object.values(pans).forEach((p) => {
        Object.values(p.inst).forEach((m) => m.dispose());
        p.label.material.map.dispose();
        p.label.material.dispose();
      });
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      canvas.remove();
    },
  };
}
