import { G } from './game';
import { L, CaptainId } from './loadout';
import { SPELLS } from './spelldata';
import { spellTarget } from './aim';
import { castSpell, spellCd } from './spells';
import { enemyGrid } from './enemies';
import { projectiles } from './weapons';
import { edibles, orbs } from './edibles';

// ---- the captain spell has no key: it fires by itself when its condition holds (module abilities are Q / E / R, see abilities.ts). Tune the numbers here. ----
const p = (): typeof G.player => G.player;
/** Living enemies within r of the ship (bosses excluded with `noBoss`). */
function foes(r: number, noBoss = false): number {
  const s = p();
  let n = 0;
  enemyGrid.query(s.x, s.z, r + 6, e => { if (!e.dead && !(noBoss && e.bd) && Math.hypot(e.x - s.x, e.z - s.z) < r + e.r * 0.5) n++; });
  return n;
}
const shots = (r: number): number => projectiles.reduce((n, q) => n + ((q.kind === 'eball' || q.kind === 'eshell' || q.kind === 'skull') && Math.hypot(q.x - p().x, q.z - p().z) < r ? 1 : 0), 0);
const boss = (r: number): boolean => !!G.boss && !G.boss.dead && Math.hypot(G.boss.x - p().x, G.boss.z - p().z) < r;
const loot = (r: number): number => [...edibles, ...orbs].reduce((n, o) => n + (!o.dead && Math.hypot(o.x - p().x, o.z - p().z) < r ? 1 : 0), 0);
const hpFrac = (): number => G.hp / G.maxHp;
/** Aimed spells: a boss in range, or a cluster of at least n enemies around the auto-aim point. */
const aimed = (id: CaptainId, n: number): boolean => {
  const d = SPELLS[id], t = spellTarget(d.maxRange ?? 20, d.radius ?? 6);
  return !!t && (boss(d.maxRange ?? 20) || t.n >= n);
};
const busy = (n: number, r = 22): boolean => foes(r) >= n || boss(r + 8);

export const SPELL_COND: Record<CaptainId, () => boolean> = {
  salt: () => hpFrac() < 0.55, // Patch Up
  rosa: () => foes(10) >= 3 || (hpFrac() < 0.5 && foes(14) >= 1), // Tailwind
  bess: () => foes(10) >= 3 || shots(12) >= 3 || (hpFrac() < 0.5 && foes(15) >= 1), // Iron Hull
  tom: () => aimed('tom', 2), // Lucky Barrel
  corvo: () => foes(15) >= 4 || boss(15) || (hpFrac() < 0.6 && foes(15) >= 2), // Blood Tithe
  hana: () => busy(5, 25), // Dead Eye
  morwen: () => aimed('morwen', 4), // Maelstrom
  flint: () => aimed('flint', 3), // Firebomb
  gwen: () => loot(30) >= 5, // Plunder
  dorian: () => shots(10) >= 3 || (boss(20) && shots(12) >= 1), // Riposte
  thorne: () => busy(4), // Rally the Guns
  isabeau: () => busy(5, 30), // Royal Escort
  driftwood: () => shots(12) >= 2 || foes(8) >= 2 || (hpFrac() < 0.5 && foes(15) >= 1), // Flotsam Shield
  goldtooth: () => foes(18, true) >= 4, // Bribe
  cass: () => shots(14) >= 4 || foes(12) >= 6 || (hpFrac() < 0.35 && foes(15) >= 1), // Time Stop
  brick: () => busy(4), // All Hands
  ines: () => foes(12) <= 1, // Treasure Sense: in a quiet moment
  ghost: () => foes(8) >= 3 || shots(10) >= 3 || (hpFrac() < 0.35 && foes(12) >= 1), // Phantom Ship
  hal: () => boss(25) || foes(25) >= 1, // Harpoon (boss first, else the biggest hull)
  coral: () => aimed('coral', 4), // Hex
};

const RETRY = 0.25;
let wait = 0;
/** Fixed step: a ready spell checks its condition every RETRY s and casts when it holds. */
export function stepSpellAuto(dt: number): void {
  if (G.state !== 'playing' || spellCd().cd > 0 || (wait -= dt) > 0) return;
  wait = RETRY;
  if (SPELL_COND[L.captain]()) castSpell();
}
export const resetSpellAuto = (): void => { wait = 0; };
