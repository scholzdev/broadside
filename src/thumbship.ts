import { Builder, V3, shade } from './geo';
import * as THREE from 'three';
import { C, box, cyl, prim, rod, tube, cannon, keg } from './dressing/kit';
import { CREW, DECKHAND, figureGeo } from './dressing/figures';

// ---- small hero objects for the ship-upgrade card thumbnails (same primitive kit as the dressing), built around the origin ----

const glow = (c: number, g = 2.4) => ({ emit: c, glow: g });
const GOLD = 0xf2c14e;

/** Wooden gun carriage with four trucks, the barrel resting on it pointing toward +z. */
function carriage(b: Builder, x: number, y: number, z: number, s: number, band: number): void {
  box(b, C.wood, [x, y + 0.14 * s, z], [0.42 * s, 0.16 * s, 0.7 * s]);
  for (const sx of [1, -1]) {
    box(b, shade(C.wood, 0.8), [x + sx * 0.19 * s, y + 0.3 * s, z - 0.08 * s], [0.06 * s, 0.26 * s, 0.5 * s]);
    for (const dz of [-0.24, 0.22]) cyl(b, C.dark, [x + sx * 0.23 * s, y + 0.1 * s, z + dz * s], 0.1 * s, 0.06 * s, [0, 0, Math.PI / 2], 10);
  }
  cannon(b, [x, y + 0.38 * s, z - 0.42 * s], [x, y + 0.46 * s, z + 0.62 * s], 0.13 * s, band);
}

/** A plus sign standing upright, glowing gold. */
function plus(b: Builder, at: V3, s: number): void {
  box(b, GOLD, at, [0.12 * s, 0.42 * s, 0.12 * s], [0, 0, 0], glow(0xffb020, 1.4));
  box(b, GOLD, at, [0.42 * s, 0.12 * s, 0.12 * s], [0, 0, 0], glow(0xffb020, 1.4));
}

/** Billowed cloth panel hanging from y = top, w wide and h tall, belly toward +z. */
function sail(b: Builder, y: number, w: number, h: number, belly: number, col: number, stripe?: number): void {
  const nx = 6, ny = 5, p = (u: number, v: number): V3 => [(u - 0.5) * w * (1 - 0.12 * v), y - v * h, belly * Math.sin(Math.PI * u) * Math.sin(Math.PI * (0.15 + v * 0.8))];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
    const c = stripe !== undefined && j === 2 ? stripe : col;
    b.quad(p(u0, v0), p(u0, v1), p(u1, v1), p(u1, v0), c, { jitter: 0.03, emit: c, glow: 0.12 });
  }
}

