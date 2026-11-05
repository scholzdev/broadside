import { G } from './game';
import { L } from './loadout';
import { ArcId } from './content';
import { Owned } from './modules';
import { Num } from './modstats';
import { Enemy, enemyGrid, targetable } from './enemies';
import { spawn, lobShell, fireBall } from './weapons';
import { addPatch } from './actives3';
import { fx, muzzle, smoke } from './particles';
import { addTrauma, addRecoil } from './juice';
import { play } from './audio';

// ---- autos of the v10 weapon modules (Swivel Gun, Chain-Shot Cannon, Fire Arrows, Bomb Ketch Mortar, Spyglass Battery) + shot spawners shared with actives3 ----
const D = Math.PI / 180;

/** Nearest targetable enemy within r (edge distance), optionally skipping some. */
export function nearest(x: number, z: number, r: number, skip?: Set<Enemy>): Enemy | null {
  let best: Enemy | null = null, bd = 1e9;
  enemyGrid.query(x, z, r + 6, e => {
    if (!targetable(e) || skip?.has(e)) return;
    const d = Math.hypot(e.x - x, e.z - z) - e.r;
    if (d < r && d < bd) { bd = d; best = e; }
  });
  return best;
}
/** All targetable enemies within r of (x,z). */
export function inRange(x: number, z: number, r: number): Enemy[] {
  const out: Enemy[] = [];
  enemyGrid.query(x, z, r + 6, e => { if (targetable(e) && Math.hypot(e.x - x, e.z - z) < r + e.r * 0.5) out.push(e); });
  return out;
}

/** A small fast bullet (swivel, gatling). */
export function bullet(x: number, z: number, ang: number, speed: number, dmg: number, range: number, pierce = 0): void {
  const s = spawn('musket', x, z, dmg, range / speed);
  s.vx = Math.sin(ang) * speed; s.vz = Math.cos(ang) * speed; s.r = 0.3; s.pierce = pierce; s.y = s.py = 1.3;
}
/** A flaming arrow: ignites what it hits (see stepProjectiles). */
export function arrow(x: number, z: number, ang: number, speed: number, dmg: number, range: number, pierce = 0): void {
  const s = spawn('arrow', x, z, dmg, range / speed);
  s.vx = Math.sin(ang) * speed; s.vz = Math.cos(ang) * speed; s.r = 0.45; s.pierce = pierce; s.y = s.py = 1.8;
  fx(x, 1.8, z, 0xffb050, 0.5, 0.1, 0.2, 0.9, false, undefined, 'glow');
}
/** Chain shot: slows the target (sails cut) for `slowT` seconds to `slowMul` x speed. */
export function chainShot(x: number, z: number, ang: number, speed: number, dmg: number, range: number, pierce: number, slowT: number, slowMul: number): void {
  const s = spawn('chain', x, z, dmg, range / speed);
  s.vx = Math.sin(ang) * speed; s.vz = Math.cos(ang) * speed; s.r = 0.75; s.pierce = pierce; s.slowT = slowT; s.slowMul = slowMul;
}

/** Bomb Ketch: a lobbed bomb whose landing spot burns for `fire` seconds. */
export function lobBomb(x: number, z: number, tx: number, tz: number, dmg: number, flight: number, radius: number, fire: number): void {
  lobShell(x, z, tx, tz, dmg, flight, radius);
  addPatch(tx, tz, radius * 0.75, flight, fire);
}

/** Auto shot of a standard-arc v10 module; false when `m` is not one of them. */
export function fireNew(m: Owned, arc: ArcId, t: Enemy, a: Num, dmg: number, rng: number, pierce: number): boolean {
  const p = G.player, fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading), aim = Math.atan2(t.x - p.x, t.z - p.z);
  const bx = p.x + fx0 * L.geo.chaserAt, bz = p.z + fz0 * L.geo.chaserAt;
  if (m.id === 'swivel') {
    const n = 1 + a.count;
    for (let i = 0; i < n; i++) bullet(bx, bz, aim + (Math.random() - 0.5) * 2 * a.spread * D, a.speed, dmg, rng, pierce);
    muzzle(p.x + fx0 * L.geo.chaserMuzzle, 1.0, p.z + fz0 * L.geo.chaserMuzzle, aim);
    play('hit');
  } else if (m.id === 'chain') {
    const side = arc === 'port' ? 1 : -1, lat = side * L.geo.flank, n = 1 + a.count;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 1.4, x = p.x + fx0 * off + fz0 * lat, z = p.z + fz0 * off - fx0 * lat;
      chainShot(x, z, aim + (i - (n - 1) / 2) * 0.1, a.speed, dmg, rng, pierce, a.slowT, 1 - a.slow);
      muzzle(x + Math.sin(aim) * 0.6, 0.9, z + Math.cos(aim) * 0.6, aim);
      smoke(x + Math.sin(aim) * 1.2, 1.0, z + Math.cos(aim) * 1.2, 1.4);
    }
    addTrauma(0.1); addRecoil(side); play('boom');
  } else if (m.id === 'firearrows') {
    const n = 1 + a.count;
    for (let i = 0; i < n; i++) arrow(p.x, p.z, aim + (i - (n - 1) / 2) * 0.12 + (Math.random() - 0.5) * 0.05, a.speed, dmg, rng, pierce);
    play('whoosh');
  } else if (m.id === 'bombketch') {
    const d = Math.hypot(t.x - p.x, t.z - p.z), bk = L.geo.kegBack;
    for (let i = 0; i <= a.count; i++) {
      const sa = Math.random() * Math.PI * 2, sd = i ? Math.sqrt(Math.random()) * a.scatter : 0;
      lobBomb(p.x - fx0 * bk, p.z - fz0 * bk, t.x + Math.cos(sa) * sd, t.z + Math.sin(sa) * sd, dmg, Math.max(a.minFlight, d / a.speed), a.radius, a.fire);
    }
    smoke(p.x - fx0 * bk, 1.2, p.z - fz0 * bk, 1.8); play('boom');
  } else if (m.id === 'spyglass') {
    const d = Math.hypot(t.x - p.x, t.z - p.z), n = 1 + a.count, k = 1 + a.bonus * Math.min(1, d / rng);
    for (let i = 0; i < n; i++) fireBall(bx, bz, aim + (i - (n - 1) / 2) * 0.05, a.speed, dmg * k, rng, true, pierce);
    muzzle(p.x + fx0 * L.geo.chaserMuzzle, 1.0, p.z + fz0 * L.geo.chaserMuzzle, aim);
    play('snipe');
  } else return false;
  return true;
}

/** Spyglass Battery passive: every other module's shot crits (x critMul) with the spyglass' crit chance. */
export function critMul(m: Owned): number {
  if (m.id === 'spyglass') return 1;
  let best: Num | null = null;
  for (const o of G.modules) if (o.id === 'spyglass') { const a = G.modStats.spyglass?.auto; if (a && (!best || a.crit > best.crit)) best = a; }
  if (!best || Math.random() >= best.crit) return 1;
  fx(G.player.x, 2.4, G.player.z, 0xfff0a0, 0.4, 1.6, 0.2, 0.9, false, undefined, 'glow');
  return best.critMul;
}
