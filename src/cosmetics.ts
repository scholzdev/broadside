// v10 Decorations: cosmetic sails, hull paint, flags, figureheads and wake colours for the player ship.
// Catalog + own save (localStorage 'broadside.cosmetics') + the hooks ship.ts calls: withCosmetics (ShipOpts), applyCosmetics (model), wakeColor.
import * as THREE from 'three';
import { Builder, PaintedMaterial, V3 } from './geo';
import type { ShipModel, ShipOpts } from './models';
import { EMBLEM_ART, Emblem } from './rig';
import { Anchors } from './dressing/anchors';
import { box, prim, rod, tube } from './dressing/kit';
import { M, UNLOCK_ALL, bossKills, save as saveMeta } from './meta';
import { t } from './i18n';
import { bossName } from './lname';

export type DecoSlot = 'sail' | 'hull' | 'flag' | 'fig' | 'wake';
export const DECO_SLOTS: DecoSlot[] = ['sail', 'hull', 'flag', 'fig', 'wake'];
export type SailPat = 'plain' | 'stripes' | 'band' | 'quarter' | 'border';
export type FigKind = 'mermaid' | 'dragon' | 'skull' | 'eagle' | 'kraken';
type Hull = Pick<ShipOpts, 'hull' | 'trim' | 'accent' | 'bottom' | 'inner' | 'glow'>;
/** Achievement alternative to buying: condition text and [have, need]. */
interface Ach { text: () => string; prog: () => [number, number] }
export interface DecoItem {
  id: string; slot: DecoSlot; cost: number; ach?: Ach;
  sail?: { base: number; alt: number; pat: SailPat; glow?: number };
  hull?: Hull; flag?: { color: number; emblem: Emblem }; fig?: FigKind; wake?: number | 'rainbow';
}

const st = () => M.stats;
const kills = (n: number): Ach => ({ text: () => t('ch.sink', { n }), prog: () => [st().kills, n] });
const wins = (n: number): Ach => ({ text: () => (n === 1 ? t('ch.win') : t('deco.ch.wins', { n })), prog: () => [st().wins, n] });
const boss = (id: Parameters<typeof bossKills>[0]): Ach => ({ text: () => t('ch.boss', { name: bossName(id) }), prog: () => [bossKills(id), 1] });
const stat = (k: 'fullSails' | 'deaths' | 'boatsEaten' | 'rams' | 'burned' | 'questsDone', key: string, n: number): Ach => ({ text: () => t('ch.' + key, { n }), prog: () => [st()[k], n] });
const endless = (n: number): Ach => ({ text: () => t('deco.ch.endless', { n }), prog: () => [Math.max(0, ...st().endBest), n] });

const D = (slot: DecoSlot, x: Partial<DecoItem> = {}): DecoItem => ({ id: slot + '.default', slot, cost: 0, ...x });
const I = (slot: DecoSlot, name: string, cost: number, x: Partial<DecoItem>, ach?: Ach): DecoItem => ({ id: slot + '.' + name, slot, cost, ach, ...x });

