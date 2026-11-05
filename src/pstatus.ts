import { G, hurtPlayer } from './game';
import { flame } from './particles';

// ---- player statuses (v8): slow (max speed x) and burn (DoT through hurtPlayer, so shields, Riposte and multipliers apply) ----
export const PS = { slowT: 0, slowMul: 1, burnT: 0, burnDps: 0, burnTick: 0, fxT: 0 };
const TICK = 0.5;

export function resetPlayerStatus(): void { Object.assign(PS, { slowT: 0, slowMul: 1, burnT: 0, burnDps: 0, burnTick: 0, fxT: 0 }); }
/** Slow the ship to `mul` x max speed for `secs` (the stronger slow wins while both run). */
export function slowPlayer(secs: number, mul: number): void {
  if (PS.slowT <= 0 || mul < PS.slowMul) PS.slowMul = mul;
  PS.slowT = Math.max(PS.slowT, secs);
}
/** Set the ship on fire: refreshes duration, keeps the higher DPS, never stacks. */
export function burnPlayer(secs: number, dps: number): void {
  const was = PS.burnT > 0;
  if (!was) PS.burnTick = TICK;
  PS.burnT = Math.max(PS.burnT, secs); PS.burnDps = was ? Math.max(PS.burnDps, dps) : dps;
}
/** Emergency Pump: washes off every status. */
export function cleansePlayer(): void { PS.slowT = 0; PS.slowMul = 1; PS.burnT = 0; PS.burnDps = 0; }
export const playerSpeedMul = (): number => (PS.slowT > 0 ? PS.slowMul : 1);

export function stepPlayerStatus(dt: number): void {
  if (PS.slowT > 0 && (PS.slowT -= dt) <= 0) PS.slowMul = 1;
  if (PS.burnT <= 0) return;
  PS.burnT -= dt;
  if ((PS.burnTick -= dt) <= 0) { PS.burnTick += TICK; hurtPlayer(PS.burnDps * TICK, true); }
  if ((PS.fxT -= dt) <= 0) { PS.fxT = 0.12; flame(G.player.x + (Math.random() - 0.5) * 2, 1.4, G.player.z + (Math.random() - 0.5) * 2, 1.1); }
  if (PS.burnT <= 0) PS.burnDps = 0;
}
