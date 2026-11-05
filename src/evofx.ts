import { G } from './game';
import { Enemy, damageEnemy } from './enemies';
import { nearest, inRange } from './weapons3';
import { explode } from './weapons';
import { addPatch } from './actives3';
import { bolt, strike } from './bolt';
import { stun } from './status';
import { pushOut } from './world';
import { fx } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';

// ---- v10 evolutions / synergies: small shared effect helpers and a delay queue (all stepped by stepEvo, only while playing) ----
export { nearest, inRange };
const queue: { t: number; fn: () => void }[] = [];
const pools: { x: number; z: number; r: number; life: number; pull: number; dps: number; fxT: number; tick: number }[] = [];

export const after = (t: number, fn: () => void): void => { queue.push({ t, fn }); };
export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
export const clearFx = (): void => { queue.length = 0; pools.length = 0; };

/** Auto damage of a module as the player sees it (no crit / buff rolls). */
export const baseDmg = (id: string): number => (G.modStats[id as keyof typeof G.modStats]?.auto.dmg ?? 0) * G.st.autoDmgMul;

export function stepFxQueue(dt: number): void {
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i];
    if ((q.t -= dt) > 0) continue;
    queue.splice(i, 1);
    q.fn();
  }
  for (let i = pools.length - 1; i >= 0; i--) {
    const p = pools[i];
    if ((p.life -= dt) <= 0) { pools.splice(i, 1); continue; }
    if ((p.fxT -= dt) <= 0) {
      p.fxT = 0.12;
      const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * p.r;
      fx(p.x + Math.cos(a) * d, 0.3, p.z + Math.sin(a) * d, 0x7fc8ff, 0.5, 0.1, 0.5, 0.7, true, { vx: -Math.sin(a) * 4, vy: 0.3, vz: Math.cos(a) * 4 }, 'glow');
    }
    const tick = (p.tick -= dt) <= 0;
    if (tick) p.tick = 0.4;
    for (const e of inRange(p.x, p.z, p.r)) {
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1, s = Math.min(d, p.pull * dt) * (e.bd ? 0.4 : 1);
      e.x += (dx / d) * s; e.z += (dz / d) * s; pushOut(e, e.r);
      if (tick && p.dps > 0) damageEnemy(e, p.dps * 0.4, false, 'ability');
    }
  }
}
/** A vortex that drags enemies to its centre and wears them down (Maelstrom Net). */
export function vortex(x: number, z: number, r: number, life: number, pull: number, dps: number): void {
  pools.push({ x, z, r, life, pull, dps, fxT: 0, tick: 0.2 });
  fx(x, 0.15, z, 0x5ac8ff, r * 0.4, r * 1.1, 0.6, 0.7, true);
  play('swirl');
}

/** Lightning from (x,z) through up to `jumps` enemies starting at `first`; each takes `dmg`, optional stun. */
export function chainLightning(x: number, z: number, first: Enemy | null, jumps: number, hop: number, dmg: number, stunT = 0, y = 2.8): number {
  const hit = new Set<Enemy>();
  let fy = y, cur = first, n = 0;
  while (cur && n < jumps) {
    hit.add(cur);
    bolt(x, fy, z, cur.x, 1.4, cur.z, 0.5);
    fx(cur.x, 1.4, cur.z, 0x9fe8ff, 0.5, 1.8, 0.2, 1, false, undefined, 'glow');
    damageEnemy(cur, dmg, true, 'auto');
    if (stunT > 0) stun(cur, stunT);
    x = cur.x; z = cur.z; fy = 1.4; n++;
    cur = nearest(cur.x, cur.z, hop, hit);
  }
  if (n) { addTrauma(0.05); play('zap'); }
  return n;
}
/** A bolt from the sky on one enemy. */
export function skyStrike(e: Enemy, dmg: number, stunT = 0): void {
  strike(e.x, e.z);
  damageEnemy(e, dmg, true, 'auto');
  if (stunT > 0) stun(e, stunT);
}
/** Friendly blast at a point. */
export const blast = (x: number, z: number, r: number, dmg: number): void => explode(x, z, r, dmg, true);
/** A burning patch of water (ignites enemies inside). */
export const burnPatch = (x: number, z: number, r: number, life: number, delay = 0.1): void => addPatch(x, z, r, delay, life);
/** Damages everything within `w` of the segment (x0,z0)-(x1,z1). */
export function hitLine(x0: number, z0: number, x1: number, z1: number, w: number, dmg: number): number {
  const dx = x1 - x0, dz = z1 - z0, len2 = dx * dx + dz * dz || 1;
  let n = 0;
  for (const e of inRange((x0 + x1) / 2, (z0 + z1) / 2, Math.sqrt(len2) / 2 + w + 4)) {
    const k = Math.max(0, Math.min(1, ((e.x - x0) * dx + (e.z - z0) * dz) / len2));
    if (Math.hypot(e.x - (x0 + dx * k), e.z - (z0 + dz * k)) < w + e.r * 0.5) { damageEnemy(e, dmg, true, 'auto'); n++; }
  }
  return n;
}
/** Shoves an enemy by (dx,dz) world units (bosses move half as far). */
export function shove(e: Enemy, dx: number, dz: number): void {
  const k = e.bd ? 0.5 : 1;
  e.x += dx * k; e.z += dz * k; pushOut(e, e.r);
}
export const ring = (x: number, z: number, color: number, r0: number, r1: number, life = 0.6): void => {
  fx(x, 0.1, z, color, r0, r1, life, 0.7, true); fx(x, 0.1, z, 0xffffff, r0 * 0.7, r1 * 0.85, life * 1.2, 0.35, true);
};
