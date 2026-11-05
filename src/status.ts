import { damageEnemy, enemyGrid, Enemy } from './enemies';
import { G } from './game';
import { flame, fx } from './particles';
import { bump } from './meta';
import { L } from './loadout';
import { islands } from './world';

// ---- enemy status effects: burn (DoT, refreshes but never stacks) and stun ----
export const BURN_DPS = 6, BURN_T = 3, BURN_TICK = 0.5;

export function ignite(e: Enemy): void {
  if (e.dead) return;
  if (!e.burned) { e.burned = true; bump('burned'); }
  if (e.burnT <= 0) e.burnTick = BURN_TICK;
  e.burnT = BURN_T; e.burnDps = BURN_DPS;
}
/** Fire Opal: a burning enemy that dies ignites its neighbours. */
export function spreadBurn(e: Enemy): void {
  enemyGrid.query(e.x, e.z, 7, o => { if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.z - e.z) < 6 + o.r) ignite(o); });
  flame(e.x, 1.2, e.z, 1.6);
}
/** Bosses take half the duration. */
export function stun(e: Enemy, secs: number): void {
  if (e.dead) return;
  e.stunT = Math.max(e.stunT, e.bd ? secs / 2 : secs);
}

/** Slow an enemy to `mul` x speed for `secs` (the stronger slow wins). */
export function slow(e: Enemy, secs: number, mul: number): void {
  if (e.dead) return;
  if (e.slowT <= 0 || mul < e.slowMul) e.slowMul = mul;
  e.slowT = Math.max(e.slowT, secs);
}
/** Enemy speed factor: Clockwork Cass's drawback, Siren's Shell (within 10 u of the ship) and slows. */
export const speedMul = (e: Enemy, d: number): number => L.cap.enemySpd * (L.relic === 'siren' && d < 10 ? 0.85 : 1) * (e.slowT > 0 ? e.slowMul : 1) * (e.elite === 'fast' ? 1.4 : 1);
/** Damage taken x on an enemy: Hex mark and Cartographer Ines near an island. */
export function dmgTakenMul(e: Enemy): number {
  let k = (e.hexT > 0 ? 1.5 : 1) * (e.elite === 'armoured' ? 0.7 : 1);
  if (L.cap.isleDmg > 1 && islands.some(i => Math.hypot(G.player.x - i.x, G.player.z - i.z) < i.r + 12)) k *= L.cap.isleDmg;
  return k;
}

/** Fixed-step tick for one live enemy: burn damage in 0.5 s chunks (merged damage numbers, no hit flash) plus flame / spark visuals. */
export function stepStatus(e: Enemy, dt: number): void {
  if (e.slowT > 0) e.slowT -= dt;
  if (e.hexT > 0) e.hexT -= dt;
  if (e.burnT > 0) {
    e.burnT -= dt;
    if ((e.burnTick -= dt) <= 0) {
      e.burnTick += BURN_TICK;
      damageEnemy(e, e.burnDps * BURN_TICK * (L.relic === 'opal' ? 1.5 : 1), false, 'burn');
      if (e.dead) return;
      if (G.st.ignite) enemyGrid.query(e.x, e.z, e.r + 4.5, o => { if (o !== e && !o.dead && o.burnT <= 0 && Math.hypot(o.x - e.x, o.z - e.z) < e.r + o.r) ignite(o); }); // Flint: fire spreads on touch
    }
    if ((e.fxT -= dt) <= 0) { e.fxT = 0.1; flame(e.x, 1.0 + e.r * 0.4, e.z, 0.9 + e.r * 0.3); }
  }
  if (e.stunT > 0) {
    e.stunT -= dt;
    if ((e.fxT -= dt) <= 0) {
      e.fxT = 0.12;
      const a = Math.random() * Math.PI * 2;
      fx(e.x + Math.cos(a) * e.r * 0.5, 2.2 + e.r * 0.3, e.z + Math.sin(a) * e.r * 0.5, 0xffe680, 0.1, 0.02, 0.22, 1, false,
        { vx: Math.cos(a) * 1.5, vy: 1.5, vz: Math.sin(a) * 1.5, g: 8 }, 'glow');
    }
  }
}