export const DECOS: DecoItem[] = [
  D('sail'),
  I('sail', 'crimson', 150, { sail: { base: 0xb3262b, alt: 0x7a1418, pat: 'plain' } }),
  I('sail', 'royal', 200, { sail: { base: 0xf3efe2, alt: 0x2d5aa8, pat: 'stripes' } }),
  I('sail', 'midnight', 250, { sail: { base: 0x23252e, alt: 0x3e4352, pat: 'stripes' } }, kills(1500)),
  I('sail', 'sunset', 250, { sail: { base: 0xf2a03a, alt: 0xc8402a, pat: 'band' } }),
  I('sail', 'jester', 300, { sail: { base: 0xe9c23a, alt: 0x6a2d8f, pat: 'quarter' } }),
  I('sail', 'emerald', 300, { sail: { base: 0x2f8f5b, alt: 0xf1e7c8, pat: 'border' } }, stat('boatsEaten', 'boats', 300)),
  I('sail', 'ghost', 500, { sail: { base: 0xbfe8ef, alt: 0x7fd0dc, pat: 'band', glow: 0.75 } }, stat('deaths', 'die', 40)),

  D('hull'),
  I('hull', 'navy', 150, { hull: { hull: 0x23395d, trim: 0xe8e2cf, accent: 0xc99a3c, bottom: 0x1c2a40, inner: 0x2d4a78 } }),
  I('hull', 'blood', 200, { hull: { hull: 0x7e1d1d, trim: 0x141416, accent: 0xc99a3c, bottom: 0x2a1212, inner: 0x5a1414 } }),
  I('hull', 'ivory', 200, { hull: { hull: 0xe9e2cf, trim: 0x2a8a7a, accent: 0x1f6b5e, bottom: 0x2a5a52, inner: 0x2a8a7a } }),
  I('hull', 'seagreen', 250, { hull: { hull: 0x2f6b5a, trim: 0xe9d9a8, accent: 0xe9d9a8, bottom: 0x1c3a32, inner: 0x3f8a72 } }, stat('fullSails', 'fullSails', 500)),
  I('hull', 'royal', 350, { hull: { hull: 0x4b2a6b, trim: 0xe2b44a, accent: 0xe2b44a, bottom: 0x2a1a3a, inner: 0x6a3a8f } }),
  I('hull', 'ebony', 400, { hull: { hull: 0x18181c, trim: 0xc99a3c, accent: 0xe0b44a, bottom: 0x101012, inner: 0x2a2a30 } }, wins(1)),
  I('hull', 'ember', 600, { hull: { hull: 0x1e1414, trim: 0x7a1a0a, accent: 0x3a1a10, bottom: 0x140c0c, inner: 0x5a1a0a, glow: 0xff5a1a } }, boss('firegalleon')),

  D('flag'),
  I('flag', 'jolly', 100, { flag: { color: 0x141416, emblem: 'skull' } }),
  I('flag', 'swords', 150, { flag: { color: 0x8e1b1b, emblem: 'x:swords' } }),
  I('flag', 'anchor', 150, { flag: { color: 0x1d3a6b, emblem: 'x:anchor' } }),
  I('flag', 'sun', 200, { flag: { color: 0x1b6b6b, emblem: 'x:sun' } }),
  I('flag', 'heart', 200, { flag: { color: 0xc2456a, emblem: 'x:heart' } }),
  I('flag', 'moon', 250, { flag: { color: 0x161b3a, emblem: 'x:moon' } }, stat('questsDone', 'quests', 20)),
  I('flag', 'crown', 300, { flag: { color: 0x4b2a6b, emblem: 'crown' } }, boss('manowar')),
  I('flag', 'kraken', 400, { flag: { color: 0x3d1f55, emblem: 'x:kraken' } }, kills(3000)),

  D('fig'),
  I('fig', 'mermaid', 300, { fig: 'mermaid' }),
  I('fig', 'eagle', 300, { fig: 'eagle' }),
  I('fig', 'skull', 350, { fig: 'skull' }, stat('rams', 'ram', 150)),
  I('fig', 'kraken', 450, { fig: 'kraken' }, endless(10)),
  I('fig', 'dragon', 600, { fig: 'dragon' }, boss('firegalleon')),

  D('wake', { wake: 0xffffff }),
  I('wake', 'gold', 150, { wake: 0xffd34a }),
  I('wake', 'ice', 150, { wake: 0x9fe8ff }),
  I('wake', 'emerald', 200, { wake: 0x3cf0a0 }),
  I('wake', 'violet', 250, { wake: 0xb07aff }, stat('burned', 'burn', 500)),
  I('wake', 'ember', 250, { wake: 0xff6a2a }),
  I('wake', 'rainbow', 500, { wake: 'rainbow' }, wins(5)),
];
const BY_ID = new Map(DECOS.map(d => [d.id, d]));
export const deco = (id: string): DecoItem | undefined => BY_ID.get(id);
export const decosOf = (slot: DecoSlot): DecoItem[] => DECOS.filter(d => d.slot === slot);