export const SHIP_UP: Record<string, (b: Builder) => void> = {
  /** Extra cannon: a gun on its carriage with a gold plus beside it. */
  cannon(b) {
    carriage(b, 0, 0, 0, 1.2, C.brass);
    plus(b, [0.62, 0.95, 0.15], 1.1);
  },
  /** Fire rate: a brass-capped hourglass, sand running, a powder keg at its foot. */
  rate(b) {
    for (const y of [0, 1.1]) cyl(b, C.brass, [0, y, 0], 0.42, 0.08, undefined, 10);
    for (let i = 0; i < 3; i++) {
      const an = (i / 3) * Math.PI * 2 + 0.4;
      cyl(b, C.wood, [Math.cos(an) * 0.34, 0.55, Math.sin(an) * 0.34], 0.035, 1.05, undefined, 6);
    }
    const glass = 0xcfe6f0;
    prim(b, 'cone8', glass, [0, 0.82, 0], [0.3, 0.5, 0.3], [Math.PI, 0, 0], glow(0x9fd0ff, 0.25));
    prim(b, 'cone8', glass, [0, 0.29, 0], [0.3, 0.5, 0.3], [0, 0, 0], glow(0x9fd0ff, 0.25));
    prim(b, 'cone8', 0xe0a94a, [0, 0.16, 0], [0.26, 0.24, 0.26], [0, 0, 0], glow(0xffa040, 0.5));
    prim(b, 'cone8', 0xe0a94a, [0, 0.9, 0], [0.16, 0.18, 0.16], [Math.PI, 0, 0], glow(0xffa040, 0.5));
    rod(b, [0, 0.8, 0], [0, 0.28, 0], 0.015, 0xffc060, 3, glow(0xffa040, 1.2));
    keg(b, [0.55, 0.2, 0.35], 0.17, 0.4, C.red, C.black);
  },
  /** Chain shot: two iron balls joined by a short chain. */
  chain(b) {
    const a: V3 = [-0.62, 0.32, -0.25], c: V3 = [0.62, 0.72, 0.25], n = 6;
    for (const p of [a, c]) { prim(b, 'sph', C.iron, p, 0.3); prim(b, 'sph', C.ironHi, [p[0], p[1] + 0.12, p[2] + 0.1], 0.12); }
    for (let i = 1; i < n; i++) {
      const k = i / n, p: V3 = [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k - Math.sin(Math.PI * k) * 0.22, a[2] + (c[2] - a[2]) * k];
      prim(b, 'torus', C.ironHi, p, [0.1, 0.1, 0.13], [i % 2 ? Math.PI / 2 : 0, 0.4, 0.6]);
    }
  },
  /** Hull plating: a curved strake of planks clad in riveted iron plates. */
  hull(b) {
    const rows = 5, w = 1.7;
    for (let r = 0; r < rows; r++) {
      const y = r * 0.24, z = -Math.pow((rows - 1 - r) / rows, 2) * 0.5;
      box(b, r % 2 ? C.plank : shade(C.plank, 0.85), [0, y, z], [w, 0.22, 0.12], [-0.25 + r * 0.08, 0, 0]);
    }
    box(b, C.wood, [0, 1.12, 0.05], [w + 0.1, 0.1, 0.26]);
    for (const [px, py] of [[-0.5, 0.25], [0.15, 0.3], [-0.2, 0.75], [0.48, 0.72]] as const) {
      const z = 0.08 - Math.pow(1 - py, 2) * 0.32;
      box(b, C.ironHi, [px, py, z], [0.5, 0.36, 0.05], [-0.15, 0, 0]);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) prim(b, 'sph', C.brass, [px + sx * 0.19, py + sy * 0.13, z + 0.04], 0.035);
    }
  },
  /** Bigger sails: a mast with a full course and topsail drawing. */
  sails(b) {
    cyl(b, C.wood, [0, 0.7, -0.05], 0.06, 2.0, undefined, 8);
    for (const [y, w] of [[1.55, 1.1], [0.95, 1.6]] as const) {
      rod(b, [-w / 2 - 0.06, y, 0], [w / 2 + 0.06, y, 0], 0.035, C.dark, 5);
      sail(b, y, w, y > 1 ? 0.5 : 0.85, 0.32, C.canvas, y > 1 ? undefined : C.red);
    }
    prim(b, 'cone6', C.red, [0.18, 1.78, -0.05], [0.04, 0.36, 0.1], [0, 0, -Math.PI / 2]);
  },
  /** Long hooks: a boathook on a coil of rope. */
  hooks(b) {
    cyl(b, C.rope, [-0.2, 0.08, 0], 0.42, 0.16, undefined, 10);
    cyl(b, shade(C.rope, 0.6), [-0.2, 0.17, 0], 0.22, 0.02, undefined, 10);
    const p0: V3 = [-0.7, 0.1, -0.3], p1: V3 = [0.45, 1.1, 0.2];
    rod(b, p0, p1, 0.05, C.plank, 6);
    tube(b, C.brass, [0.38, 1.04, 0.17], [0.47, 1.12, 0.21], 0.065, 0.065, 8);
    rod(b, p1, [0.66, 1.45, 0.29], 0.04, C.ironHi, 5);
    prim(b, 'cone6', 0xd8dde3, [0.73, 1.56, 0.32], [0.05, 0.18, 0.05], [0, 0, -0.55]);
    let prev: V3 = [0.52, 1.2, 0.23];
    for (let i = 1; i <= 5; i++) {
      const an = (i / 5) * Math.PI * 1.1, p: V3 = [0.52 + Math.sin(an) * 0.2, 1.2 + (1 - Math.cos(an)) * 0.17 - 0.0, 0.23];
      rod(b, prev, p, 0.03, C.ironHi, 5);
      prev = p;
    }
    rod(b, [-0.2, 0.17, 0], [-0.55, 0.15, -0.22], 0.02, C.rope, 3);
  },
  /** Swivel gun: a small cannon in an iron yoke on a turned post. */
  swivel(b) {
    cyl(b, C.wood, [0, 0.12, 0], 0.32, 0.24, undefined, 10);
    cyl(b, shade(C.wood, 1.2), [0, 0.55, 0], 0.08, 0.7, undefined, 8);
    cyl(b, C.brass, [0, 0.9, 0], 0.12, 0.08, undefined, 10);
    for (const sx of [1, -1]) box(b, C.iron, [sx * 0.15, 1.04, 0], [0.04, 0.24, 0.08]);
    box(b, C.iron, [0, 0.94, 0], [0.34, 0.05, 0.08]);
    cannon(b, [0, 1.06, -0.5], [0, 1.18, 0.7], 0.11, C.brass);
    rod(b, [0, 1.04, -0.55], [0, 0.98, -0.95], 0.025, C.dark, 5);
    for (const sx of [1, -1]) prim(b, 'sph', C.brass, [sx * 0.18, 1.08, 0], 0.045);
  },
  /** Copper sheathing: overlapping copper plates riveted along a strake, a verdigris patch on one. */
  sheath(b) {
    const cu = 0xc87a4a, patina = 0x4fa090;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const x = (c - 1) * 0.5 + (r % 2) * 0.25, y = r * 0.3;
      box(b, r === 1 && c === 2 ? patina : shade(cu, 0.9 + ((r + c) % 3) * 0.08), [x, y, r * 0.03], [0.54, 0.32, 0.05], [-0.2, 0, 0]);
      prim(b, 'sph', C.brass, [x - 0.17, y + 0.08, r * 0.03 + 0.04], 0.03);
      prim(b, 'sph', C.brass, [x + 0.17, y + 0.08, r * 0.03 + 0.04], 0.03);
    }
  },
  /** Carpenters: a mallet leaning on a plank, a few nails scattered. */
  carp(b) {
    box(b, C.plank, [0, 0.07, 0], [1.5, 0.14, 0.5], [0, 0.3, 0]);
    rod(b, [-0.35, 0.16, 0.0], [0.15, 0.95, 0.15], 0.045, C.wood, 6);
    box(b, C.dark, [0.2, 1.02, 0.17], [0.5, 0.26, 0.26], [0, 0.2, 0.5]);
    for (const x of [0.4, 0.55, 0.7]) rod(b, [x, 0.14, 0.2], [x + 0.03, 0.22, 0.22], 0.018, C.ironHi, 4);
  },
  /** Quartermaster: a coin sack with spilled gold coins. */
  quart(b) {
    prim(b, 'sph', C.canvas, [0, 0.42, 0], [0.5, 0.5, 0.5]);
    prim(b, 'cone8', C.canvas, [0, 0.88, 0], [0.26, 0.3, 0.26]);
    cyl(b, C.red, [0, 0.82, 0], 0.18, 0.06, undefined, 10);
    for (const [x, z, y] of [[0.62, 0.2, 0.04], [0.8, -0.1, 0.04], [0.7, 0.2, 0.1], [-0.7, 0.3, 0.04]] as const) cyl(b, GOLD, [x, y, z], 0.17, 0.05, undefined, 10, glow(0xffb020, 0.9));
  },
  /** Lookout: a brass spyglass on a short stand. */
  look(b) {
    tube(b, C.brass, [-0.6, 0.55, 0], [0.1, 0.75, 0], 0.14, 0.14, 10);
    tube(b, C.wood, [0.1, 0.75, 0], [0.7, 0.92, 0], 0.11, 0.11, 10);
    tube(b, C.brass, [0.7, 0.92, 0], [0.95, 0.99, 0], 0.15, 0.15, 10);
    cyl(b, 0x9fd0ff, [0.96, 0.99, 0], 0.12, 0.02, [0, 0, 1.28], 10, glow(0x9fd0ff, 0.8));
    for (const sz of [1, -1]) rod(b, [-0.1, 0.65, 0], [-0.3, 0, sz * 0.4], 0.04, C.wood, 5);
    rod(b, [-0.1, 0.65, 0], [-0.1, 0, 0.0], 0.04, C.wood, 5);
  },
};

/** Crew card thumbnail: three figures of the type with their props on a deck plank (fresh geometry: thumbs.ts disposes it). */
export function crewGroup(id: string, adv: boolean): { geo: THREE.BufferGeometry; at?: THREE.Vector3; yaw?: number }[] {
  const l = CREW[id] ?? DECKHAND, b = new Builder();
  box(b, C.plank, [0, -0.025, 0], [0.82, 0.05, 0.52]);
  for (const x of [-0.3, -0.1, 0.1, 0.3]) box(b, shade(C.plank, 0.82), [x, 0.001, 0], [0.008, 0.002, 0.52]);
  return [
    { geo: b.build() },
    { geo: figureGeo(l, adv), at: new THREE.Vector3(0, 0, 0.14), yaw: 0.15 },
    { geo: figureGeo(l, adv), at: new THREE.Vector3(-0.27, 0, -0.1), yaw: 0.55 },
    { geo: figureGeo(l, adv), at: new THREE.Vector3(0.27, 0, -0.1), yaw: -0.5 },
  ];
}
