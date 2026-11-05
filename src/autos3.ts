import { G, addGold } from './game';
import { Owned, ModuleId } from './modules';
import { Enemy, damageEnemy, targetable } from './enemies';
import { shotDmg, findTarget } from './weapons';
import { stun } from './status';
import { bolt } from './bolt';
import { edibles, orbs } from './edibles';
import { autoShot } from './relicfx';
import { autoK } from './spelldata';
import { L } from './loadout';
import { bullet, nearest } from './weapons3';
import { spawnShark, sharkCount } from './sharks';
import { fx, muzzle } from './particles';
import { addTrauma, popText } from './juice';
import { play } from './audio';
import { lerp } from './spatial';
import { evoFired } from './evolutions';

// ---- timer-driven autos of Tesla Coil, Gatling Swivel (spin-up), Shark Cage and Treasure Magnet ----
const CUSTOM3 = new Set<ModuleId>(['tesla', 'gatling', 'sharkcage', 'magnet']);
export const isCustom3 = (id: ModuleId): boolean => CUSTOM3.has(id);
const spin = new WeakMap<Owned, number>();
const pulled = new WeakMap<Owned, number>();

function arcLightning(m: Owned): boolean {
  const p = G.player, a = G.modStats.tesla?.auto;
  if (!a) return false;
  const first = nearest(p.x, p.z, a.range * G.st.rangeMul);
  if (!first) return false;
  const dmg = shotDmg(m), hit = new Set<Enemy>();
  let from = { x: p.x, y: 3.2, z: p.z }, cur: Enemy | null = first;
  for (let i = 0; i <= a.jumps && cur; i++) {
    hit.add(cur);
    bolt(from.x, from.y, from.z, cur.x, 1.4, cur.z, 0.4);
    fx(cur.x, 1.4, cur.z, 0x9fe8ff, 0.5, 1.8, 0.2, 1, false, undefined, 'glow');
    damageEnemy(cur, dmg, true, 'auto');
    stun(cur, a.stun);
    from = { x: cur.x, y: 1.4, z: cur.z };
    cur = nearest(cur.x, cur.z, a.hop, hit);
  }
  addTrauma(0.05); play('zap');
  return true;
}

function gatlingStep(m: Owned, dt: number): void {
  const a = G.modStats.gatling?.auto, p = G.player;
  if (!a) return;
  const range = a.range * G.st.rangeMul;
  let target: Enemy | null = null, side = 1, bd = 1e9;
  for (const [arc, s] of [['port', 1], ['starboard', -1]] as const) {
    const e = findTarget(arc, range);
    if (!e || !targetable(e)) continue;
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    if (d < bd) { bd = d; target = e; side = s; }
  }
  const sp = spin.get(m) ?? 0;
  spin.set(m, target ? Math.min(a.spin, sp + dt) : Math.max(0, sp - dt * 1.5));
  if ((m.timer -= dt * autoK()) > 0) return;
  if (!target) { m.timer = 0; return; }
  const k = (spin.get(m) ?? 0) / a.spin, fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading);
  const lat = side * L.geo.flank, off = (Math.random() - 0.5) * L.geo.volley;
  const x = p.x + fx0 * off + fz0 * lat, z = p.z + fz0 * off - fx0 * lat;
  const aim = Math.atan2(target.x - x, target.z - z) + (Math.random() - 0.5) * 2 * a.spread * Math.PI / 180;
  bullet(x, z, aim, a.speed, shotDmg(m), range, G.st.pierce + a.pierce);
  muzzle(x + Math.sin(aim) * 0.6, 1.0, z + Math.cos(aim) * 0.6, aim);
  if (Math.random() < 0.35) play('hit');
  autoShot();
  evoFired(m, target);
  m.timer = lerp(a.cd, a.cdMin, k * k) * G.st.cooldownMul * G.st.autoRateMul;
}

function cage(m: Owned): boolean {
  const p = G.player, a = G.modStats.sharkcage?.auto;
  if (!a || sharkCount() >= 4 + a.max * 2 || !nearest(p.x, p.z, a.range * G.st.rangeMul)) return false;
  const dmg = shotDmg(m);
  for (let i = 0; i <= a.count; i++) {
    const an = p.heading + Math.PI + (i - a.count / 2) * 0.7;
    spawnShark(p.x + Math.sin(an) * 3, p.z + Math.cos(an) * 3, a.life, dmg, a.bite, a.swim);
  }
  play('splash');
  return true;
}

/** Magnet: crates and XP orbs in reach are dragged to the ship; every `cd` s of pulling pays bonus gold. */
function magnetStep(m: Owned, dt: number): void {
  const a = G.modStats.magnet?.auto, p = G.player;
  if (!a) return;
  const R = a.range * G.st.rangeMul;
  let n = 0;
  for (const c of edibles) {
    if (c.dead || c.kind !== 'crate' || Math.hypot(c.x - p.x, c.z - p.z) > R) continue;
    if (c.pull <= 0) c.pull = 10;
    n++;
  }
  for (const o of orbs) if (!o.dead && Math.hypot(o.x - p.x, o.z - p.z) < R) { o.attract = true; o.v = Math.max(o.v, 14); n++; }
  if (n) pulled.set(m, (pulled.get(m) ?? 0) + dt);
  if ((pulled.get(m) ?? 0) >= a.cd) {
    pulled.set(m, 0);
    addGold(a.gold);
    popText(p.x, 3.6, p.z, `+${a.gold}`, 'gold');
    fx(p.x, 1.6, p.z, 0xffd84a, 0.4, 1.8, 0.4, 0.9, false, undefined, 'glow');
    play('coin'); autoShot();
  }
}

export function stepAuto3(m: Owned, dt: number): void {
  if (m.id === 'gatling') { gatlingStep(m, dt); return; }
  if (m.id === 'magnet') { magnetStep(m, dt); return; }
  if ((m.timer -= dt * autoK()) > 0) return;
  const a = G.modStats[m.id]?.auto;
  if (!a) return;
  const fired = m.id === 'tesla' ? arcLightning(m) : cage(m);
  if (fired) { autoShot(); evoFired(m, nearest(G.player.x, G.player.z, 24)); }
  m.timer = fired ? a.cd * G.st.cooldownMul * G.st.autoRateMul : 0.15;
}
