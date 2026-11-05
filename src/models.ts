import * as THREE from 'three';
import { Builder, PAINTED, paintedMesh, rod, shade, xf, V3 } from './geo';
import { HullSpec, buildHull, raised, deckAt, deckFurniture, bowsprit, lanterns, hullX, hullDeck, tOf } from './hull';
import { buildRig, jib, rigging, pennant, makeFlag, MastSpec, Rig, Emblem, Sail } from './rig';
export { makeCrate, makeHut, makeIsland, makeRaft } from './props';
export type { IslandModel } from './props';

// ---- legacy primitive helpers (cached flat-shaded standard materials) ----
const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: number, emissive = 0): THREE.MeshStandardMaterial {
  const k = color + ':' + emissive;
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive, flatShading: true, roughness: 0.9, metalness: 0 });
    mats.set(k, m);
  }
  return m;
}
const place = (m: THREE.Mesh, x: number, y: number, z: number): THREE.Mesh => { m.position.set(x, y, z); return m; };
export const box = (w: number, h: number, d: number, c: number, x = 0, y = 0, z = 0, em = 0): THREE.Mesh =>
  place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, em)), x, y, z);
export const cyl = (rt: number, rb: number, h: number, seg: number, c: number, x = 0, y = 0, z = 0): THREE.Mesh =>
  place(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c)), x, y, z);
export const cone = (r: number, h: number, seg: number, c: number, x = 0, y = 0, z = 0, em = 0): THREE.Mesh =>
  place(new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c, em)), x, y, z);

/** Hull and mast layout of a built ship, in ship space at scale 1 (equipment dressing anchors on it). */
export interface ShipFrame { h: HullSpec; masts: MastSpec[]; tip: V3; sternTop: number; flag?: { color: number; emblem: Emblem } }
export interface ShipModel { root: THREE.Group; tilt: THREE.Group; sails: THREE.Group[]; flag?: THREE.Object3D; frame?: ShipFrame }

/**
 * Ship look. The first block is the original contract; everything else is optional with galleon defaults.
 * Model space at scale 1: forward = +Z, port = +X, waterline y = 0, default hull 6.4 long x 2.4 wide.
 */
export interface ShipOpts {
  scale: number;
  hull: number; deck: number; sail: number;
  /** Mast z positions at scale 1, bow first. */
  masts: number[];
  /** Wale / gunport band colour. */
  trim?: number;
  /** Flag colour at the tallest masthead; omitted = no flag. */
  flag?: number;
  length?: number; beam?: number;
  /** Deck-edge height above the waterline amidships. */
  freeboard?: number;
  /** Below-waterline paint, rails and carvings, inner bulwarks, spars. */
  bottom?: number; accent?: number; inner?: number; wood?: number;
  /** Rig per mast (default 'square'); square-sail tiers per mast (number = same for all). */
  rigs?: Rig[]; tiers?: number | number[];
  /** Mast heights above their deck (default derived from hull length). */
  mastH?: number[];
  /** Alternate sail panels in this colour (striped sails). */
  sailStripe?: number;
  /** Gunports per side per gun deck, and the number of gun decks. */
  guns?: number; gunDecks?: number;
  /** Stern castle and forecastle heights (0 = flush). Castles above 0.6 get a poop deck on top. */
  castle?: number; forecastle?: number;
  jib?: boolean;
  emblem?: Emblem;
  /** Lit stern-window and lantern colour (HDR glow). */
  lanterns?: number;
  /** Emissive accent on trim bands and castle rails (e.g. the Fire Galleon's embers). */
  glow?: number;
  /** Streamer colour on the other mastheads. */
  pennants?: number;
  /** A deck mortar on the foredeck (bomb ketch). */
  mortar?: boolean;
  /** Merge sails into the body: one draw call, no sail animation (enemies, edibles). */
  merge?: boolean;
}

const MAST_RANK = [[1], [0.94, 1], [0.92, 1, 0.78], [0.9, 1, 0.84, 0.68]];
const CASTLE_END = 0.27, FORE_START = 0.8;
const FORE_AFT = new THREE.Matrix4().makeRotationY(-Math.PI / 2);

