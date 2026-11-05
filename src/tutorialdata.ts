// Tutorial state (dependency-free: read by game.ts, enemies.ts and the debug API) and the step list.
export const TUT = {
  active: false, step: 0, done: false,
  /** Spawner speed factor while the tutorial runs (enemies.ts), and whether XP may trigger a level-up on its own (game.ts gainXp). */
  spawnMul: 1, noLevel: false,
  /** Skip dialog open. */
  confirm: false,
};
/** id = key prefix (tut.<id>.t / .b); hl = CSS selector pulsed while the step is active. */
export const STEPS: { id: string; hl: string | null }[] = [
  { id: 's1', hl: null },
  { id: 's2', hl: '#abar .ab.fs' },
  { id: 's3', hl: null },
  { id: 's4', hl: null },
  { id: 's5', hl: '#abar .ab.sp' },
  { id: 's6', hl: '#buyrow' },
  { id: 's7', hl: '.bossrow' },
];
