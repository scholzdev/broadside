// Heat (v10 difficulty per sea) and Endless mode: run-state singletons and tuning numbers. Leaf module (no imports).
export const HEAT_MAX = 5;
/** Doubloon multiplier per heat level (index = level). */
export const HEAT_DBL = [1, 1.25, 1.5, 1.75, 2, 2.5];
/** Heat of the current run (set by startRun before the world is built). */
export const HEAT = { level: 0 };
export const heatAt = (n: number): boolean => HEAT.level >= n;

export type EliteTrait = 'fast' | 'armoured' | 'splitting';
export const ELITE_TRAITS: EliteTrait[] = ['fast', 'armoured', 'splitting'];
export const ELITE_CHANCE = 0.12, ELITE_HP = 1.8;
/** Heat 3: stronger hazards. */
export const REEF_DMG_K = 1.5, REEF_SIZE_K = 1.3, FOG_LESS = 3, ERUPT_FASTER = 0.7;

/** Endless mode: step every ENDLESS_T seconds, a boss every BOSS_EVERY steps. `dbl` = base doubloons accrued so far. */
export const END = { on: false, step: 0, t: 0, dbl: 0 };
export const ENDLESS_T = 90, BOSS_EVERY = 3;
export const endHp = (): number => 1 + 0.12 * END.step;
export const endDmg = (): number => 1 + 0.12 * END.step;
export const endDensity = (): number => 1 + 0.08 * END.step;
export const endReward = (step: number): number => 15 + 5 * step;
export function resetEndless(): void { Object.assign(END, { on: false, step: 0, t: 0, dbl: 0 }); }
