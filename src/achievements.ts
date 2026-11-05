// v11 local achievements: pure functions over the saved lifetime stats. Only M.achSeen (ids already announced) is persisted.
import { M, R, flags, save, unlockedModCount, UNLOCK_ALL } from './meta';
import { SEAS, BOSS_IDS } from './seas';
import { MOD_IDS } from './modules';
import { SHIP_IDS, CAPTAIN_IDS, L } from './loadout';
import { HEAT_MAX } from './heatdefs';
import { seaName } from './seatext';
import { t } from './i18n';
import { toast } from './evoui';
import { DAILY } from './daily';

export interface Ach { id: string; name: () => string; desc: () => string; prog: () => [number, number] }
const S = () => M.stats;
const max = (a: number[]): number => Math.max(0, ...a);
const count = (r: Record<string, number>, ids: readonly string[]): number => ids.filter(id => (r[id] ?? 0) > 0).length;
const winTimes = (): number[] => S().fastestWin.filter(x => x > 0);
const A = (id: string, prog: () => [number, number], key = id, p?: () => Record<string, string>): Ach => ({ id, prog, name: () => t(`ach.${key}`, p?.()), desc: () => t(`ach.${key}.d`, p?.()) });
const atLeast = (cur: number, goal: number): [number, number] => [Math.min(cur, goal), goal];
const bossesSunk = (): number => BOSS_IDS.filter(id => (S().bossKills[id] ?? 0) > 0).length;
const heatWon = (): number => max(S().bestHeat) - 1; // highest heat level cleared on any sea

export const ACHIEVEMENTS: Ach[] = [
  A('firstWin', () => atLeast(S().wins, 1)),
  ...SEAS.map((_, i) => A('sea' + i, () => atLeast(S().seaWins[i] ?? 0, 1), 'sea', () => ({ sea: seaName(i) }))),
  A('heat1', () => atLeast(heatWon(), 1)), A('heat3', () => atLeast(heatWon(), 3)), A('heat5', () => atLeast(heatWon(), HEAT_MAX)),
  A('sink1k', () => atLeast(S().kills, 1000)), A('sink10k', () => atLeast(S().kills, 10000)),
  A('bosses5', () => atLeast(bossesSunk(), 5)), A('bosses12', () => atLeast(bossesSunk(), 12)),
  A('allShips', () => atLeast(count(S().shipWins, SHIP_IDS), SHIP_IDS.length)),
  A('caps5', () => atLeast(count(S().capWins, CAPTAIN_IDS), 5)), A('capsAll', () => atLeast(count(S().capWins, CAPTAIN_IDS), CAPTAIN_IDS.length)),
  A('sails100', () => atLeast(S().fullSails, 100)), A('rams50', () => atLeast(S().rams, 50)),
  A('evo1', () => atLeast(S().evolutions, 1)), A('evo25', () => atLeast(S().evolutions, 25)),
  A('lv8', () => atLeast(max(Object.values(S().maxModLevel)), 8)),
  A('allMods', () => atLeast(unlockedModCount(), MOD_IDS.length)),
  A('dbl5000', () => atLeast(S().doubloonsEarned, 5000)),
  A('end1', () => atLeast(max(S().endBest), 1)), A('end10', () => atLeast(max(S().endBest), 10)),
  A('speed', () => [winTimes().some(x => x < 900) ? 1 : 0, 1]),
  A('quests25', () => atLeast(S().questsDone, 25)),
  A('lvl20', () => atLeast(S().maxLevel, 20)),
  A('runs50', () => atLeast(S().runs, 50)),
  A('time10h', () => atLeast(Math.floor(S().playTime), 36000)),
  A('collector', () => atLeast(M.unlocked.length, 25)),
  A('tank', () => atLeast(Math.floor(S().damageTaken), 10000)),
];
export const isDone = (a: Ach): boolean => { const [c, g] = a.prog(); return c >= g; };

const inc = (r: Record<string, number>, k: string): void => { r[k] = (r[k] ?? 0) + 1; };
let recordedAt = -1;
/** Folds the finished run into the lifetime stats. Once per run (a second call, e.g. endRun then settleAbandoned, is ignored). Call before settleRun so its save() persists it. */
export function recordRun(time: number, level: number, evolved: number): void {
  const s = S();
  if (recordedAt === s.runs) return;
  recordedAt = s.runs;
  s.playTime += time; s.evolutions += evolved; s.maxLevel = Math.max(s.maxLevel, level);
  if (DAILY) return; // the seed picks ship and captain, maybe locked ones: they must not count toward per-ship/captain goals
  inc(s.shipRuns, L.ship); inc(s.capRuns, L.captain);
  if ((R.c.win ?? 0) > 0) { // R.c.winT: endless runs note the moment of the win (Sail On)
    inc(s.shipWins, L.ship); inc(s.capWins, L.captain);
    const wt = R.c.winT || time, cur = s.fastestWin[R.sea] ?? 0;
    if (wt > 0 && (!cur || wt < cur)) s.fastestWin[R.sea] = wt;
  }
}

/** Announces achievements not yet in M.achSeen (once each). Saves from before achievements existed are seeded silently. */
export function checkAchievements(): void {
  if (UNLOCK_ALL || DAILY) return; // both fake every unlock: judging now would mark unearned achievements as seen
  const done = ACHIEVEMENTS.filter(isDone);
  if (flags.legacy) { flags.legacy = false; M.achSeen = done.map(a => a.id); save(); return; }
  const fresh = done.filter(a => !M.achSeen.includes(a.id));
  if (!fresh.length) return;
  M.achSeen.push(...fresh.map(a => a.id));
  save();
  fresh.forEach((a, i) => setTimeout(() => toast(t('rec.toast'), `<b>${a.name()}</b>`, 0xffd24a), i * 700));
}
