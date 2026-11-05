import { G } from './game';
import { Enemy, spawnEnemy, dmgK, steer, targetable } from './enemies';
import { fireBall, fireVolley, lobMortar } from './weapons';
import { islands } from './world';
import { wrap } from './spatial';
import { dropMine, firePool } from './ehazards';
import { burnPlayer } from './pstatus';
import { SERPENT_SEGS, ghostify, GHOST_ALPHA } from './enemymodels';
import { splash, smoke, flame, embers, fx } from './particles';
import { aiTurret, isFortTurret } from './fortress';
import type { EnemyType } from './content';

// ---- AI, spawning and visuals of the v8 pass-2 enemies (swarm, serpent, minelayer, ghost, battery, fireship) ----
/** Battery sits ON an island: spawner, pushOut, separation and ram push all skip it. */
export const NEW_TYPES = new Set<EnemyType>(['swarm', 'serpent', 'minelayer', 'ghost', 'battery', 'fireship']);
const BATTERY_RANGE = 30, SURFACE_T = 0.8, MAX_BATTERIES = 3;

export function initNew(e: Enemy): void {
  if (e.type === 'serpent') { e.hidden = true; e.vis = 0; e.mode = 0; e.modeT = 1 + Math.random() * 1.5; }
  if (e.type === 'ghost') { e.mode = 0; e.modeT = 1 + Math.random() * 2; }
  if (e.type === 'ghost') ghostify(e.model.root, e.mats, 3.4);
  if (e.type === 'battery') e.fireT = 2 + Math.random() * 2;
  if (e.type === 'minelayer') e.auxT = 2 + Math.random() * 2;
}

/** A pack of 5-7 swarm cutters around (x, z). */
export function spawnPack(x: number, z: number): void {
  const n = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) spawnEnemy('swarm', x + (Math.random() - 0.5) * 7, z + (Math.random() - 0.5) * 7);
}

/** Places a Coastal Battery on the shore of a nearby island (the sea side facing the player). Returns false when no island fits. */
export function spawnBattery(): boolean {
  const p = G.player;
  if (G.enemies.reduce((n, e) => n + (e.type === 'battery' && !e.dead ? 1 : 0), 0) >= MAX_BATTERIES) return false;
  const free = islands.filter(i => {
    const d = Math.hypot(i.x - p.x, i.z - p.z);
    return !i.fort && i.r >= 3.5 && d > 32 && d < 75 && !G.enemies.some(e => e.type === 'battery' && !e.dead && Math.hypot(e.x - i.x, e.z - i.z) < i.r + 2);
  });
  if (!free.length) return false;
  const i = free[Math.floor(Math.random() * free.length)];
  const a = Math.atan2(p.x - i.x, p.z - i.z) + (Math.random() - 0.5) * 1.4;
  const e = spawnEnemy('battery', i.x + Math.sin(a) * i.r * 0.74, i.z + Math.cos(a) * i.r * 0.74);
  e.heading = e.ph = a; e.aim = Math.atan2(p.x - e.x, p.z - e.z);
  return true;
}

/** Surface the serpent next to the ship (mode 1), splash and all. */
function surface(e: Enemy): void {
  e.x = e.ax; e.z = e.az; e.px = e.x; e.pz = e.z;
  e.mode = 1; e.modeT = 3; e.hidden = false;
  splash(e.x, e.z);
}
/** After a bite (or too long on the surface) the serpent dives and swims around for a few seconds. */
export function dive(e: Enemy): void { e.mode = 0; e.modeT = 3; e.hidden = true; splash(e.x, e.z); }

