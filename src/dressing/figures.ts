import * as THREE from 'three';
import { Builder, shade, type V3 } from '../geo';
import { C, box, cyl, prim, rod, tube, keg } from './kit';

// ---- low-poly sailors: feet at the origin, facing +z, about 0.5 tall (captain x1.3) ----

export type Hat = 'tricorn' | 'bandana' | 'cap' | 'chef' | 'witch' | 'plume' | 'crown' | 'tophat' | 'pith' | 'none';
export type Prop = 'hammer' | 'ledger' | 'spyglass' | 'rammer' | 'medbag' | 'compass' | 'keg' | 'ladle' | 'cutlass' | 'musket' | 'none';
/** Left-hand prop: the boarder's grappling hook, the cook's grog mug. */
export type Prop2 = 'hook' | 'mug';
export interface Look {
  shirt: number; pants: number; skin: number; hat: Hat; hatC: number; prop: Prop; prop2?: Prop2;
  hair?: number; beard?: number; trim?: number; coat?: boolean; scale?: number;
}
/** Crew look plus how many stand on deck. */
export interface CrewLook extends Look { count: number }

const sailor = (shirt: number, hat: Hat, hatC: number, prop: Prop, count: number, o: Partial<CrewLook> = {}): CrewLook =>
  ({ shirt, pants: 0x3b3a44, skin: 0xd9a37c, hat, hatC, prop, count, ...o });

/** Crew id -> look. Unknown ids fall back to DECKHAND (with its own count). */
export const CREW: Record<string, CrewLook> = {
  musket: sailor(0x6b7a3a, 'tricorn', 0x3a2a1c, 'musket', 3, { pants: 0x3a3226, trim: 0xe8dcc0 }),
  boarder: sailor(0x7a2a2a, 'bandana', 0x1c1c22, 'cutlass', 2, { skin: 0xb9815a, pants: 0x2a2a30, prop2: 'hook', beard: 0x2a1a10 }),
  carp: sailor(0xe08a3a, 'cap', 0x6a3a1a, 'hammer', 3, { pants: 0x4a3a2a }),
  quart: sailor(0x2f6b4a, 'tricorn', 0x1e2e26, 'ledger', 2, { skin: 0xc98a62 }),
  look: sailor(0x3a6aa8, 'bandana', 0xe2c33a, 'spyglass', 3),
  gunner: sailor(0xb0342a, 'bandana', 0x222226, 'rammer', 3, { skin: 0xb9815a }),
  surgeon: sailor(0xe8e4d8, 'cap', 0x8a2a2a, 'medbag', 2, { pants: 0x2a2a30 }),
  navigator: sailor(0x2a3f6a, 'tricorn', 0x1a2440, 'compass', 2, { trim: C.brass }),
  monkey: sailor(0xb8b2a4, 'bandana', 0xd84a1a, 'keg', 3, { scale: 0.8, skin: 0xe0a98a }),
  cook: sailor(0xf0ece0, 'chef', 0xfaf8f0, 'ladle', 2, { pants: 0x5a5a62, skin: 0xe0a07a, prop2: 'mug' }),
  mate: sailor(0x8a1e2e, 'tricorn', 0x1c1c22, 'cutlass', 2, { trim: C.brass, beard: 0x3a2a1c }),
};
CREW.powdermonkey = CREW.monkey; CREW.firstmate = CREW.mate;
export const DECKHAND: CrewLook = sailor(0xdfe6ee, 'bandana', 0xc0392b, 'none', 2, { pants: 0x34507a });

const cap = (coat: number, hat: Hat, hatC: number, skin: number, hair: number, trim = C.brass, beard?: number): Look =>
  ({ shirt: shade(coat, 1.3), pants: 0x2a2630, skin, hat, hatC: shade(hatC, 1.2), prop: 'none', hair, beard, trim, coat: true, scale: 1.3 }); // a touch lighter than the portrait: the helm sits in the castle's shade
