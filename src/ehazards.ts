import * as THREE from 'three';
import { G, scene } from './game';
import { PAINTED } from './geo';
import { L } from './loadout';
import { SP } from './spelldata';
import { explode } from './weapons';
import { burnPlayer } from './pstatus';
import { mineGeometry } from './enemymodels';
import { flame, embers, fx } from './particles';
import { waveH } from './anim';

// ---- enemy-made hazards (v8 pass 2): floating mines (Minelayer) and fire pools (Fire Ship) ----
interface Mine { x: number; z: number; t: number; dmg: number; mesh: THREE.Mesh; armed: boolean; drift?: { x: number; z: number } }
interface Pool { x: number; z: number; t: number; fxT: number; k: number }
export const MINE_ARM = 0.6, MINE_LIFE = 45, MINE_R = 3, MAX_MINES = 24, POOL_R = 3, POOL_T = 5;
const mines: Mine[] = [], pools: Pool[] = [];
let geo: THREE.BufferGeometry | null = null;

/** Drops a floating mine; it arms after MINE_ARM seconds and blows when the ship comes close. */
export function dropMine(x: number, z: number, dmg: number, drift?: { x: number; z: number }): void {
  if (mines.length >= MAX_MINES) removeMine(0);
  geo ??= mineGeometry(0.55);
  const mesh = new THREE.Mesh(geo, PAINTED);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  mines.push({ x, z, t: 0, dmg, mesh, armed: false, drift });
}
function removeMine(i: number): void {
  scene.remove(mines[i].mesh);
  mines.splice(i, 1);
}
/** A pool of fire that burns the ship sailing through it; `k` scales its radius and life (heat-3 wreckage: 0.55). */
export function firePool(x: number, z: number, k = 1): void {
  if (pools.length >= 24) pools.shift();
  pools.push({ x, z, t: POOL_T * k, fxT: 0, k });
}

export function clearEHazards(): void {
  for (let i = mines.length - 1; i >= 0; i--) removeMine(i);
  pools.length = 0;
}
export const ehazardView = () => ({ mines: mines.map(m => ({ x: m.x, z: m.z, armed: m.armed, t: m.t })), pools: pools.map(p => ({ x: p.x, z: p.z, t: p.t })) });

export function stepEHazards(dt: number): void {
  if (SP.stop > 0) return; // Time Stop
  const p = G.player;
  for (let i = mines.length - 1; i >= 0; i--) {
    const m = mines[i];
    m.t += dt;
    if (m.drift) { m.x += m.drift.x * dt; m.z += m.drift.z * dt; }
    if (m.t >= MINE_ARM) m.armed = true;
    if (m.t > MINE_LIFE) { removeMine(i); continue; }
    if (m.armed && Math.hypot(p.x - m.x, p.z - m.z) < L.geo.hit + 1.3) {
      explode(m.x, m.z, MINE_R, m.dmg, false);
      embers(m.x, 1, m.z, 8, 1.5);
      removeMine(i);
    }
  }
  for (let i = pools.length - 1; i >= 0; i--) {
    const f = pools[i];
    if ((f.t -= dt) <= 0) { pools.splice(i, 1); continue; }
    if (Math.hypot(p.x - f.x, p.z - f.z) < POOL_R * f.k + L.geo.r * 0.4) burnPlayer(2, 4);
    if ((f.fxT -= dt) <= 0) {
      f.fxT = 0.12;
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * POOL_R * f.k;
      flame(f.x + Math.sin(a) * d, 0.3, f.z + Math.cos(a) * d, 1.2 * f.k);
      fx(f.x, 0.14, f.z, 0xff7a20, POOL_R * f.k * 1.7, POOL_R * f.k * 1.8, 0.16, 0.45 * Math.min(1, f.t), true);
    }
  }
}

/** Per render frame: bob the mines on the swell and blink the armed ones. */
export function renderEHazards(t: number): void {
  for (const m of mines) {
    m.mesh.position.x = m.x; m.mesh.position.z = m.z;
    m.mesh.position.y = waveH(m.x, m.z, t) * 1.2 - 0.12 + Math.sin(t * 2 + m.x) * 0.04;
    m.mesh.rotation.y = t * 0.3 + m.x;
    m.mesh.scale.setScalar(m.armed ? 1 + Math.max(0, Math.sin(t * 6)) * 0.08 : 0.6 + 0.4 * (m.t / MINE_ARM));
  }
}
