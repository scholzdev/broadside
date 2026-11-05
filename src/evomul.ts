import type { Enemy, DmgSource } from './enemies';

// ---- v10 synergy damage multipliers, kept dependency-free because enemies.ts calls it for every hit. synergies.ts keeps `activeSyn` current each tick. ----
export const activeSyn = new Set<string>();

/** Napalm: burn +50%. Fish in a Barrel: +30% to slowed enemies. Juggernaut: ram hits +50%. */
export function evoDmgMul(e: Enemy, source: DmgSource): number {
  if (!activeSyn.size) return 1;
  let k = 1;
  if (source === 'burn' && activeSyn.has('napalm')) k *= 1.5;
  if (e.slowT > 0 && (source === 'auto' || source === 'ability') && activeSyn.has('barrel')) k *= 1.3;
  if (source === 'ram' && activeSyn.has('juggernaut')) k *= 1.5;
  return k;
}
