// The four seas (v8 biomes): look, hazard, enemy pool, act bosses, scaling, rewards and sea quests.
// Leaf module (type-only imports) so meta.ts can read it while it loads. Names live in i18n under `sea.<id>.*`.
import type { EnemyType } from './content';

export type SeaId = 'calm' | 'reef' | 'fog' | 'volcano';
export type HazardId = 'none' | 'reef' | 'fog' | 'eruption';
export type IslandStyle = 'tropical' | 'coral' | 'rocky' | 'volcanic';
/** Every boss in the game (BOSSES in content.ts, BOSS_LOOKS in fleet.ts). New bosses: add the id here and an entry in both tables. */
export type BossId = 'cutter' | 'manowar' | 'firegalleon' | 'flagship' | 'corsair' | 'manowar_r' | 'pirateking' | 'ghostgalleon' | 'cutter_r' | 'drownedadmiral' | 'firegalleon_r' | 'magma' | 'flagship_r' | MonsterBossId;
/** v8 pass 3b: bosses with a custom model (monsters.ts BOSS_MODELS) instead of a ship look. */
export type MonsterBossId = 'leviathan' | 'lighthouse' | 'ashleviathan';
export const BOSS_IDS: BossId[] = ['cutter', 'manowar', 'firegalleon', 'flagship', 'corsair', 'manowar_r', 'pirateking', 'ghostgalleon', 'cutter_r', 'drownedadmiral', 'firegalleon_r', 'magma', 'flagship_r', 'leviathan', 'lighthouse', 'ashleviathan'];

/** Linear-ish hex colours. Sea: shader colours. Lights: hemisphere sky/ground, sun, rim. Post: exposure, saturation, shadow/highlight grade. */
export interface SeaPalette {
  deep: number; mid: number; shallow: number; foam: number; line: number; coral: number;
  bg: number; sky: number; ground: number; hemi: number; sun: number; sunI: number; rim: number; rimI: number;
  exposure: number; sat: number; lo: [number, number, number]; hi: [number, number, number];
}
/** One spawn-table row: enemy type, weight, and the act time (s) from which it appears. */
export type PoolRow = [EnemyType, number, number];

/** Sea quest: reach `n` on the per-run counter `stat` in one run of this sea; `unless` = a counter that must stay 0; `maxTime` = run time limit (s). */
export interface SeaQuest { id: string; stat: string; n: number; reward: number; unless?: string; maxTime?: number }

export interface SeaDef {
  id: SeaId; hazard: HazardId; style: IslandStyle; difficulty: number; pal: SeaPalette;
  /** Island chance per 80 u world cell, islands per cell, radius range. */
  islands: { chance: number; per: number; r: [number, number] };
  /** Spawn pool per act (index 0 = act 1). */
  pools: PoolRow[][];
  /** Boss per act (ids, never act indices). Placeholders for pass 3b: reef act 2 leviathan, fog act 2 lighthouse, volcano act 3 ashleviathan. */
  bosses: [BossId, BossId, BossId, BossId];
  hpMul: number; dmgMul: number; dblMul: number;
  quests: SeaQuest[];
}

// Sea 1 reproduces the original spawner exactly: rafts after 25 s, brigs from act 2 (or after 60 s), ketches from act 3.
const CALM: PoolRow[][] = [
  [['gunboat', 1, 0], ['raft', 0.5, 25], ['brig', 0.35, 60]],
  [['gunboat', 1, 0], ['raft', 0.5, 25], ['brig', 0.35, 0]],
  [['gunboat', 1, 0], ['raft', 0.5, 25], ['brig', 0.35, 0], ['ketch', 0.3, 0]],
  [['gunboat', 1, 0], ['raft', 0.5, 25], ['brig', 0.35, 0], ['ketch', 0.3, 0]],
];

