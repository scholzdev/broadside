import type { ModuleDef } from './modules';

// v10: nine more modules (swivel .. magnet). Pure data, spread into MODS. Numbers live in modstats3.ts; behaviour in weapons3 / autos3 / actives3 / sharks.
const D = Math.PI / 180;
export const MODS3 = {
  swivel: { id: 'swivel', name: 'Swivel Gun', slot: 'bow', color: 0xe0c070, abbr: 'SG', arcs: ['bow'], info: 'Rapid small shots (4 dmg every 0.4 s) straight ahead, slightly inaccurate.',
    auto: { dmg: 4, range: 16, cooldown: 0.4, speed: 30 },
    active: { name: 'Hail of Lead', cd: 14, dmg: 5, text: '30 bullets in a wide fan ahead over 1 s.', plus: '50 bullets.' } },
  chain: { id: 'chain', name: 'Chain-Shot Cannon', slot: 'side', color: 0x9aa4b0, abbr: 'CS', arcs: ['port', 'starboard'], info: 'Chain balls (9 dmg, range 12) cut the sails: the target is slowed 35% for 2.5 s.',
    auto: { dmg: 9, range: 12, cooldown: 2.2, speed: 20 },
    active: { name: 'Dismast', cd: 18, dmg: 20, text: 'Everything within 16 u loses its masts: slowed 60% for 4 s and takes 20 dmg.', plus: 'Also stuns for 1 s.' } },
  firearrows: { id: 'firearrows', name: 'Fire Arrows', slot: 'deck', color: 0xff9a3a, abbr: 'FA', arcs: ['deck'], info: 'Archers loose a flaming arrow (6 dmg) at any target (360 degrees); it ignites.',
    auto: { dmg: 6, range: 18, cooldown: 1.1, speed: 26 },
    active: { name: 'Volley of Flame', cd: 20, dmg: 6, text: '16 flaming arrows fly at random enemies within 22 u.', plus: '28 arrows.' } },
  bombketch: { id: 'bombketch', name: 'Bomb Ketch Mortar', slot: 'stern', color: 0x5a5a66, abbr: 'BK', arcs: ['stern'], info: 'Lobs bombs at targets astern (20 dmg, radius 3.5) that leave a burning patch.',
    auto: { dmg: 20, range: 16, cooldown: 3.5, speed: 14 },
    active: { name: 'Carpet', cd: 22, dmg: 25, text: 'Carpet-bombs your wake with 10 bombs over 1.5 s.', plus: '16 bombs.' } },
  tesla: { id: 'tesla', name: 'Tesla Coil', slot: 'deck', color: 0x6fd8ff, abbr: 'TC', arcs: [], info: 'Every 1.6 s lightning arcs to the nearest enemy (10 dmg), jumps to 2 more and stuns each briefly.',
    auto: { dmg: 10, range: 14, cooldown: 1.6, speed: 0 },
    active: { name: 'Overload', cd: 24, dmg: 40, text: 'A lightning ring bursts out to 14 u: 40 dmg and a 1 s stun to everything inside.', plus: 'Radius 20 and the ring pulses twice.' } },
  gatling: { id: 'gatling', name: 'Gatling Swivel', slot: 'side', color: 0xc9b27a, abbr: 'GS', arcs: ['port', 'starboard'], arcHalf: 50 * D, info: 'Spins up while enemies are in its arc: from one shot per 0.5 s to one per 0.07 s (3 dmg).',
    auto: { dmg: 3, range: 13, cooldown: 0.5, speed: 28 },
    active: { name: 'Bullet Storm', cd: 18, dmg: 4, text: 'For 4 s a spinning stream of bullets sprays all around the ship.', plus: '6 s.' } },
  sharkcage: { id: 'sharkcage', name: 'Shark Cage', slot: 'stern', color: 0x4aa0c0, abbr: 'SC', arcs: [], info: 'Every 7 s releases a shark that hunts the nearest enemy and bites (8 dmg every 0.7 s for 10 s).',
    auto: { dmg: 8, range: 20, cooldown: 7, speed: 0 },
    active: { name: 'Feeding Frenzy', cd: 25, text: 'Releases 5 frenzied sharks that bite twice as fast.', plus: '8 sharks.' } },
  spyglass: { id: 'spyglass', name: 'Spyglass Battery', slot: 'bow', color: 0xd9c98a, abbr: 'SB', arcs: ['bow'], info: 'A slow long-range precision shot (28 dmg, range 34) that hits harder the farther it flies. Your other modules crit 10% for x1.5.',
    auto: { dmg: 28, range: 34, cooldown: 2.6, speed: 55 },
    active: { name: 'Volley Fire', cd: 16, dmg: 30, text: 'Instantly shoots the 5 farthest enemies within 40 u with precision shots.', plus: '8 targets.' } },
  magnet: { id: 'magnet', name: 'Treasure Magnet', slot: 'deck', color: 0xe8c040, abbr: 'TM', arcs: [], info: 'Pulls crates and XP orbs within 14 u toward the ship and adds +1 gold every 4 s while loot is in reach.',
    auto: { dmg: 0, range: 14, cooldown: 4, speed: 0 },
    active: { name: 'Golden Tide', cd: 30, text: 'Crates within 20 u turn to gold (x3 gold) and rush to the ship.', plus: 'Radius 30.' } },
} satisfies Record<string, ModuleDef>;
