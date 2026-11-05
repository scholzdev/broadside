import type { CaptainId } from './roster';

// ---- captain signature spells: data table (names, cooldowns, texts). Numbers are mirrored in spells.ts casts. Dependency-free. ----
/** `aimed` spells use the mouse aim point (clamped to `maxRange` from the ship); `radius` sizes the reticle. */
export interface SpellDef { name: string; cd: number; color: number; text: string; aimed?: boolean; maxRange?: number; radius?: number }
export const SPELLS: Record<CaptainId, SpellDef> = {
  salt: { name: 'Patch Up', cd: 30, color: 0x5adf7a, text: 'Heal 30% max HP over 3 s' },
  rosa: { name: 'Tailwind', cd: 18, color: 0x9fe6ff, text: 'Refills the nitro meter, then 4 s of +60% speed and immunity to contact damage' },
  bess: { name: 'Iron Hull', cd: 25, color: 0xaab6c4, text: '4 s of -70% damage taken; rammed enemies take x2 damage' },
  tom: { name: 'Lucky Barrel', cd: 20, color: 0xe8a23a, text: 'Lob a barrel at the mouse aim (max 18 u, else 12 u ahead): 40% blast (80 dmg), 30% +15 gold, 30% heal 25', aimed: true, maxRange: 18, radius: 7 },
  corvo: { name: 'Blood Tithe', cd: 22, color: 0xd02048, text: '20 dmg to every enemy within 15 u; heal 50% of the damage dealt' },
  hana: { name: 'Dead Eye', cd: 20, color: 0xff6a3a, text: '5 s: autos deal x2 and pierce +2' },
  morwen: { name: 'Maelstrom', cd: 28, color: 0x4aa8d8, text: 'Whirlpool at the mouse aim (max 18 u, else 10 u ahead) for 5 s: pulls enemies in, 25 dps, brief stun (bosses only slowed)', aimed: true, maxRange: 18, radius: 8 },
  flint: { name: 'Firebomb', cd: 14, color: 0xff7a1a, text: 'Lob at the mouse aim (max 20 u, else 12 u ahead): 60 dmg blast, then a 4 s burning fire pool', aimed: true, maxRange: 20, radius: 6 },
  gwen: { name: 'Plunder', cd: 25, color: 0xffd84a, text: 'Everything within 30 u flies to your ship; gold x2 for 6 s' },
  dorian: { name: 'Riposte', cd: 16, color: 0xffcf5a, text: '1.5 s: all damage negated, enemy shots reflected back' },
  thorne: { name: 'Rally the Guns', cd: 30, color: 0xe0b040, text: 'Every module ability cooldown -3 s now; autos fire at -50% cooldown for 4 s' },
  isabeau: { name: 'Royal Escort', cd: 35, color: 0xb070e0, text: '3 friendly escort sloops orbit and fire at enemies for 10 s' },
  driftwood: { name: 'Flotsam Shield', cd: 20, color: 0xb08a58, text: 'A debris ring absorbs the next 40 damage (max 8 s)' },
  goldtooth: { name: 'Bribe', cd: 25, color: 0xffd84a, text: 'Non-boss enemies within 18 u stop attacking and moving for 4 s' },
  cass: { name: 'Time Stop', cd: 35, color: 0x9fd8ff, text: 'Enemies and enemy projectiles freeze for 3 s' },
  brick: { name: 'All Hands', cd: 30, color: 0xe0883a, text: 'Auto cooldowns -50% for 6 s' },
  ines: { name: 'Treasure Sense', cd: 30, color: 0xf0c050, text: '6 treasure crates (5 gold each) appear around the ship' },
  ghost: { name: 'Phantom Ship', cd: 22, color: 0x9fe8d8, text: '3 s ethereal: immune, sail through enemies for 20 dmg each' },
  hal: { name: 'Harpoon', cd: 16, color: 0xc0d0e0, text: 'Biggest enemy near the mouse aim within 25 u (boss first) takes 100 dmg, is pulled 8 u to you and stunned 1.5 s', aimed: true, maxRange: 25, radius: 3 },
  coral: { name: 'Hex', cd: 24, color: 0xb050d0, text: 'Enemies within 16 u of the mouse aim (max 14 u from you, else on you) take +50% damage for 6 s', aimed: true, maxRange: 14, radius: 16 },
};

/** Live spell effect timers (seconds left) read by weapons, game, enemies, ship, edibles. tint/tintI drive the ship's emissive sheen. */
export const SP = { dead: 0, iron: 0, tail: 0, rip: 0, plunder: 0, tint: 0, tintI: 0, rally: 0, hands: 0, flot: 0, phantom: 0, stop: 0 };
export const clearSP = (): void => { for (const k of Object.keys(SP) as (keyof typeof SP)[]) SP[k] = 0; };
/** Auto cooldown tick speed: Rally the Guns and All Hands halve auto cooldowns. */
export const autoK = (): number => (SP.rally > 0 || SP.hands > 0 ? 2 : 1);
