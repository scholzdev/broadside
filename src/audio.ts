// Synthesized WebAudio only; no asset files. Never throws into game code.
export type Sound = 'boom' | 'hit' | 'splash' | 'explode' | 'pickup' | 'levelup' | 'hurt' | 'horn' | 'ready' | 'zap' | 'whoosh' | 'fire' | 'heal' | 'clang' | 'coin' | 'swirl' | 'tithe' | 'snipe' | 'launch';

const KEY = 'broadside.muted', VKEY = 'broadside.volume';
let ctx: AudioContext | null = null, master: GainNode | null = null, meter: AnalyserNode | null = null, noise: AudioBuffer | null = null, sfx: GainNode | null = null, musicBus: GainNode | null = null;
/** volume = master; music / sfx are the two bus sliders (settings.ts persists all three). */
export const audio = { muted: true, volume: 0.5, music: 0.5, sfx: 0.85 };
/** settings.ts hooks in here to persist audio changes (including the M key). */
export const onAudio: { f?: () => void } = {};
try {
  // always launch muted (user request); M or the settings toggle unmutes
  const v = parseFloat(localStorage.getItem(VKEY) ?? '');
  if (v >= 0 && v <= 1) audio.volume = v;
} catch { /* storage unavailable */ }
const TRIM = 0.3; // global output trim: full slider = old 30%
const gain = (): number => (audio.muted ? 0 : audio.volume * TRIM);
export function setMuted(m: boolean): void {
  audio.muted = m;
  try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ }
  onAudio.f?.();
  if (master) master.gain.value = gain();
}
const level = (v: number): number => Math.min(1, Math.max(0, v));
export function setMusicVol(v: number): void { audio.music = level(v); onAudio.f?.(); if (musicBus) musicBus.gain.value = audio.music; }
export function setSfxVol(v: number): void { audio.sfx = level(v); onAudio.f?.(); if (sfx) sfx.gain.value = audio.sfx; }
export interface Bus { ctx: AudioContext; music: GainNode; sfx: GainNode; noise: AudioBuffer }
/** The running audio graph, or null before the first user gesture. */
export function bus(): Bus | null { return ctx && musicBus && sfx && noise && ctx.state === 'running' ? { ctx, music: musicBus, sfx, noise } : null; }
/** Final output (after the limiter) as time-domain samples, or null before audio is up. Only read by debug tooling. */
export function outputLevel(): Float32Array | null {
  if (!meter) return null;
  const a = new Float32Array(meter.fftSize);
  meter.getFloatTimeDomainData(a);
  return a;
}
export function setVolume(v: number): void {
  audio.volume = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(VKEY, String(audio.volume)); } catch { /* ignore */ }
  onAudio.f?.();
  if (master) master.gain.value = gain();
}

function unlock(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = gain();
      const comp = ctx.createDynamicsCompressor(); // limiter-ish: keeps music + sfx from clipping
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2;
      master.connect(comp).connect(ctx.destination);
      meter = ctx.createAnalyser(); meter.fftSize = 2048; comp.connect(meter); // level tap for the QA meter (outputs nothing)
      sfx = ctx.createGain(); sfx.gain.value = audio.sfx; sfx.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = audio.music; musicBus.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}
addEventListener('keydown', e => {
  unlock();
  if (e.code === 'KeyM' && !e.repeat) setMuted(!audio.muted);
});
addEventListener('pointerdown', unlock);

const recent = new Map<Sound, number[]>();
function allowed(s: Sound): boolean {
  const now = performance.now(), a = (recent.get(s) ?? []).filter(t => now - t < 60);
  if (a.length >= 4) { recent.set(s, a); return false; }
  a.push(now); recent.set(s, a);
  return true;
}

const vary = (): number => 0.92 + Math.random() * 0.16;
function burst(at: number, dur: number, f0: number, f1: number, gain: number, type: BiquadFilterType = 'lowpass'): void {
  if (!ctx || !sfx || !noise) return;
  const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise; flt.type = type;
  flt.frequency.setValueAtTime(f0, at); flt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
  g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  src.connect(flt).connect(g).connect(sfx);
  src.start(at, Math.random() * 0.5, dur);
}
function tone(at: number, dur: number, f0: number, f1: number, gain: number, type: OscillatorType = 'sine', attack = 0.003): void {
  if (!ctx || !sfx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), at + dur);
  g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(gain, at + attack); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(sfx);
  o.start(at); o.stop(at + dur + 0.02);
}

