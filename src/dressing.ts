import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { G } from './game';
import { L, SHIPS, ShipId, startModules } from './loadout';
import { MODS, Slot } from './modules';
import { deriveStats } from './content';
import { Builder, PaintedMaterial } from './geo';
import type { ShipModel } from './models';
import { emblemTexture } from './rig';
import { Anchors } from './dressing/anchors';
import { ATTACH } from './dressing/registry';
import { helm } from './dressing/deckstern';
import { CAPTAIN, CAPTAIN0, Look, figureGeo } from './dressing/figures';
import { addCrowd, footprint, clearCrowds, animateCrew, crowdCounts, walkAmps, initCrewAnim, muzzleTip, crewPerf, type Spot } from './dressing/crewanim';
import { crewFxView } from './dressing/crewfx';
import { crewState, CREW_ORDER, DECK_T, crewHash, startCrew, CrewState } from './crewdefs';
import { trinketGeo } from './dressing/relic';
import { rod } from './dressing/kit';
import type { Anim } from './dressing/types';
import { input } from './input';

// ---- equipment dressing on the player ship: module attachments, crew, captain at the helm, relic charm and flag tint.
// Rebuilt only when the equipped set changes (checked each frame without allocating); geometry is cached per ship + mount.

interface Mount { id: string; slot: Slot; idx: number }
interface Mover { obj: THREE.Object3D; kind: Anim['kind']; ph: number; halo?: THREE.Sprite; size: number; y: number }

let ship: ShipId = 'galleon', model: ShipModel | null = null, mat: THREE.Material = new PaintedMaterial(), a: Anchors | null = null;
const root = new THREE.Group();
root.name = 'dressing';
const statics = new Map<string, THREE.BufferGeometry>();
const built = new Map<string, { geo: THREE.BufferGeometry; anims: Anim[] }>();
const figGeo = new Map<string, THREE.BufferGeometry>();
const movers: Mover[] = [];
let captain: { mesh: THREE.Mesh; spot: Spot } | null = null;
/** Static parts collected during a rebuild, merged into one mesh (one draw call plus its shadow pass). */
const parts: THREE.BufferGeometry[] = [];
let merged: THREE.BufferGeometry | null = null;

/** Called by initShip after cloneMats: dressing parts share the ship's own painted material, so hit flashes cover them. */
export function resetDressing(m: ShipModel, id: ShipId): void {
  model = m; ship = id; a = m.frame ? new Anchors(m.frame) : null;
  m.root.traverse(o => { const me = o as THREE.Mesh; if (me.isMesh && me.material instanceof PaintedMaterial) mat = me.material; });
  (m.tilt.children[0] as THREE.Group).add(root);
  key.mode = -1; // force a rebuild on the next frame
  if (a) initCrewAnim(root, a);
}

// ---- change detection (no allocation per frame) ----
const key = { mode: -1, ship: '', cap: '', crew: 0, relic: null as string | null, start: null as string | null, mods: 0, balls: 0 };
const codes = new Map<string, number>();
const code = (id: string): number => { let c = codes.get(id); if (c === undefined) { c = codes.size + 1; codes.set(id, c); } return c; };
function modsHash(): number {
  let h = G.modules.length;
  for (const m of G.modules) h = (h * 131 + code(m.id) * 8 + m.idx) % 2147483647;
  return h;
}

/** Debug (like __game.debug): dress with these mounts instead of the loadout / run (to look at attachments the module table does not have yet). */
let force: Mount[] | null = null;
{
  (window as unknown as { __dressing: unknown }).__dressing = {
    /** Figures standing on deck per crew group (instanced meshes), e.g. { 'crew:musket': 2 }. */
    crowd: crowdCounts, walkers: walkAmps,
    /** World position of musketeer i's raised muzzle tip; crew fx pool state. */
    muzzle: muzzleTip, fx: crewFxView, perf: crewPerf,
    /** Close-up camera for screenshots (bypasses the 0.6 wheel clamp; the next wheel turn clamps it again). */
    zoom(z: number): void { input.zoom = z; dispatchEvent(new Event('resize')); },
    show(ids: string[] | null): void {
      const used: Record<string, number> = {};
      force = ids && ids.map(id => { const slot = ATTACH[id]?.slot ?? 'deck', idx = used[slot] ?? 0; used[slot] = idx + 1; return { id, slot, idx }; });
      key.mode = -1;
    },
  };
}

