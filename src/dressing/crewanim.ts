import * as THREE from 'three';
import { G } from '../game';
import { L } from '../loadout';
import type { CrewId } from '../relics';
import { crewEvents, setFigureLocator, crewMarked, type CrewEvent, type CrewKind } from '../crew';
import { crewState, isAdv } from '../crewdefs';
import type { Anchors } from './anchors';
import { CREW, DECKHAND, figureGeo, figureParts, type FigParts } from './figures';
import { rigOf, armMatrix, PIVOT_L, PIVOT_R, AIM_BUTT, MUZZLE, type Rig } from './rig';
import { musketFlash, sparks, healRing, warmGlow, mugPop, leap, leapHome, prewarmCrewFx, setLeapGeo, stepCrewFx, glintAt, flash, LEAP_T } from './crewfx';

// ---- crew figures on deck: instanced body + arm parts per crew type, idle life (bob, look around, a few walk the deck)
// and the per-figure reactions to crew.ts events (fire, repair, heal, leap, grog, spot). Also the figure locator for crew.ts.
// State lives in fixed per-figure records that survive rebuilds; the frame loop only writes instance matrices. ----

export interface Spot { x: number; y: number; z: number; yaw: number; ph: number }
interface Fig { slot: number; act: CrewKind | null; t: number; yaw: number; cur: number; climb: number; spotT: number; hits: number; tx: number; tz: number; lx: number; ly: number; lz: number; wz: number }
interface Crowd { type: CrewId; body: THREE.InstancedMesh; r: THREE.InstancedMesh; l: THREE.InstancedMesh | null; spots: Spot[]; s: number; rig: Rig; walk: boolean[]; amp: number[] }

const DUR: Record<CrewKind, number> = { fire: 0.95, repair: 0.9, heal: 1.3, leap: LEAP_T + 0.15, grog: 1.3, spot: 1.6 };
const figs: Partial<Record<CrewId, Fig[]>> = {};
const crowds: Crowd[] = [], byType: Partial<Record<CrewId, Crowd>> = {};
const parts = new Map<string, FigParts>(), merged = new Map<string, THREE.BufferGeometry>();
let root: THREE.Object3D | null = null, an: Anchors | null = null, wired = false;

function fig(type: CrewId, i: number): Fig {
  const a = figs[type] ?? (figs[type] = []);
  while (a.length <= i) a.push({ slot: -1, act: null, t: 0, yaw: 0, cur: NaN, climb: 0, spotT: 0, hits: 0, tx: 0, tz: 0, lx: 0, ly: 0, lz: 0, wz: 0 });
  return a[i];
}

/** Hooks the event stream and the locator (lazily: crew.ts sits in an import cycle with the dressing). */
export function initCrewAnim(r: THREE.Object3D, a: Anchors): void {
  root = r; an = a;
  prewarmCrewFx();
  if (wired) return;
  wired = true;
  crewEvents.on('*', onEvent);
  setFigureLocator((type, index, out) => {
    const c = byType[type];
    if (!c || !root || index >= c.spots.length || G.state === 'menu') return false;
    const f = fig(type, index);
    _w.set(f.lx, f.ly + AIM_BUTT.y * c.s, f.lz).applyMatrix4(root.matrixWorld); // shoulder height: the raised musket's muzzle is ~0.5 ahead (crew.ts flashes there)
    out.x = _w.x; out.y = _w.y; out.z = _w.z;
    return true;
  });
}

export function clearCrowds(): void {
  for (const c of crowds) { c.body.dispose(); c.r.dispose(); c.l?.dispose(); }
  crowds.length = 0;
  for (const k of Object.keys(byType)) delete byType[k as CrewId];
}

