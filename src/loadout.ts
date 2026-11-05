// Ship and captain definitions plus the current loadout. Dependency-free so content.ts (deriveStats) can read it.
import { MODS, MOD_IDS, ModuleId, Slot } from './modules';
import { RelicId, CrewId, isRelicId, isCrewId } from './relics';
export type ShipId = 'sloop' | 'galleon' | 'frigate';
import { CAPTAINS, CAP0, CaptainId } from './roster';
import { isUnlocked, modInPool, seaOpen, heatUnlocked } from './meta';
import { isSea } from './seas';
export { CAPTAINS };
export type { CaptainId, CaptainDef } from './roster';

export interface ShipDef { id: ShipId; name: string; blurb: string; hp: number; speed: number; turn: number; balls: number; ram: number; start: ModuleId[]; slots: Record<Slot, number>; length: number; beam: number }
export const SHIPS: Record<ShipId, ShipDef> = {
  sloop: { id: 'sloop', name: 'Sloop', blurb: 'Small and quick. Starts with a Bow Chaser.', hp: 70, speed: 11, turn: 1.3, balls: 1, ram: 1, start: ['broadside', 'chaser'], slots: { bow: 1, side: 1, deck: 0, stern: 1 }, length: 5.2, beam: 2.0 },
  galleon: { id: 'galleon', name: 'Galleon', blurb: 'Balanced all-rounder.', hp: 100, speed: 9, turn: 1, balls: 2, ram: 1, start: ['broadside'], slots: { bow: 1, side: 1, deck: 1, stern: 1 }, length: 6.4, beam: 2.4 },
  frigate: { id: 'frigate', name: 'Frigate', blurb: 'Heavy and slow. Rams hit 50% harder.', hp: 150, speed: 7.5, turn: 0.8, balls: 3, ram: 1.5, start: ['broadside'], slots: { bow: 1, side: 2, deck: 1, stern: 1 }, length: 7.6, beam: 2.5 },
};

export const SHIP_IDS = Object.keys(SHIPS) as ShipId[];
export const CAPTAIN_IDS = Object.keys(CAPTAINS) as CaptainId[];

/** Hull-relative gameplay geometry. Constants were tuned on the 6.4 x 2.4 galleon, so they scale with length and beam. */
export function shipGeo(d: ShipDef) {
  const k = d.length / 6.4, b = d.beam / 2.4;
  return {
    len: d.length, beam: d.beam,
    r: 1.7 * k, hit: 1.6 * k, contact: 1.5 * k, // collision, enemy-shot hit and enemy-contact radii
    seaF: 3.0 * k, seaS: 1.2 * b, // wave-pose sample distances (bow/stern, port/starboard)
    wakeBack: 2.6 * k, wakeSide: 0.8 * b, spray: 3.1 * k, arcIn: 2.2 * k,
    flank: 1 * b, volley: 2.8 * k, chaserAt: 3 * k, chaserMuzzle: 3.4 * k, kegBack: 2.8 * k, // weapon mount positions
  };
}

/** Optional loadout picks beyond ship and captain; null = default. `sea` is the chosen sea (index into SEAS, from the Sea Chart), `heat` its difficulty level (0-5). */
export interface Extras { startModule: ModuleId | null; relic: RelicId | null; crew: CrewId | null; sea: number; heat: number }
export const NO_EXTRAS: Extras = { startModule: null, relic: null, crew: null, sea: 0, heat: 0 };

export const L = { ship: 'galleon' as ShipId, captain: 'salt' as CaptainId, def: SHIPS.galleon, cap: CAPTAINS.salt, geo: shipGeo(SHIPS.galleon), ...NO_EXTRAS };
export function setLoadout(ship: ShipId, captain: CaptainId, x?: Partial<Extras>): void {
  L.ship = ship; L.captain = captain; L.def = SHIPS[ship]; L.cap = CAPTAINS[captain]; L.geo = shipGeo(L.def);
  if (x) Object.assign(L, { ...NO_EXTRAS, ...x });
}

