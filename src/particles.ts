import * as THREE from 'three';
import { scene } from './game';
import { Batch, BatchKind, makeBatch, flushBatch } from './fxmats';
import { waveH, uTime } from './anim';

// ---- pooled visual-only particles; stepFx runs per render frame with real dt ----
export interface Vel { vx: number; vy: number; vz: number; g?: number }
/** soft = smoke/spray (alpha), glow = fire/flash (additive HDR), flat = foam on the water. */
export type Blend = BatchKind;
interface P { on: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; g: number; life: number; max: number; s0: number; s1: number; op: number; r: number; g2: number; b: number; seed: number; rot: number; spin: number }

const CAP: Record<Blend, number> = { soft: 700, glow: 500, flat: 260 };
const ORDER: Record<Blend, number> = { flat: 1, soft: 2, glow: 3 };
const pools = {} as Record<Blend, { batch: Batch; ps: P[]; idx: number }>;
let added = false;
const _c = new THREE.Color();

function ensure(): void {
  if (added) return;
  added = true;
  for (const k of ['flat', 'soft', 'glow'] as Blend[]) {
    const batch = makeBatch(k, CAP[k], ORDER[k]);
    scene.add(batch.mesh);
    const ps: P[] = Array.from({ length: CAP[k] }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, life: 0, max: 1, s0: 1, s1: 1, op: 1, r: 1, g2: 1, b: 1, seed: 0, rot: 0, spin: 0 }));
    pools[k] = { batch, ps, idx: 0 };
  }
  scene.add(debris.mesh);
}

/** Hot, saturated colours (fire, flashes) glow; everything else is a soft alpha puff. */
const isHot = (c: number): boolean => ((c >> 16) & 255) >= 0xf0 && ((c >> 8) & 255) < 0xf0 && (c & 255) < 0xb0;

export function fx(x: number, y: number, z: number, color: number, s0: number, s1: number, life: number, op = 0.8, flat = false, v?: Vel, blend?: Blend): void {
  ensure();
  const kind: Blend = blend ?? (flat ? 'flat' : isHot(color) ? 'glow' : 'soft');
  const pool = pools[kind];
  const p = pool.ps[pool.idx++ % pool.ps.length];
  _c.set(color);
  p.on = true; p.x = x; p.y = y; p.z = z; p.life = life; p.max = life; p.op = op;
  // billboards are soft-edged: draw them a bit larger than the old solid spheres of radius s
  const k = kind === 'flat' ? 1 : 1.3;
  p.s0 = s0 * k; p.s1 = s1 * k;
  p.vx = v?.vx ?? 0; p.vy = v?.vy ?? 0; p.vz = v?.vz ?? 0; p.g = v?.g ?? 0;
  p.r = _c.r; p.g2 = _c.g; p.b = _c.b;
  p.seed = Math.random() * 10; p.rot = Math.random() * 6.28; p.spin = (Math.random() - 0.5) * (kind === 'soft' ? 1.2 : 2.5);
}

export function stepFx(dt: number): void {
  ensure();
  for (const kind of ['flat', 'soft', 'glow'] as Blend[]) {
    const { batch, ps } = pools[kind];
    let n = 0;
    for (const p of ps) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rot += p.spin * dt;
      const k = 1 - p.life / p.max, s = p.s0 + (p.s1 - p.s0) * (kind === 'flat' ? k : 1 - (1 - k) * (1 - k));
      const o = n * 4;
      batch.pos[o] = p.x; batch.pos[o + 1] = kind === 'flat' ? Math.min(0.12, Math.max(0.03, p.y)) : p.y; batch.pos[o + 2] = p.z; batch.pos[o + 3] = s;
      batch.col[o] = p.r; batch.col[o + 1] = p.g2; batch.col[o + 2] = p.b; batch.col[o + 3] = p.op * (1 - k);
      batch.misc[o] = p.seed; batch.misc[o + 1] = p.rot; batch.misc[o + 2] = k;
      n++;
    }
    flushBatch(batch, n);
  }
  stepDebris(dt);
}

