// Relic table (dependency-free). One relic can be carried per run; effects are read from L.relic in content.deriveStats, game.ts, ship.ts, spells.ts, status.ts and relicfx.ts.
export type RelicId = 'coin' | 'biscuit' | 'wind' | 'opal' | 'quickmatch' | 'log' | 'kraken' | 'mermaid' | 'storm' | 'map' | 'barnacle' | 'compass'
  | 'cursed' | 'siren' | 'pearl' | 'rum' | 'anchor' | 'ghostlamp' | 'medal' | 'vane';
export interface RelicDef { id: RelicId; name: string; desc: string; cost: number; starter?: boolean }
export const RELICS: Record<RelicId, RelicDef> = {
  coin: { id: 'coin', name: 'Lucky Coin', desc: '+10% gold', cost: 0, starter: true },
  biscuit: { id: 'biscuit', name: "Ship's Biscuit", desc: '+20 max HP', cost: 0, starter: true },
  wind: { id: 'wind', name: 'Second Wind', desc: 'Once per run, when you would sink, revive with 30% HP', cost: 300 },
  opal: { id: 'opal', name: 'Fire Opal', desc: 'Burning enemies take +50% burn damage and spread burn on death', cost: 250 },
  quickmatch: { id: 'quickmatch', name: 'Quickmatch', desc: 'Auto cooldowns -10%', cost: 250 },
  log: { id: 'log', name: "Captain's Log", desc: 'Captain spell cooldown -20%', cost: 300 },
  kraken: { id: 'kraken', name: 'Kraken Tooth', desc: 'Ram damage +60%', cost: 350 },
  mermaid: { id: 'mermaid', name: 'Mermaid Scale', desc: '+15% max speed while above 80% HP', cost: 300 },
  storm: { id: 'storm', name: 'Bottled Storm', desc: 'Every 10th auto shot chains lightning to 2 enemies', cost: 350 },
  map: { id: 'map', name: 'Treasure Map', desc: 'Start the run with 40 gold and 1 extra free reroll', cost: 200 },
  barnacle: { id: 'barnacle', name: 'Barnacle Plating', desc: '-15% contact damage taken and +0.3 HP/s regeneration (none for Count Corvo)', cost: 250 },
  compass: { id: 'compass', name: 'Golden Compass', desc: 'Once per act, the next level-up roll offers only Rare or better upgrade cards', cost: 400 },
  cursed: { id: 'cursed', name: 'Cursed Doubloon', desc: 'Doubloons earned +50%, but -10% max HP', cost: 300 },
  siren: { id: 'siren', name: "Siren's Shell", desc: 'Enemies within 10 u are slowed 15%', cost: 250 },
  pearl: { id: 'pearl', name: 'Pearl of Plenty', desc: 'XP orbs give +25% XP', cost: 250 },
  rum: { id: 'rum', name: 'Rum Flask', desc: 'Casting your captain spell heals 10 HP', cost: 200 },
  anchor: { id: 'anchor', name: 'Iron Anchor', desc: '+40 max HP, -10% max speed', cost: 200 },
  ghostlamp: { id: 'ghostlamp', name: 'Ghost Lantern', desc: 'Sinking enemies explode for 15 damage, radius 3', cost: 300 },
  medal: { id: 'medal', name: "Admiral's Medal", desc: 'Start at level 2 with one extra card pick at the start of the run', cost: 350 },
  vane: { id: 'vane', name: 'Weathervane', desc: 'The wind always counts as a tailwind (+20% speed)', cost: 250 },
};
export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
export const isRelicId = (v: unknown): v is RelicId => typeof v === 'string' && v in RELICS;
export type CrewId = 'musket' | 'boarder' | 'carp' | 'quart' | 'look' | 'gunner' | 'surgeon' | 'navigator' | 'monkey' | 'cook' | 'mate';
export interface CrewDef { id: CrewId; name: string; text: string; cost: number }
/** Crew types: active figures on deck (numbers live in crewdefs.ts). Text = the per-figure effect; the starting crew gives 2 figures at Lv 1. Musketeers and the three originals are free, the rest are bought with doubloons. */
export const CREW: Record<CrewId, CrewDef> = {
  musket: { id: 'musket', name: 'Musketeers', text: 'Each fires a musket shot at the nearest enemy within 14 u every 2.2 s: 4 damage, +1 per level.', cost: 0 },
  boarder: { id: 'boarder', name: 'Boarders', text: 'An enemy that rams or touches you takes 12 damage per boarder.', cost: 250 },
  carp: { id: 'carp', name: 'Carpenters', text: 'Each repairs 0.3 HP/s while the ship has not been hit for 3 s.', cost: 0 },
  quart: { id: 'quart', name: 'Quartermaster', text: 'Each gives +6% gold from all sources.', cost: 0 },
  look: { id: 'look', name: 'Lookout', text: 'Each gives +4% weapon range (at most +50%).', cost: 0 },
  gunner: { id: 'gunner', name: 'Gunners', text: 'Each cuts auto-attack cooldowns by 3% (at most -30%).', cost: 150 },
  surgeon: { id: 'surgeon', name: 'Surgeon', text: 'Each heals 5% max HP every 12 s.', cost: 200 },
  navigator: { id: 'navigator', name: 'Navigator', text: 'Each gives +3% max speed and turn rate.', cost: 150 },
  monkey: { id: 'monkey', name: 'Powder Monkeys', text: 'Each cuts module ability cooldowns by 3% (at most -30%).', cost: 200 },
  cook: { id: 'cook', name: 'Cook', text: 'Each gives +8 max HP.', cost: 150 },
  mate: { id: 'mate', name: 'First Mate', text: 'Each cuts the captain spell cooldown by 4% (at most -30%).', cost: 250 },
};
export const CREW_IDS = Object.keys(CREW) as CrewId[];
export const isCrewId = (v: unknown): v is CrewId => CREW_IDS.includes(v as CrewId);
