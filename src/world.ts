import * as THREE from 'three';
import { scene, G } from './game';
import { L } from './loadout';
import { makeIsland } from './models';
import { queueBuild, clearPending, buildPendingIslands } from './props';
import { makeReefMesh, setIslandStyle } from './islandstyle';
import { SEAS } from './seas';
import type { Pt } from './spatial';
import { HEAT, heatAt, REEF_SIZE_K } from './heatdefs';

export interface Hut { x: number; z: number; eaten: boolean; mesh: THREE.Object3D }
/** `fort`: the Lighthouse Fortress collider (fortress.ts), never a battery site. */
export interface Island { x: number; z: number; r: number; group: THREE.Group; huts: Hut[]; fort?: boolean }

export const wind = { angle: 0.8 }; // direction the wind blows TOWARD: (sin a, cos a)
export const islands: Island[] = []; // currently loaded

const CELL = 80;
/** A coral shallow (Coral Reefs hazard). Patches stay inside their world cell, so a lookup checks one cell. */
export interface Reef { x: number; z: number; r: number }
interface Cell { isl: Island[]; reefs: Reef[]; coral: THREE.Object3D[] }
const cache = new Map<string, Cell>();
const loaded = new Map<string, Cell>();
export const reefs: Reef[] = []; // currently loaded
let sea = 0;
export const worldSea = (): number => sea;
let wHeat = 0;
/** Heat the world was generated at (heat 3 grows the reef patches). */
export const worldHeat = (): number => wHeat;

function rng(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Islands and reefs of one cell. Calm Seas (sea 0) keeps the original seed and rand order, so its layout is unchanged. */
function gen(cx: number, cz: number): Cell {
  const seed = (cx * 73856093) ^ (cz * 19349663) ^ 0x9e3779b9 ^ Math.imul(sea, 0x5bd1e995);
  const d = SEAS[sea].islands, cell: Cell = { isl: [], reefs: [], coral: [] };
  for (let k = 0; k < d.per; k++) {
    const rand = rng(seed + k * 7919);
    if (rand() > d.chance) continue;
    const r = d.r[0] + rand() * (d.r[1] - d.r[0]);
    const x = (cx + 0.15 + rand() * 0.7) * CELL, z = (cz + 0.15 + rand() * 0.7) * CELL;
    if (Math.hypot(x, z) < r + 24 || cell.isl.some(i => Math.hypot(i.x - x, i.z - z) < i.r + r + 6)) continue;
    const m = makeIsland(r, rand);
    m.group.position.set(x, 0, z);
    cell.isl.push({ x, z, r, group: m.group, huts: m.huts.map(h => ({ x: x + h.lx, z: z + h.lz, eaten: false, mesh: h.mesh })) });
  }
  if (SEAS[sea].hazard === 'reef') {
    const rand = rng(seed ^ 0x2545f491), n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const r = (3 + rand() * 3.5) * (heatAt(3) ? REEF_SIZE_K : 1), x = cx * CELL + r + rand() * (CELL - 2 * r), z = cz * CELL + r + rand() * (CELL - 2 * r);
      if (Math.hypot(x, z) < r + 18 || cell.isl.some(i => Math.hypot(i.x - x, i.z - z) < i.r * 1.3 + r + 2) || cell.reefs.some(o => Math.hypot(o.x - x, o.z - z) < o.r + r + 3)) continue;
      const reef = { x, z, r };
      cell.reefs.push(reef);
      const crand = rng(seed + k * 104729);
      queueBuild(() => { const m = makeReefMesh(x, z, r, crand); cell.coral.push(m); if (loaded.get(cx + ',' + cz) === cell) scene.add(m); });
    }
  }
  return cell;
}

/** Cell offsets within 3, nearest first (so the dressing queue builds the closest islands first). */
const RING: [number, number][] = [];
for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) RING.push([dx, dz]);
RING.sort((a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2));

export function loadAround(px: number, pz: number): void {
  const cx0 = Math.floor(px / CELL), cz0 = Math.floor(pz / CELL);
  for (const [dx, dz] of RING) {
    const cx = cx0 + dx, cz = cz0 + dz, key = cx + ',' + cz;
    if (loaded.has(key)) continue;
    let c = cache.get(key);
    if (!c) { c = gen(cx, cz); cache.set(key, c); }
    loaded.set(key, c);
    for (const i of c.isl) { scene.add(i.group); islands.push(i); }
    for (const m of c.coral) scene.add(m);
    reefs.push(...c.reefs);
  }
  for (const [key, c] of loaded) {
    const [cx, cz] = key.split(',').map(Number);
    if (Math.abs(cx - cx0) > 4 || Math.abs(cz - cz0) > 4) unload(key, c);
  }
}
function unload(key: string, c: Cell): void {
  loaded.delete(key);
  for (const i of c.isl) { scene.remove(i.group); islands.splice(islands.indexOf(i), 1); }
  for (const m of c.coral) scene.remove(m);
  for (const r of c.reefs) reefs.splice(reefs.indexOf(r), 1);
}
/** Drops the whole world (meshes freed) and regenerates it for sea `s` around the origin. */
export function resetWorld(s: number): void {
  for (const [key, c] of loaded) unload(key, c);
  for (const c of cache.values()) for (const o of [...c.isl.map(i => i.group), ...c.coral]) o.traverse(m => (m as THREE.Mesh).geometry?.dispose());
  cache.clear(); clearPending();
  sea = s; wHeat = HEAT.level;
  setIslandStyle(SEAS[s].style);
  loadAround(0, 0);
  buildPendingIslands(60); // the nearest cells now, the far ring over the next frames
}
/** Reef patch under (x, z), if any (one cell lookup). */
export function reefAt(x: number, z: number, pad = 0): Reef | null {
  const c = loaded.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  if (!c) return null;
  for (const r of c.reefs) if (Math.hypot(x - r.x, z - r.z) < r.r + pad) return r;
  return null;
}

/** Push a circle out of any island. Returns true if it collided. */
export function pushOut(o: Pt, r: number): boolean {
  let hit = false;
  for (const i of islands) {
    const dx = o.x - i.x, dz = o.z - i.z, min = i.r + r, d2 = dx * dx + dz * dz;
    if (d2 < min * min) {
      const d = Math.sqrt(d2) || 0.001;
      o.x = i.x + (dx / d) * min; o.z = i.z + (dz / d) * min;
      hit = true;
    }
  }
  return hit;
}
export const nearIsland = (x: number, z: number, margin: number): boolean =>
  islands.some(i => Math.hypot(x - i.x, z - i.z) < i.r * 1.4 + margin);

export function updateWind(dt: number, t: number): void {
  if (L.relic === 'vane') { wind.angle = G.player.heading; return; } // Weathervane: always a tailwind
  wind.angle += dt * (0.12 * Math.sin(t * 0.07) + 0.05 * Math.sin(t * 0.031 + 1));
}