// ---- wood-chip debris: one InstancedMesh of tumbling slivers that splash when they hit the water ----
const DEBRIS = 180;
interface Chip { on: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; wx: number; wy: number; life: number; s: number }
const debris = (() => {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.32, 0.22), new THREE.MeshStandardMaterial({ roughness: 0.9 }), DEBRIS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const chips: Chip[] = Array.from({ length: DEBRIS }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, wx: 0, wy: 0, life: 0, s: 0 }));
  const col = new THREE.Color();
  for (let i = 0; i < DEBRIS; i++) mesh.setColorAt(i, col.set([0x7a4a22, 0x4a2c14, 0x9a6a3a, 0x5a3a1c][i % 4]));
  return { mesh, chips, idx: 0 };
})();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

function stepDebris(dt: number): void {
  // slots are not compacted, so each chip keeps its per-slot colour; idle slots get a zero-scale matrix
  for (let i = 0; i < DEBRIS; i++) {
    const c = debris.chips[i];
    if (c.on) {
      c.life -= dt;
      c.vy -= 14 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      c.rx += c.wx * dt; c.ry += c.wy * dt;
      if (c.vy < 0 && c.y < waveH(c.x, c.z, uTime.value)) {
        c.on = false;
        fx(c.x, 0.05, c.z, 0xffffff, c.s * 0.8, c.s * 2.5, 0.35, 0.5, true);
      } else if (c.life <= 0) c.on = false;
    }
    _m.compose(_p.set(c.x, c.y, c.z), _q.setFromEuler(_e.set(c.rx, c.ry, 0)), _s.setScalar(c.on ? c.s : 0));
    debris.mesh.setMatrixAt(i, _m);
  }
  debris.mesh.instanceMatrix.needsUpdate = true;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** Wood chips flying outward, tumbling and splashing down. */
export function splinters(x: number, y: number, z: number, n: number, spd = 4): void {
  ensure();
  for (let i = 0; i < n; i++) {
    const c = debris.chips[debris.idx++ % DEBRIS], a = Math.random() * Math.PI * 2, s = spd * rnd(0.4, 1);
    Object.assign(c, { on: true, x, y, z, vx: Math.cos(a) * s, vy: rnd(2.5, 6), vz: Math.sin(a) * s, rx: rnd(0, 6), ry: rnd(0, 6), wx: rnd(-14, 14), wy: rnd(-10, 10), life: 2, s: rnd(0.16, 0.3) });
  }
}
/** White column, droplets and a foam ring where a ball lands in the water. */
export function splash(x: number, z: number): void {
  for (let i = 0; i < 4; i++) fx(x, 0.2 + i * 0.35, z, 0xffffff, 0.35, 0.12, 0.45, 0.85, false, { vx: 0, vy: 2.5 + i * 0.4, vz: 0, g: 3 });
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(1, 2.6);
    fx(x, 0.3, z, 0xe6f7ff, 0.13, 0.05, rnd(0.45, 0.65), 0.9, false, { vx: Math.cos(a) * s, vy: rnd(3.5, 6.5), vz: Math.sin(a) * s, g: 18 });
  }
  fx(x, 0.1, z, 0xffffff, 0.4, 2.6, 0.6, 0.7, true);
  fx(x, 0.1, z, 0xffffff, 0.3, 1.4, 0.9, 0.5, true);
}
/** Muzzle flash, sparks and 2-3 grey smoke puffs drifting up and outward along `ang`. */
export function muzzle(x: number, y: number, z: number, ang: number): void {
  const dx = Math.sin(ang), dz = Math.cos(ang);
  fx(x, y, z, 0xffe9a0, 0.3, 0.95, 0.12, 1, false, undefined, 'glow');
  fx(x + dx * 0.4, y, z + dz * 0.4, 0xff9a3a, 0.25, 0.6, 0.16, 0.9, false, undefined, 'glow');
  for (let i = 0; i < 3; i++) {
    const s = rnd(4, 8);
    fx(x, y, z, 0xffc060, 0.06, 0.02, rnd(0.15, 0.3), 1, false, { vx: dx * s + rnd(-1, 1), vy: rnd(0.5, 2), vz: dz * s + rnd(-1, 1), g: 4 }, 'glow');
  }
  const n = 2 + (Math.random() < 0.5 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const s = rnd(1, 2.4);
    fx(x, y, z, 0xc4c0b8, 0.3, rnd(1.0, 1.5), rnd(0.8, 1.2), 0.55, false, { vx: dx * s + rnd(-0.5, 0.5), vy: rnd(0.8, 1.6), vz: dz * s + rnd(-0.5, 0.5) }, 'soft');
  }
}
export function smoke(x: number, y: number, z: number, size: number): void {
  fx(x, y, z, 0x5a5550, size * 0.5, size * 1.6, rnd(0.8, 1.2), 0.5, false, { vx: rnd(-0.6, 0.6), vy: rnd(1, 2), vz: rnd(-0.6, 0.6) }, 'soft');
}
/** Fireball: flash, rolling flame puffs, sparks, rising smoke and a foam ring on the water. */
export function explosion(x: number, y: number, z: number, r: number): void {
  const k = 1 / (1 + Math.max(0, r - 3) * 0.2); // big blasts overlap a lot: keep the additive sum from blowing out to white
  fx(x, y + 0.3, z, 0xfff0c0, r * 0.25, r * 0.9, 0.18, k, false, undefined, 'glow');
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, d = rnd(0.1, 0.5) * r;
    fx(x + Math.cos(a) * d, y + rnd(0, 0.5) * r, z + Math.sin(a) * d, i % 2 ? 0xff8a2a : 0xffb040, r * 0.25, r * rnd(0.5, 0.8), rnd(0.35, 0.55), 0.95 * k,
      false, { vx: Math.cos(a) * r * 0.6, vy: rnd(0.5, 2), vz: Math.sin(a) * r * 0.6 }, 'glow');
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(4, 9) * Math.sqrt(r);
    fx(x, y + 0.3, z, 0xffc870, 0.08, 0.03, rnd(0.3, 0.6), 1, false, { vx: Math.cos(a) * s, vy: rnd(3, 8), vz: Math.sin(a) * s, g: 16 }, 'glow');
  }
  for (let i = 0; i < 4; i++) {
    fx(x + rnd(-0.4, 0.4) * r, y + 0.4 + i * 0.2 * r, z + rnd(-0.4, 0.4) * r, i % 2 ? 0x5e5954 : 0x7d7771, r * 0.3, r * rnd(0.7, 1.0), rnd(0.9, 1.4), 0.42,
      false, { vx: rnd(-0.6, 0.6), vy: rnd(1.2, 2.4), vz: rnd(-0.6, 0.6) }, 'soft');
  }
  fx(x, 0.08, z, 0xffffff, r * 0.4, r * 1.3, 0.7, 0.6, true);
}
/** Embers drifting up from a fire (fire rafts, the Fire Galleon). */
export function embers(x: number, y: number, z: number, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    fx(x + rnd(-spread, spread), y, z + rnd(-spread, spread), Math.random() < 0.5 ? 0xff7a20 : 0xffb040, rnd(0.06, 0.12), 0.02, rnd(0.6, 1.1), 1,
      false, { vx: rnd(-0.5, 0.5), vy: rnd(1.5, 3), vz: rnd(-0.5, 0.5) }, 'glow');
  }
}
/** Flame licks: short-lived flame puffs (rafts, burning wrecks). */
export function flame(x: number, y: number, z: number, s: number): void {
  fx(x + rnd(-0.15, 0.15) * s, y, z + rnd(-0.15, 0.15) * s, Math.random() < 0.5 ? 0xff7a1a : 0xffa830, s * 0.35, s * 0.15, rnd(0.25, 0.45), 0.9,
    false, { vx: 0, vy: rnd(1.5, 2.5), vz: 0 }, 'glow');
}
