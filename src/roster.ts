// Captain roster data (dependency-free). Multipliers are 1 when neutral; see loadout.baseStats / content.deriveStats for how they are used.
export type CaptainId = 'salt' | 'rosa' | 'bess' | 'tom' | 'corvo' | 'hana' | 'morwen' | 'flint' | 'gwen' | 'dorian'
  | 'thorne' | 'isabeau' | 'driftwood' | 'goldtooth' | 'cass' | 'brick' | 'ines' | 'ghost' | 'hal' | 'coral';

export interface CaptainDef {
  id: CaptainId; name: string; up: string; down: string;
  hp: number; speed: number; cd: number; gold: number; enemyHp: number; ram: number; contact: number;
  activeCd: number; autoDmg: number; dmg: number; taken: number; autoRate: number;
  /** Full Sail: speed factor and cooldown x. */
  fullSpd: number; fullCd: number;
  /** Chance of double damage, free rerolls per level-up, steering wobble amount. */
  lucky: number; freeRoll: number; wobble: number;
  /** HP per kill / per edible, regen x, share of max HP mended after each act boss. */
  healKill: number; healEat: number; regen: number; repair: number;
  /** All player hits ignite and burning enemies spread fire. */
  ignite: boolean;
  /** v7 passives: turn x, enemy speed x, shop price x, doubloons x, XP x, crew-card level x, healing x, pickup radius x. */
  turn: number; enemySpd: number; shop: number; doubloons: number; xp: number; crewX: number; heal: number; pickup: number;
  /** Damage x near an island, share of enemy balls that pass through, bow range x, bow hits slow, side module damage x, summon dps x, extra longboats per launch. */
  isleDmg: number; ghost: number; bowRange: number; bowSlow: boolean; sideDmg: number; summonDps: number; summonPlus: number;
  /** Thorne: kills per +1 max HP (cap 100). Driftwood: seconds cut from the Full Sail cooldown per crate / hut. Coral: heal 1 HP per module every 5 s. */
  hpKills: number; eatCd: number; modRegen: boolean;
  /** Module granted at the start when a deck slot is free. */
  startMod?: 'witch';
}
export const CAP0 = { hp: 1, speed: 1, cd: 1, gold: 1, enemyHp: 1, ram: 1, contact: 1, activeCd: 1, autoDmg: 1, dmg: 1, taken: 1, autoRate: 1,
  fullSpd: 1.5, fullCd: 1, lucky: 0, freeRoll: 0, wobble: 0, healKill: 0, healEat: 0, regen: 1, repair: 0.5, ignite: false,
  turn: 1, enemySpd: 1, shop: 1, doubloons: 1, xp: 1, crewX: 1, heal: 1, pickup: 1, isleDmg: 1, ghost: 0, bowRange: 1, bowSlow: false, sideDmg: 1, summonDps: 1, summonPlus: 0, hpKills: 0, eatCd: 0, modRegen: false };
const c = (id: CaptainId, name: string, up: string, down: string, o: Partial<CaptainDef>): CaptainDef => ({ ...CAP0, id, name, up, down, ...o });

export const CAPTAINS: Record<CaptainId, CaptainDef> = {
  salt: c('salt', 'Old Salt', '+10% max HP', '', { hp: 1.1 }),
  rosa: c('rosa', 'Racer Rosa', 'Boost 50% faster, nitro recharge -30%', '-15% max speed', { fullSpd: 2.25, fullCd: 0.7, speed: 0.85 }),
  bess: c('bess', 'Iron Bess', 'Ram damage x2, contact damage taken x0.5', '-10% max speed', { ram: 2, contact: 0.5, speed: 0.9 }),
  tom: c('tom', 'Tankard Tom', 'Lucky: 20% double damage, free reroll each level-up', 'Steering wobbles', { lucky: 0.2, freeRoll: 1, wobble: 0.25 }),
  corvo: c('corvo', 'Count Corvo', 'Heal 2 HP per kill, 1 per edible eaten', 'No regen; no repair after bosses', { healKill: 2, healEat: 1, regen: 0, repair: 0 }),
  hana: c('hana', 'Hawkeye Hana', 'Autos fire 40% faster', 'Active cooldowns +40%', { autoRate: 1 / 1.4, activeCd: 1.4 }),
  morwen: c('morwen', 'Morwen the Sea Witch', 'Active cooldowns -35%, starts with Sea Witch', '-25% auto damage', { activeCd: 0.65, autoDmg: 0.75, startMod: 'witch' }),
  flint: c('flint', 'Firebrand Flint', 'All hits ignite, burning foes spread fire on touch', '-20% max HP', { ignite: true, hp: 0.8 }),
  gwen: c('gwen', 'Greedy Gwen', '+40% gold', 'Enemies have +15% HP', { gold: 1.4, enemyHp: 1.15 }),
  dorian: c('dorian', 'Duelist Dorian', '+30% damage dealt', '+30% damage taken', { dmg: 1.3, taken: 1.3 }),
  thorne: c('thorne', 'Admiral Thorne', '+1 max HP per 3 kills this run (cap +100)', 'Regen -50%', { hpKills: 3, regen: 0.5 }),
  isabeau: c('isabeau', 'Queen Isabeau', 'Summons: +1 longboat each time, +50% summon dps', '-10% max speed', { summonPlus: 1, summonDps: 1.5, speed: 0.9 }),
  driftwood: c('driftwood', 'Old Driftwood', 'Eating crates and huts cuts the Full Sail cooldown by 1 s', '-10% auto damage', { eatCd: 1, autoDmg: 0.9 }),
  goldtooth: c('goldtooth', 'Baron Goldtooth', 'Doubloons earned x1.5', 'Shop prices +30%', { doubloons: 1.5, shop: 1.3 }),
  cass: c('cass', 'Clockwork Cass', '+30% XP, ship +15% speed and turn', 'Enemies +10% speed', { xp: 1.3, speed: 1.15, turn: 1.15, enemySpd: 1.1 }),
  brick: c('brick', 'Bosun Brick', 'Crew cards count double', '-10% max HP', { crewX: 2, hp: 0.9 }),
  ines: c('ines', 'Cartographer Ines', '+30% damage within 12 u of an island, +50% pickup radius', '-15% max HP', { isleDmg: 1.3, pickup: 1.5, hp: 0.85 }),
  ghost: c('ghost', "Saltbeard's Ghost", '25% of enemy cannonballs pass through harmlessly', 'Healing -50%', { ghost: 0.25, heal: 0.5 }),
  hal: c('hal', 'Harpoon Hal', 'Bow modules +30% range; bow hits slow 30% for 1 s', 'Side modules -15% damage', { bowRange: 1.3, bowSlow: true, sideDmg: 0.85 }),
  coral: c('coral', 'Mama Coral', 'Heal 1 HP every 5 s per owned module', 'Enemies +10% damage', { modRegen: true, taken: 1.1 }),
};
