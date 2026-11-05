import * as THREE from 'three';
import { G, scene, gainXp, addGold, healPlayer } from './game';
import { Grid, Pt, Prev, lerp, lerpAngle } from './spatial';
import { getShip, makeCrate, makeFishingBoat } from './models';
import { islands, nearIsland, pushOut } from './world';
import { fx } from './particles';
import { play } from './audio';
import { bump } from './meta';
import { L } from './loadout';
import { eatHook } from './capfx';

export interface Edible extends Pt, Prev { kind: 'boat' | 'crate'; heading: number; mesh: THREE.Object3D; phase: number; xp: number; gold: number; dead: boolean; pull: number }
export interface Orb extends Pt, Prev { xp: number; mesh: THREE.Mesh; attract: boolean; dead: boolean; v: number }

export const edibles: Edible[] = [];
export const orbs: Orb[] = [];
const edibleGrid = new Grid<Edible>(8);
const orbGrid = new Grid<Orb>(8);
const TARGET = 40;

const orbGeo = new THREE.OctahedronGeometry(0.3, 0).scale(0.85, 1.35, 0.85);
// glowing XP gem: HDR emissive so it blooms
const orbMat = new THREE.MeshStandardMaterial({ color: 0x8af59a, emissive: new THREE.Color(0x36e070), emissiveIntensity: 2.4, roughness: 0.25, metalness: 0.1 });
const orbPool: THREE.Mesh[] = [];
export function spawnOrb(x: number, z: number, xp: number): void {
  const mesh = orbPool.pop() ?? new THREE.Mesh(orbGeo, orbMat);
  mesh.scale.setScalar(0.8 + Math.min(xp, 8) * 0.12);
  mesh.position.set(x, 0.7, z);
  scene.add(mesh);
  const o: Orb = { x, z, px: x, pz: z, ph: 0, xp, mesh, attract: false, dead: false, v: 3 };
  orbs.push(o);
  orbGrid.insert(o);
}

export function addEdible(kind: Edible['kind'], x: number, z: number): void {
  const mesh = kind === 'crate' ? makeCrate() : getShip('fish', makeFishingBoat).root;
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const heading = Math.random() * Math.PI * 2;
  if (kind === 'crate') mesh.rotation.y = heading;
  edibles.push({
    kind, x, z, px: x, pz: z, ph: heading, heading, mesh, phase: Math.random() * 6, dead: false, pull: 0,
    xp: kind === 'boat' ? 3 : 1, gold: kind === 'boat' ? 2 : 1,
  });
}

function respawn(): void {
  const p = G.player;
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 35;
    const cx = p.x + Math.sin(a) * d, cz = p.z + Math.cos(a) * d;
    if (nearIsland(cx, cz, 4)) continue;
    if (Math.random() < 0.65) {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) addEdible('crate', cx + (Math.random() - 0.5) * 6, cz + (Math.random() - 0.5) * 6);
    } else {
      addEdible('boat', cx, cz);
      if (Math.random() < 0.4) addEdible('boat', cx + 3, cz + 2);
    }
    return;
  }
}

/** Treasure Sense: a crate worth `gold` gold, a little bigger than the usual ones. */
export function spawnTreasure(x: number, z: number, gold: number): void {
  addEdible('crate', x, z);
  const e = edibles[edibles.length - 1];
  e.gold = gold; e.mesh.scale.setScalar(1.35);
}

/** Plunder: every edible and orb within r flies to the ship. Returns how many were grabbed. */
export function plunder(r: number): number {
  const p = G.player;
  let n = 0;
  for (const e of edibles) if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < r) { e.pull = 14; n++; }
  for (const o of orbs) if (!o.dead && Math.hypot(o.x - p.x, o.z - p.z) < r) { o.attract = true; o.v = Math.max(o.v, 24); n++; }
  return n;
}