/** Adds the instanced figures of one crew type on these deck spots (index i = figure i of that type). */
export function addCrowd(type: CrewId, spots: Spot[], parent: THREE.Object3D, mat: THREE.Material, obstacles: readonly number[] = []): void {
  const look = CREW[type] ?? DECKHAND, rig = rigOf(type), adv = isAdv(crewState[type]) && G.state !== 'menu', key = type + (adv ? ':5' : '');
  let p = parts.get(key);
  if (!p) { p = figureParts(look, adv, !!rig.l); parts.set(key, p); }
  const mk = (g: THREE.BufferGeometry): THREE.InstancedMesh => {
    const m = new THREE.InstancedMesh(g, mat, spots.length);
    m.castShadow = true; m.receiveShadow = true; m.userData.dress = true; m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(m);
    return m;
  };
  const body = mk(p.body);
  body.userData.k = 'crew:' + type;
  // a walker's pacing range is the longest of 0.32 / 0.2 / 0.1 that stays clear of masts and deck clutter (module attachments); none = it stands
  const amp = spots.map((s, i) => {
    if ((i + type.length) % 3 !== 1 || !an || type === 'look') return 0;
    for (const a of WALK_AMP) if (an.clearAt(s.z - a - 0.03, 0.3) && an.clearAt(s.z + a + 0.03, 0.3) && !blocked(s, a, obstacles)) return a;
    return 0;
  });
  const walk = amp.map(a => a > 0);
  const c: Crowd = { type, body, r: mk(p.r), l: p.l ? mk(p.l) : null, spots, s: p.s, rig, walk, amp };
  crowds.push(c); byType[type] = c;
  spots.forEach((s, i) => { const f = fig(type, i); f.lx = s.x; f.ly = s.y; f.lz = s.z; });
  if (type === 'boarder') {
    let g = merged.get(key);
    if (!g) { g = figureGeo(look, adv); merged.set(key, g); }
    setLeapGeo(g, mat);
  }
}

const WALK_AMP = [0.32, 0.2, 0.1];
/** Does the figure's footprint (a ~0.5 wide, 0.7 tall column) over its pacing range [z-a, z+a] meet an attachment? `pts` = flat x,y,z samples of the attachments' vertices and triangle centres. */
function blocked(s: Spot, a: number, pts: readonly number[]): boolean {
  for (let k = 0; k < pts.length; k += 3) {
    const y = pts[k + 1];
    if (y < s.y + 0.05 || y > s.y + 0.7) continue;
    if (Math.abs(pts[k] - s.x) < 0.25 && pts[k + 2] > s.z - a - 0.2 && pts[k + 2] < s.z + a + 0.2) return true;
  }
  return false;
}

