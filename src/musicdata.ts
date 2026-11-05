import type { Voice, Drum } from './voices';

// Pattern data for the sequencer. Grid = eighth notes, 8 per bar, a phrase = 4 bars = 32 steps.
// Melody chars: 0-9 = scale degree (7 = octave up), a/b/c = degrees -1/-2/-3, '.' rest, '-' hold the previous note. Spaces are ignored.
// Chord string: one scale-degree root per bar; triads are stacked in the mode. Perc strings: 8 chars per bar, 'x' = hit, 'o' = soft hit.
export interface Phrase { m: string; c: string }
export type Kit = Partial<Record<Drum, string>>;
export interface TrackDef {
  bpm: number; root: number; mode: number[];
  lead: Voice; chordV: Voice | null; bass: Voice; bassPat: string; chordPat: string;
  /** Percussion kits by intensity 0..2 (index = arrangement level). */
  kits: Kit[];
  drone?: Voice; bells?: boolean;
  phrases: Record<string, Phrase>;
  /** 8 phrases = 32 bars: [phrase id, intensity 0..2]. */
  arr: [string, number][];
  vol: number;
}
const MAJ = [0, 2, 4, 5, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10], LYD = [0, 2, 4, 6, 7, 9, 11], PHR = [0, 1, 3, 5, 7, 8, 10], PHD = [0, 1, 4, 5, 7, 8, 10], HMIN = [0, 2, 3, 5, 7, 8, 11];

export type TrackId = 'title' | 'sea0' | 'sea1' | 'sea2' | 'sea3' | 'boss';
export const TRACK_IDS: TrackId[] = ['title', 'sea0', 'sea1', 'sea2', 'sea3', 'boss'];

