import { G, healPlayer } from './game';
import { L } from './loadout';
import { bump } from './meta';
import { hitNumber } from './juice';
import { fx } from './particles';

// ---- captain passives that need run state (the stat-only ones live in roster.ts / content.deriveStats) ----
let coralT = 0;
export const resetPassives = (): void => { coralT = 0; };

/** A crate or dock hut was eaten: lifetime stats, plus Old Driftwood cutting the nitro meter. */
export function eatHook(kind: 'crate' | 'hut'): void {
  bump(kind === 'crate' ? 'cratesEaten' : 'hutsEaten');
  const cut = L.cap.eatCd, p = G.player;
  if (cut > 0 && p.nitro < 1) {
    p.nitro = Math.min(1, p.nitro + cut / G.st.fullCd);
    fx(p.x, 2.6, p.z, 0xb08a58, 0.4, 0.1, 0.5, 0.9, false, { vx: 0, vy: 2, vz: 0 }, 'glow');
  }
}
/** Admiral Thorne: +1 max HP per `hpKills` kills this run (cap +100), kept in G.lv['k:hp'] so deriveStats can read it. Returns true when stats changed. */
export function killBonus(): boolean {
  const per = L.cap.hpKills;
  if (!per || G.kills % per || (G.lv['k:hp'] ?? 0) >= 100) return false;
  G.lv['k:hp'] = (G.lv['k:hp'] ?? 0) + 1;
  return true;
}
/** Mama Coral: 1 HP per owned module every 5 s (the interval shrinks with every module). */
export function stepPassives(dt: number): void {
  if (!L.cap.modRegen || !G.modules.length) return;
  coralT += dt * G.modules.length;
  if (coralT < 5) return;
  coralT -= 5;
  const before = G.hp;
  healPlayer(1);
  if (G.hp > before) hitNumber(G.player, G.player.x, 3.4, G.player.z, G.hp - before, 'heal');
}
/** Doubloon multiplier at settle time: Baron Goldtooth and Cursed Doubloon. */
export const doubloonMul = (): number => L.cap.doubloons * (L.relic === 'cursed' ? 1.5 : 1);
