// Synthesized instruments for the music sequencer. Every voice builds a few short-lived nodes that stop themselves.
export type Voice = 'accordion' | 'fiddle' | 'steel' | 'marimba' | 'bell' | 'brass' | 'pluck' | 'bass' | 'sub' | 'drone';
export type Drum = 'kick' | 'snare' | 'hat' | 'shaker' | 'tom' | 'taiko' | 'clap';
export interface Out { c: AudioContext; to: AudioNode; noise: AudioBuffer }

const hz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
export { hz };

function env(o: Out, t: number, a: number, peak: number, hold: number, rel: number, dest: AudioNode): GainNode {
  const g = o.c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold);
  g.gain.exponentialRampToValueAtTime(0.0002, t + a + hold + rel);
  g.connect(dest);
  return g;
}
function osc(o: Out, type: OscillatorType, f: number, t: number, end: number, dest: AudioNode, detune = 0): void {
  const n = o.c.createOscillator();
  n.type = type; n.frequency.value = f; n.detune.value = detune;
  n.connect(dest); n.start(t); n.stop(end);
}
function lp(o: Out, f: number, q: number, dest: AudioNode, type: BiquadFilterType = 'lowpass'): BiquadFilterNode {
  const b = o.c.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(dest);
  return b;
}
function hit(o: Out, t: number, dur: number, f: number, q: number, type: BiquadFilterType, peak: number, dest: AudioNode = o.to): void {
  const s = o.c.createBufferSource(), fl = lp(o, f, q, dest, type);
  s.buffer = o.noise;
  s.connect(env(o, t, 0.002, peak, 0, dur, fl));
  s.start(t, Math.random() * 0.5, dur + 0.05);
}
/** Inharmonic partial stack (marimba / steel drum / bell): [ratio, level, decay seconds]. */
function partials(o: Out, t: number, f: number, v: number, parts: [number, number, number][]): void {
  for (const [r, l, d] of parts) {
    if (f * r > 9000) continue;
    const g = env(o, t, 0.004, v * l, 0, d, o.to);
    osc(o, 'sine', f * r, t, t + d + 0.1, g);
  }
}

export function note(o: Out, v: Voice, t: number, midi: number, dur: number, vel: number): void {
  const f = hz(midi), end = t + dur + 0.5;
  switch (v) {
    case 'accordion': { // two detuned squares through a lowpass, soft attack, breathing release
      const g = env(o, t, 0.03, vel * 0.5, Math.max(0.05, dur - 0.05), 0.3, o.to), fl = lp(o, 1700, 0.8, g);
      osc(o, 'square', f, t, end, fl, -7); osc(o, 'square', f, t, end, fl, 7); osc(o, 'sawtooth', f, t, end, fl, 0);
      break;
    }
    case 'fiddle': { const g = env(o, t, 0.06, vel * 0.5, Math.max(0.05, dur - 0.05), 0.25, o.to), fl = lp(o, 2600, 1.5, g); osc(o, 'sawtooth', f, t, end, fl, -5); osc(o, 'sawtooth', f, t, end, fl, 6); break; }
    case 'steel': partials(o, t, f, vel * 0.55, [[1, 1, 0.7], [2, 0.5, 0.45], [3.01, 0.25, 0.3], [4.2, 0.1, 0.18]]); break;
    case 'marimba': partials(o, t, f, vel * 0.7, [[1, 1, 0.45], [3.9, 0.35, 0.12], [9.2, 0.08, 0.05]]); break;
    case 'bell': partials(o, t, f, vel * 0.45, [[1, 1, 3.2], [2.76, 0.5, 2.2], [5.4, 0.3, 1.4], [8.9, 0.12, 0.8]]); break;
    case 'pluck': { const g = env(o, t, 0.004, vel * 0.5, 0, Math.min(dur + 0.2, 0.9), o.to), fl = lp(o, 1500, 1, g); fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(500, t + 0.4); osc(o, 'square', f, t, end, fl); break; }
    case 'brass': { // saw with a filter that opens on the attack
      const g = env(o, t, 0.09, vel * 0.55, Math.max(0.05, dur - 0.1), 0.25, o.to), fl = lp(o, 500, 1.2, g);
      fl.frequency.setValueAtTime(500, t); fl.frequency.linearRampToValueAtTime(1800, t + 0.15); fl.frequency.exponentialRampToValueAtTime(900, t + dur + 0.2);
      osc(o, 'sawtooth', f, t, end, fl, -6); osc(o, 'sawtooth', f, t, end, fl, 6);
      break;
    }
    case 'bass': { const g = env(o, t, 0.006, vel * 0.8, 0, Math.min(dur + 0.15, 0.7), o.to), fl = lp(o, 420, 0.8, g); osc(o, 'triangle', f, t, end, fl); osc(o, 'square', f, t, end, fl, 3); break; }
    case 'sub': { const g = env(o, t, 0.02, vel * 0.9, Math.max(0.05, dur - 0.1), 0.35, o.to); osc(o, 'sine', f, t, end, g); osc(o, 'triangle', f * 2, t, end, g); break; }
    case 'drone': { // long detuned saws under a very low lowpass
      const l = dur + 1.5, g = env(o, t, 1.2, vel * 0.35, Math.max(0.1, dur - 0.5), 1.4, o.to), fl = lp(o, 260, 2, g);
      osc(o, 'sawtooth', f, t, t + l + 1, fl, -9); osc(o, 'sawtooth', f, t, t + l + 1, fl, 9); osc(o, 'sine', f / 2, t, t + l + 1, g);
      break;
    }
  }
}

export function drum(o: Out, d: Drum, t: number, vel: number): void {
  switch (d) {
    case 'kick': { const g = env(o, t, 0.002, vel * 0.9, 0, 0.22, o.to), n = o.c.createOscillator(); n.frequency.setValueAtTime(130, t); n.frequency.exponentialRampToValueAtTime(42, t + 0.12); n.connect(g); n.start(t); n.stop(t + 0.3); break; }
    case 'snare': hit(o, t, 0.16, 1800, 0.7, 'bandpass', vel * 0.6); { const g = env(o, t, 0.002, vel * 0.3, 0, 0.09, o.to); osc(o, 'triangle', 190, t, t + 0.15, g); } break;
    case 'clap': hit(o, t, 0.1, 1400, 1, 'bandpass', vel * 0.5); hit(o, t + 0.02, 0.12, 1400, 1, 'bandpass', vel * 0.4); break;
    case 'hat': hit(o, t, 0.04, 7000, 0.5, 'highpass', vel * 0.22); break;
    case 'shaker': hit(o, t, 0.07, 5500, 0.8, 'bandpass', vel * 0.28); break;
    case 'tom': { const g = env(o, t, 0.003, vel * 0.8, 0, 0.35, o.to), n = o.c.createOscillator(); n.frequency.setValueAtTime(150, t); n.frequency.exponentialRampToValueAtTime(70, t + 0.25); n.connect(g); n.start(t); n.stop(t + 0.45); break; }
    case 'taiko': { const g = env(o, t, 0.004, vel, 0, 0.6, o.to), n = o.c.createOscillator(); n.frequency.setValueAtTime(95, t); n.frequency.exponentialRampToValueAtTime(48, t + 0.4); n.connect(g); n.start(t); n.stop(t + 0.7); hit(o, t, 0.1, 500, 0.7, 'lowpass', vel * 0.4); break; }
  }
}