export const TRACKS: Record<TrackId, TrackDef> = {
  // Calm shanty in D dorian, 74 bpm: accordion lead over an oom-pah bass.
  title: {
    bpm: 74, root: 62, mode: DOR, lead: 'accordion', chordV: 'pluck', bass: 'bass', bassPat: 'r...f...', chordPat: '..x...x.', vol: 0.9,
    kits: [{}, { shaker: '..o...o.' }, { shaker: 'o.o.o.o.', kick: 'x.......' }],
    phrases: {
      A: { c: '0603', m: '0-24-4-2 2-0-a-0- 0-24-465 4-3-2---' },
      A2: { c: '0630', m: '0-24-4-2 2-0-a-0- 4-5-7-5- 7-4-2-0-' },
      B: { c: '2360', m: '4-6-7-64 5-3-5-7- 6-4-6-76 4-2-0---' },
    },
    arr: [['A', 0], ['A2', 1], ['B', 1], ['A', 1], ['A2', 2], ['B', 2], ['A', 1], ['A2', 0]],
  },
  // Sea 0 Calm: jaunty major-key shanty in G, 112 bpm, fiddle + accordion feel, snare on 2 and 4.
  sea0: {
    bpm: 112, root: 55 + 12, mode: MAJ, lead: 'fiddle', chordV: 'accordion', bass: 'bass', bassPat: 'r.f.r.f.', chordPat: '.x.x.x.x', vol: 0.8,
    kits: [{ shaker: 'o.o.o.o.' }, { kick: 'x...x...', snare: '..o...o.', shaker: 'o.o.o.o.' }, { kick: 'x.x.x.x.', snare: '..x...x.', hat: 'xoxoxoxo' }],
    phrases: {
      A: { c: '0340', m: '4-42-4-7 5-54-5-7 6-65-6-8 7---4--- ' },
      A2: { c: '0350', m: '7-75-7-9 8-85-8-7 6-54-5-6 4---2--- ' },
      B: { c: '5413', m: '5-7-9-75 4-6-8-64 3-5-7-53 4-2-0-.. ' },
      C: { c: '0430', m: '4.2.0.2. 4.5.6.5. 4.2.0.2. 3-2-0--- ' },
    },
    arr: [['A', 1], ['A2', 1], ['B', 1], ['A', 2], ['C', 1], ['B', 2], ['A2', 2], ['C', 0]],
  },
  // Sea 1 Reefs: bright lydian steel-drum lead in C, calypso 3+3+2 rhythm, marimba comping, 104 bpm.
  sea1: {
    bpm: 104, root: 72, mode: LYD, lead: 'steel', chordV: 'marimba', bass: 'sub', bassPat: 'r..r..r.', chordPat: '..x..x.x', vol: 0.8,
    kits: [{ shaker: 'o.oo.oo.' }, { kick: 'x..x..x.', shaker: 'o.oo.oo.', clap: '....x...' }, { kick: 'x..x..x.', snare: '....x...', shaker: 'xoxxoxxo', hat: '.o.o.o.o' }],
    phrases: {
      A: { c: '0304', m: '0--2--4. 6--4--2. 0--2--4- 7------. ' },
      A2: { c: '0304', m: '4--6--7. 9--7--6. 4--6--7- 6--4--2. ' },
      B: { c: '5342', m: '5--7--9. 7--5--4. 3--5--7- 5--4--2. ' },
    },
    arr: [['A', 1], ['A2', 1], ['B', 1], ['A', 2], ['A2', 2], ['B', 2], ['A', 2], ['A2', 1]],
  },
  // Sea 2 Fog: eerie phrygian in D, 58 bpm, drones and sparse bells; heartbeat kick only at the peak.
  sea2: {
    bpm: 58, root: 62 + 12, mode: PHR, lead: 'bell', chordV: null, bass: 'sub', bassPat: 'r.......', chordPat: '........', drone: 'drone', bells: true, vol: 0.85,
    kits: [{}, { hat: '........' }, { kick: 'x.......' }],
    phrases: {
      A: { c: '0010', m: '0.......  ..2.....  ........  4.......' },
      A2: { c: '1011', m: '..1.....  3.......  ..2.....  0.......' },
      B: { c: '5010', m: '4.....3.  ........  1.....0.  ..a.....' },
    },
    arr: [['A', 0], ['A2', 0], ['B', 1], ['A', 1], ['B', 1], ['A2', 2], ['B', 2], ['A', 0]],
  },
  // Sea 3 Volcanic: phrygian dominant in E, 88 bpm, taiko and toms, slow low brass over a sub.
  sea3: {
    bpm: 88, root: 52, mode: PHD, lead: 'brass', chordV: 'brass', bass: 'sub', bassPat: 'r..r..r.', chordPat: 'x.......', drone: 'drone', vol: 0.8,
    kits: [{ taiko: 'x.......' }, { taiko: 'x.....x.', tom: '....o...' }, { taiko: 'x..x..x.', tom: '..o.o.xx', hat: 'o.o.o.o.' }],
    phrases: {
      A: { c: '0010', m: '0--1--0- 4------- 0--1--4- 3--1----' },
      A2: { c: '0150', m: '4--5--4- 3--1--0- 1--0--a- 0-------' },
      B: { c: '5461', m: '5--4--5- 7--5--4- 5--4--1- 0-------' },
    },
    arr: [['A', 0], ['A2', 1], ['A', 1], ['B', 1], ['A2', 2], ['B', 2], ['A', 2], ['A2', 1]],
  },
  // Boss: urgent harmonic minor in A, 142 bpm, driving kick/snare, brass ostinato.
  boss: {
    bpm: 142, root: 57, mode: HMIN, lead: 'brass', chordV: 'pluck', bass: 'bass', bassPat: 'rrrrrrrr', chordPat: 'x.xxx.xx', vol: 0.85,
    kits: [{ kick: 'x.x.x.x.', hat: 'xxxxxxxx' }, { kick: 'x.x.x.x.', snare: '..x...x.', hat: 'xxxxxxxx' }, { kick: 'x.xxx.x.', snare: '..x...xx', hat: 'xxxxxxxx', taiko: 'x.......' }],
    phrases: {
      A: { c: '0050', m: '0-0-2-3- 0-0-4-3- 0-0-2-3- 4-3-2-1-' },
      A2: { c: '0450', m: '7-7-9-8- 7-7-6-5- 7-7-5-4- 3-2-1-0-' },
      B: { c: '5412', m: '5-5-7-6- 4-4-6-5- 3-3-5-4- 6-5-4-.. ' },
    },
    arr: [['A', 1], ['A', 2], ['A2', 2], ['B', 2], ['A', 2], ['A2', 2], ['B', 2], ['A2', 1]],
  },
};