export const SEAS: SeaDef[] = [
  {
    id: 'calm', hazard: 'none', style: 'tropical', difficulty: 1,
    pal: { deep: 0x0f5c84, mid: 0x1d93b6, shallow: 0x4cdccb, foam: 0xf2fbff, line: 0xc8f4ff, coral: 0xff8a7a, bg: 0x2b7d9a, sky: 0xc4e4ff, ground: 0x1f5a6c, hemi: 1.35, sun: 0xffe1b4, sunI: 3.0, rim: 0x8cb8ff, rimI: 0.55, exposure: 1.12, sat: 1.1, lo: [0.93, 1.0, 1.06], hi: [1.05, 1.0, 0.93] },
    islands: { chance: 0.6, per: 1, r: [4, 10] },
    pools: CALM, bosses: ['cutter', 'manowar', 'firegalleon', 'flagship'], hpMul: 1, dmgMul: 1, dblMul: 1,
    quests: [
      { id: 'calm1', stat: 'kill:gunboat', n: 60, reward: 150 },
      { id: 'calm2', stat: 'boatsEaten', n: 40, reward: 150 },
      { id: 'calm3', stat: 'act', n: 4, reward: 300, unless: 'lowHp' },
    ],
  },
  {
    id: 'reef', hazard: 'reef', style: 'coral', difficulty: 2,
    pal: { deep: 0x0a6f8f, mid: 0x14b3c4, shallow: 0x6ff2dc, foam: 0xf6fffd, line: 0xd8fff8, coral: 0xff6f8e, bg: 0x3aa7b5, sky: 0xd2f4ff, ground: 0x2a7a7a, hemi: 1.45, sun: 0xfff0c8, sunI: 3.1, rim: 0x9ad8ff, rimI: 0.5, exposure: 1.15, sat: 1.2, lo: [0.92, 1.02, 1.04], hi: [1.06, 1.0, 0.94] },
    islands: { chance: 0.85, per: 3, r: [2.2, 4.6] },
    pools: [
      [['gunboat', 1, 0], ['raft', 0.7, 15], ['brig', 0.3, 60], ['swarm', 0.3, 20], ['serpent', 0.2, 50], ['minelayer', 0.2, 40]],
      [['gunboat', 1, 0], ['raft', 0.7, 15], ['brig', 0.35, 0], ['swarm', 0.35, 0], ['serpent', 0.3, 0], ['minelayer', 0.3, 0]],
      [['gunboat', 1, 0], ['raft', 0.7, 15], ['brig', 0.35, 0], ['ketch', 0.3, 0], ['swarm', 0.4, 0], ['serpent', 0.35, 0], ['minelayer', 0.35, 0]],
      [['gunboat', 1, 0], ['raft', 0.7, 15], ['brig', 0.4, 0], ['ketch', 0.35, 0], ['swarm', 0.4, 0], ['serpent', 0.4, 0], ['minelayer', 0.4, 0]],
    ],
    bosses: ['corsair', 'leviathan', 'manowar_r', 'pirateking'], hpMul: 1.2, dmgMul: 1.1, dblMul: 1.25,
    quests: [
      { id: 'reef1', stat: 'kill:swarm', n: 50, reward: 200 },
      { id: 'reef2', stat: 'hutsEaten', n: 15, reward: 200 },
      { id: 'reef3', stat: 'fastBoss', n: 2, reward: 350 },
    ],
  },
  {
    id: 'fog', hazard: 'fog', style: 'rocky', difficulty: 3,
    pal: { deep: 0x1d3f45, mid: 0x355f62, shallow: 0x6f9a8e, foam: 0xdfe8e2, line: 0xa9c4bc, coral: 0x8a9a80, bg: 0x51655f, sky: 0xb8c8c0, ground: 0x2a3a36, hemi: 1.25, sun: 0xdfe6dc, sunI: 2.1, rim: 0x9ab0b8, rimI: 0.6, exposure: 1.08, sat: 0.8, lo: [0.96, 1.02, 1.0], hi: [1.0, 1.0, 0.97] },
    islands: { chance: 0.6, per: 1, r: [4, 9] },
    pools: [
      [['gunboat', 1, 0], ['raft', 0.4, 25], ['brig', 0.45, 40], ['ghost', 0.3, 20], ['battery', 0.2, 30], ['swarm', 0.25, 10]],
      [['gunboat', 1, 0], ['raft', 0.4, 25], ['brig', 0.5, 0], ['ghost', 0.4, 0], ['battery', 0.25, 0], ['swarm', 0.3, 0]],
      [['gunboat', 0.9, 0], ['raft', 0.4, 25], ['brig', 0.55, 0], ['ketch', 0.3, 0], ['ghost', 0.45, 0], ['battery', 0.3, 0], ['swarm', 0.35, 0]],
      [['gunboat', 0.9, 0], ['raft', 0.4, 25], ['brig', 0.6, 0], ['ketch', 0.35, 0], ['ghost', 0.5, 0], ['battery', 0.3, 0], ['swarm', 0.4, 0]],
    ],
    bosses: ['ghostgalleon', 'lighthouse', 'cutter_r', 'drownedadmiral'], hpMul: 1.45, dmgMul: 1.25, dblMul: 1.5,
    quests: [
      { id: 'fog1', stat: 'kill:ghost', n: 20, reward: 250 },
      { id: 'fog2', stat: 'cratesEaten', n: 60, reward: 250 },
      { id: 'fog3', stat: 'win', n: 1, reward: 400, maxTime: 16 * 60 },
    ],
  },
  {
    id: 'volcano', hazard: 'eruption', style: 'volcanic', difficulty: 4,
    pal: { deep: 0x1f3036, mid: 0x34494c, shallow: 0x4f6262, foam: 0xe8d8c4, line: 0xa8b8b4, coral: 0xff5a1a, bg: 0x3a2620, sky: 0xffc8a0, ground: 0x4a2414, hemi: 1.45, sun: 0xffbc80, sunI: 3.0, rim: 0xff6a3a, rimI: 0.8, exposure: 1.15, sat: 1.05, lo: [1.02, 0.96, 0.96], hi: [1.1, 0.98, 0.88] },
    islands: { chance: 0.65, per: 1, r: [5, 11] },
    pools: [
      [['gunboat', 1, 0], ['raft', 0.8, 15], ['brig', 0.3, 60], ['fireship', 0.4, 10], ['battery', 0.2, 30], ['minelayer', 0.2, 40]],
      [['gunboat', 1, 0], ['raft', 0.8, 15], ['brig', 0.35, 0], ['ketch', 0.2, 0], ['fireship', 0.5, 0], ['battery', 0.25, 0], ['minelayer', 0.3, 0]],
      [['gunboat', 1, 0], ['raft', 0.8, 15], ['brig', 0.35, 0], ['ketch', 0.4, 0], ['fireship', 0.55, 0], ['battery', 0.3, 0], ['minelayer', 0.35, 0]],
      [['gunboat', 1, 0], ['raft', 0.9, 15], ['brig', 0.4, 0], ['ketch', 0.45, 0], ['fireship', 0.6, 0], ['battery', 0.3, 0], ['minelayer', 0.4, 0]],
    ],
    bosses: ['firegalleon_r', 'magma', 'ashleviathan', 'flagship_r'], hpMul: 1.75, dmgMul: 1.4, dblMul: 1.75,
    quests: [
      { id: 'vol1', stat: 'kill:fireship', n: 25, reward: 300 },
      { id: 'vol2', stat: 'rams', n: 60, reward: 300 },
      { id: 'vol3', stat: 'win', n: 1, reward: 500 },
    ],
  },
];
export const SEA_COUNT = SEAS.length;
export const isSea = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < SEA_COUNT;
export const seaBoss = (sea: number, act: number): BossId => SEAS[sea].bosses[Math.max(0, Math.min(3, act - 1))];

/** Weighted pick from the sea's pool for this act at act time `t`. */
export function pickEnemy(sea: number, act: number, t: number, rand: () => number = Math.random): EnemyType {
  const rows = SEAS[sea].pools[Math.max(0, Math.min(3, act - 1))];
  let r = rand() * rows.reduce((s, x) => s + (t >= x[2] ? x[1] : 0), 0);
  return (rows.find(x => t >= x[2] && (r -= x[1]) < 0) ?? rows[0])[0];
}
/** Enemy types that can appear anywhere in this sea (map preview). */
export const seaEnemies = (sea: number): EnemyType[] => [...new Set(SEAS[sea].pools.flat().map(x => x[0]))];