/** Re-dress when the loadout (menu preview) or the run's modules / ball count changed, then animate. */
export function stepDressing(t: number, dt: number): void {
  if (!model || !a) return;
  const menu = G.state === 'menu', mode = menu ? 0 : 1;
  const balls = menu ? key.balls : G.st.balls + (G.modStats.broadside?.auto.count ?? 0), mods = menu ? 0 : modsHash();
  const ch = crewHash(shown(menu));
  if (mode !== key.mode || ship !== key.ship || L.captain !== key.cap || ch !== key.crew || L.relic !== key.relic
    || (menu && L.startModule !== key.start) || mods !== key.mods || balls !== key.balls) {
    Object.assign(key, { mode, ship, cap: L.captain, crew: ch, relic: L.relic, start: L.startModule, mods, balls });
    if (menu) key.balls = deriveStats({}).balls;
    rebuild(force ?? (menu ? previewMounts() : G.modules), key.balls);
  }
  animate(t);
  animateCrew(t, Math.min(0.1, dt));
}

/** The crew on deck: the run's, or the loadout preview (start crew) in the menu. */
const shown = (menu: boolean): CrewState => (menu ? startCrew(L.crew) : crewState);

/** Start modules of the current loadout, numbered per slot like addModule does. */
function previewMounts(): Mount[] {
  const used: Partial<Record<Slot, number>> = {}, caps = SHIPS[ship].slots, out: Mount[] = [];
  for (const id of startModules(ship, L.captain, L.startModule)) {
    const slot = MODS[id].slot, idx = used[slot] ?? 0;
    if (idx >= caps[slot]) continue;
    used[slot] = idx + 1;
    out.push({ id, slot, idx });
  }
  return out;
}

// ---- building ----
function addMesh(g: THREE.BufferGeometry, parent: THREE.Object3D = root): THREE.Mesh {
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true; m.userData.dress = true;
  parent.add(m);
  return m;
}
function cachedStatic(k: string, fn: (b: Builder) => void): THREE.BufferGeometry {
  let g = statics.get(k);
  if (!g) { const b = new Builder(); fn(b); g = b.build(); statics.set(k, g); }
  return g;
}

function clear(): void {
  merged?.dispose(); merged = null; parts.length = 0;
  clearCrowds();
  movers.length = 0; captain = null;
  for (let i = root.children.length - 1; i >= 0; i--) root.remove(root.children[i]);
}

/** Sideways shift of a lane-placed attachment in a two-mount slot: mounts alternate +/- sides unless one is pinned to a side. */
function laneShift(l: NonNullable<typeof ATTACH[string]['lane']>, m: Mount, mounts: readonly Mount[]): number {
  const other = mounts.find(o => o !== m && o.slot === m.slot && ATTACH[o.id]?.lane?.pin);
  const side = l.pin ?? (other ? -(ATTACH[other.id].lane!.pin as number) : m.idx % 2 ? -1 : 1);
  return side * l.half - l.x;
}

function rebuild(mounts: readonly Mount[], balls: number): void {
  if (!a || !model) return;
  const an = a;
  clear();
  const helmT = 0.2, obstacles: number[] = [];
  parts.push(cachedStatic('helm:' + ship, b => helm(b, an, helmT + 0.06)));
  for (const m of mounts) {
    const at = ATTACH[m.id];
    if (!at) continue;
    const slot = MODS[m.id as keyof typeof MODS]?.slot ?? at.slot, n = SHIPS[ship].slots[slot] ?? 1;
    const dx = n > 1 && at.lane ? laneShift(at.lane, m, mounts) : 0;
    const k = `${ship}:${m.id}:${m.idx}:${n}:${at.usesBalls ? balls : 0}:${dx}`;
    let e = built.get(k);
    if (!e) {
      const b = new Builder(), anims: Anim[] = [];
      at.build(b, an, { idx: m.idx, n, balls, color: MODS[m.id as keyof typeof MODS]?.color ?? at.color, anims });
      e = { geo: b.build(), anims };
      if (dx) { e.geo.translate(dx, 0, 0); for (const x of anims) x.at = [x.at[0] + dx, x.at[1], x.at[2]]; }
      built.set(k, e);
    }
    if (!e.geo.attributes.position.count) continue;
    parts.push(e.geo);
    footprint(e.geo, obstacles);
    for (const x of e.anims) addMover(x, m.idx * 1.7);
  }
  dressCrew(obstacles);
  const fh = model.tilt.children[0]?.getObjectByName('figurehead');
  if (fh) fh.visible = !mounts.some(m => m.id === 'ram'); // the Ram's iron beak occupies the stem: a figurehead would clip through its collar
  const cl = CAPTAIN[L.captain] ?? CAPTAIN0, spot = { x: 0, y: an.top(helmT), z: an.z(helmT), yaw: 0, ph: 0 };
  captain = { mesh: addMesh(fig('cap:' + L.captain, cl)), spot };
  dressRelic();
  merged = parts.length > 1 ? mergeGeometries(parts) : null;
  if (merged ?? parts[0]) addMesh(merged ?? parts[0]);
}

const haloTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d') as CanvasRenderingContext2D, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const haloMats = new Map<number, THREE.SpriteMaterial>();
function haloMat(col: number): THREE.SpriteMaterial {
  let m = haloMats.get(col);
  if (!m) {
    m = new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 });
    m.color.set(col).multiplyScalar(1.6);
    haloMats.set(col, m);
  }
  return m;
}

function addMover(x: Anim, ph: number): void {
  const obj = addMesh(x.geo);
  obj.position.set(...x.at);
  let halo: THREE.Sprite | undefined;
  if (x.halo) {
    halo = new THREE.Sprite(haloMat(x.halo.color));
    halo.position.y = x.halo.dy ?? 0;
    halo.scale.setScalar(x.halo.size);
    obj.add(halo);
  }
  movers.push({ obj, kind: x.kind, ph, halo, size: x.halo?.size ?? 0, y: x.at[1] });
}

function fig(k: string, l: Look): THREE.BufferGeometry {
  let g = figGeo.get(k);
  if (!g) { g = figureGeo(l); figGeo.set(k, g); }
  return g;
}

/** Spots on the main deck between the bulwark guns and the centre-line clutter (hatch, boat), alternating sides fore to aft. */
function deckSpots(an: Anchors): Spot[] {
  const out: Spot[] = [], ts = DECK_T;
  ts.forEach((t, i) => {
    const side = i % 2 ? -1 : 1, z = an.z(t);
    out.push({ x: side * an.deckX(t) * 0.48, y: an.top(t), z, yaw: side * 1.1 + ((i * 0.37) % 0.6) - 0.3, ph: i * 1.3 + side });
  });
  return out;
}

function dressCrew(obstacles: readonly number[]): void {
  if (!a) return;
  const spots = deckSpots(a), st = shown(G.state === 'menu');
  let s = 0;
  for (const id of CREW_ORDER) {
    const n = st[id]?.count ?? 0;
    if (n <= 0) continue;
    const mine = spots.slice(s, s + n);
    s += n;
    if (mine.length) addCrowd(id, mine, root, mat, obstacles);
  }
}

const RELIC_T = 0;
function dressRelic(): void {
  if (!a || !model) return;
  const an = a, f = an.f, x = an.sideX(RELIC_T, 1) * 0.85, y = an.sternTop + 0.21, z = -an.L / 2 - 0.05;
  const flagMesh = model.flag?.children[0] as THREE.Mesh | undefined;
  if (!L.relic) {
    if (flagMesh && f.flag) (flagMesh.material as THREE.MeshStandardMaterial).map = emblemTexture(f.flag.color, f.flag.emblem);
    return;
  }
  parts.push(cachedStatic('relicarm:' + ship, b => {
    rod(b, [x, y - 0.02, z], [x, y + 0.12, z - 0.12], 0.015, 0x2b2c31, 4);
    rod(b, [x, y + 0.12, z - 0.12], [x, y + 0.1, z - 0.3], 0.015, 0x2b2c31, 4);
  }));
  const k = 'relic:' + L.relic;
  let e = built.get(k);
  if (!e) {
    const tg = trinketGeo(L.relic);
    e = { geo: tg.geo, anims: [{ geo: tg.geo, at: [0, 0, 0], kind: 'swing', halo: { color: tg.col, size: 0.75, dy: -0.2 } }] };
    built.set(k, e);
  }
  const an0 = e.anims[0];
  addMover({ ...an0, at: [x, y + 0.1, z - 0.3] }, 2.1);
  const col = an0.halo?.color;
  if (flagMesh && f.flag) (flagMesh.material as THREE.MeshStandardMaterial).map = emblemTexture(f.flag.color, f.flag.emblem, col);
}

// ---- animation (no allocation) ----
function animate(t: number): void {
  if (captain) {
    const s = captain.spot, o = captain.mesh;
    o.position.set(s.x + Math.sin(t * 0.5) * 0.02, s.y, s.z);
    o.rotation.y = Math.sin(t * 0.35) * 0.25;
  }
  for (const m of movers) {
    const o = m.obj;
    if (m.kind === 'spin') { o.rotation.y = t * 0.9 + m.ph; o.position.y = m.y + Math.sin(t * 1.8 + m.ph) * 0.03; }
    else if (m.kind === 'swing') { o.rotation.z = Math.sin(t * 1.6 + m.ph) * 0.16; o.rotation.x = Math.sin(t * 1.1 + m.ph) * 0.1; }
    else o.position.y = m.y + Math.sin(t * 2 + m.ph) * 0.03;
    if (m.halo) m.halo.scale.setScalar(m.size * (0.86 + 0.14 * Math.sin(t * 2.4 + m.ph)));
  }
}