/** Returns the speed. Hull-less battery returns 0 (never moves, never rotates). */
export function aiNew(e: Enemy, dt: number, d: number, toP: number, spd: number): number {
  const p = G.player, away = Math.atan2(e.x - p.x, e.z - p.z);
  switch (e.type) {
    case 'swarm': {
      const want = d > 9 ? toP : toP + e.side * Math.PI / 2 + e.side * 0.4;
      steer(e, e.x + Math.sin(want) * 10, e.z + Math.cos(want) * 10, e.def.turn, dt);
      if (e.fireT <= 0 && d < 15) { e.fireT = 1.8 + Math.random() * 0.8; fireBall(e.x, e.z, toP + (Math.random() - 0.5) * 0.15, 15, 2 * dmgK(e), 17, false); }
      break;
    }
    case 'serpent': {
      e.modeT -= dt;
      e.vis = Math.max(0, Math.min(1, e.vis + (e.mode === 1 ? 3 : -4) * dt));
      if (e.mode === 0) {
        e.hidden = true;
        if (e.modeT > 0) { const w = away + e.side * 1.4; steer(e, p.x + Math.sin(w) * 10, p.z + Math.cos(w) * 10, e.def.turn, dt); spd *= 0.8; }
        else {
          steer(e, p.x, p.z, e.def.turn, dt);
          if (d < 13) { // telegraph where it will come up: ahead of the ship and a little to the side
            const a = Math.random() * Math.PI * 2;
            e.ax = p.x + p.vx * SURFACE_T + Math.sin(a) * 4.5; e.az = p.z + p.vz * SURFACE_T + Math.cos(a) * 4.5;
            e.mode = 2; e.modeT = SURFACE_T;
          }
        }
      } else if (e.mode === 2) { // telegraph: rings on the water, then up it comes
        e.hidden = true; spd = 0;
        if ((e.fxT -= dt) <= 0) { e.fxT = 0.1; fx(e.ax, 0.15, e.az, 0xff9a60, 0.5, 2.4 * (1 - e.modeT / SURFACE_T) + 0.6, 0.35, 0.8, true); }
        if (e.modeT <= 0) surface(e);
      } else {
        e.hidden = false;
        steer(e, p.x, p.z, e.def.turn, dt);
        if (e.modeT <= 0) dive(e);
      }
      break;
    }
    case 'minelayer': {
      const want = d > 20 ? toP : d < 13 ? away : toP + e.side * Math.PI / 2;
      steer(e, e.x + Math.sin(want) * 10, e.z + Math.cos(want) * 10, e.def.turn, dt);
      if ((e.auxT -= dt) <= 0 && d < 36 && d > 6) {
        e.auxT = 3.2;
        dropMine(e.x - Math.sin(e.heading) * e.r * 1.4, e.z - Math.cos(e.heading) * e.r * 1.4, 20 * dmgK(e));
      }
      break;
    }
    case 'ghost': {
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 1 - e.mode; e.modeT = 2; e.hidden = e.mode === 1; }
      e.vis += (e.mode === 1 ? 0.22 - e.vis : 1 - e.vis) * Math.min(1, dt * 6);
      const want = d > 12 ? toP : toP + e.side * Math.PI / 2;
      steer(e, e.x + Math.sin(want) * 10, e.z + Math.cos(want) * 10, e.def.turn, dt);
      const rel = wrap(toP - e.heading);
      if (e.mode === 0 && e.fireT <= 0 && d < 17 && Math.abs(Math.abs(rel) - Math.PI / 2) < 0.9) {
        e.fireT = 3;
        fireVolley({ x: e.x, z: e.z, heading: e.heading, side: rel > 0 ? 1 : -1, n: 3, aim: toP, len: 2.6, speed: 13, dmg: 6 * dmgK(e), range: 20, friendly: false });
      }
      break;
    }
    case 'battery': {
      if (isFortTurret(e)) return aiTurret(e, dt, d, toP);
      e.aim += wrap(toP - e.aim) * Math.min(1, dt * 4);
      if (e.fireT <= 0 && d < BATTERY_RANGE) {
        e.fireT = 4.2;
        lobMortar(e.x, e.z, p.x + p.vx * 0.5, p.z + p.vz * 0.5, 14 * dmgK(e));
        smoke(e.x + Math.sin(e.aim) * 2, 2, e.z + Math.cos(e.aim) * 2, 1.4);
      }
      return 0;
    }
    case 'fireship':
      steer(e, p.x, p.z, e.def.turn, dt);
      break;
  }
  return spd;
}

/** Fire Ship rams the ship: the blast itself is explode() in enemies.ts; this adds the burn, the fire pool and the flames. */
export function fireshipBlast(e: Enemy, safe: boolean): void {
  if (!safe) burnPlayer(3, 4);
  firePool(e.x, e.z);
  for (let i = 0; i < 6; i++) flame(e.x + (Math.random() - 0.5) * 4, 0.6, e.z + (Math.random() - 0.5) * 4, 1.8);
  embers(e.x, 1, e.z, 12, 3);
}

/** Per-frame visual of a pass-2 enemy; returns true when its health bar should stay hidden. */
export function newVisual(e: Enemy, t: number, ex: number, ez: number, y: number, dt: number): boolean {
  const m = e.model;
  if (e.type === 'serpent') {
    const under = e.vis < 0.05;
    m.root.visible = !under;
    m.root.position.y = y - (1 - e.vis) * 2.2;
    for (let i = 0; i < SERPENT_SEGS; i++) {
      const s = m.tilt.children[i];
      s.position.x = Math.sin(t * 5 - i * 0.8 + e.phase) * (0.12 + i * 0.07);
      s.position.y = 0.2 + Math.max(0, Math.sin(t * 3 - i * 0.7 + e.phase)) * 0.28;
    }
    if (e.vis < 0.6 && (e.smokeT -= dt) <= 0) { // faint ripple while it swims underwater
      e.smokeT = 0.22;
      fx(ex, 0.1, ez, 0xdff4ff, 0.4, 1.7, 0.8, 0.4, true);
      fx(ex - Math.sin(e.heading) * 1.2, 0.1, ez - Math.cos(e.heading) * 1.2, 0xdff4ff, 0.3, 1.2, 0.7, 0.3, true);
    }
    return under || e.hidden;
  }
  if (e.type === 'ghost') {
    for (const r of e.mats) { r.m.opacity = e.vis * GHOST_ALPHA; r.m.depthWrite = false; }
    m.root.position.y = y + 0.35 + Math.sin(t * 1.6 + e.phase) * 0.12;
    if (e.hidden && (e.smokeT -= dt) <= 0) {
      e.smokeT = 0.12;
      fx(ex + (Math.random() - 0.5) * e.r * 1.4, 1 + Math.random() * 2, ez + (Math.random() - 0.5) * e.r * 1.4, 0x8affc8, 0.25, 0.05, 0.7, 0.6, false, { vx: 0, vy: 0.8, vz: 0 }, 'glow');
    }
    return e.hidden;
  }
  if (e.type === 'battery') {
    m.root.position.y = isFortTurret(e) ? 1.5 : 0.5;
    m.tilt.rotation.set(0, 0, 0);
    const turret = m.tilt.children[1];
    if (turret) turret.rotation.y = e.aim - e.heading;
  }
  return false;
}

/** True for a Fog Coast edge arrow: submerged serpents are not marked. */
export const arrowHidden = (e: Enemy): boolean => e.type === 'serpent' && !targetable(e);
