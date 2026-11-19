// Original "sneaky detective" background tune, synthesised with Web Audio (no audio files, no copyright).
// A minor, 112 bpm, swung eighths, 8-bar loop: pizzicato walking bass + vibraphone motif + finger snaps.
// Never autoplays: it starts only after the student taps the 🎵 button (AGENTS.md §2.4).
// Mode 'focus' (problem screens): quieter, melody muted — the "slow" version chosen by the developer (v1.10).

export const BPM = 112;
export const STEPS = 64; // 8 bars × 8 swung eighths

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
/** "A4" → 440 Hz (equal temperament). */
export function freq(name) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`nada tidak dikenal: ${name}`);
  const midi = (Number(m[2]) + 1) * 12 + NOTE[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

const BASS_BARS = [
  ['A2', 'C3', 'E3', 'G3'], ['A2', 'C3', 'D#3', 'E3'], ['F2', 'A2', 'C3', 'E3'], ['E2', 'G#2', 'B2', 'D3'],
  ['A2', 'C3', 'E3', 'G3'], ['A2', 'C3', 'D#3', 'E3'], ['F2', 'A2', 'E2', 'G#2'], ['A2', 'E2', 'A2', null],
];
const MELODY_BARS = [
  ['E5', null, null, 'D#5', 'E5', null, 'C5', null], ['B4', null, null, 'A4', 'B4', null, 'G#4', null],
  ['A4', null, 'C5', null, 'E5', null, 'A5', null], ['G#5', null, null, 'F5', 'E5', null, 'D5', null],
  ['E5', null, null, 'D#5', 'E5', null, 'C5', null], ['B4', null, null, 'A4', 'B4', null, 'D5', null],
  ['C5', null, 'A4', null, 'E5', null, 'D#5', null], ['E5', null, null, null, 'A4', null, null, null],
];

/** Pure description of the loop: per eighth-step, which voices sound. */
export function buildLoop() {
  return Array.from({ length: STEPS }, (_, i) => {
    const bar = Math.floor(i / 8);
    const e = i % 8;
    return {
      bass: e % 2 === 0 ? BASS_BARS[bar][e / 2] : null,
      melody: MELODY_BARS[bar][e],
      snap: e === 2 || e === 6,
      tick: e % 2 === 1,
    };
  });
}

let ctx = null;
let master = null;
let melodyBus = null;
let timer = null;
let step = 0;
let nextTime = 0;
let mode = 'menu';
let noise = null;
const LOOP = buildLoop();
const listeners = new Set();
const VOL = { menu: 0.2, focus: 0.07 };

export const isPlaying = () => Boolean(timer);
export function onMusicChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => fn(isPlaying()));

function noiseBuffer() {
  const b = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function env(g, t, peak, decay, attack = 0.005) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

function pizz(note, t) {
  const o = ctx.createOscillator(); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = freq(note);
  f.type = 'lowpass'; f.frequency.value = 900;
  env(g, t, 0.55, 0.38);
  o.connect(f).connect(g).connect(master);
  o.start(t); o.stop(t + 0.42);
}

function vibes(note, t) {
  const g = ctx.createGain(); const trem = ctx.createGain(); const lfo = ctx.createOscillator(); const depth = ctx.createGain();
  lfo.frequency.value = 5.5; depth.gain.value = 0.25; lfo.connect(depth).connect(trem.gain); trem.gain.value = 0.75;
  for (const [mult, amp] of [[1, 0.32], [4, 0.05]]) {
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq(note) * mult; og.gain.value = amp;
    o.connect(og).connect(g); o.start(t); o.stop(t + 1.3);
  }
  env(g, t, 1, 1.2, 0.01);
  g.connect(trem).connect(melodyBus);
  lfo.start(t); lfo.stop(t + 1.3);
}

function burst(t, type, freqHz, peak, decay) {
  const s = ctx.createBufferSource(); const f = ctx.createBiquadFilter(); const g = ctx.createGain();
  s.buffer = noise; f.type = type; f.frequency.value = freqHz;
  env(g, t, peak, decay, 0.002);
  s.connect(f).connect(g).connect(master);
  s.start(t); s.stop(t + decay + 0.02);
}

function schedule() {
  const eighth = 60 / BPM / 2;
  while (nextTime < ctx.currentTime + 0.15) {
    const s = LOOP[step];
    const swing = step % 2 === 1 ? eighth * 0.33 : 0;
    const t = nextTime + swing;
    if (s.bass) pizz(s.bass, t);
    if (s.melody) vibes(s.melody, t);
    if (s.snap) burst(t, 'bandpass', 2200, 0.35, 0.07);
    if (s.tick && mode === 'menu') burst(t, 'highpass', 7000, 0.06, 0.03);
    step = (step + 1) % STEPS;
    nextTime += eighth;
  }
}

function applyMode(now = true) {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.linearRampToValueAtTime(VOL[mode], t + (now ? 0.6 : 0));
  melodyBus.gain.cancelScheduledValues(t);
  melodyBus.gain.linearRampToValueAtTime(mode === 'menu' ? 1 : 0, t + 0.6);
}

/** Start (must be called from a tap). */
export function startMusic() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC || timer) return;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    melodyBus = ctx.createGain(); melodyBus.connect(master);
    noise = noiseBuffer();
  }
  ctx.resume?.();
  step = 0; nextTime = ctx.currentTime + 0.05;
  applyMode();
  timer = setInterval(schedule, 25);
  schedule();
  emit();
}

export function stopMusic() {
  if (!timer) return;
  clearInterval(timer); timer = null;
  if (ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2); }
  emit();
}

/** 'menu' = full tune; 'focus' = quiet bass + snaps only (problem screens). */
export function setMusicMode(m) {
  mode = m === 'focus' ? 'focus' : 'menu';
  applyMode();
}

// Pause when the app is hidden (battery), resume when it comes back if it was on.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend?.(); else if (timer) ctx.resume?.();
  });
}
