// Daily Voyage: a run seeded from the UTC date. Dependency-free (meta.ts, world.ts, cards.ts read it).
// Randomness is never one sequential stream: every draw is hashed from (date seed, stream name, keys), so offers and spawns do not depend on how often other things rolled.
export const DAILY = new URLSearchParams(location.search).has('daily');

/** UTC calendar date, YYYY-MM-DD. */
export const dailyDate = (d = new Date()): string => d.toISOString().slice(0, 10);
export const DAILY_DATE = dailyDate();

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
export const dailySeed = (): number => hashStr('broadside-daily:' + DAILY_DATE);

/** Deterministic float in [0, 1) for (today, stream, keys). */
export function drand(stream: string, ...keys: number[]): number {
  return hashStr(`${DAILY_DATE}|${stream}|${keys.join(',')}`) / 4294967296;
}
/** A generator over one keyed stream: Math.random outside daily runs, else drand(stream, ...keys, 0), drand(stream, ...keys, 1), ... */
export function rngFor(stream: string, ...keys: number[]): () => number {
  if (!DAILY) return Math.random;
  let i = 0;
  return () => drand(stream, ...keys, i++);
}
const counters = new Map<string, number>();
/** Next index of a named event counter (spawns, respawns); reset at run start. */
export const nextN = (stream: string): number => { const n = counters.get(stream) ?? 0; counters.set(stream, n + 1); return n; };
export const resetDailyCounters = (): void => { counters.clear(); roll.pick = 0; roll.rr = 0; };

/** Card-roll key: pick = level-up / loot index, rr = reroll index, part = 0 free row / 1 buy row. */
export const roll = { pick: 0, rr: 0, part: 0, slot: 0 };
export function rollKey(fresh: boolean, part: number): void {
  if (part === 0) { if (fresh) { roll.pick++; roll.rr = 0; } else roll.rr++; }
  roll.part = part; roll.slot = 0;
}
/** Draw for card rolls (cards.ts). */
export const cardRand = (): number => (DAILY ? drand('card', roll.pick, roll.rr, roll.part, roll.slot++) : Math.random());