export function stepEdibles(dt: number, t: number): void {
  const p = G.player;
  for (let i = 0; i < 3 && edibles.length < TARGET; i++) respawn();

  for (const e of edibles) {
    if (e.dead) continue;
    if (e.pull > 0) { // Plunder: magnetised to the ship
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1, s = Math.min(d, (e.pull += 90 * dt) * dt);
      e.x += (dx / d) * s; e.z += (dz / d) * s;
      if (Math.random() < 0.3) fx(e.x, 0.8, e.z, 0xffd84a, 0.18, 0.03, 0.3, 0.9, false, undefined, 'glow');
      continue;
    }
    if (e.kind === 'boat') {
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d < 10) {
        const want = Math.atan2(dx, dz);
        let diff = want - e.heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        e.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
        e.x += Math.sin(e.heading) * 6 * dt; e.z += Math.cos(e.heading) * 6 * dt;
      } else { e.x += Math.sin(e.heading) * 1.2 * dt; e.z += Math.cos(e.heading) * 1.2 * dt; }
      if (pushOut(e, 1)) e.heading += 1.5 * dt;
    }
  }
  edibleGrid.clear();
  for (const e of edibles) if (!e.dead) edibleGrid.insert(e);
  for (const o of orbs) if (!o.dead) orbGrid.insert(o);

  const eat = G.st.pickup * 0.6;
  edibleGrid.query(p.x, p.z, eat + 2, e => {
    if (e.dead || Math.hypot(e.x - p.x, e.z - p.z) > (e.kind === 'boat' ? 2.4 : eat)) return;
    e.dead = true;
    if (e.kind === 'boat') bump('boatsEaten'); else eatHook('crate');
    addGold(e.gold);
    healPlayer(G.st.healEat);
    fx(e.x, 0.6, e.z, 0xffffff, 0.3, 1.3, 0.35, 0.7);
    play('pickup');
    gainXp(e.xp);
  });

  // dock huts: eaten only when ramming at more than half speed
  for (const isl of islands) {
    if (Math.hypot(p.x - isl.x, p.z - isl.z) > isl.r + 8) continue;
    for (const h of isl.huts) {
      if (h.eaten || Math.hypot(p.x - h.x, p.z - h.z) > 3 || p.speed < G.st.maxSpeed * 0.5) continue;
      h.eaten = true; h.mesh.visible = false;
      addGold(5); eatHook('hut');
      healPlayer(G.st.healEat);
      fx(h.x, 1, h.z, 0xc9a56a, 0.5, 2.4, 0.5, 0.8);
      play('pickup');
      gainXp(5);
    }
  }

  orbGrid.query(p.x, p.z, G.st.pickup, o => { o.attract = true; });
  for (const o of orbs) {
    if (o.dead) continue;
    if (o.attract) {
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz) || 1;
      o.v += 45 * dt; // accelerates toward the ship once inside the magnet radius
      const s = Math.min(d, (o.v + Math.max(0, p.speed)) * dt);
      o.x += (dx / d) * s; o.z += (dz / d) * s;
      if (d < 1.3) {
        o.dead = true;
        const sc = o.mesh.scale.x;
        fx(o.x, 0.7, o.z, 0x9af0a8, sc * 0.4, sc * 0.9, 0.25, 0.8, false, undefined, 'glow'); // pop to 1.4x and fade
        play('pickup');
        gainXp(o.xp * (L.relic === 'pearl' ? 1.25 : 1)); // Pearl of Plenty
      }
    }
  }
  orbGrid.clear();

  for (let i = edibles.length - 1; i >= 0; i--) {
    const e = edibles[i];
    if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) > 120) e.dead = true;
    if (e.dead) { scene.remove(e.mesh); edibles.splice(i, 1); }
  }
  for (let i = orbs.length - 1; i >= 0; i--) {
    if (orbs[i].dead) { scene.remove(orbs[i].mesh); orbPool.push(orbs[i].mesh); orbs.splice(i, 1); }
  }
}

export function renderEdibles(alpha: number, t: number): void {
  for (const e of edibles) {
    const x = lerp(e.px, e.x, alpha), z = lerp(e.pz, e.z, alpha);
    if (e.kind === 'boat') {
      e.mesh.rotation.y = lerpAngle(e.ph, e.heading, alpha);
      e.mesh.position.set(x, Math.sin(t * 1.5 + e.phase) * 0.06, z);
    } else {
      e.mesh.position.set(x, Math.sin(t * 1.8 + e.phase) * 0.12, z);
      e.mesh.rotation.z = Math.sin(t * 1.3 + e.phase) * 0.12;
    }
  }
  for (const o of orbs) {
    const x = lerp(o.px, o.x, alpha);
    o.mesh.position.set(x, 0.7 + Math.sin(t * 3 + o.x) * 0.1, lerp(o.pz, o.z, alpha));
    o.mesh.rotation.y = t * 2;
  }
}