let combo = 0, lastPick = -9;
export function play(s: Sound): void {
  try {
    if (!ctx || audio.muted || ctx.state !== 'running' || !allowed(s)) return;
    const t = ctx.currentTime, v = vary();
    switch (s) {
      case 'boom': burst(t, 0.28, 900 * v, 180, 0.7); tone(t, 0.22, 130 * v, 38, 0.8); break;
      case 'hit': burst(t, 0.07, 2200 * v, 900, 0.5, 'bandpass'); tone(t, 0.09, 220 * v, 90, 0.35, 'square'); break;
      case 'splash': burst(t, 0.32, 2400 * v, 500, 0.4, 'bandpass'); break;
      case 'explode': burst(t, 0.6, 1400 * v, 90, 0.9); tone(t, 0.45, 90 * v, 28, 0.9); break;
      case 'pickup': {
        const now = performance.now() / 1000;
        combo = now - lastPick < 0.5 ? Math.min(combo + 1, 14) : 0;
        lastPick = now;
        tone(t, 0.1, 620 * Math.pow(1.0595, combo * 2) * v, 700 * Math.pow(1.0595, combo * 2) * v, 0.28, 'triangle');
        break;
      }
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.09, 0.22, f, f * 1.002, 0.3, 'triangle')); break;
      case 'hurt': tone(t, 0.28, 160 * v, 45, 0.9); burst(t, 0.18, 500, 120, 0.5); break;
      case 'ready': tone(t, 0.12, 880, 1320, 0.18, 'triangle'); tone(t + 0.07, 0.16, 1320, 1760, 0.14, 'triangle'); break;
      case 'zap': burst(t, 0.22, 6000 * v, 1200, 0.5, 'highpass'); tone(t, 0.16, 900 * v, 140, 0.3, 'sawtooth'); break;
      case 'whoosh': burst(t, 0.45, 300, 2200 * v, 0.55, 'bandpass'); tone(t, 0.3, 90, 220, 0.25, 'triangle'); break;
      case 'fire': burst(t, 0.4, 1800 * v, 400, 0.55, 'bandpass'); tone(t, 0.3, 120 * v, 60, 0.3, 'sawtooth'); break;
      case 'heal': [660, 880, 1100].forEach((f, i) => tone(t + i * 0.08, 0.3, f, f * 1.01, 0.2, 'sine')); break;
      case 'clang': tone(t, 0.35, 1400 * v, 900, 0.35, 'square'); tone(t, 0.5, 2100 * v, 1500, 0.2, 'triangle'); burst(t, 0.1, 5000, 2000, 0.4, 'highpass'); break;
      case 'coin': tone(t, 0.1, 1568, 1568, 0.22, 'triangle'); tone(t + 0.07, 0.25, 2093, 2093, 0.22, 'triangle'); break;
      case 'swirl': burst(t, 0.9, 300, 1800 * v, 0.5, 'bandpass'); tone(t, 0.8, 70, 240, 0.4, 'sine'); break;
      case 'tithe': tone(t, 0.5, 220 * v, 55, 0.6, 'sawtooth'); burst(t, 0.4, 900, 150, 0.5); break;
      case 'snipe': burst(t, 0.12, 6000 * v, 900, 0.7, 'highpass'); tone(t, 0.35, 1800 * v, 300, 0.35, 'square'); tone(t + 0.05, 0.5, 90, 40, 0.5); break;
      case 'launch': burst(t, 0.5, 700, 3200 * v, 0.5, 'bandpass'); tone(t, 0.35, 160 * v, 420, 0.25, 'sawtooth'); break;
      case 'horn': tone(t, 1.1, 98, 96, 0.5, 'sawtooth', 0.15); tone(t, 1.1, 147, 145, 0.3, 'sawtooth', 0.2); break;
    }
  } catch { /* audio must never break the game */ }
}