/** Flat x,y,z samples of a geometry (vertices plus triangle centres) for the walkers' clutter test. */
export function footprint(g: THREE.BufferGeometry, out: number[]): void {
  const p = g.attributes.position, ix = g.index, n = ix ? ix.count : p.count;
  for (let i = 0; i < p.count; i++) out.push(p.getX(i), p.getY(i), p.getZ(i));
  for (let i = 0; i + 2 < n; i += 3) {
    const a = ix ? ix.getX(i) : i, b = ix ? ix.getX(i + 1) : i + 1, c = ix ? ix.getX(i + 2) : i + 2;
    out.push((p.getX(a) + p.getX(b) + p.getX(c)) / 3, (p.getY(a) + p.getY(b) + p.getY(c)) / 3, (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3);
  }
}

/** Debug: pacing range per figure of each crowd (0 = stands), e.g. { 'crew:musket': [0.32, 0] }. */
export const walkAmps = (): Record<string, number[]> => Object.fromEntries(crowds.map(c => [c.body.userData.k as string, c.amp]));

export const crowdCounts = (): Record<string, number> => Object.fromEntries(crowds.map(c => [c.body.userData.k as string, c.body.count]));

// ---- events ----
const _w = new THREE.Vector3(), _v = new THREE.Vector3();
function worldOf(lx: number, ly: number, lz: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(lx, ly, lz).applyMatrix4((root as THREE.Object3D).matrixWorld);
}
function onEvent(e: CrewEvent): void {
  const c = byType[e.type];
  if (!c || !root || e.index >= c.spots.length) return; // a figure added this frame is built on the next one
  const f = fig(e.type, e.index), s = c.spots[e.index];
  f.act = e.kind; f.t = 0; f.hits = 0;
  if (e.target) {
    f.tx = e.target.x; f.tz = e.target.z;
    worldOf(f.lx, f.ly, f.lz, _w);
    f.yaw = Math.atan2(f.tx - _w.x, f.tz - _w.z) - G.player.heading;
  }
  switch (e.kind) {
    case 'fire': { // snap to the target and fire from the raised muzzle (the shot itself left from the locator's shoulder point)
      f.cur = f.yaw;
      const sn = Math.sin(f.yaw), cs = Math.cos(f.yaw), fw = (AIM_BUTT.z + MUZZLE) * c.s, sd = AIM_BUTT.x * c.s;
      worldOf(f.lx + sn * fw + cs * sd, f.ly + AIM_BUTT.y * c.s, f.lz + cs * fw - sn * sd, _w);
      const h = f.yaw + G.player.heading;
      musketFlash(_w.x, _w.y, _w.z, Math.sin(h), Math.cos(h));
      break;
    }
    case 'repair': f.yaw = (s.x >= 0 ? 1 : -1) * Math.PI / 2; break; // face the rail
    case 'heal': healRing(L.def.length * 0.62); break;
    case 'grog': warmGlow(); break;
    case 'spot': f.spotT = 5; flash(f.tx, 2.6, f.tz, 0xfff2c0, 1.1, 0.35); break;
    case 'leap': worldOf(f.lx, f.ly + 0.2, f.lz, _w); f.slot = leap(_w.x, _w.y, _w.z, f.tx, f.tz); break;
  }
}

// ---- per-frame pose (no allocation) ----
const _m = new THREE.Matrix4(), _a = new THREE.Matrix4(), _o = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const bell = (k: number): number => (k <= 0 || k >= 1 ? 0 : Math.min(1, Math.sin(Math.PI * k) * 1.6));
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Debug: accumulated cost of animateCrew (figures + world fx), see __dressing.perf. */
export const crewPerf = { frames: 0, ms: 0, worst: 0 };
export function animateCrew(t: number, dt: number): void {
  const t0 = performance.now();
  stepAll(t, dt);
  const ms = performance.now() - t0;
  crewPerf.frames++; crewPerf.ms += ms; crewPerf.worst = Math.max(crewPerf.worst, ms);
}
function stepAll(t: number, dt: number): void {
  for (const c of crowds) {
    for (let i = 0; i < c.spots.length; i++) animateFig(c, i, t, dt);
    c.body.instanceMatrix.needsUpdate = true; c.r.instanceMatrix.needsUpdate = true;
    if (c.l) c.l.instanceMatrix.needsUpdate = true;
  }
  if (!root) return;
  root.getWorldPosition(_v);
  stepCrewFx(dt, _v.x, _v.y, _v.z);
  const mk = G.state === 'menu' ? null : crewMarked();
  glintAt(mk?.x ?? 0, 2.8, mk?.z ?? 0, !!mk, t);
}

function animateFig(c: Crowd, i: number, t: number, dt: number): void {
  const s = c.spots[i], f = fig(c.type, i);
  if (f.act && (f.t += dt) >= DUR[f.act]) f.act = null;
  if (f.spotT > 0) f.spotT -= dt;
  let x = s.x, y = s.y, z = s.z, yaw = s.yaw + Math.sin(t * 0.6 + s.ph) * 0.45, bob = Math.max(0, Math.sin(t * 2.2 + s.ph)) * 0.02;
  // idle walkers pace a few steps along their rail and turn at the ends
  if (c.walk[i]) {
    const w = t * 0.3 + s.ph, dir = Math.cos(w), want = f.act ? f.wz : Math.sin(w) * c.amp[i];
    f.wz += (want - f.wz) * Math.min(1, dt * 4);
    z += f.wz;
    if (!f.act && Math.abs(dir) > 0.2) { yaw = dir > 0 ? 0 : Math.PI; bob = Math.abs(Math.sin(t * 7 + s.ph)) * 0.025; }
  }
  if (c.type === 'look' && an) { // up the mainmast while a spot is fresh (Eagle Eye: the first lookout lives up there)
    const want = f.spotT > 0 || (i === 0 && isAdv(crewState.look) && G.state !== 'menu') ? 1 : 0;
    f.climb = Math.max(0, Math.min(1, f.climb + (want ? dt : -dt) / 1.4));
    if (f.climb > 0) {
      const m = an.main, ang = i * 2.1 + 0.6, mx = Math.sin(ang) * 0.17, mz = m.z + Math.cos(ang) * 0.17, k = f.climb;
      const h = Math.min(1, k / 0.3), v = Math.max(0, (k - 0.3) / 0.7);
      x += (mx - x) * h; z += (mz - z) * h; y += (m.lower + 0.05 - y) * v * v * (3 - 2 * v);
      if (k >= 1) yaw = f.spotT > 0 ? f.yaw : ang + Math.PI + Math.sin(t * 0.4 + s.ph) * 0.8;
      else if (k > 0.3) yaw = ang + Math.PI; // face the mast while climbing
      bob = k > 0.3 && k < 1 ? Math.abs(Math.sin(t * 9)) * 0.03 : 0;
    }
  }
  let kr = 0, kl = 0, push = 0, hidden = false;
  const tt = f.t;
  switch (f.act) {
    case 'fire':
      yaw = f.yaw;
      kr = tt < 0.06 ? tt / 0.06 : tt < 0.6 ? 1 : Math.max(0, 1 - (tt - 0.6) / 0.3);
      push = tt < 0.22 ? (1 - tt / 0.22) * 0.06 : 0; // recoil shoves the shooter back a step
      break;
    case 'repair': {
      yaw = f.yaw; y -= 0.03;
      const ph = tt * 15;
      kr = 0.55 + 0.45 * Math.cos(ph);
      if (Math.floor((ph + Math.PI) / (Math.PI * 2)) > f.hits && an) { // hammer down: sparks off the planks at the rail
        f.hits++;
        const ts = an.t(z), side = s.x >= 0 ? 1 : -1;
        worldOf(side * an.railX(ts) * 0.92, an.rail(ts) - 0.02, z, _w);
        sparks(_w.x, _w.y, _w.z, 7);
        flash(_w.x, _w.y, _w.z, 0xffd080, 0.3, 0.08);
      }
      break;
    }
    case 'heal': kr = kl = bell(tt / DUR.heal); break;
    case 'grog':
      kl = bell(tt / DUR.grog); kr = kl * 0.3;
      if (!f.hits && tt > 0.45) { f.hits = 1; worldOf(x + Math.sin(f.cur) * 0.12, y + 0.62 * c.s, z + Math.cos(f.cur) * 0.12, _w); mugPop(_w.x, _w.y, _w.z); }
      break;
    case 'spot': yaw = f.yaw; kr = bell(tt / DUR.spot); break;
    case 'leap': hidden = tt < LEAP_T - 0.05; break;
    default: break;
  }
  if (Number.isNaN(f.cur)) f.cur = yaw;
  f.cur += wrap(yaw - f.cur) * Math.min(1, dt * (f.act ? 14 : 3.5));
  x -= Math.sin(f.cur) * push; z -= Math.cos(f.cur) * push;
  f.lx = x; f.ly = y; f.lz = z;
  if (f.act === 'leap' && f.slot >= 0) { worldOf(x, y + 0.2, z, _w); leapHome(f.slot, _w.x, _w.y, _w.z); }
  _q.setFromAxisAngle(_up, f.cur);
  _m.compose(_p.set(x, y + bob, z), _q, _s.setScalar(hidden ? 0 : 1));
  c.body.setMatrixAt(i, _m);
  c.r.setMatrixAt(i, _o.multiplyMatrices(_m, armMatrix(PIVOT_R, c.rig.r, kr, c.s, _a)));
  if (c.l && c.rig.l) c.l.setMatrixAt(i, _o.multiplyMatrices(_m, armMatrix(PIVOT_L, c.rig.l, kl, c.s, _a)));
}

/** Debug: world position of musketeer i's muzzle tip in its current pose (null if there is none). */
export function muzzleTip(i: number): { x: number; y: number; z: number } | null {
  const c = byType.musket;
  if (!c || !root || i >= c.spots.length) return null;
  c.body.getMatrixAt(i, _m);
  _w.copy(AIM_BUTT).add(_p.set(0, 0, MUZZLE)).multiplyScalar(c.s).applyMatrix4(_m).applyMatrix4(root.matrixWorld);
  return { x: _w.x, y: _w.y, z: _w.z };
}