/** The ship's start modules, Morwen's module first claiming its slot, then the chosen start module replaces a default in its slot (or is added when the slot has room). */
export function startModules(ship: ShipId, captain: CaptainId, chosen: ModuleId | null): ModuleId[] {
  const caps = SHIPS[ship].slots, extra = CAPTAINS[captain].startMod;
  const defs = [...SHIPS[ship].start];
  const used = (slot: Slot): number => defs.filter(m => MODS[m].slot === slot).length + (extra && MODS[extra].slot === slot && !defs.includes(extra) ? 1 : 0);
  if (chosen && !defs.includes(chosen) && chosen !== extra) {
    const slot = MODS[chosen].slot;
    if (used(slot) < caps[slot]) defs.push(chosen);
    else { const i = defs.findIndex(m => MODS[m].slot === slot); if (i >= 0) defs[i] = chosen; }
  }
  if (extra && !defs.includes(extra) && used(MODS[extra].slot) <= caps[MODS[extra].slot]) defs.push(extra);
  return defs;
}
/** Modules offered as the starting module: unlocked, in the pool, and their slot exists on the ship and isn't taken by Morwen's module (a default start in that slot gets replaced). */
export function startModuleOptions(ship: ShipId, captain: CaptainId): ModuleId[] {
  const extra = CAPTAINS[captain].startMod, caps = SHIPS[ship].slots;
  return MOD_IDS.filter(id => {
    if (!modInPool(id)) return false;
    const slot = MODS[id].slot, taken = extra && MODS[extra].slot === slot && extra !== id ? 1 : 0;
    return caps[slot] - taken > 0;
  });
}
/** Drops picks that are locked, invalid or unavailable for this ship and captain. */
export function sanitizeExtras(ship: ShipId, captain: CaptainId, x?: Partial<Record<keyof Extras, unknown>>): Extras {
  const sm = x?.startModule, r = x?.relic, c = x?.crew, sea = x?.sea, h = x?.heat;
  const sOk = isSea(sea) && seaOpen(sea) ? sea : 0;
  return {
    startModule: typeof sm === 'string' && startModuleOptions(ship, captain).includes(sm as ModuleId) && !SHIPS[ship].start.includes(sm as ModuleId) ? sm as ModuleId : null,
    relic: isRelicId(r) && isUnlocked('relic:' + r) ? r : null,
    crew: isCrewId(c) && isUnlocked('crew:' + c) ? c : null,
    sea: sOk,
    heat: typeof h === 'number' && Number.isInteger(h) && h > 0 ? Math.min(h, heatUnlocked(sOk)) : 0,
  };
}

/** Base numbers after ship and captain, before level-up and harbor bonuses. Used by deriveStats and the select cards. */
export function baseStats(ship: ShipId, captain?: CaptainId) {
  const s = SHIPS[ship], c = captain ? CAPTAINS[captain] : CAP0;
  return { hp: s.hp * c.hp, speed: s.speed * c.speed, turn: s.turn * c.turn, balls: s.balls, cd: c.cd, gold: c.gold, ram: s.ram * c.ram, contact: c.contact, enemyHp: c.enemyHp, activeCd: c.activeCd, autoDmg: c.autoDmg, dmg: c.dmg, taken: c.taken, autoRate: c.autoRate,
    fullSpd: c.fullSpd, fullCd: c.fullCd, lucky: c.lucky, wobble: c.wobble, healKill: c.healKill, healEat: c.healEat, regen: c.regen, ignite: c.ignite, heal: c.heal, xp: c.xp };
}

const KEY = 'broadside.loadout';
export function loadSaved(): { ship: ShipId; captain: CaptainId } & Extras {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { ship?: string; captain?: string };
    const ship = (o.ship && o.ship in SHIPS && isUnlocked('ship:' + o.ship) ? o.ship : 'galleon') as ShipId;
    const captain = (o.captain && o.captain in CAPTAINS && isUnlocked('cap:' + o.captain) ? o.captain : 'salt') as CaptainId;
    return { ship, captain, ...sanitizeExtras(ship, captain, o as Record<string, unknown>) };
  } catch { return { ship: 'galleon', captain: 'salt', ...NO_EXTRAS }; }
}
/** `heat` may be left out: the saved heat is kept. */
export function saveLoadout(ship: ShipId, captain: CaptainId, x: Omit<Extras, 'heat'> & { heat?: number } = NO_EXTRAS): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ship, captain, ...x, heat: x.heat ?? loadSaved().heat })); } catch { /* storage unavailable */ }
}