/** Captain id -> look, from the portrait palette (portraits.ts). Unknown captains get a navy coat and black tricorn. */
export const CAPTAIN: Record<string, Look> = {
  salt: cap(0x3b5f8a, 'cap', 0x27456b, 0xd9a77c, 0xe8e4dc, C.brass, 0xe8e4dc),
  rosa: cap(0x2f7d6d, 'bandana', 0xe2c33a, 0xc98a62, 0xb3341e, 0xe8dcc0),
  bess: cap(0x555d66, 'none', 0x6d7681, 0xb9815a, 0x2b2118, 0xaab2bb),
  tom: cap(0xa0522d, 'cap', 0x8a5a2b, 0xe0a07a, 0x7a4a22, 0xd8c28a, 0x7a4a22),
  corvo: cap(0x4a1626, 'none', 0x15121a, 0xe9e0d4, 0x15121a, 0xb02a46, 0x15121a),
  hana: cap(0x3e5e49, 'tricorn', 0x2d4a3a, 0xd49a70, 0x3a2a1c),
  morwen: cap(0x3a2a5a, 'witch', 0x2a1a40, 0xcbd6c0, 0x7a3a9a, 0x9a5acb),
  flint: cap(0x6b2a18, 'bandana', 0xa02a14, 0xd9a07a, 0xd4501c, 0xf09a2a, 0xd4501c),
  gwen: cap(0x7a4a9a, 'plume', 0x6a3a8a, 0xe0a98a, 0xe8b83a),
  dorian: cap(0x2a3f7a, 'plume', 0x1f2f5a, 0xe2b08e, 0x1c1c24, 0xe0e0e8, 0x1c1c24),
  thorne: cap(0x1f3355, 'tricorn', 0x1c2a4a, 0xd8a682, 0x9aa0aa, 0xe0b040, 0x9aa0aa),
  isabeau: cap(0x7a2a9a, 'crown', 0xf2d27a, 0xefc7a8, 0x7a2f1a, 0xb02a46),
  driftwood: cap(0x6a5a3a, 'cap', 0x7a5a30, 0xc48a60, 0xd8d0b8, 0xa89060, 0xd8d0b8),
  goldtooth: cap(0x8a1c2a, 'tophat', 0x1a1a22, 0xdfa57e, 0x1a1208, 0xf2c94a, 0x1a1208),
  cass: cap(0x4a5a68, 'cap', 0x8a6a2a, 0xe6c8a8, 0xb0703a, 0xf2d27a),
  brick: cap(0x7a4a2a, 'none', 0x2a1a12, 0xb4764c, 0x2a1a12, C.brass, 0x4a2a14),
  ines: cap(0x8a6a3a, 'pith', 0xd8c28a, 0xd6a07a, 0x3a2a1c, 0x2f6d4d),
  ghost: cap(0x2a5a60, 'tricorn', 0x2a4a50, 0xbfe8e0, 0xe0f8f4, 0x9fe8d8, 0xe0f8f4),
  hal: cap(0x3a5a6a, 'bandana', 0x1f4a6a, 0xc08a62, 0x2a1a10, 0xc0d0e0, 0x2a1a10),
  coral: cap(0xd86a5a, 'none', 0xe0507a, 0xb8754a, 0xe0507a, 0xf8d8c0),
};
export const CAPTAIN0: Look = cap(0x2a3a5a, 'tricorn', 0x1e1e24, 0xd9a77c, 0x3a2a1c);

