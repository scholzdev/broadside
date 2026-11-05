import type { Bus } from './audio';
import { note, drum, type Out, type Voice } from './voices';

// Short one-shot jingles, played straight onto the music bus (not ducked).
export type Stinger = 'victory' | 'death' | 'levelup' | 'boss';
type N = [Voice, number, number, number]; // voice, time offset (s), midi, duration (s)
const SCORES: Record<Stinger, { notes: N[]; hits?: [Parameters<typeof drum>[1], number][]; vol: number }> = {
  levelup: { vol: 0.55, notes: [['bell', 0, 79, 1], ['bell', 0.1, 83, 1], ['bell', 0.2, 86, 1], ['bell', 0.3, 91, 1.4]] },
  victory: { vol: 0.9, hits: [['taiko', 0], ['kick', 0.55], ['taiko', 1.1]], notes: [
    ['brass', 0, 55, 0.3], ['brass', 0.33, 55, 0.3], ['brass', 0.66, 59, 0.3], ['brass', 1, 62, 0.6], ['brass', 1.65, 59, 0.25], ['brass', 2, 67, 1.6],
    ['accordion', 2, 71, 1.6], ['accordion', 2, 74, 1.6], ['bell', 2.05, 79, 2], ['bell', 2.2, 86, 2], ['bass', 2, 43, 1.6]] },
  death: { vol: 0.85, hits: [['taiko', 0.05]], notes: [
    ['brass', 0, 57, 0.9], ['brass', 0.9, 55, 0.9], ['brass', 1.8, 52, 1.2], ['sub', 0, 33, 3], ['sub', 2.5, 28, 2], ['bell', 0.1, 69, 3], ['bell', 2.9, 45, 3]] },
  boss: { vol: 0.9, hits: [['tom', 0], ['tom', 0.15], ['tom', 0.3], ['tom', 0.45], ['taiko', 0.6]], notes: [
    ['sub', 0, 36, 1.5], ['brass', 0, 40, 1.4], ['brass', 0, 46, 1.4], ['brass', 0.6, 52, 1.2]] },
};
export function playStinger(b: Bus, s: Stinger): void {
  const sc = SCORES[s], g = b.ctx.createGain(), t = b.ctx.currentTime + 0.05;
  g.gain.value = sc.vol; g.connect(b.music);
  const o: Out = { c: b.ctx, to: g, noise: b.noise };
  for (const [v, dt, m, d] of sc.notes) note(o, v, t + dt, m, d, 0.9);
  for (const [d, dt] of sc.hits ?? []) drum(o, d, t + dt, 1);
  window.setTimeout(() => g.disconnect(), 6000);
}