export function makeShip(o: ShipOpts): ShipModel {
  const L = o.length ?? 6.4, B = o.beam ?? 2.4, decks = o.gunDecks ?? 1, trim = o.trim ?? 0x2a1a0e;
  const castle = o.castle ?? 0.6, fore = o.forecastle ?? 0.25, wood = o.wood ?? 0x5b3b1f;
  const h: HullSpec = {
    L, B, F: o.freeboard ?? 0.52 + 0.3 * (decks - 1), D: 0.5 + 0.08 * (decks - 1), hull: o.hull, deck: o.deck, trim,
    accent: o.accent ?? shade(trim, 0.85), bottom: o.bottom ?? 0x5e2a1f, inner: o.inner ?? 0x7b3326,
    gunDecks: decks, guns: o.guns ?? 3, castle, forecastle: fore,
    windows: o.lanterns ?? 0xffc46b, windowGlow: o.lanterns !== undefined ? 1.6 : 0.6, glow: o.glow,
  };
  const body = new Builder();
  buildHull(body, h);
  if (castle > 0) {
    raised(body, h, 0, CASTLE_END, castle, { back: true, front: true, windows: true });
    if (castle > 0.6) raised(body, h, 0, CASTLE_END * 0.45, 0.3, { back: true, front: true, windows: true, lift: castle, inset: 0.93 });
  }
  if (fore > 0) raised(body, h, FORE_START, 0.95, fore, { back: true, front: true });

  // masts stand on whatever deck is under them
  const n = o.masts.length, rank = MAST_RANK[Math.min(n, 4) - 1] ?? MAST_RANK[3];
  const baseH = 4.3 * Math.sqrt(L / 6.4) * (1 + 0.12 * (decks - 1));
  const tierOf = (i: number): number => (typeof o.tiers === 'number' ? o.tiers : o.tiers?.[i] ?? 2);
  const masts: MastSpec[] = o.masts.map((z, i) => {
    const t = tOf(h, z), onCastle = castle > 0 && t < CASTLE_END ? castle - 0.12 : 0, onFore = fore > 0 && t > FORE_START ? fore - 0.12 : 0;
    const mh = o.mastH?.[i] ?? baseH * (rank[i] ?? 0.7);
    return { z, base: deckAt(h, t) + onCastle + onFore, h: mh - onCastle, rig: o.rigs?.[i] ?? 'square', tiers: tierOf(i), width: B * 0.98 * Math.sqrt(mh / baseH) };
  });
  const rig = buildRig(body, masts, { wood, sail: o.sail, stripe: o.sailStripe, deckLen: L });
  const tip = bowsprit(body, h, wood);
  const sails: Sail[] = rig.sails;
  if (o.jib ?? true) {
    const m0 = masts[0];
    sails.push(jib(tip, [0, m0.base + m0.h * 0.82, m0.z], L * 0.42, hullDeck(h, 0.95) + 0.25, shade(o.sail, 0.97)));
  }
  const sternTop = hullDeck(h, 0) + castle + (castle > 0.6 ? 0.3 : 0);
  const rr = Math.min(0.04, 0.016 / Math.min(1, o.scale));
  rigging(body, masts, z => { const t = tOf(h, z); return [hullX(h, t, 1), hullDeck(h, t)]; }, tip, [0, sternTop, -L / 2], rr, 0x2c2219);
  deckFurniture(body, h, o.masts);
  if (castle > 0 || o.lanterns !== undefined) lanterns(body, h, o.lanterns ?? 0xffb04a, sternTop);
  if (o.mortar) mortar(body, h, masts[0].z + L * 0.2);

  const tallest = masts.reduce((a, m) => (m.base + m.h > a.base + a.h ? m : a), masts[0]);
  if (o.pennants !== undefined) {
    for (const m of masts) if (m !== tallest || o.flag === undefined) pennant(body, [0, m.base + m.h, m.z], o.pennants, 0.9 + m.h * 0.12);
  }
  if (o.flag !== undefined) rod(body, [0, tallest.base + tallest.h - 0.1, tallest.z], [0, tallest.base + tallest.h + 0.35, tallest.z], 0.025, wood, 4);

  const root = new THREE.Group(), tilt = new THREE.Group(), ship = new THREE.Group();
  root.add(tilt);
  ship.scale.setScalar(o.scale);
  tilt.add(ship);
  const groups: THREE.Group[] = [];
  const clothGlow = { emit: o.sail, glow: 0.16 }; // thin cloth: a little light comes through even on the shaded side
  if (o.merge) {
    for (const s of sails) body.add(s.geo, null, xf(...s.pivot), { smooth: true, jitter: 0.02, ...clothGlow });
  } else {
    for (const s of sails) {
      const g = new THREE.Group();
      g.position.set(...s.pivot);
      // ship.ts scales z for billow: turn fore-and-aft sails so their billow (x) is the group's local z
      if (s.foreAft) g.rotation.y = Math.PI / 2;
      const m = s.foreAft ? FORE_AFT : undefined;
      g.add(paintedMesh(new Builder().add(s.geo, null, m, { smooth: true, jitter: 0.02, ...clothGlow }).build()));
      ship.add(g);
      groups.push(g);
    }
  }
  for (const s of sails) s.geo.dispose();
  ship.add(paintedMesh(body.build()));
  let flag: THREE.Group | undefined;
  if (o.flag !== undefined) {
    flag = makeFlag(o.flag, o.emblem ?? 'skull', 0.75 + 0.1 * (L / 6.4));
    flag.position.set(0, tallest.base + tallest.h + 0.35, tallest.z);
    ship.add(flag);
  }
  const frame: ShipFrame = { h, masts, tip, sternTop, flag: o.flag !== undefined ? { color: o.flag, emblem: o.emblem ?? 'skull' } : undefined };
  return { root, tilt, sails: groups, flag, frame };
}