function hat(b: Builder, l: Look, y: number): void {
  const c = l.hatC, t = l.trim ?? shade(c, 1.6);
  switch (l.hat) {
    case 'tricorn': case 'plume':
      prim(b, 'cone3', c, [0, y + 0.03, 0], [0.13, 0.06, 0.13], [0, Math.PI, 0]);
      prim(b, 'cone3', t, [0, y + 0.005, 0], [0.135, 0.012, 0.135], [0, Math.PI, 0]);
      cyl(b, c, [0, y + 0.05, -0.005], 0.06, 0.05, undefined, 6);
      if (l.hat === 'plume') box(b, t, [0.07, y + 0.1, -0.03], [0.025, 0.14, 0.05], [0.2, 0, -0.5]);
      break;
    case 'bandana':
      prim(b, 'sph', c, [0, y - 0.005, 0], [0.082, 0.05, 0.082]);
      box(b, c, [0, y - 0.03, -0.085], [0.03, 0.06, 0.03], [0.5, 0, 0]);
      break;
    case 'cap':
      cyl(b, c, [0, y + 0.01, 0], 0.078, 0.05, undefined, 8);
      box(b, shade(c, 0.7), [0, y - 0.01, 0.06], [0.11, 0.012, 0.07]);
      break;
    case 'chef':
      cyl(b, c, [0, y + 0.04, 0], 0.07, 0.1, undefined, 8);
      prim(b, 'sph', c, [0, y + 0.12, 0], [0.09, 0.06, 0.09]);
      break;
    case 'witch':
      cyl(b, c, [0, y, 0], 0.15, 0.012, undefined, 10);
      prim(b, 'cone6', c, [0, y + 0.13, -0.01], [0.075, 0.26, 0.075], [-0.15, 0, 0]);
      cyl(b, t, [0, y + 0.02, 0], 0.077, 0.025, undefined, 6);
      break;
    case 'crown':
      prim(b, 'sph', l.hair ?? 0x3a2a1c, [0, y - 0.01, -0.01], [0.08, 0.055, 0.08]);
      cyl(b, c, [0, y + 0.03, 0], 0.07, 0.05, undefined, 6, { emit: c, glow: 0.4 });
      for (let i = 0; i < 5; i++) { const an = (i / 5) * Math.PI * 2; prim(b, 'cone3', c, [Math.sin(an) * 0.06, y + 0.075, Math.cos(an) * 0.06], [0.02, 0.05, 0.02]); }
      break;
    case 'tophat':
      cyl(b, c, [0, y + 0.002, 0], 0.11, 0.012, undefined, 10);
      cyl(b, c, [0, y + 0.08, 0], 0.07, 0.15, undefined, 8);
      cyl(b, t, [0, y + 0.03, 0], 0.072, 0.025, undefined, 8);
      break;
    case 'pith':
      prim(b, 'sph', c, [0, y + 0.01, 0], [0.09, 0.07, 0.1]);
      cyl(b, c, [0, y - 0.01, 0], 0.13, 0.01, undefined, 10);
      cyl(b, t, [0, y + 0.005, 0], 0.092, 0.018, undefined, 8);
      break;
    default:
      prim(b, 'sph', l.hair ?? 0x3a2a1c, [0, y - 0.01, -0.01], [0.08, 0.055, 0.08]);
  }
}

/** Musket at port arms: butt at the right hip, muzzle above the left shoulder (rig.ts turns it level for the shot). */
export const MUSKET = { butt: [-0.13, 0.13, 0.1] as V3, muzzle: [0.1, 0.63, 0.14] as V3 };
function musket(b: Builder): void {
  const [p0, p1] = [MUSKET.butt, MUSKET.muzzle], at = (k: number): V3 => [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, p0[2] + (p1[2] - p0[2]) * k];
  tube(b, 0x6a3c1a, p0, at(0.42), 0.038, 0.024, 4); // stock
  tube(b, 0x3a3d44, at(0.36), p1, 0.019, 0.017, 5); // barrel
  tube(b, C.ironHi, at(0.95), p1, 0.022, 0.022, 5); // muzzle band
  box(b, C.brass, at(0.4), [0.03, 0.03, 0.03]); // lock
  rod(b, at(0.5), at(0.62), 0.006, 0xd8dde3, 3);
}