// ---- save: owned (bought) ids and the equipped id per slot ----
const KEY = 'broadside.cosmetics';
const C: { owned: string[]; eq: Record<DecoSlot, string> } = { owned: [], eq: { sail: 'sail.default', hull: 'hull.default', flag: 'flag.default', fig: 'fig.default', wake: 'wake.default' } };
try {
  const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { owned?: unknown; eq?: Record<string, unknown> };
  if (Array.isArray(o.owned)) C.owned = o.owned.filter((x): x is string => typeof x === 'string' && BY_ID.has(x));
  for (const s of DECO_SLOTS) { const v = o.eq?.[s]; if (typeof v === 'string' && BY_ID.get(v)?.slot === s) C.eq[s] = v; }
} catch { /* corrupt or unavailable storage: defaults */ }
function persist(): void {
  if (UNLOCK_ALL) return; // like meta: nothing is saved while ?unlockall is set
  try { localStorage.setItem(KEY, JSON.stringify(C)); } catch { /* storage unavailable */ }
}

/** Settings -> Reset progress / debug.resetMeta: owned and equipped decorations back to the defaults, and the save key removed. */
export function resetCosmetics(): void {
  C.owned = [];
  for (const s of DECO_SLOTS) C.eq[s] = s + '.default';
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export const achDone = (d: DecoItem): boolean => { if (!d.ach) return false; const [a, b] = d.ach.prog(); return a >= b; };
export const owns = (id: string): boolean => {
  const d = BY_ID.get(id);
  return !!d && (UNLOCK_ALL || d.cost === 0 || C.owned.includes(id) || achDone(d));
};
export const equippedId = (s: DecoSlot): string => (owns(C.eq[s]) ? C.eq[s] : s + '.default');
export function buyDeco(id: string): boolean {
  const d = BY_ID.get(id);
  if (!d || owns(id) || M.doubloons < d.cost) return false;
  M.doubloons -= d.cost;
  C.owned.push(id);
  saveMeta(); persist();
  return true;
}
export function equipDeco(id: string): boolean {
  const d = BY_ID.get(id);
  if (!d || !owns(id)) return false;
  C.eq[d.slot] = id;
  persist();
  return true;
}

/** Loadout preview of a focused (maybe locked) item; never applies to a run (cleared by cosmeticsui before sailing). */
export const PREVIEW: { slot: DecoSlot | null; id: string } = { slot: null, id: '' };
const cur = (s: DecoSlot): DecoItem => BY_ID.get(PREVIEW.slot === s ? PREVIEW.id : equippedId(s)) ?? (BY_ID.get(s + '.default') as DecoItem);

// ---- applying to the player ship ----
/** Ship look with the current hull paint, sail colour and flag over the ship's own defaults. */
export function withCosmetics(o: ShipOpts): ShipOpts {
  const r: ShipOpts = { ...o }, s = cur('sail').sail, h = cur('hull').hull, f = cur('flag').flag;
  if (s) { r.sail = s.base; r.sailStripe = undefined; }
  if (h) Object.assign(r, h);
  if (f) { r.flag = f.color; r.emblem = f.emblem; }
  return r;
}

const _c = new THREE.Color(), _b = new THREE.Color(), _a = new THREE.Color();
const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
function patHit(p: SailPat, u: number, v: number): boolean {
  switch (p) {
    case 'stripes': return Math.floor(u * 6) % 2 === 1;
    case 'band': return v > 0.25 && v < 0.55;
    case 'quarter': return (u < 0.5) !== (v < 0.5);
    case 'border': return u < 0.17 || u > 0.83 || v > 0.75;
    default: return false;
  }
}
/** Repaint each sail's vertex colours with the pattern, keeping the original per-facet shading (ratio to the base colour). */
function paintSails(m: ShipModel, s: NonNullable<DecoItem['sail']>): void {
  _b.set(s.base); _a.set(s.alt);
  const lb = Math.max(0.02, lum(_b.r, _b.g, _b.b));
  for (const g of m.sails) g.traverse(o => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    const geo = me.geometry, pos = geo.attributes.position, col = geo.attributes.color, emi = geo.attributes.emit;
    if (!col) return;
    geo.computeBoundingBox();
    const bb = geo.boundingBox as THREE.Box3, w = Math.max(1e-3, bb.max.x - bb.min.x), hgt = Math.max(1e-3, bb.max.y - bb.min.y);
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const u = (cx - bb.min.x) / w, v = (bb.max.y - cy) / hgt, tgt = patHit(s.pat, u, v) ? _a : _b;
      for (let k = i; k < i + 3; k++) {
        const f = Math.min(1.6, lum(col.getX(k), col.getY(k), col.getZ(k)) / lb);
        col.setXYZ(k, tgt.r * f, tgt.g * f, tgt.b * f);
        if (emi && s.glow) emi.setXYZ(k, tgt.r * s.glow, tgt.g * s.glow, tgt.b * s.glow);
      }
    }
    col.needsUpdate = true;
    if (emi) emi.needsUpdate = true;
  });
}

