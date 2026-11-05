import { rngFor, nextN } from './daily';
import * as THREE from 'three';
import { G, scene, gainXp, addGold, healPlayer } from './game';
import { ACTS } from './content';
import { END, heatAt } from './heatdefs';
import { hitNumber, popText } from './juice';
import { t as tr } from './i18n';
import { Grid, Pt, Prev, lerp, lerpAngle } from './spatial';
import { getShip, makeCrate, makeFishingBoat } from './models';
import { islands, nearIsland, pushOut } from './world';
import { fx } from './particles';
import { play } from './audio';
import { bump, R } from './meta';
import { L } from './loadout';
import { eatHook } from './capfx';

export interface Edible extends Pt, Prev { kind: 'boat' | 'crate' | 'heal' | 'chest'; heading: number; mesh: THREE.Object3D; phase: number; xp: number; gold: number; dead: boolean; pull: number; dbl: number }
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

// repair kit: a barrel with a glowing green cross; boss chest: a big gold-lidded chest with a light beam
const kitBarrel = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 10), kitCross = new THREE.BoxGeometry(0.62, 0.16, 0.16);
const kitWood = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.85 });
const kitGlow = new THREE.MeshStandardMaterial({ color: 0x9dffb0, emissive: new THREE.Color(0x2fe070), emissiveIntensity: 2.6, roughness: 0.3 });
function makeKit(): THREE.Group {
  const g = new THREE.Group(), b = new THREE.Mesh(kitBarrel, kitWood);
  b.position.y = 0.4; g.add(b);
  const h = new THREE.Mesh(kitCross, kitGlow), v = new THREE.Mesh(kitCross, kitGlow);
  h.position.set(0, 0.84, 0); v.position.set(0, 0.84, 0); v.rotation.y = Math.PI / 2;
  const up = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), kitGlow); up.position.set(0, 0.84, 0);
  g.add(h, v, up);
  return g;
}
const chestBody = new THREE.BoxGeometry(1.7, 0.9, 1.1), chestLid = new THREE.CylinderGeometry(0.55, 0.55, 1.7, 12);
const chestBeam = new THREE.CylinderGeometry(0.35, 0.8, 16, 10, 1, true);
const chestWood = new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.8 });
const chestGold = new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: new THREE.Color(0xffb020), emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.6 });
const chestBeamMat = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
function makeChest(): THREE.Group {
  const g = new THREE.Group(), b = new THREE.Mesh(chestBody, chestWood);
  b.position.y = 0.45; g.add(b);
  const lid = new THREE.Mesh(chestLid, chestGold);
  lid.rotation.z = Math.PI / 2; lid.position.y = 0.9; lid.scale.set(0.8, 1, 1);
  g.add(lid);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.95, 1.15), chestGold); band.position.y = 0.45; g.add(band);
  const beam = new THREE.Mesh(chestBeam, chestBeamMat); beam.position.y = 8; g.add(beam);
  return g;
}

export function addEdible(kind: Edible['kind'], x: number, z: number): void {
  const mesh = kind === 'crate' ? makeCrate() : kind === 'heal' ? makeKit() : kind === 'chest' ? makeChest() : getShip('fish', makeFishingBoat).root;
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const heading = Math.random() * Math.PI * 2;
  if (kind === 'crate' || kind === 'heal') mesh.rotation.y = heading;
  edibles.push({
    kind, x, z, px: x, pz: z, ph: heading, heading, mesh, phase: Math.random() * 6, dead: false, pull: 0, dbl: 0,
    xp: kind === 'boat' ? 3 : 1, gold: kind === 'boat' ? 2 : 1,
  });
}

const healAlive = (): number => edibles.reduce((n, e) => n + (e.kind === 'heal' && !e.dead ? 1 : 0), 0);
/** Enemy kill drop: a repair kit where the ship sank (rare; capped at 2 alive; none at heat 4+, where repairs are off). */
export function dropRepairKit(x: number, z: number): void {
  if (heatAt(4) || healAlive() >= 2 || Math.random() >= 0.04) return;
  addEdible('heal', x, z);
}
/** Boss tombstone: a doubloon chest where the boss sank (20 + 10 per act). The act-4 final boss opens the Retire/Sail On screen at once, so that one is paid out directly. */
export function bossChest(x: number, z: number): void {
  const n = 20 + 10 * G.act;
  if (G.act >= ACTS && !END.on) { R.chestD += n; popText(x, 3, z, tr('chest.got', { n }), 'gold'); play('coin'); return; }
  addEdible('chest', x, z);
  edibles[edibles.length - 1].dbl = n;
}

function respawn(): void {
  const p = G.player, rand = rngFor('edible', nextN('edible'));
  for (let tries = 0; tries < 8; tries++) {
    const a = rand() * Math.PI * 2, d = 50 + rand() * 35;
    const cx = p.x + Math.sin(a) * d, cz = p.z + Math.cos(a) * d;
    if (nearIsland(cx, cz, 4)) continue;
    if (healAlive() < 2 && !heatAt(4) && rand() < (R.sea === 0 ? 0.06 : 0.03)) { addEdible('heal', cx, cz); return; }
    if (rand() < 0.65) {
      const n = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) addEdible('crate', cx + (rand() - 0.5) * 6, cz + (rand() - 0.5) * 6);
    } else {
      addEdible('boat', cx, cz);
      if (rand() < 0.4) addEdible('boat', cx + 3, cz + 2);
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
    if (e.dead || Math.hypot(e.x - p.x, e.z - p.z) > (e.kind === 'boat' ? 2.4 : e.kind === 'chest' ? Math.max(eat, 3.5) : eat)) return;
    e.dead = true;
    if (e.kind === 'chest') {
      R.chestD += e.dbl;
      popText(e.x, 3, e.z, tr('chest.got', { n: e.dbl }), 'gold');
      fx(e.x, 0.8, e.z, 0xffd84a, 0.6, 2.6, 0.5, 0.9, false, undefined, 'glow');
      play('coin');
      return;
    }
    if (e.kind === 'heal') {
      const before = G.hp;
      healPlayer(G.maxHp * 0.15);
      if (G.hp > before) hitNumber(p, p.x, 3, p.z, G.hp - before, 'heal');
      fx(e.x, 0.8, e.z, 0x6dff9a, 0.5, 2, 0.45, 0.9, false, undefined, 'glow');
      play('heal');
      return;
    }
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
    if (!e.dead && e.kind !== 'chest' && Math.hypot(e.x - p.x, e.z - p.z) > 120) e.dead = true; // the boss chest never despawns
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
    } else if (e.kind === 'chest') {
      e.mesh.position.set(x, Math.sin(t * 1.5 + e.phase) * 0.1, z);
      e.mesh.rotation.y = t * 0.6;
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
