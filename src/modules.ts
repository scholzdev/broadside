import type { ArcId } from './content';
import { MODS3 } from './modules3';

// Pure module data and helpers (no game state). Per-run state lives in G.modules (ownership) and G.modStats (numbers + track levels, see modstats.ts).
export type Slot = 'bow' | 'side' | 'deck' | 'stern';
export type ModuleId = 'broadside' | 'chaser' | 'mortar' | 'kegs' | 'ram' | 'boarding' | 'witch' | 'siphon' | 'ward' | 'lantern'
  | 'harpoon' | 'carronade' | 'rockets' | 'net' | 'crowsnest' | 'pump'
  | 'swivel' | 'chain' | 'firearrows' | 'bombketch' | 'tesla' | 'gatling' | 'sharkcage' | 'spyglass' | 'magnet';
export const SLOT_ORDER: Slot[] = ['bow', 'side', 'deck', 'stern'];
export const MAX_MOD_LV = 8, PLUS_LV = 4;
const D = Math.PI / 180;

export interface ModuleDef {
  id: ModuleId; name: string; slot: Slot; color: number; abbr: string; info: string;
  /** Fire arcs the auto uses (none: passive or timer-driven). */
  arcs: ArcId[]; arcHalf?: number;
  auto: { dmg: number; range: number; cooldown: number; speed: number };
  active: { name: string; cd: number; dmg?: number; text: string; plus: string };
}
export const MODS: Record<ModuleId, ModuleDef> = {
  broadside: { id: 'broadside', name: 'Broadside Cannons', slot: 'side', color: 0xffd36a, abbr: 'BS', arcs: ['port', 'starboard'], info: 'A volley of balls from each flank.',
    auto: { dmg: 8, range: 14, cooldown: 1.6, speed: 22 },
    active: { name: 'Full Broadside', cd: 12, dmg: 16, text: 'Both sides fire 3 rapid volleys at x2 damage.', plus: '5 volleys instead of 3.' } },
  chaser: { id: 'chaser', name: 'Bow Chaser', slot: 'bow', color: 0xff8a5a, abbr: 'BC', arcs: ['bow'], info: 'A single fast shot straight ahead.',
    auto: { dmg: 12, range: 18, cooldown: 1.0, speed: 32 },
    active: { name: 'Heated Shot', cd: 10, dmg: 120, text: 'A red-hot ball pierces everything along a 30 u line and ignites it.', plus: '+1 extra shot, fanned +/-8 degrees.' } },
  mortar: { id: 'mortar', name: 'Deck Mortar', slot: 'deck', color: 0xffffff, abbr: 'DM', arcs: ['deck'], info: 'Lobs a shell at any target (360 degrees), splash radius 3.',
    auto: { dmg: 15, range: 16, cooldown: 3, speed: 14 },
    active: { name: 'Barrage', cd: 25, dmg: 30, text: '8 shells over 1.5 s on the densest enemy cluster within 22 u (r3).', plus: '14 shells.' } },
  kegs: { id: 'kegs', name: 'Powder Kegs', slot: 'stern', color: 0xc9743a, abbr: 'PK', arcs: ['stern'], info: 'Drops floating kegs astern; splash radius 3.5.',
    auto: { dmg: 25, range: 14, cooldown: 2.5, speed: 0 },
    active: { name: 'Powder Trail', cd: 20, text: 'A burning trail behind the ship for 4 s; enemies crossing it burn.', plus: 'Trail lasts 7 s and is wider.' } },
  ram: { id: 'ram', name: 'Iron Ram', slot: 'bow', color: 0xb9c0c8, abbr: 'IR', arcs: [], info: 'Passive: ram damage +60% and 20% less contact damage taken.',
    auto: { dmg: 0, range: 0, cooldown: 0, speed: 0 },
    active: { name: 'Ramming Speed', cd: 12, text: '0.8 s dash at x2.2 speed, immune to contact damage, ram damage x3, knocks enemies aside.', plus: '1.2 s dash that ends with a 40 dmg, r5 shockwave.' } },
  boarding: { id: 'boarding', name: 'Boarding Party', slot: 'side', color: 0x9fd18b, abbr: 'BP', arcs: [], info: 'Every 10 s launches a longboat that chases the nearest enemy (15 dps for 6 s).',
    auto: { dmg: 15, range: 40, cooldown: 10, speed: 12 },
    active: { name: 'Boarders Away', cd: 35, dmg: 15, text: '5 longboats launch at once.', plus: 'Longboats last 10 s.' } },
  witch: { id: 'witch', name: 'Sea Witch', slot: 'deck', color: 0xb58cff, abbr: 'SW', arcs: [], info: 'Chain lightning every 2.5 s: 12 dmg, jumps to 3 targets.',
    auto: { dmg: 12, range: 16, cooldown: 2.5, speed: 0 },
    active: { name: 'Storm Call', cd: 30, dmg: 60, text: '8 lightning strikes on random enemies within 25 u.', plus: '14 strikes, each stuns for 1 s.' } },
  siphon: { id: 'siphon', name: 'Greek Fire Siphon', slot: 'side', color: 0xff7a2a, abbr: 'GF', arcs: ['port', 'starboard'], arcHalf: 45 * D, info: 'Short fire cone (8 u) on both sides every 1.2 s that ignites.',
    auto: { dmg: 6, range: 8, cooldown: 1.2, speed: 0 },
    active: { name: 'Flame Wall', cd: 30, text: 'A 3 s sweep of fire around the ship, radius 7, burns everything.', plus: 'Radius 10.' } },
  ward: { id: 'ward', name: 'Ward Charm', slot: 'bow', color: 0x7fd0ff, abbr: 'WC', arcs: [], info: 'Every 6 s deletes 1 enemy projectile within 10 u.',
    auto: { dmg: 0, range: 10, cooldown: 6, speed: 0 },
    active: { name: 'Ward', cd: 25, text: 'Deletes all enemy projectiles within 18 u, then 2 s of 80% damage reduction.', plus: 'Also pushes enemies back and deals 30 dmg.' } },
  lantern: { id: 'lantern', name: 'Fog Lantern', slot: 'stern', color: 0xd9e4ea, abbr: 'FL', arcs: [], info: 'Enemies more than 12 u away lose track of you 15% of the time.',
    auto: { dmg: 0, range: 12, cooldown: 0, speed: 0 },
    active: { name: 'Vanish', cd: 16, text: 'Blink 14 u forward (island-safe), leave a fog puff; the next auto volley deals x2.', plus: '2 charges.' } },
  harpoon: { id: 'harpoon', name: 'Harpoon Gun', slot: 'bow', color: 0xd9b26a, abbr: 'HG', arcs: ['bow'], info: 'Fires a harpoon straight ahead (18 dmg) that slows its target by 30% for 1 s.',
    auto: { dmg: 18, range: 20, cooldown: 1.8, speed: 30 },
    active: { name: 'Reel In', cd: 16, text: 'Harpoons up to 3 enemies within 25 u, pulls them to the ship and stuns them for 1 s.', plus: 'Up to 5 targets.' } },
  carronade: { id: 'carronade', name: 'Carronade', slot: 'side', color: 0xd8a24a, abbr: 'CR', arcs: ['port', 'starboard'], info: 'A heavy short-range shot (20 dmg, range 9) from each flank that shoves enemies back.',
    auto: { dmg: 20, range: 9, cooldown: 2, speed: 20 },
    active: { name: 'Grapeshot', cd: 14, dmg: 10, text: 'A cone of 12 pellets (10 dmg each) bursts from both sides.', plus: '20 pellets per side.' } },
  rockets: { id: 'rockets', name: 'Rocket Rack', slot: 'deck', color: 0xff5a3a, abbr: 'RR', arcs: ['deck'], info: 'Launches a homing rocket (10 dmg) at any target (360 degrees).',
    auto: { dmg: 10, range: 20, cooldown: 2, speed: 15 },
    active: { name: 'Salvo', cd: 22, dmg: 10, text: '12 homing rockets launched over 0.7 s.', plus: '20 rockets.' } },
  net: { id: 'net', name: 'Net Thrower', slot: 'stern', color: 0xd0a050, abbr: 'NT', arcs: ['stern'], info: 'Every 3 s throws a net astern that slows enemies 40% for 2 s.',
    auto: { dmg: 0, range: 14, cooldown: 3, speed: 0 },
    active: { name: 'Drag Net', cd: 20, text: 'Everything within 12 u is slowed 60% for 3 s; crates, boats and orbs are pulled in.', plus: 'Radius 18.' } },
  crowsnest: { id: 'crowsnest', name: "Crow's Nest", slot: 'deck', color: 0x6ab0e0, abbr: 'CN', arcs: [], info: 'A sniper shot (30 dmg) every 3 s at the highest-HP enemy within 28 u (360 degrees).',
    auto: { dmg: 30, range: 28, cooldown: 3, speed: 0 },
    active: { name: 'Headshot', cd: 25, dmg: 300, text: '300 damage to the strongest enemy within 40 u (bosses take 150).', plus: 'Also stuns the target for 1.5 s.' } },
  pump: { id: 'pump', name: 'Bilge Pump', slot: 'stern', color: 0x7fc8ff, abbr: 'BP', arcs: [], info: 'Passive: +1 HP/s while below 50% HP.',
    auto: { dmg: 0, range: 0, cooldown: 0, speed: 0 },
    active: { name: 'Emergency Pump', cd: 30, text: 'Heals 25% of max HP and cleanses burn and slow.', plus: 'Also 50% damage reduction for 3 s.' } },
  ...MODS3,
};
export const MOD_IDS = Object.keys(MODS) as ModuleId[];

/** An owned module. Its stats and levels are G.modStats[id]. Each charge recharges on a shared cooldown (cd counts down while charges < maxCharges). */
export interface Owned { id: ModuleId; slot: Slot; idx: number; cd: number; cdMax: number; charges: number; maxCharges: number; timer: number }



/** Remaining mounts per slot given the ship's capacities and what is owned. */
export function freeSlots(caps: Record<Slot, number>, owned: { slot: Slot }[]): Record<Slot, number> {
  const out = { ...caps };
  for (const o of owned) out[o.slot]--;
  return out;
}
/** Lowest unused index in a slot, or -1 when full. */
export function freeIdx(caps: Record<Slot, number>, owned: Owned[], slot: Slot): number {
  for (let i = 0; i < caps[slot]; i++) if (!owned.some(o => o.slot === slot && o.idx === i)) return i;
  return -1;
}