/** Called by initShip after makeShip(withCosmetics(..)) and before cloneMats: sail pattern and figurehead. */
export function applyCosmetics(m: ShipModel): void {
  const s = cur('sail').sail;
  if (s && (s.pat !== 'plain' || s.glow)) paintSails(m, s);
  const k = cur('fig').fig;
  if (!k || !m.frame) return;
  const a = new Anchors(m.frame), ship = m.tilt.children[0] as THREE.Group;
  let mat: THREE.Material | null = null;
  ship.traverse(o => { const me = o as THREE.Mesh; if (!mat && me.isMesh && me.material instanceof PaintedMaterial) mat = me.material; });
  const mesh = new THREE.Mesh(figGeo(k), mat ?? new PaintedMaterial());
  mesh.name = 'figurehead';
  mesh.userData.dress = true; // shipFit / stage framing ignore it
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.scale.setScalar(Math.sqrt(a.L / 6.4) * 1.05);
  mesh.position.set(0, a.rail(1) * 0.8, a.L / 2 - 0.06);
  mesh.rotation.x = 0.78; // raked forward under the bowsprit
  ship.add(mesh);
}

/** Wake foam colour for stepShip. */
export function wakeColor(): number {
  const w = cur('wake').wake ?? 0xffffff;
  return w === 'rainbow' ? _c.setHSL((performance.now() / 2400) % 1, 0.85, 0.66).getHex() : w;
}

// ---- figureheads: built upright (+y) facing +z around the stem mount, then raked by applyCosmetics ----
const GOLD = 0xd9a93a, GOLD2 = 0xb07e22, WOOD = 0x5b3b1f, glow = (c: number, g = 2.2) => ({ emit: c, glow: g });
const figCache = new Map<FigKind, THREE.BufferGeometry>();
function figGeo(k: FigKind): THREE.BufferGeometry {
  let g = figCache.get(k);
  if (!g) { const b = new Builder(); mount(b); FIG[k](b); g = b.build(); figCache.set(k, g); }
  return g;
}
/** Gilded bracket bolting the figure to the stem. */
function mount(b: Builder): void {
  box(b, GOLD2, [0, 0.02, -0.08], [0.14, 0.16, 0.2]);
  prim(b, 'torus', GOLD, [0, 0.1, -0.02], 0.08, [Math.PI / 2, 0, 0]);
}
const mirror = (f: (sx: number) => void): void => { f(1); f(-1); };

