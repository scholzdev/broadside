import type * as THREE from 'three';
import { G, scene } from './game';
import { L } from './loadout';
import { enemyGrid, damageEnemy, Enemy } from './enemies';
import { getShip, makeFishingBoat, ShipModel } from './models';
import { pushOut } from './world';
import { splash } from './particles';
import { seaPose, Pose } from './anim';
import { lerp, lerpAngle, wrap } from './spatial';

// ---- Boarding Party longboats: friendly mini-entities, kept out of enemyGrid and G.enemies ----
interface Boat { speed: number; x: number; z: number; px: number; pz: number; ph: number; heading: number; dps: number; life: number; target: Enemy | null; retarget: number; tick: number; phase: number; model: ShipModel }
const boats: Boat[] = [];
const MAX_BOATS = 14, TURN = 4.5, TICK = 0.25, SCALE = 1.5;
const pose: Pose = { y: 0, pitch: 0, roll: 0 };

export function nearestEnemy(x: number, z: number, r: number, skip?: Set<Enemy>): Enemy | null {
  let best: Enemy | null = null, bd = 1e9;
  enemyGrid.query(x, z, r, e => {
    if (e.dead || skip?.has(e)) return;
    const d = Math.hypot(e.x - x, e.z - z) - e.r;
    if (d < r && d < bd) { bd = d; best = e; }
  });
  return best;
}

/** Queen Isabeau launches extra longboats and they hit 50% harder; her drawback is in her speed. */
export function spawnLongboat(x: number, z: number, heading: number, dps: number, life: number, speed: number): void {
  for (let i = 0; i < L.cap.summonPlus; i++) launch(x, z, heading + 0.35 * (i % 2 ? 1 : -1) * (1 + (i >> 1)), dps * L.cap.summonDps, life, speed);
  launch(x, z, heading, dps * L.cap.summonDps, life, speed);
}
function launch(x: number, z: number, heading: number, dps: number, life: number, speed: number): void {
  if (boats.length >= MAX_BOATS) removeBoat(0);
  const model = getShip('longboat', makeFishingBoat);
  model.root.scale.setScalar(SCALE);
  scene.add(model.root);
  boats.push({ speed, x, z, px: x, pz: z, ph: heading, heading, dps, life, target: null, retarget: 0, tick: 0, phase: Math.random() * 6, model });
  splash(x, z);
}
function removeBoat(i: number): void {
  const b = boats[i];
  scene.remove(b.model.root);
  splash(b.x, b.z);
  boats.splice(i, 1);
}
export function clearSummons(): void {
  for (const b of boats) scene.remove(b.model.root);
  boats.length = 0;
}
export const boatCount = (): number => boats.length;

export function stepSummons(dt: number): void {
  for (let i = boats.length - 1; i >= 0; i--) {
    const b = boats[i];
    b.px = b.x; b.pz = b.z; b.ph = b.heading;
    if ((b.life -= dt) <= 0) { removeBoat(i); continue; }
    if (!b.target || b.target.dead || (b.retarget -= dt) <= 0) { b.target = nearestEnemy(b.x, b.z, 45); b.retarget = 0.5; }
    const t = b.target;
    let spd = b.speed * 0.4;
    if (t) {
      const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz);
      const diff = wrap(Math.atan2(dx, dz) - b.heading);
      b.heading += Math.max(-TURN * dt, Math.min(TURN * dt, diff));
      if (d < t.r + 1.0) {
        spd = 0;
        if ((b.tick -= dt) <= 0) { b.tick = TICK; damageEnemy(t, b.dps * TICK, true, 'summon'); }
      } else spd = b.speed;
    } else {
      const dx = G.player.x - b.x, dz = G.player.z - b.z;
      if (Math.hypot(dx, dz) > 8) b.heading += Math.max(-TURN * dt, Math.min(TURN * dt, wrap(Math.atan2(dx, dz) - b.heading)));
    }
    b.x += Math.sin(b.heading) * spd * dt; b.z += Math.cos(b.heading) * spd * dt;
    pushOut(b, 0.8);
  }
}

export function renderSummons(t: number, alpha: number): void {
  for (const b of boats) {
    const x = lerp(b.px, b.x, alpha), z = lerp(b.pz, b.z, alpha), h = lerpAngle(b.ph, b.heading, alpha);
    seaPose(x, z, h, t, 1.2, 0.6, pose);
    b.model.root.position.set(x, pose.y, z);
    b.model.root.rotation.y = h;
    (b.model.tilt as THREE.Object3D).rotation.z = pose.roll;
    (b.model.tilt as THREE.Object3D).rotation.x = pose.pitch;
    b.model.root.visible = b.life > 0.4 || Math.floor(t * 12) % 2 === 0; // blink out when about to vanish
  }
}
