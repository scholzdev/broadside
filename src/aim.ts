import { G } from './game';
import { enemyGrid, Enemy } from './enemies';

// ---- auto-aim for captain spells (they fire on their own, see autocast.ts): the nearest boss in range first, else the densest enemy cluster ----
/** The last auto-aim point (debug view); `active` = a target was found. */
export const aim = { x: 0, z: 0, n: 0, vx: 0, vz: 0, active: false };
const out = { x: 0, z: 0 };

/** Best spell target within `maxRange` of the ship: a living boss, else the enemy with the most neighbours within `r`. Null when nothing is in range. */
export function spellTarget(maxRange: number, r = 6): typeof aim | null {
  const p = G.player, b = G.boss;
  aim.active = false;
  if (b && !b.dead && Math.hypot(b.x - p.x, b.z - p.z) < maxRange + b.r * 0.5) { Object.assign(aim, { x: b.x, z: b.z, n: 1, vx: Math.sin(b.heading) * b.speed, vz: Math.cos(b.heading) * b.speed, active: true }); return aim; }
  const near: Enemy[] = [];
  enemyGrid.query(p.x, p.z, maxRange + 6, e => { if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < maxRange + e.r * 0.5) near.push(e); });
  if (!near.length) return null;
  let best = near[0], bn = -1;
  for (const e of near) {
    const n = near.reduce((c, o) => c + (Math.hypot(o.x - e.x, o.z - e.z) < r ? 1 : 0), 0);
    if (n > bn) { bn = n; best = e; }
  }
  let vx = 0, vz = 0; // mean velocity of the cluster, so lobs can lead it
  for (const o of near) if (Math.hypot(o.x - best.x, o.z - best.z) < r) { vx += Math.sin(o.heading) * o.speed; vz += Math.cos(o.heading) * o.speed; }
  Object.assign(aim, { x: best.x, z: best.z, n: bn, vx: vx / bn, vz: vz / bn, active: true });
  return aim;
}

/** Spell target point: spellTarget clamped to `maxRange`, or `fallback` units ahead of the ship when nothing is in range. Returns a shared object. */
export function aimPoint(maxRange: number, fallback: number, r?: number): { x: number; z: number } {
  const p = G.player, t = spellTarget(maxRange, r);
  let dx = Math.sin(p.heading), dz = Math.cos(p.heading), d = fallback;
  if (t) {
    const ax = t.x - p.x, az = t.z - p.z, ad = Math.hypot(ax, az);
    if (ad > 0.01) { dx = ax / ad; dz = az / ad; }
    d = ad;
  }
  d = Math.min(d, maxRange);
  out.x = p.x + dx * d; out.z = p.z + dz * d;
  return out;
}
