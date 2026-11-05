import type { Bus } from './audio';

// Ambience bed: looped noise layers (waves, wind, rumble) whose levels follow the current sea, plus occasional gulls and fog horns.
// The graph is built once; switching sea only moves gain targets (no node churn).
export interface Amb { waves: number; wind: number; rumble: number; gulls: number; horn: number }
/** waves / wind / rumble are 0..1 levels; gulls and horn are events per minute. */
export const AMB: Record<string, Amb> = {
  title: { waves: 0.6, wind: 0.15, rumble: 0, gulls: 3, horn: 0 },
  sea0: { waves: 0.7, wind: 0.25, rumble: 0, gulls: 5, horn: 0 },
  sea1: { waves: 0.9, wind: 0.2, rumble: 0, gulls: 7, horn: 0 },
  sea2: { waves: 0.35, wind: 0.55, rumble: 0, gulls: 0.5, horn: 3 },
  sea3: { waves: 0.3, wind: 0.3, rumble: 0.9, gulls: 0, horn: 0 },
};
const BED = 0.22; // overall bed level, low under the music

interface Graph { b: Bus; out: GainNode; waves: GainNode; wind: GainNode; rum: GainNode; cfg: Amb | null; level: number }
let g: Graph | null = null;

function loopNoise(b: Bus): AudioBufferSourceNode {
  const s = b.ctx.createBufferSource();
  s.buffer = b.noise; s.loop = true; s.start(0, Math.random() * 0.5);
  return s;
}
function lfo(b: Bus, hz: number, depth: number, target: AudioParam): void {
  const o = b.ctx.createOscillator(), d = b.ctx.createGain();
  o.frequency.value = hz; d.gain.value = depth; o.connect(d).connect(target); o.start();
}
function build(b: Bus): Graph {
  const c = b.ctx, out = c.createGain();
  out.gain.value = 0; out.connect(b.sfx);
  const layer = (type: BiquadFilterType, f: number, q: number): { fl: BiquadFilterNode; sw: GainNode; lvl: GainNode } => {
    const fl = c.createBiquadFilter(), sw = c.createGain(), lvl = c.createGain();
    fl.type = type; fl.frequency.value = f; fl.Q.value = q; sw.gain.value = 0.55; lvl.gain.value = 0;
    loopNoise(b).connect(fl).connect(sw).connect(lvl).connect(out);
    return { fl, sw, lvl };
  };
  const w = layer('lowpass', 700, 0.5), wi = layer('bandpass', 520, 0.9), ru = layer('lowpass', 90, 0.7);
  // slow swells: waves breathe every ~9 s, wind drifts in pitch and level
  lfo(b, 0.11, 0.45, w.sw.gain);
  lfo(b, 0.06, 220, wi.fl.frequency);
  lfo(b, 0.045, 0.4, wi.sw.gain);
  const sub = c.createOscillator();
  sub.frequency.value = 42; sub.connect(ru.lvl); sub.start();
  return { b, out, waves: w.lvl, wind: wi.lvl, rum: ru.lvl, cfg: null, level: 1 };
}
const ease = (p: AudioParam, v: number, now: number): void => { p.setTargetAtTime(v, now, 1.2); };

function gull(b: Bus): void {
  const c = b.ctx, t0 = c.currentTime + 0.02, n = 2 + Math.floor(Math.random() * 3), f = 0.85 + Math.random() * 0.3;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * 0.27, o = c.createOscillator(), e = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1500 * f, t); o.frequency.linearRampToValueAtTime(2500 * f, t + 0.1); o.frequency.exponentialRampToValueAtTime(1300 * f, t + 0.3);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.14, t + 0.03); e.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(e).connect(g!.out); o.start(t); o.stop(t + 0.35);
  }
}
function horn(b: Bus): void {
  const c = b.ctx, t = c.currentTime + 0.02, e = c.createGain(), fl = c.createBiquadFilter();
  fl.type = 'lowpass'; fl.frequency.value = 380;
  e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.5, t + 0.5); e.gain.setValueAtTime(0.5, t + 1.7); e.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
  fl.connect(e).connect(g!.out);
  for (const [f, dt] of [[73.4, -6], [110, 5]] as const) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + 3.3); }
}
let tick = 0;
/** Moves the bed toward `cfg` (null = silent) scaled by `level` (ducking). Call every frame; cheap. */
export function setAmbience(b: Bus, cfg: Amb | null, level: number): void {
  if (!g) { g = build(b); tick = window.setInterval(() => {
    const s = g; if (!s || !s.cfg || s.level < 0.1 || s.b.ctx.state !== 'running') return;
    if (Math.random() < s.cfg.gulls / 60) gull(s.b);
    if (Math.random() < s.cfg.horn / 60) horn(s.b);
  }, 1000); }
  if (g.cfg === cfg && g.level === level) return;
  g.cfg = cfg; g.level = level;
  const now = b.ctx.currentTime, c = cfg ?? { waves: 0, wind: 0, rumble: 0, gulls: 0, horn: 0 };
  ease(g.out.gain, BED * level, now); ease(g.waves.gain, c.waves, now); ease(g.wind.gain, c.wind, now); ease(g.rum.gain, c.rumble, now);
}
export const ambienceView = (): { on: boolean; tick: number } => ({ on: !!g?.cfg, tick });
