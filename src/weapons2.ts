import { G } from './game';
import { L } from './loadout';
import { Enemy } from './enemies';
import { Num } from './modstats';
import { spawn } from './weapons';
import { fx, muzzle, smoke } from './particles';
import { addTrauma, addRecoil } from './juice';
import { lerp } from './spatial';
import { play } from './audio';

// ---- shot spawners for the Harpoon Gun, Carronade, Rocket Rack and Net Thrower autos (stats `a` = G.modStats[id].auto) ----
/** A line of glow motes between two points (rope, tether). */
export function rope(x0: number, z0: number, x1: number, z1: number, color: number, life = 0.25): void {
  const n = Math.max(4, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1.2));
  for (let i = 0; i <= n; i++) { const k = i / n; fx(lerp(x0, x1, k), 1.5 - Math.sin(k * Math.PI) * 0.5, lerp(z0, z1, k), color, 0.28, 0.06, life, 0.95, false, undefined, 'glow'); }
}

export function shootHarpoon(a: Num, aim: number, dmg: number, range: number, pierce: number): void {
  const p = G.player, fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading), n = 1 + a.count;
  for (let i = 0; i < n; i++) {
    const ang = aim + (i - (n - 1) / 2) * 2 * a.fan * Math.PI / 180;
    const s = spawn('harp', p.x + fx0 * L.geo.chaserAt, p.z + fz0 * L.geo.chaserAt, dmg, range / a.speed);
    s.vx = Math.sin(ang) * a.speed; s.vz = Math.cos(ang) * a.speed; s.r = 0.5; s.pierce = pierce;
    s.slowT = a.slowT; s.slowMul = 1 - a.slow;
  }
  muzzle(p.x + fx0 * L.geo.chaserMuzzle, 0.9, p.z + fz0 * L.geo.chaserMuzzle, aim);
  play('whoosh'); play('clang');
}

export function fireCarronade(a: Num, side: number, aim: number, dmg: number, range: number, pierce: number): void {
  const p = G.player, fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading), lat = side * L.geo.flank, n = 1 + a.count;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 1.4, x = p.x + fx0 * off + fz0 * lat, z = p.z + fz0 * off - fx0 * lat;
    const s = spawn('cball', x, z, dmg, range / a.speed);
    const ang = aim + (i - (n - 1) / 2) * 0.1;
    s.vx = Math.sin(ang) * a.speed; s.vz = Math.cos(ang) * a.speed; s.r = 0.7; s.pierce = pierce; s.kb = a.knock;
    muzzle(x + Math.sin(aim) * 0.6, 0.9, z + Math.cos(aim) * 0.6, aim);
    smoke(x + Math.sin(aim) * 1.2, 1.0, z + Math.cos(aim) * 1.2, 1.6);
  }
  addTrauma(0.16); addRecoil(side); play('boom');
}

export function launchRocket(x: number, z: number, ang: number, speed: number, dmg: number, life: number, turn: number): void {
  const s = spawn('rocket', x, z, dmg, life);
  s.vx = Math.sin(ang) * speed; s.vz = Math.cos(ang) * speed; s.r = 0.7; s.turn = turn; s.y = s.py = 1.7;
  fx(x, 1.7, z, 0xffd27a, 0.6, 0.1, 0.25, 0.9, false, { vx: Math.sin(ang) * 3, vy: 1, vz: Math.cos(ang) * 3 }, 'glow');
}
export function fireRocket(a: Num, aim: number, dmg: number, range: number, _t: Enemy): void {
  const p = G.player, n = 1 + a.count;
  for (let i = 0; i < n; i++) launchRocket(p.x, p.z, aim + (Math.random() - 0.5) * 0.9, a.speed, dmg, range / a.speed * 1.7, a.turn);
  play('launch');
}

/** Net Thrower: lobs a net onto the target patch astern (extra nets scatter around it). */
export function throwNet(a: Num, t: Enemy, range: number): void {
  const p = G.player, n = 1 + a.count, back = L.geo.kegBack;
  for (let i = 0; i < n; i++) {
    const sa = Math.random() * Math.PI * 2, sd = i ? 3 : 0;
    const s = spawn('net', p.x - Math.sin(p.heading) * back, p.z - Math.cos(p.heading) * back, 0, 99);
    const d = Math.hypot(t.x - p.x, t.z - p.z), k = d > range ? range / d : 1;
    s.tx = p.x + (t.x - p.x) * k + Math.cos(sa) * sd; s.tz = p.z + (t.z - p.z) * k + Math.sin(sa) * sd;
    s.T = 0.55; s.rad = a.radius; s.slowT = a.slowT; s.slowMul = 1 - a.slow; s.y = s.py = 1.4;
  }
  play('whoosh');
}
