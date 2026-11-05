import * as THREE from 'three';
import { scene } from '../game';
import { fx, type Vel } from '../particles';

// ---- world-space crew effects (live in the scene, not under the rocking ship): boarder leap clones with a trail,
// heal pulse rings, the grog glow, spark bursts and the Eagle Eye glint. Everything is pooled; nothing allocates per frame. ----

const v: Vel = { vx: 0, vy: 0, vz: 0, g: 0 };
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
function vel(vx: number, vy: number, vz: number, g: number): Vel { v.vx = vx; v.vy = vy; v.vz = vz; v.g = g; return v; }

/** n small hot sparks flying up and out from a point (hammer on the hull, cutlass slash). */
export function sparks(x: number, y: number, z: number, n: number, col = 0xffc060, spd = 2.4): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * rnd(0.4, 1);
    fx(x, y, z, col, rnd(0.05, 0.09), 0.015, rnd(0.25, 0.45), 1, false, vel(Math.cos(a) * s, rnd(1.2, 3), Math.sin(a) * s, 9), 'glow');
  }
}
/** Short flash (musket-scale) at a point. */
export const flash = (x: number, y: number, z: number, col: number, s: number, life = 0.12): void => fx(x, y, z, col, s * 0.4, s, life, 1, false, undefined, 'glow');
/** Musket shot at the muzzle: a small flash along the barrel, two sparks and one grey puff drifting forward. */
export function musketFlash(x: number, y: number, z: number, dx: number, dz: number): void {
  flash(x, y, z, 0xffe6a0, 0.36, 0.09);
  fx(x + dx * 0.15, y, z + dz * 0.15, 0xff9a3a, 0.08, 0.28, 0.1, 0.9, false, undefined, 'glow');
  sparks(x, y, z, 2, 0xffc060, 1.5);
  fx(x, y, z, 0xd4d0c8, 0.1, rnd(0.45, 0.6), rnd(0.7, 0.9), 0.45, false, vel(dx * 0.9, rnd(0.5, 0.9), dz * 0.9, 0), 'soft');
}
/** Mug pop: a warm burst and two foam blobs hopping out of the mug. */
export function mugPop(x: number, y: number, z: number): void {
  flash(x, y, z, 0xffb040, 0.35, 0.18);
  for (let i = 0; i < 3; i++) fx(x, y, z, 0xfff4dc, 0.05, 0.03, rnd(0.35, 0.5), 0.95, false, vel(rnd(-0.6, 0.6), rnd(1.4, 2.2), rnd(-0.6, 0.6), 6), 'soft');
  sparks(x, y, z, 3, 0xffd070, 1.2);
}

// ---- pooled meshes / sprites (created on first use) ----
const glowTex = (): THREE.Texture => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d') as CanvasRenderingContext2D, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,0.9)'; // four-point star (spyglass glint)
  g.beginPath(); g.moveTo(32, 0); g.lineTo(35, 29); g.lineTo(64, 32); g.lineTo(35, 35); g.lineTo(32, 64); g.lineTo(29, 35); g.lineTo(0, 32); g.lineTo(29, 29); g.fill();
  return new THREE.CanvasTexture(c);
};
interface Ring { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; r: number }
interface Pool { rings: Ring[]; glow: THREE.Sprite; glowT: number; glint: THREE.Sprite; leap: THREE.InstancedMesh | null; warm: number }
let pool: Pool | null = null;
function ensure(): Pool {
  if (pool) return pool;
  const tex = glowTex(), ringGeo = new THREE.RingGeometry(0.93, 1, 56).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 4 }, () => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x40ff90).multiplyScalar(1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.visible = false; mesh.renderOrder = 4; scene.add(mesh);
    return { mesh, mat, t: 0, dur: 1, r: 1 };
  });
  const sprite = (col: number): THREE.Sprite => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(col).multiplyScalar(1.8), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.visible = false; s.renderOrder = 4; scene.add(s);
    return s;
  };
  pool = { rings, glow: sprite(0xff9a40), glowT: 0, glint: sprite(0xfff2c0), leap: null, warm: 3 };
  return pool;
}

/** Green pulse ring growing out from the ship to radius r. */
export function healRing(r: number): void {
  const p = ensure(), g = p.rings.find(x => !x.mesh.visible) ?? p.rings[0];
  g.t = 0; g.dur = 0.9; g.r = r; g.mesh.visible = true;
}
/** Warm glow on the ship for a moment (grog). */
export function warmGlow(): void { ensure().glowT = 1; }