function prop(b: Builder, p: Prop): void {
  const hx = -0.14; // right hand (the figure faces +z, so its right is -x)
  switch (p) {
    case 'hammer': rod(b, [hx, 0.2, 0.08], [hx, 0.36, 0.12], 0.012, C.wood, 4); box(b, C.iron, [hx, 0.37, 0.12], [0.09, 0.04, 0.04]); break;
    case 'ledger': box(b, 0x7a2a1c, [-0.02, 0.28, 0.1], [0.13, 0.16, 0.03], [-0.4, 0, 0]); box(b, 0xf0e6c8, [-0.02, 0.285, 0.115], [0.115, 0.14, 0.01], [-0.4, 0, 0]); break;
    case 'spyglass': tube(b, C.brass, [-0.04, 0.43, 0.05], [-0.04, 0.47, 0.3], 0.02, 0.028, 6); break;
    case 'rammer': rod(b, [hx, 0.02, 0.07], [hx, 0.66, 0.07], 0.014, C.wood, 4); cyl(b, 0x2a2a2a, [hx, 0.67, 0.07], 0.035, 0.08, undefined, 6); break;
    case 'medbag': box(b, 0xf2efe6, [hx - 0.02, 0.13, 0.02], [0.08, 0.08, 0.12]); box(b, 0xc0392b, [hx - 0.065, 0.13, 0.02], [0.01, 0.06, 0.02]); box(b, 0xc0392b, [hx - 0.065, 0.13, 0.02], [0.01, 0.02, 0.06]); break;
    case 'compass': cyl(b, C.brass, [0, 0.29, 0.12], 0.05, 0.02, [Math.PI / 2 - 0.4, 0, 0], 8); cyl(b, 0xf0e6c8, [0.13, 0.22, 0.04], 0.025, 0.14, [Math.PI / 2, 0, 0], 6); break;
    case 'keg': keg(b, [0, 0.27, 0.11], 0.065, 0.12, 0x8a5a2b, C.black); break;
    case 'ladle': rod(b, [hx, 0.2, 0.08], [hx, 0.44, 0.14], 0.01, 0xb8bcc4, 4); prim(b, 'sph', 0xb8bcc4, [hx, 0.45, 0.15], 0.035); break;
    case 'cutlass':
      box(b, 0xe4e8ee, [hx, 0.34, 0.15], [0.014, 0.26, 0.04], [0.55, 0, 0], { emit: 0xffffff, glow: 0.15 });
      box(b, C.brass, [hx, 0.23, 0.09], [0.06, 0.018, 0.045]); prim(b, 'torus', C.brass, [hx, 0.21, 0.08], 0.03, [0, Math.PI / 2, 0]);
      break;
    case 'musket': musket(b); break;
    default: break;
  }
}
/** Left hand (x = +0.145). */
function prop2(b: Builder, p: Prop2 | undefined): void {
  const hx = 0.15;
  if (p === 'hook') {
    prim(b, 'torus', C.rope, [0.02, 0.27, 0.07], [0.09, 0.09, 0.12], [0.3, 0.2, 0.9]); // rope coil over the shoulder
    rod(b, [hx, 0.17, 0.02], [hx, 0.06, 0.03], 0.008, C.rope, 3);
    rod(b, [hx, 0.07, 0.03], [hx, -0.0, 0.03], 0.012, C.iron, 4);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; prim(b, 'cone3', C.ironHi, [hx + Math.sin(a) * 0.03, 0.02, 0.03 + Math.cos(a) * 0.03], [0.012, 0.06, 0.012], [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9]); }
  } else if (p === 'mug') {
    cyl(b, 0x8a5a2b, [hx, 0.2, 0.06], 0.035, 0.07, undefined, 8);
    cyl(b, 0xfff6dc, [hx, 0.24, 0.06], 0.037, 0.02, undefined, 8, { emit: 0xffe8b0, glow: 0.3 });
    box(b, 0x6a4020, [hx + 0.04, 0.2, 0.06], [0.015, 0.04, 0.01]);
  }
}

/** Lv 5 advanced form: gold sash across the chest and a gold plume on the hat (glows a little so it reads at deck scale). */
function accent(b: Builder, l: Look): void {
  const g = { emit: 0xffc040, glow: 0.5 };
  box(b, 0xf2c14e, [0, 0.27, 0.068], [0.045, 0.27, 0.012], [0, 0, 0.75], g);
  box(b, 0xf2c14e, [0, 0.27, -0.068], [0.045, 0.27, 0.012], [0, 0, -0.75], g);
  const y = l.hat === 'chef' ? 0.66 : 0.56;
  box(b, 0xffd860, [0.06, y, -0.03], [0.022, 0.15, 0.05], [0.25, 0, -0.45], g);
  prim(b, 'sph', 0xc0392b, [0.04, y - 0.06, -0.02], 0.025);
}

/** Builders the parts of a figure are drawn into (the same builder three times for a merged figure). */
interface Into { body: Builder; r: Builder; l: Builder }
/** Shoulder pivots (figure space, unscaled): the arm parts rotate about these. */
export const PIVOT_R: V3 = [-0.13, 0.35, 0], PIVOT_L: V3 = [0.13, 0.35, 0];

