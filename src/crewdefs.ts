import type { CrewId } from './relics';
import type { ShipId } from './loadout';
// Crew tables and the pure maths behind them (dependency-light: no game state except the shared `crewState`). Runtime lives in crew.ts, cards in crewcards.ts.

export interface CrewEntry { count: number; level: number }
export type CrewState = Partial<Record<CrewId, CrewEntry>>;
/** The run's crew (G.crew points at this object; startRun refills it in place so deriveStats can read it without importing the game). */
export const crewState: CrewState = {};
export const MAX_CREW_LV = 5;
export const SHIP_CAP: Record<ShipId, number> = { sloop: 6, galleon: 10, frigate: 14 };
/** Deck order: figure i of the ship is the i-th entry of this list expanded by count. */
export const CREW_ORDER: CrewId[] = ['musket', 'boarder', 'carp', 'gunner', 'look', 'surgeon', 'cook', 'quart', 'navigator', 'monkey', 'mate'];
/** Fore-aft position (0 stern .. 1 bow) of each deck slot; figure g stands on the rail (g even: port, odd: starboard). Shared by dressing and crew.ts. */
export const DECK_T = [0.6, 0.44, 0.7, 0.36, 0.52, 0.66, 0.4, 0.56, 0.48, 0.62, 0.38, 0.58, 0.46, 0.68];
/** Per-figure numbers, scaled by lvK(level). Caps: -30% on any crew cooldown, +50% range. */
export const FX = {
  musket: { range: 14, advRange: 22, cd: 2.2, dmg: 3, advMul: 2, advPierce: 1, speed: 40 }, // dmg = 3 + level (4 at Lv 1, +1 per Lv)
  boarder: { dmg: 12, leapEvery: 4, leapR: 6 },
  carp: { hps: 0.3, idle: 3, taken: 0.08 },
  gunner: { cut: 0.03, every: 8 },
  look: { range: 0.04, vision: 6, mark: 1.15 },
  surgeon: { frac: 0.05, every: 12 },
  cook: { hp: 8, every: 20, dur: 6, dmg: 0.1 },
  quart: { gold: 0.06, pull: 2 },
  navigator: { spd: 0.03, nitro: 1.3 },
  monkey: { cut: 0.03, blast: 1.25 },
  mate: { cut: 0.04, adv: 0.85 },
  capCut: 0.3, capRange: 0.5,
};
/** Level scaling of a non-musket per-figure effect: 1x at Lv 1 up to 2x at Lv 5. */
export const lvK = (l: number): number => 1 + 0.25 * (l - 1);
export const musketDmg = (l: number): number => FX.musket.dmg + l;
export const isAdv = (e: CrewEntry | undefined): boolean => !!e && e.count > 0 && e.level >= MAX_CREW_LV;
export const crewTotal = (s: CrewState = crewState): number => CREW_ORDER.reduce((n, id) => n + (s[id]?.count ?? 0), 0);
export const crewCap = (ship: ShipId): number => SHIP_CAP[ship];
/** Starting crew: 2 figures of the chosen type at Lv 1, or 2 musketeers. */
export const startCrew = (id: CrewId | null): CrewState => ({ [id ?? 'musket']: { count: 2, level: 1 } });
/** Cheap number that changes whenever the figures on deck change (for change detection, no allocation). */
export const crewHash = (s: CrewState = crewState): number => CREW_ORDER.reduce((h, id) => h * 31 + (s[id] ? s[id].count * 8 + s[id].level : 0), 7) % 2147483647;
export function resetCrew(from: CrewState): void {
  for (const k of Object.keys(crewState)) delete crewState[k as CrewId];
  for (const [k, v] of Object.entries(from)) crewState[k as CrewId] = { ...v };
}

export interface CrewFx { autoRate: number; activeCd: number; spellCd: number; hp: number; speed: number; range: number; gold: number; taken: number; nitro: number; pull: number; blast: number; vision: number }
/** Everything crew changes in the ship's stats, as multipliers (add for hp, vision). */
export function crewFx(s: CrewState = crewState): CrewFx {
  const n = (id: CrewId, per: number): number => (s[id] ? s[id].count * per * lvK(s[id].level) : 0);
  const cut = (id: CrewId, per: number): number => Math.min(FX.capCut, n(id, per));
  return {
    autoRate: 1 - cut('gunner', FX.gunner.cut), activeCd: 1 - cut('monkey', FX.monkey.cut),
    spellCd: (1 - cut('mate', FX.mate.cut)) * (isAdv(s.mate) ? FX.mate.adv : 1),
    hp: Math.round(n('cook', FX.cook.hp)), speed: 1 + n('navigator', FX.navigator.spd), range: 1 + Math.min(FX.capRange, n('look', FX.look.range)),
    gold: 1 + n('quart', FX.quart.gold), taken: isAdv(s.carp) ? 1 - FX.carp.taken : 1, nitro: isAdv(s.navigator) ? FX.navigator.nitro : 1,
    pull: isAdv(s.quart) ? FX.quart.pull : 1, blast: isAdv(s.monkey) ? FX.monkey.blast : 1, vision: isAdv(s.look) ? FX.look.vision : 0,
  };
}

/** The headline number of a crew type for card lines and tooltips (label = stat label key, English source text). */
export interface CrewStat { label: string; dec: number; pre?: string; suf?: string; val: (e: CrewEntry) => number }
const pct = (v: number): number => Math.round(v * 1000) / 10;
const one = (id: CrewId, f: (x: CrewFx) => number) => (e: CrewEntry): number => f(crewFx({ [id]: e }));
export const CREW_STAT: Record<CrewId, CrewStat> = {
  musket: { label: 'Volley damage', dec: 0, val: e => e.count * musketDmg(e.level) * (e.level >= MAX_CREW_LV ? FX.musket.advMul : 1) },
  boarder: { label: 'Boarding damage', dec: 0, val: e => e.count * FX.boarder.dmg * lvK(e.level) },
  carp: { label: 'Repair', dec: 1, suf: '/s', val: e => e.count * FX.carp.hps * lvK(e.level) },
  gunner: { label: 'Auto cooldown', dec: 0, suf: '%', val: e => -pct(1 - one('gunner', x => x.autoRate)(e)) },
  look: { label: 'Weapon range', dec: 0, pre: '+', suf: '%', val: e => pct(one('look', x => x.range)(e) - 1) },
  surgeon: { label: 'Heal per 12 s', dec: 1, suf: '%', val: e => pct(e.count * FX.surgeon.frac * lvK(e.level)) },
  cook: { label: 'Max HP', dec: 0, pre: '+', val: one('cook', x => x.hp) },
  quart: { label: 'Gold bonus', dec: 0, pre: '+', suf: '%', val: e => pct(one('quart', x => x.gold)(e) - 1) },
  navigator: { label: 'Speed and turn', dec: 0, pre: '+', suf: '%', val: e => pct(one('navigator', x => x.speed)(e) - 1) },
  monkey: { label: 'Ability cooldown', dec: 0, suf: '%', val: e => -pct(1 - one('monkey', x => x.activeCd)(e)) },
  mate: { label: 'Spell cooldown', dec: 0, suf: '%', val: e => -pct(1 - one('mate', x => x.spellCd)(e)) },
};
