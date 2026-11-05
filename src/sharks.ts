import * as THREE from 'three';
import { G, scene } from './game';
import { Enemy, damageEnemy, targetable } from './enemies';
import { Builder, xf, paintedMesh } from './geo';
import { nearest } from './weapons3';
import { fx } from './particles';
import { play } from './audio';

// ---- Shark Cage sharks: friendly mini-entities that hunt the nearest enemy and bite it (kept out of enemyGrid / G.enemies) ----
interface Shark { x: number; z: number; heading: number; life: number; dmg: number; bite: number; bt: number; speed: number; target: Enemy | null; orbit: number; mesh: THREE.Mesh; size: number }
const sharks: Shark[] = [];
const MAX = 24, TURN = 6;

function sharkGeo(): THREE.BufferGeometry {
  const b = new Builder(), Z = Math.PI / 2;
  b.add(new THREE.SphereGeometry(1, 8, 6), 0x7d8f9c, xf(0, 0, 0, 0, 0, 0, [0.34, 0.3, 1.15]));
  b.add(new THREE.SphereGeometry(1, 8, 6), 0xdfe6ea, xf(0, -0.1, 0.1, 0, 0, 0, [0.3, 0.2, 0.95]));
  b.add(new THREE.ConeGeometry(0.28, 0.9, 4), 0x6c7d8a, xf(0, 0.42, -0.1, -0.35, 0, 0)); // dorsal fin
  b.add(new THREE.ConeGeometry(0.3, 0.9, 4), 0x6c7d8a, xf(0, 0.1, -1.2, -Z, 0, 0)); // tail
  b.add(new THREE.BoxGeometry(0.9, 0.04, 0.35), 0x6c7d8a, xf(0, -0.08, 0.35, 0, 0, 0)); // pectoral fins
  for (const s of [-1, 1]) b.add(new THREE.IcosahedronGeometry(0.05, 0), 0x101418, xf(s * 0.22, 0.08, 0.85));
  return b.build();
}
let geo: THREE.BufferGeometry | null = null;

/** `size` scales the model and the bite reach (Megalodon Cage). */
export function spawnShark(x: number, z: number, life: number, dmg: number, bite: number, speed: number, size = 1): void {
  if (sharks.length >= MAX) return;
  geo ??= sharkGeo();
  const mesh = paintedMesh(geo, false), heading = Math.random() * Math.PI * 2;
  mesh.scale.setScalar(1.15 * size);
  mesh.position.set(x, 0.1, z);
  scene.add(mesh);
  sharks.push({ x, z, heading, life, dmg, bite, bt: 0.2, speed, target: null, orbit: Math.random() * 6, mesh, size });
  fx(x, 0.2, z, 0xdff4ff, 0.6, 3 * size, 0.5, 0.7, true);
  play('splash');
}
export const sharkCount = (): number => sharks.length;

function remove(i: number): void {
  const s = sharks[i];
  scene.remove(s.mesh);
  fx(s.x, 0.2, s.z, 0xdff4ff, 0.6, 2.4, 0.5, 0.6, true);
  sharks[i] = sharks[sharks.length - 1]; sharks.pop();
}
export function resetSharks(): void { for (let i = sharks.length - 1; i >= 0; i--) { scene.remove(sharks[i].mesh); } sharks.length = 0; }

export function stepSharks(dt: number): void {
  const p = G.player;
  for (let i = sharks.length - 1; i >= 0; i--) {
    const s = sharks[i];
    if ((s.life -= dt) <= 0) { remove(i); continue; }
    if (!s.target || !targetable(s.target)) s.target = nearest(s.x, s.z, 40);
    const e = s.target;
    let want: number, move = s.speed;
    if (e) want = Math.atan2(e.x - s.x, e.z - s.z);
    else { s.orbit += dt * 1.2; want = Math.atan2(p.x + Math.sin(s.orbit) * 5 - s.x, p.z + Math.cos(s.orbit) * 5 - s.z); move *= 0.6; }
    const diff = Math.atan2(Math.sin(want - s.heading), Math.cos(want - s.heading));
    s.heading += Math.max(-TURN * dt, Math.min(TURN * dt, diff));
    const reach = e ? e.r * 0.5 + 1.1 * s.size : 0;
    if (!e || Math.hypot(e.x - s.x, e.z - s.z) > reach) { s.x += Math.sin(s.heading) * move * dt; s.z += Math.cos(s.heading) * move * dt; }
    else if ((s.bt -= dt) <= 0) {
      s.bt = s.bite;
      damageEnemy(e, s.dmg, true, 'summon');
      fx(e.x, 0.8, e.z, 0xd02a2a, 0.4, 1.6, 0.3, 0.9, false, undefined, 'glow');
      play('hit');
    }
    s.mesh.position.set(s.x, 0.1 + Math.sin(G.time * 6 + i) * 0.05, s.z);
    s.mesh.rotation.set(0, s.heading, Math.sin(G.time * 9 + i) * 0.12);
    if (Math.random() < 0.35) fx(s.x - Math.sin(s.heading) * 1.4, 0.15, s.z - Math.cos(s.heading) * 1.4, 0xeaf6ff, 0.35, 0.9, 0.5, 0.5, true);
  }
}
