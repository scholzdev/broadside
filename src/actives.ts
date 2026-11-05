import { G } from './game';
import { L } from './loadout';
import { Owned, ModuleId } from './modules';
import { ModStats, isPlus, abil } from './modstats';
import { enemyGrid, damageEnemy, Enemy } from './enemies';
import { fireVolley, fireBall, deleteEnemyProjectiles, explode } from './weapons';
import { spawnLongboat, nearestEnemy } from './summons';
import { ignite } from './status';
import { islands, pushOut } from './world';
import { fx, flame, embers, muzzle } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';
import { CAST2, stepActives2, resetActives2, Cast } from './actives2';
import { CAST3, stepActives3, resetActives3 } from './actives3';

// ---- active abilities: one cast function per module (returns false when nothing happened, so no cooldown is spent) ----
const D = Math.PI / 180;
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
// All numbers come from the module's stat record (G.modStats); the captain's global multiplier is applied inside damageEnemy.

// timed effects stepped by stepActives
const queue: { t: number; fn: () => void }[] = [];
const after = (t: number, fn: () => void): void => { queue.push({ t, fn }); };
interface Seg { x: number; z: number; life: number; fxT: number }
const trail: Seg[] = [];
const S = { trailT: 0, trailR: 1.6, trailLife: 3, trailAcc: 0, flameT: 0, flameR: 7, flameA: 0, wardFx: 0, ramPlus: false, ramDmg: 0, ramR: 5 };

export function resetActives(): void {
  queue.length = 0; trail.length = 0;
  Object.assign(S, { trailT: 0, trailR: 1.6, trailLife: 3, trailAcc: 0, flameT: 0, flameR: 7, flameA: 0, wardFx: 0, ramPlus: false, ramDmg: 0, ramR: 5 });
  Object.assign(G.buffs, { ram: 0, ward: 0, vanish: false, lantern: 0, pump: 0 });
  resetActives2(); resetActives3();
}

function inRange(x: number, z: number, r: number): Enemy[] {
  const out: Enemy[] = [];
  enemyGrid.query(x, z, r + 6, e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.r * 0.5) out.push(e); });
  return out;
}

function fullBroadside(_m: Owned, ms: ModStats): boolean {
  const v = ms.ability, au = ms.auto;
  const volley = (): void => {
    const p = G.player;
    for (const side of [1, -1]) {
      fireVolley({ x: p.x, z: p.z, heading: p.heading, side, n: G.st.balls + au.count, aim: p.heading + side * Math.PI / 2, len: L.geo.volley, speed: au.speed, dmg: v.dmg, range: au.range * G.st.rangeMul, friendly: true, pierce: G.st.pierce + au.pierce });
    }
  };
  const n = abil(ms, 'count');
  volley();
  for (let i = 1; i < n; i++) after(i * v.interval, volley);
  return true;
}

function heatedShot(_m: Owned, ms: ModStats): boolean {
  const p = G.player, fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading), v = ms.ability, n = abil(ms, 'count');
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * 2 * v.fan * D;
    fireBall(p.x + fx0 * L.geo.chaserAt, p.z + fz0 * L.geo.chaserAt, p.heading + a, v.speed, v.dmg, v.range, true, v.pierce, true);
    muzzle(p.x + fx0 * L.geo.chaserMuzzle, 0.9, p.z + fz0 * L.geo.chaserMuzzle, p.heading + a);
  }
  addTrauma(0.25); play('boom'); play('fire');
  return true;
}

function powderTrail(_m: Owned, ms: ModStats): boolean {
  S.trailT = abil(ms, 'duration'); S.trailR = abil(ms, 'radius'); S.trailLife = ms.ability.segLife;
  play('fire');
  return true;
}

function rammingSpeed(_m: Owned, ms: ModStats): boolean {
  G.buffs.ram = abil(ms, 'duration'); S.ramPlus = isPlus(ms); S.ramDmg = ms.ability.dmg; S.ramR = ms.ability.radius;
  addTrauma(0.3); play('whoosh');
  return true;
}

function boardersAway(_m: Owned, ms: ModStats): boolean {
  const p = G.player;
  if (!nearestEnemy(p.x, p.z, 45)) return false;
  const n = abil(ms, 'count'), v = ms.ability;
  for (let i = 0; i < n; i++) {
    const a = p.heading + (i / n) * Math.PI * 2;
    spawnLongboat(p.x + Math.sin(a) * 2.5, p.z + Math.cos(a) * 2.5, a, v.dmg, abil(ms, 'life'), v.speed);
  }
  play('whoosh');
  return true;
}

function flameWall(_m: Owned, ms: ModStats): boolean {
  S.flameT = abil(ms, 'duration'); S.flameR = abil(ms, 'radius');
  addTrauma(0.15); play('fire');
  return true;
}