// ---- leaping boarders: clones flying out along a parabola, a short pause with a slash, then back ----
interface Leap { on: boolean; t: number; x0: number; y0: number; z0: number; x1: number; z1: number; trail: number; slashed: boolean }
const LEAPS = 16, OUT = 0.5, STAY = 0.3;
export const LEAP_T = OUT * 2 + STAY;
const leaps: Leap[] = Array.from({ length: LEAPS }, () => ({ on: false, t: 0, x0: 0, y0: 0, z0: 0, x1: 0, z1: 0, trail: 0, slashed: false }));
let leapGeo: THREE.BufferGeometry | null = null;
/** The boarder look (merged figure) and the deck material (its instanced program is already compiled by the crowd: no hitch on the first leap). */
export function setLeapGeo(g: THREE.BufferGeometry, mat: THREE.Material): void {
  if (leapGeo === g) return;
  leapGeo = g;
  const p = ensure();
  if (p.leap) { scene.remove(p.leap); p.leap.dispose(); }
  const m = new THREE.InstancedMesh(g, mat, LEAPS);
  m.count = 0; m.frustumCulled = false; m.castShadow = true;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(m);
  p.leap = m;
}
/** Starts a leap; returns its slot (for leapHome) or -1 when the pool is full. */
export function leap(x0: number, y0: number, z0: number, x1: number, z1: number): number {
  const i = leaps.findIndex(x => !x.on), l = leaps[i];
  if (!l) return -1;
  l.on = true; l.t = 0; l.x0 = x0; l.y0 = y0; l.z0 = z0; l.x1 = x1; l.z1 = z1; l.trail = 0; l.slashed = false;
  return i;
}
/** The ship sails on during a leap: keep the take-off / landing point on the figure's live deck position. */
export function leapHome(i: number, x: number, y: number, z: number): void {
  const l = leaps[i];
  if (l?.on) { l.x0 = x; l.y0 = y; l.z0 = z; }
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
/** Leap path at time t: out (0..OUT), at the target (STAY), back. Returns the height above the line. */
function leapPos(l: Leap, out: THREE.Vector3): number {
  const back = l.t > OUT + STAY, k = l.t < OUT ? l.t / OUT : back ? 1 - (l.t - OUT - STAY) / OUT : 1;
  const ty = 1.0, h = 4 * k * (1 - k) * 2.6;
  out.set(l.x0 + (l.x1 - l.x0) * k, l.y0 + (ty - l.y0) * k + h, l.z0 + (l.z1 - l.z0) * k);
  return h;
}

/** Creates the pools now (at dressing reset) so the first frames draw them invisibly and compile their programs before any fight. */
export const prewarmCrewFx = (): void => { ensure(); };
export function stepCrewFx(dt: number, sx: number, sy: number, sz: number): void {
  if (!pool) return;
  const p = pool;
  if (p.warm > 0) { // a few frames fully transparent: compiles the ring and sprite programs outside combat
    const on = --p.warm > 0;
    p.rings[0].mesh.visible = on; p.rings[0].mat.opacity = 0; p.glow.visible = on; p.glow.material.opacity = 0; p.glint.visible = on; p.glint.material.opacity = 0;
    p.rings[0].t = p.rings[0].dur;
    p.rings[0].mesh.position.set(sx, 0.5, sz); p.glow.position.set(sx, sy, sz); p.glint.position.set(sx, sy, sz);
    if (on) return;
  }
  for (const g of p.rings) {
    if (!g.mesh.visible) continue;
    g.t += dt;
    const k = g.t / g.dur;
    if (k >= 1) { g.mesh.visible = false; continue; }
    g.mesh.position.set(sx, 0.5, sz);
    g.mesh.scale.setScalar(0.6 + (g.r - 0.6) * (1 - (1 - k) * (1 - k)));
    g.mat.opacity = (1 - k) * (1 - k);
  }
  if (p.glowT > 0) {
    p.glowT = Math.max(0, p.glowT - dt);
    const k = 1 - p.glowT;
    p.glow.visible = p.glowT > 0;
    p.glow.position.set(sx, sy + 1.2, sz);
    p.glow.scale.setScalar(5 + k * 2.5);
    p.glow.material.opacity = Math.sin(Math.PI * k) * 0.6;
  }
  const m = p.leap;
  if (!m) return;
  let n = 0;
  for (const l of leaps) {
    if (!l.on) continue;
    l.t += dt;
    if (l.t >= LEAP_T) { l.on = false; continue; }
    leapPos(l, _p);
    const back = l.t > OUT + STAY, yaw = Math.atan2(l.x1 - l.x0, l.z1 - l.z0) + (back ? Math.PI : 0);
    if (!l.slashed && l.t >= OUT) { l.slashed = true; flash(_p.x, _p.y + 0.3, _p.z, 0xfff0d0, 0.9, 0.14); sparks(_p.x, _p.y + 0.3, _p.z, 6, 0xfff0c0, 3.2); }
    const flying = l.t < OUT || back;
    if (flying && (l.trail -= dt) <= 0) { l.trail = 0.025; fx(_p.x, _p.y + 0.25, _p.z, 0xffd890, 0.14, 0.03, 0.35, 0.7, false, undefined, 'glow'); }
    const spin = flying ? 0 : Math.sin(l.t * 30) * 0.4; // a quick hack and slash while standing on the enemy
    _q.setFromAxisAngle(_up, yaw + spin);
    m.setMatrixAt(n++, _m.compose(_p, _q, _s.setScalar(1.25))); // a touch larger than on deck: reads at sea scale
  }
  m.count = n;
  m.instanceMatrix.needsUpdate = true;
}

/** Glint on the marked elite (null hides it). */
export function glintAt(x: number, y: number, z: number, on: boolean, t: number): void {
  const p = ensure();
  p.glint.visible = on;
  if (!on) return;
  const tw = Math.max(0, Math.sin(t * 2.6)) ** 6;
  p.glint.position.set(x, y, z);
  p.glint.scale.setScalar(0.6 + tw * 1.8);
  p.glint.material.opacity = 0.25 + tw * 0.75;
  p.glint.material.rotation = t * 0.8;
}

export const crewFxView = (): unknown => ({ leaps: leaps.filter(l => l.on).length, rings: pool?.rings.filter(r => r.mesh.visible).length ?? 0, glow: pool?.glowT ?? 0, glint: pool?.glint.visible ?? false });
