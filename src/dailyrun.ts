// Daily Voyage setup and local records. The daily config is a pure function of the date; progress is stored under its own key.
import { drand, DAILY_DATE } from './daily';
import { SHIP_IDS, CAPTAIN_IDS, SHIPS, CAPTAINS, ShipId, CaptainId, Extras } from './loadout';
import { MOD_IDS, MODS, ModuleId } from './modules';
import { SEA_COUNT } from './seas';

export interface DailyCfg { ship: ShipId; captain: CaptainId; extras: Extras }
const pick = <T>(a: T[], k: number): T => a[Math.min(a.length - 1, Math.floor(drand('cfg', k) * a.length))];

let cfg: DailyCfg | null = null;
export function dailyCfg(): DailyCfg {
  if (cfg) return cfg;
  const ship = pick(SHIP_IDS, 0), captain = pick(CAPTAIN_IDS, 3);
  const extra = CAPTAINS[captain].startMod, caps = SHIPS[ship].slots;
  const mods = MOD_IDS.filter(id => !SHIPS[ship].start.includes(id) && id !== extra && caps[MODS[id].slot] - (extra && MODS[extra].slot === MODS[id].slot ? 1 : 0) > 0);
  const startModule: ModuleId | null = mods.length ? pick(mods, 4) : null;
  cfg = { ship, captain, extras: { startModule, relic: null, crew: null, sea: Math.floor(drand('cfg', 1) * SEA_COUNT), heat: Math.floor(drand('cfg', 2) * 3) } };
  return cfg;
}

export interface DailyBest { act: number; kills: number; time: number; won: boolean; doubloons: number }
interface DailySave { date: string; best: DailyBest | null; attempts: number }
const KEY = 'broadside.daily';
export function loadDaily(): DailySave {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as DailySave | null;
    if (o && o.date === DAILY_DATE && typeof o.attempts === 'number') return { date: o.date, best: o.best ?? null, attempts: o.attempts };
  } catch { /* storage unavailable or corrupt */ }
  return { date: DAILY_DATE, best: null, attempts: 0 };
}
function saveDaily(s: DailySave): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }
export function noteDailyAttempt(): void { const s = loadDaily(); s.attempts++; saveDaily(s); }
const better = (a: DailyBest, b: DailyBest | null): boolean =>
  !b ? true : a.won !== b.won ? a.won : a.act !== b.act ? a.act > b.act : a.won ? a.time < b.time : a.kills > b.kills;
/** Stores the run as today's best when it beats the previous best; returns the best afterwards. */
export function noteDailyResult(r: DailyBest): DailyBest {
  const s = loadDaily();
  if (better(r, s.best)) { s.best = r; saveDaily(s); }
  return s.best ?? r;
}