const FIG: Record<FigKind, (b: Builder) => void> = {
  mermaid(b) {
    const SKIN = 0xe3b48c, TAIL = 0x2a8f7e, HAIR = 0xb8402a;
    tube(b, TAIL, [0, -0.05, -0.06], [0, 0.18, 0.0], 0.06, 0.1, 8);
    tube(b, TAIL, [0, 0.18, 0.0], [0, 0.38, 0.05], 0.1, 0.12, 8);
    mirror(sx => prim(b, 'cone3', shade2(TAIL), [sx * 0.08, -0.1, -0.1], [0.05, 0.16, 0.025], [0.4, 0, sx * 2.3]));
    prim(b, 'torus', GOLD, [0, 0.38, 0.05], [0.12, 0.12, 0.12], [Math.PI / 2, 0, 0]);
    tube(b, SKIN, [0, 0.38, 0.05], [0, 0.6, 0.08], 0.11, 0.09, 8);
    mirror(sx => prim(b, 'sph', 0xe86a5a, [sx * 0.05, 0.52, 0.14], 0.04));
    mirror(sx => { rod(b, [sx * 0.09, 0.58, 0.07], [sx * 0.15, 0.44, -0.06], 0.028, SKIN, 6); prim(b, 'sph', SKIN, [sx * 0.15, 0.44, -0.07], 0.035); });
    tube(b, SKIN, [0, 0.6, 0.08], [0, 0.66, 0.09], 0.04, 0.035, 6);
    prim(b, 'sph', SKIN, [0, 0.74, 0.11], [0.075, 0.085, 0.08]);
    prim(b, 'sph', HAIR, [0, 0.77, 0.07], [0.085, 0.085, 0.085]);
    tube(b, HAIR, [0, 0.74, 0.04], [0, 0.46, -0.05], 0.07, 0.035, 7);
    mirror(sx => tube(b, HAIR, [sx * 0.06, 0.72, 0.07], [sx * 0.08, 0.56, 0.06], 0.035, 0.015, 5));
    for (let i = 0; i < 5; i++) prim(b, 'cone6', GOLD, [(i - 2) * 0.03, 0.84, 0.1 - Math.abs(i - 2) * 0.012], [0.012, 0.05, 0.012]);
  },
  dragon(b) {
    const SC = 0x2f7a46, BELLY = 0xd8b45a, HORN = 0xe8dcc0;
    tube(b, SC, [0, -0.04, -0.04], [0, 0.32, 0.04], 0.12, 0.1, 8);
    tube(b, SC, [0, 0.32, 0.04], [0, 0.56, 0.2], 0.1, 0.08, 8);
    tube(b, BELLY, [0, 0.0, 0.03], [0, 0.32, 0.11], 0.07, 0.06, 6);
    box(b, SC, [0, 0.62, 0.3], [0.16, 0.13, 0.24], [-0.2, 0, 0]);
    box(b, SC, [0, 0.6, 0.46], [0.12, 0.08, 0.16], [-0.1, 0, 0]);
    box(b, shade2(SC), [0, 0.53, 0.4], [0.11, 0.04, 0.22], [0.25, 0, 0]);
    for (let i = 0; i < 4; i++) mirror(sx => prim(b, 'cone6', HORN, [sx * 0.035, 0.535, 0.48 - i * 0.04], [0.01, 0.035, 0.01], [Math.PI, 0, 0]));
    mirror(sx => {
      prim(b, 'cone6', HORN, [sx * 0.06, 0.74, 0.24], [0.025, 0.17, 0.025], [-0.9, 0, sx * -0.25]);
      prim(b, 'sph', 0xff3a1a, [sx * 0.078, 0.66, 0.38], 0.022, [0, 0, 0], glow(0xff4010, 3));
      prim(b, 'sph', 0x111111, [sx * 0.035, 0.63, 0.545], 0.014);
      // folded wing: a fan of three gilded fingers with membrane boxes
      for (let j = 0; j < 3; j++) box(b, j % 2 ? shade2(SC) : SC, [sx * (0.15 + j * 0.03), 0.3 + j * 0.05, -0.08 - j * 0.04], [0.02, 0.3 - j * 0.05, 0.16], [0.35 + j * 0.15, 0, sx * (0.45 + j * 0.12)]);
    });
    for (let i = 0; i < 5; i++) prim(b, 'cone6', GOLD, [0, 0.1 + i * 0.11, -0.07 + i * 0.045], [0.025, 0.08, 0.025], [-0.5, 0, 0]);
  },
  skull(b) {
    const BONE = 0xe9e1c9;
    tube(b, WOOD, [0, -0.04, -0.06], [0, 0.22, 0.02], 0.08, 0.07, 7);
    mirror(sx => {
      rod(b, [sx * -0.3, 0.12, -0.06], [sx * 0.3, 0.62, -0.06], 0.035, BONE, 6);
      for (const e of [[-0.3, 0.12], [0.3, 0.62]]) mirror(o => prim(b, 'sph', BONE, [sx * e[0] + o * 0.03, e[1] + sx * o * -0.03, -0.06], 0.05));
    });
    prim(b, 'sph', BONE, [0, 0.46, 0.06], [0.2, 0.19, 0.21]);
    box(b, BONE, [0, 0.31, 0.12], [0.18, 0.1, 0.15]);
    mirror(sx => {
      prim(b, 'sph', 0x141210, [sx * 0.075, 0.43, 0.22], [0.055, 0.05, 0.03]);
      prim(b, 'sph', 0x4dff7a, [sx * 0.075, 0.43, 0.235], 0.018, [0, 0, 0], glow(0x40ff70, 3));
    });
    prim(b, 'cone3', 0x141210, [0, 0.36, 0.25], [0.025, 0.05, 0.015], [0, 0, Math.PI]);
    for (let i = 0; i < 5; i++) box(b, 0xf6f0de, [(i - 2) * 0.03, 0.275, 0.2], [0.022, 0.04, 0.02]);
    box(b, 0x2a2018, [0, 0.3, 0.198], [0.15, 0.008, 0.01]);
  },
  eagle(b) {
    const BR = 0x5a3a22, WH = 0xf0ece0, BK = 0xe8b230;
    prim(b, 'sph', BR, [0, 0.3, 0.05], [0.14, 0.25, 0.15]);
    prim(b, 'sph', shade2(BR), [0, 0.28, 0.12], [0.1, 0.18, 0.08]);
    prim(b, 'sph', WH, [0, 0.6, 0.12], [0.1, 0.1, 0.11]);
    prim(b, 'cone6', BK, [0, 0.58, 0.25], [0.035, 0.11, 0.04], [Math.PI / 2 + 0.35, 0, 0]);
    mirror(sx => {
      prim(b, 'sph', 0x111111, [sx * 0.06, 0.63, 0.19], 0.016);
      // spread wing: four long gilded feathers fanning back and up
      for (let j = 0; j < 4; j++) {
        const len = 0.42 - j * 0.06, ang = 0.5 + j * 0.28;
        box(b, j % 2 ? GOLD : GOLD2, [sx * (0.12 + Math.sin(ang) * len * 0.5), 0.42 + Math.cos(ang) * len * 0.45, -0.06 - j * 0.03], [len, 0.06, 0.03], [0, -sx * 0.4, sx * (Math.PI / 2 - ang)]);
      }
      for (let j = 0; j < 3; j++) prim(b, 'cone6', BK, [sx * 0.05 + (j - 1) * 0.02, -0.02, 0.1], [0.012, 0.07, 0.012], [Math.PI - 0.3, 0, 0]);
    });
    prim(b, 'cone6', WH, [0, 0.02, -0.08], [0.08, 0.16, 0.03], [Math.PI + 0.3, 0, 0]);
  },
  kraken(b) {
    const PU = 0x6b3a8a, SU = 0xe0a0c8;
    prim(b, 'sph', PU, [0, 0.52, 0.0], [0.17, 0.25, 0.17]);
    prim(b, 'sph', shade2(PU), [0, 0.74, -0.04], [0.1, 0.1, 0.1]);
    mirror(sx => {
      prim(b, 'sph', 0xffd23a, [sx * 0.09, 0.44, 0.13], 0.045, [0, 0, 0], glow(0xffb020, 1.6));
      prim(b, 'sph', 0x111111, [sx * 0.1, 0.44, 0.165], [0.012, 0.03, 0.012]);
    });
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 + 0.3, ca = Math.cos(a0), sa = Math.sin(a0);
      const p: V3[] = [[ca * 0.1, 0.34, sa * 0.1], [ca * 0.2, 0.18, sa * 0.2 + 0.03], [ca * 0.24, 0.0, sa * 0.18 + 0.06], [ca * 0.17, -0.12, sa * 0.1 + 0.12]];
      for (let j = 0; j < 3; j++) tube(b, j ? PU : shade2(PU), p[j], p[j + 1], 0.06 - j * 0.017, 0.045 - j * 0.017, 6);
      prim(b, 'sph', SU, p[2], 0.022);
    }
  },
};
function shade2(c: number): number { return ((c >> 1) & 0x7f7f7f) + ((c >> 2) & 0x3f3f3f); }