function draw(l: Look, o: Into, adv: boolean): void {
  const b = o.body, trim = l.trim ?? shade(l.shirt, 0.75);
  for (const sx of [1, -1]) {
    box(b, l.pants, [sx * 0.045, 0.09, 0], [0.07, 0.16, 0.08]);
    box(b, C.black, [sx * 0.045, 0.02, 0.012], [0.075, 0.04, 0.1]);
  }
  box(b, l.shirt, [0, 0.26, 0], [0.2, 0.2, 0.13]);
  if (l.coat) {
    box(b, l.shirt, [0, 0.13, -0.005], [0.22, 0.12, 0.145]);
    box(b, trim, [0, 0.24, 0.067], [0.03, 0.2, 0.005]);
    for (const sx of [1, -1]) box(b, trim, [sx * 0.11, 0.355, 0], [0.06, 0.02, 0.08]);
  } else if (l.trim !== undefined) for (const sx of [1, -1]) box(b, trim, [sx * 0.07, 0.3, 0.066], [0.02, 0.14, 0.006], [0, 0, sx * 0.35]); // cross belts
  box(b, l.coat ? trim : 0x3a2618, [0, 0.175, 0], [0.205, 0.03, 0.135]);
  // arms: left hangs, right reaches a little forward (holds the prop or the wheel)
  const fwd = l.prop === 'none' && !l.coat ? 0.15 : 0.7;
  box(o.l, l.shirt, [0.13, 0.26, 0], [0.055, 0.17, 0.06], [l.coat ? -0.7 : 0.1, 0, 0.12]);
  box(o.r, l.shirt, [-0.13, 0.27, 0.04], [0.055, 0.17, 0.06], [-fwd, 0, -0.12]);
  prim(o.l, 'sph', l.skin, [0.145, l.coat ? 0.22 : 0.17, l.coat ? 0.08 : 0.01], 0.03);
  prim(o.r, 'sph', l.skin, [-0.145, 0.21, 0.1], 0.03);
  prim(b, 'sph', l.skin, [0, 0.43, 0], [0.075, 0.08, 0.075]);
  prim(b, 'sph', shade(l.skin, 0.85), [0, 0.425, 0.07], 0.018);
  if (l.beard !== undefined) prim(b, 'sph', l.beard, [0, 0.385, 0.04], [0.06, 0.045, 0.05]);
  if (l.hair !== undefined && l.hat !== 'none') box(b, l.hair, [0, 0.42, -0.05], [0.13, 0.08, 0.05]);
  hat(b, l, 0.49);
  prop(o.r, l.prop);
  prop2(o.l, l.prop2);
  if (adv) accent(b, l);
}

const scaled = (g: THREE.BufferGeometry, s: number): THREE.BufferGeometry => { if (s !== 1) { g.scale(s, s, s); g.computeBoundingSphere(); } return g; };

/** Geometry of one figure (merged, vertex-coloured). `adv` adds the Lv 5 accent. */
export function figureGeo(l: Look, adv = false): THREE.BufferGeometry {
  const b = new Builder();
  draw(l, { body: b, r: b, l: b }, adv);
  return scaled(b.build(), l.scale ?? 1);
}

/** A figure split for animation: body, right arm (+ prop) around PIVOT_R, optionally the left arm around PIVOT_L. All scaled by l.scale. */
export interface FigParts { body: THREE.BufferGeometry; r: THREE.BufferGeometry; l: THREE.BufferGeometry | null; s: number }
export function figureParts(l: Look, adv: boolean, splitL: boolean): FigParts {
  const body = new Builder(), r = new Builder(), lb = splitL ? new Builder() : body, s = l.scale ?? 1;
  draw(l, { body, r, l: lb }, adv);
  const arm = (b: Builder, p: V3): THREE.BufferGeometry => scaled(b.build().translate(-p[0], -p[1], -p[2]), s);
  return { body: scaled(body.build(), s), r: arm(r, PIVOT_R), l: splitL ? arm(lb, PIVOT_L) : null, s };
}