function ward(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, R = v.radius;
  deleteEnemyProjectiles(p.x, p.z, R);
  G.buffs.ward = v.duration;
  fx(p.x, 0.2, p.z, 0x9fe0ff, 1, R * 1.1, 0.6, 0.8, true);
  fx(p.x, 1.2, p.z, 0xbfeaff, 2, R * 0.6, 0.35, 0.6, false, undefined, 'glow');
  if (isPlus(ms)) {
    for (const e of inRange(p.x, p.z, R)) {
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1, push = Math.min(v.push, R - d + 2);
      e.x += (dx / d) * push; e.z += (dz / d) * push;
      pushOut(e, e.r);
      damageEnemy(e, v.dmg, true, 'ability');
    }
  }
  addTrauma(0.2); play('zap');
  return true;
}

function vanish(_m: Owned, ms: ModStats): boolean {
  const p = G.player, fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading);
  let dist = 0;
  for (let d = Math.floor(ms.ability.blink); d >= 1; d--) {
    const x = p.x + fx0 * d, z = p.z + fz0 * d;
    if (!islands.some(i => Math.hypot(x - i.x, z - i.z) < i.r + L.geo.r + 0.6)) { dist = d; break; }
  }
  if (!dist) return false;
  const fog = (x: number, z: number): void => {
    for (let i = 0; i < 7; i++) fx(x + rnd(-1.5, 1.5), rnd(0.5, 2), z + rnd(-1.5, 1.5), 0xdde6ea, 1.2, rnd(3, 4.5), rnd(1.2, 1.8), 0.6, false, { vx: rnd(-0.6, 0.6), vy: rnd(0.2, 0.8), vz: rnd(-0.6, 0.6) }, 'soft');
  };
  fog(p.x, p.z);
  p.x += fx0 * dist; p.z += fz0 * dist;
  pushOut(p, L.geo.r);
  p.px = p.x; p.pz = p.z;
  fog(p.x, p.z);
  G.buffs.vanish = true;
  play('whoosh');
  return true;
}

export const CAST: Partial<Record<ModuleId, Cast>> = {
  broadside: fullBroadside, chaser: heatedShot, kegs: powderTrail, ram: rammingSpeed,
  boarding: boardersAway, siphon: flameWall, ward, lantern: vanish, ...CAST2, ...CAST3,
};

/** Fixed-step upkeep of queued volleys/strikes, the powder trail, the flame wall and the ram dash / ward timers. */
export function stepActives(dt: number): void {
  const p = G.player;
  stepActives2(dt); stepActives3(dt);
  for (let i = queue.length - 1; i >= 0; i--) {
    if ((queue[i].t -= dt) > 0) continue;
    const q = queue[i];
    queue.splice(i, 1);
    q.fn();
  }
  if (S.trailT > 0) {
    S.trailT -= dt;
    if ((S.trailAcc -= dt) <= 0) {
      S.trailAcc = 0.12;
      trail.push({ x: p.x - Math.sin(p.heading) * L.geo.kegBack, z: p.z - Math.cos(p.heading) * L.geo.kegBack, life: S.trailLife, fxT: 0 });
    }
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    const s = trail[i];
    if ((s.life -= dt) <= 0) { trail[i] = trail[trail.length - 1]; trail.pop(); continue; }
    for (const e of inRange(s.x, s.z, S.trailR)) ignite(e);
    if ((s.fxT -= dt) <= 0) {
      s.fxT = 0.1;
      flame(s.x, 0.5, s.z, S.trailR * 1.1);
      if (Math.random() < 0.3) embers(s.x, 0.8, s.z, 1, S.trailR * 0.5);
    }
  }
  if (S.flameT > 0) {
    S.flameT -= dt; S.flameA += dt * 7;
    for (let i = 0; i < 2; i++) {
      const a = S.flameA + i * 0.5 + rnd(-0.1, 0.1);
      flame(p.x + Math.sin(a) * S.flameR, 0.9, p.z + Math.cos(a) * S.flameR, 1.5);
    }
    if (Math.random() < 0.4) { const a = Math.random() * Math.PI * 2; flame(p.x + Math.sin(a) * S.flameR, 0.7, p.z + Math.cos(a) * S.flameR, 1.2); }
    for (const e of inRange(p.x, p.z, S.flameR)) ignite(e);
  }
  if (G.buffs.ram > 0) {
    G.buffs.ram -= dt;
    fx(p.x - Math.sin(p.heading) * L.geo.wakeBack, 0.8, p.z - Math.cos(p.heading) * L.geo.wakeBack, 0xe8f6ff, 0.7, 0.1, 0.3, 0.6, false, undefined, 'glow');
    if (G.buffs.ram <= 0) {
      G.buffs.ram = 0;
      if (S.ramPlus) explode(p.x + Math.sin(p.heading) * 3, p.z + Math.cos(p.heading) * 3, S.ramR, S.ramDmg, true);
    }
  }
  if (G.buffs.ward > 0) {
    G.buffs.ward -= dt;
    if ((S.wardFx -= dt) <= 0) { S.wardFx = 0.2; fx(p.x, 0.2, p.z, 0x9fe0ff, 2.6, 3.4, 0.4, 0.5, true); }
  }
}