// ---- extra flag emblems on the 128x80 cloth (rig.ts EMBLEM_ART) ----
const CREAM = '#f4efe2', GOLDC = '#f2c14e';
EMBLEM_ART['x:swords'] = (g, _bg, tint) => {
  g.lineCap = 'round';
  for (const s of [1, -1]) {
    g.strokeStyle = tint ?? '#e8e8ee'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(64 - s * 34, 68); g.quadraticCurveTo(64 + s * 2, 44, 64 + s * 30, 12); g.stroke();
    g.strokeStyle = tint ?? GOLDC; g.lineWidth = 5;
    g.beginPath(); g.moveTo(64 - s * 42, 58); g.lineTo(64 - s * 24, 72); g.stroke();
    g.fillStyle = tint ?? GOLDC; g.beginPath(); g.arc(64 - s * 38, 72, 4, 0, Math.PI * 2); g.fill();
  }
};
EMBLEM_ART['x:anchor'] = (g, _bg, tint) => {
  const ink = tint ?? CREAM;
  g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 16, 6, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(64, 22); g.lineTo(64, 66); g.moveTo(48, 30); g.lineTo(80, 30); g.stroke();
  g.beginPath(); g.arc(64, 44, 24, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  for (const s of [1, -1]) { g.beginPath(); g.moveTo(64 + s * 30, 50); g.lineTo(64 + s * 18, 52); g.lineTo(64 + s * 25, 60); g.closePath(); g.fill(); }
};
EMBLEM_ART['x:sun'] = (g, _bg, tint) => {
  g.fillStyle = tint ?? GOLDC;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.beginPath(); g.moveTo(64 + Math.cos(a - 0.12) * 18, 40 + Math.sin(a - 0.12) * 18); g.lineTo(64 + Math.cos(a) * 34, 40 + Math.sin(a) * 34); g.lineTo(64 + Math.cos(a + 0.12) * 18, 40 + Math.sin(a + 0.12) * 18); g.fill();
  }
  g.beginPath(); g.arc(64, 40, 17, 0, Math.PI * 2); g.fill();
};
EMBLEM_ART['x:heart'] = (g, bg, tint) => {
  g.fillStyle = tint ?? CREAM;
  g.beginPath(); g.moveTo(64, 70); g.bezierCurveTo(30, 48, 34, 14, 64, 28); g.bezierCurveTo(94, 14, 98, 48, 64, 70); g.fill();
  g.strokeStyle = tint ?? GOLDC; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(28, 64); g.lineTo(100, 18); g.stroke();
  g.fillStyle = tint ?? GOLDC; g.beginPath(); g.moveTo(104, 15); g.lineTo(92, 18); g.lineTo(99, 26); g.fill();
  g.fillStyle = bg;
};
EMBLEM_ART['x:moon'] = (g, bg, tint) => {
  g.fillStyle = tint ?? CREAM;
  g.beginPath(); g.arc(56, 40, 24, 0, Math.PI * 2); g.fill();
  g.fillStyle = bg; g.beginPath(); g.arc(66, 34, 21, 0, Math.PI * 2); g.fill();
  g.fillStyle = tint ?? GOLDC;
  for (const [x, y, r] of [[88, 20, 6], [100, 44, 4.5], [84, 60, 5]]) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
};
EMBLEM_ART['x:kraken'] = (g, bg, tint) => {
  const ink = tint ?? '#e0a0e8';
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    const x0 = 46 + i * 7, dir = i < 3 ? -1 : 1;
    g.beginPath(); g.moveTo(x0, 40); g.quadraticCurveTo(x0 + dir * 14, 58, x0 + dir * (8 + i % 3 * 6), 72); g.stroke();
  }
  g.beginPath(); g.ellipse(64, 28, 19, 20, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = bg; for (const s of [1, -1]) { g.beginPath(); g.arc(64 + s * 8, 30, 4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = GOLDC; for (const s of [1, -1]) { g.beginPath(); g.arc(64 + s * 8, 30, 2, 0, Math.PI * 2); g.fill(); }
};