function mortar(b: Builder, h: HullSpec, z: number): void {
  const y = deckAt(h, tOf(h, z));
  b.add(new THREE.BoxGeometry(0.9, 0.22, 0.9), 0x5a3a20, xf(0, y + 0.11, z));
  b.add(new THREE.CylinderGeometry(0.34, 0.42, 0.55, 10), 0x2b2b30, xf(0, y + 0.45, z, -0.35, 0, 0));
  b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 10), 0x0c0c0e, xf(0, y + 0.72, z + 0.1, -0.35, 0, 0));
}

const templates = new Map<string, ShipModel>();
/** Clone of a cached model (shares geometry and materials). */
export function getShip(key: string, factory: () => ShipModel): ShipModel {
  let t = templates.get(key);
  if (!t) { t = factory(); templates.set(key, t); }
  const root = t.root.clone(true);
  return { root, tilt: root.children[0] as THREE.Group, sails: [], flag: root.getObjectByName('flag') ?? undefined };
}

export interface MatRec { m: THREE.MeshStandardMaterial; e: number }
/** Give a model its own copies of the shared cached materials (geometry stays shared). Dispose the records' `m` when done. */
export function cloneMats(root: THREE.Object3D): MatRec[] {
  const map = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  const recs: MatRec[] = [];
  root.traverse(o => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    const old = me.material as THREE.MeshStandardMaterial;
    if (!old.emissive) return; // only lit materials take part in hit flashes
    let c = map.get(old);
    if (!c) { c = old.clone(); map.set(old, c); recs.push({ m: c, e: c.emissive.getHex() }); }
    me.material = c;
  });
  return recs;
}

export const makeFishingBoat = (): ShipModel => makeShip({
  scale: 0.36, length: 6, beam: 2.7, hull: 0xf0ece0, deck: 0xc9b58a, sail: 0xfbf6e8, trim: 0x2d6ea8, accent: 0x2d6ea8,
  bottom: 0x2d5f8a, inner: 0x2d6ea8, masts: [0.9], rigs: ['lateen'], mastH: [3.6], guns: 0, castle: 0, forecastle: 0, jib: false, merge: true,
});

export { PAINTED };
export type { V3 };
