// Meta progression ("Doubloons"): permanent currency, unlock catalog and lifetime stats, saved in localStorage.
// Dependency-free (no game imports) so loadout.ts, content.ts and loot.ts can read it. Names/descriptions live in unlocks.ts.
import { MOD_IDS } from './modules';
import { t, tr } from './i18n';
import { RELICS, RELIC_IDS, CREW, CREW_IDS } from './relics';
import { SEAS, SEA_COUNT, BOSS_IDS, BossId } from './seas';
import { HEAT_MAX, HEAT_DBL, END } from './heatdefs';
const KEY = 'broadside.meta';
export const UNLOCK_ALL = new URLSearchParams(location.search).has('unlockall'); // in memory only: nothing is saved while set

export type NumStat = 'runs' | 'kills' | 'fullSails' | 'rerolls' | 'autoCasts' | 'burned' | 'rams' | 'boatsEaten' | 'damageTaken'
  | 'cratesEaten' | 'hutsEaten' | 'shopBuys' | 'deaths' | 'wins' | 'doubloonsEarned' | 'questsDone';
export interface Stats {
  runs: number; kills: number; fullSails: number; rerolls: number; autoCasts: number; burned: number; rams: number; boatsEaten: number; damageTaken: number;
  cratesEaten: number; hutsEaten: number; shopBuys: number; deaths: number; wins: number; doubloonsEarned: number; questsDone: number;
  /** Highest level reached per module id (counted up to Lv 8). */
  maxModLevel: Record<string, number>;
  /** Boss kills by boss id (v8; older saves counted per act, migrated onto the Calm Seas bosses). */
  bossKills: Record<string, number>;
  /** Best act overall (act challenges) and per sea; act-4 boss kills (wins) per sea. */
  bestAct: number;
  seaBest: number[]; seaWins: number[];
  /** v10 Heat per sea: bestHeat = highest heat cleared + 1 (0 = never won; heat N+1 is unlocked once N is cleared); heatWins = wins on heat 1+; endBest = best endless step. */
  bestHeat: number[]; heatWins: number[]; endBest: number[];
}
const freshStats = (): Stats => ({ runs: 0, kills: 0, fullSails: 0, rerolls: 0, autoCasts: 0, burned: 0, rams: 0, boatsEaten: 0, damageTaken: 0, cratesEaten: 0, hutsEaten: 0, shopBuys: 0, deaths: 0, wins: 0, doubloonsEarned: 0, questsDone: 0, maxModLevel: {}, bossKills: {}, bestAct: 0, seaBest: SEAS.map(() => 0), seaWins: SEAS.map(() => 0), bestHeat: SEAS.map(() => 0), heatWins: SEAS.map(() => 0), endBest: SEAS.map(() => 0) });

/** seasUnlocked: how many seas are open (sea k+1 opens when the act-4 boss of sea k falls). seaQuests: completed (and paid) sea quest ids. */
export interface Save { doubloons: number; unlocked: string[]; disabled: string[]; stats: Stats; seasUnlocked: number; seaQuests: string[] }
export const M: Save = { doubloons: 0, unlocked: [], disabled: [], stats: freshStats(), seasUnlocked: 1, seaQuests: [] };

/** Catalog of lockable items; everything else (Galleon, Old Salt, Iron Bess, Greedy Gwen, the four starting modules) is always unlocked. */
export interface Entry { id: string; cost: number; challenge: () => string; prog: () => [number, number] }
const S = (): Stats => M.stats;
type Ch = Pick<Entry, 'challenge' | 'prog'>;
const cnt = (k: NumStat, n: number, key: string): Ch => ({ challenge: () => t('ch.' + key, { n }), prog: () => [S()[k], n] });
const act = (n: number): Ch => ({ challenge: () => t('ch.act', { n }), prog: () => [S().bestAct, n] });
export const bossKills = (id: BossId): number => S().bossKills[id] ?? 0;
const boss = (id: BossId, name: string): Ch => ({ challenge: () => t('ch.boss', { name: tr(`boss.${id}`, name) }), prog: () => [bossKills(id), 1] });
const lv8 = (id: string, name: string): Ch => ({ challenge: () => t('ch.lv8', { name: tr(`mod.${id}.name`, name) }), prog: () => [S().maxModLevel[id] ?? 0, 8] });
const e = (id: string, cost: number, c: Ch): Entry => ({ id, cost, ...c });
export const CATALOG: Entry[] = [
  e('ship:sloop', 300, act(2)), e('ship:frigate', 600, boss('manowar', "Man-o'-War")),
  e('cap:rosa', 200, cnt('fullSails', 100, 'fullSails')), e('cap:tom', 200, cnt('rerolls', 15, 'rerolls')),
  e('cap:corvo', 350, cnt('kills', 500, 'sink')), e('cap:hana', 300, act(3)),
  e('cap:morwen', 400, cnt('autoCasts', 300, 'autoCasts')), e('cap:flint', 350, cnt('burned', 300, 'burn')),
  e('cap:dorian', 500, boss('firegalleon', 'Fire Galleon')),
  e('cap:thorne', 400, cnt('kills', 1000, 'sink')), e('cap:isabeau', 450, act(4)), e('cap:driftwood', 250, cnt('cratesEaten', 500, 'crates')),
  e('cap:goldtooth', 400, cnt('doubloonsEarned', 3000, 'earn')), e('cap:cass', 500, { challenge: () => t('ch.win'), prog: () => [S().wins, 1] }),
  e('cap:brick', 300, cnt('shopBuys', 30, 'buys')), e('cap:ines', 300, { challenge: () => t('ch.huts', { n: 100 }) + ' ' + t('un.or') + ' ' + t('ch.quests', { n: 50 }), prog: () => (S().questsDone / 50 > S().hutsEaten / 100 ? [S().questsDone, 50] : [S().hutsEaten, 100]) }),
  e('cap:ghost', 450, cnt('deaths', 25, 'die')), e('cap:hal', 350, { challenge: () => t('ch.bosses3'), prog: () => [Object.values(S().bossKills).reduce((a, b) => a + b, 0), 3] }),
  e('cap:coral', 400, cnt('burned', 1000, 'burn')),
  e('mod:ram', 250, cnt('rams', 100, 'ram')), e('mod:boarding', 300, cnt('boatsEaten', 200, 'boats')),
  e('mod:witch', 400, lv8('mortar', 'Deck Mortar')), e('mod:siphon', 350, lv8('kegs', 'Powder Kegs')),
  e('mod:ward', 300, cnt('damageTaken', 2000, 'damage')), e('mod:lantern', 300, lv8('chaser', 'Bow Chaser')),
  e('mod:harpoon', 300, cnt('rams', 200, 'ram')), e('mod:carronade', 300, cnt('kills', 1500, 'sink')),
  e('mod:rockets', 400, act(4)), e('mod:net', 250, cnt('boatsEaten', 300, 'boats')),
  e('mod:crowsnest', 350, boss('firegalleon', 'Fire Galleon')), e('mod:pump', 250, cnt('damageTaken', 5000, 'damage')),
  // v10 modules
  e('mod:swivel', 250, cnt('kills', 800, 'sink')), e('mod:chain', 350, cnt('kills', 2500, 'sink')), e('mod:firearrows', 300, cnt('burned', 500, 'burn')),
  e('mod:bombketch', 350, lv8('broadside', 'Broadside Cannons')), e('mod:tesla', 400, act(3)), e('mod:gatling', 350, cnt('autoCasts', 150, 'autoCasts')),
  e('mod:sharkcage', 300, cnt('boatsEaten', 500, 'boats')), e('mod:spyglass', 400, boss('manowar', "Man-o'-War")), e('mod:magnet', 300, cnt('cratesEaten', 400, 'crates')),
];
const buyOnly: Ch = { challenge: () => '', prog: () => [0, 1] };
for (const id of RELIC_IDS) if (!RELICS[id].starter) CATALOG.push(e('relic:' + id, RELICS[id].cost, buyOnly));
for (const id of CREW_IDS) if (CREW[id].cost) CATALOG.push(e('crew:' + id, CREW[id].cost, buyOnly));
export const entry = (id: string): Entry | undefined => CATALOG.find(x => x.id === id);

export const isUnlocked = (id: string): boolean => UNLOCK_ALL || !entry(id) || M.unlocked.includes(id);
/** A module can enter the draft / shop pool when unlocked and not toggled off (starting modules can't be toggled off). */
export const modInPool = (id: string): boolean => isUnlocked('mod:' + id) && !M.disabled.includes(id);
export const unlockedModCount = (): number => MOD_IDS.filter(id => isUnlocked('mod:' + id)).length;
export const freeRollsPerRun = (): number => Math.floor(unlockedModCount() / 3);
/** Every unlocked id including the always-unlocked starting set (for debug). */
export const unlockedIds = (): string[] => [...new Set([...M.unlocked, 'ship:galleon', 'cap:salt', 'cap:bess', 'cap:gwen', ...['broadside', 'chaser', 'mortar', 'kegs'].map(m => 'mod:' + m), ...RELIC_IDS.filter(r => RELICS[r].starter).map(r => 'relic:' + r)])];

let timer = 0;
export function save(): void {
  if (UNLOCK_ALL) return;
  timer = 0;
  try { localStorage.setItem(KEY, JSON.stringify(M)); } catch { /* storage unavailable */ }
}
const later = (): void => { if (!timer) timer = window.setTimeout(save, 2000); };

function load(): void {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Save>;
    const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0);
    const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    const st = (o.stats ?? {}) as Partial<Stats>, f = freshStats();
    M.doubloons = Math.floor(num(o.doubloons));
    M.unlocked = strs(o.unlocked).filter(id => entry(id));
    M.disabled = strs(o.disabled);
    for (const k of Object.keys(f) as (keyof Stats)[]) if (typeof f[k] === 'number') (f as unknown as Record<string, number>)[k] = num(st[k]);
    for (const [k, v] of Object.entries(st.maxModLevel ?? {})) f.maxModLevel[k] = num(v);
    const old = st as { bossesKilled?: unknown[] }, arr = (v: unknown, i: number): number => num(Array.isArray(v) ? v[i] : 0);
    if (st.bossKills && typeof st.bossKills === 'object') { for (const id of BOSS_IDS) if (st.bossKills[id]) f.bossKills[id] = num(st.bossKills[id]); }
    else if (Array.isArray(old.bossesKilled)) SEAS[0].bosses.forEach((id, i) => { const n = arr(old.bossesKilled, i); if (n) f.bossKills[id] = (f.bossKills[id] ?? 0) + n; }); // pre-v8: per act = Calm Seas bosses
    f.seaBest = SEAS.map((_, i) => arr(st.seaBest, i)); f.seaWins = SEAS.map((_, i) => arr(st.seaWins, i));
    f.bestHeat = SEAS.map((_, i) => Math.min(HEAT_MAX + 1, Math.max(arr(st.bestHeat, i), f.seaWins[i] > 0 ? 1 : 0))); f.heatWins = SEAS.map((_, i) => arr(st.heatWins, i)); f.endBest = SEAS.map((_, i) => arr(st.endBest, i));
    if (!Array.isArray(st.seaBest)) { f.seaBest[0] = f.bestAct; f.seaWins[0] = arr(old.bossesKilled, 3); }
    f.shopBuys = Math.max(f.shopBuys, num((st as { harborBuys?: unknown }).harborBuys)); // pre-shop saves counted harbor purchases
    M.stats = f;
    M.seasUnlocked = Math.max(1, Math.min(SEA_COUNT, Math.floor(num(o.seasUnlocked))), ...f.seaWins.map((w, i) => (w > 0 ? Math.min(SEA_COUNT, i + 2) : 1)));
    M.seaQuests = strs(o.seaQuests).filter(id => SEAS.some(s => s.quests.some(q => q.id === id)));
  } catch { M.doubloons = 0; M.unlocked = []; M.disabled = []; M.stats = freshStats(); M.seasUnlocked = 1; M.seaQuests = []; }
}
load();
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });

// ---- per-run counters (reset by startRun) ----
/** c: per-run counters for sea quests (every bump key, 'kill:<type>', 'buy:<item>', 'fastBoss', 'win'); quests: sea quests finished this run. */
export const R = { gold: 0, bosses: 0, act: 1, kills: 0, sea: 0, heat: 0, newly: [] as string[], settled: false, c: {} as Record<string, number>, quests: [] as string[], qn: 0, qd: 0 };
export function resetRun(sea = 0, heat = 0): void { Object.assign(R, { gold: 0, bosses: 0, act: 1, kills: 0, sea, heat, newly: [], settled: false, c: {}, quests: [], qn: 0, qd: 0 }); }
export const runCount = (k: string, n = 1): void => { R.c[k] = (R.c[k] ?? 0) + n; };
export const seaOpen = (sea: number): boolean => UNLOCK_ALL || sea < M.seasUnlocked;
/** Highest heat level the player may pick on this sea (0 = only the base level). */
export const heatUnlocked = (sea: number): number => (UNLOCK_ALL ? HEAT_MAX : Math.min(HEAT_MAX, M.stats.bestHeat[sea] ?? 0));
/** Best heat cleared on this sea, or -1. */
export const heatCleared = (sea: number): number => (M.stats.bestHeat[sea] ?? 0) - 1;

export function unlock(id: string): void {
  if (M.unlocked.includes(id) || !entry(id)) return;
  M.unlocked.push(id);
  R.newly.push(id);
  later();
}
/** Unlocks every item whose challenge is complete. */
export function checkUnlocks(): void {
  for (const c of CATALOG) { if (M.unlocked.includes(c.id)) continue; const [a, b] = c.prog(); if (a >= b) unlock(c.id); }
}
export function bump(k: NumStat, n = 1): void {
  M.stats[k] += n; runCount(k, n);
  if (k === 'kills') R.kills++; // per-run kills; cheap kill counting, unlocks are checked on boss kills and run end
  else checkUnlocks();
  later();
}
export function noteModLevel(id: string, lv: number): void {
  const v = Math.min(lv, 8);
  if (v > (M.stats.maxModLevel[id] ?? 0)) { M.stats.maxModLevel[id] = v; checkUnlocks(); later(); }
}
export function noteAct(a: number): void {
  R.act = Math.max(R.act, a);
  if (a > M.stats.seaBest[R.sea]) { M.stats.seaBest[R.sea] = a; later(); }
  if (a > M.stats.bestAct) { M.stats.bestAct = a; checkUnlocks(); later(); }
}
/** A boss died; the act-4 boss of a sea also counts a sea win and opens the next sea. */
export function noteBoss(id: BossId, last: boolean): void {
  M.stats.bossKills[id] = (M.stats.bossKills[id] ?? 0) + 1; R.bosses++; runCount('boss');
  if (last) {
    M.stats.seaWins[R.sea]++;
    if (R.heat > 0) M.stats.heatWins[R.sea]++;
    M.stats.bestHeat[R.sea] = Math.max(M.stats.bestHeat[R.sea], Math.min(HEAT_MAX + 1, R.heat + 1));
    M.seasUnlocked = Math.max(M.seasUnlocked, Math.min(SEA_COUNT, R.sea + 2));
  }
  checkUnlocks(); later();
}
export function noteGold(n: number): void { R.gold += n; }
/** Endless mode reached `step` on the current sea. */
export function noteEndless(step: number): void { if (step > M.stats.endBest[R.sea]) { M.stats.endBest[R.sea] = step; later(); } }

export interface RunResult { gold: number; bosses: number; acts: number; kills: number; goldD: number; bossD: number; actD: number; killD: number; total: number; balance: number; unlocked: string[]; quests: { id: string; reward: number }[]; questN: number; questD: number; endN: number; endD: number; heat: number; mul: number }
/** Awards the run's doubloons once (a second call returns null). */
export function settleRun(mul = 1): RunResult | null {
  if (R.settled) return null;
  R.settled = true;
  // mul: Baron Goldtooth / Cursed Doubloon, times the sea multiplier; sea quest rewards are flat and paid once ever
  const goldD = Math.floor(R.gold / 2), bossD = R.bosses * 30, actD = R.act * 10, killD = Math.floor(R.kills / 10);
  const quests = SEAS[R.sea].quests.filter(q => R.quests.includes(q.id) && !M.seaQuests.includes(q.id)).map(q => ({ id: q.id, reward: q.reward }));
  for (const q of quests) M.seaQuests.push(q.id);
  const endD = Math.floor(END.dbl), hm = HEAT_DBL[R.heat] ?? 1;
  const total = Math.round((goldD + bossD + actD + killD + R.qd + endD) * mul * SEAS[R.sea].dblMul * hm) + quests.reduce((a, q) => a + q.reward, 0);
  M.doubloons += total; M.stats.doubloonsEarned += total;
  checkUnlocks();
  save();
  return { gold: R.gold, bosses: R.bosses, acts: R.act, kills: R.kills, goldD, bossD, actD, killD, total, balance: M.doubloons, unlocked: [...R.newly], quests, questN: R.qn, questD: R.qd, endN: END.on ? END.step : 0, endD, heat: R.heat, mul: SEAS[R.sea].dblMul * hm };
}

export function buyUnlock(id: string): boolean {
  const c = entry(id);
  if (!c || isUnlocked(id) || M.doubloons < c.cost) return false;
  M.doubloons -= c.cost;
  M.unlocked.push(id);
  save();
  return true;
}
export function toggleMod(id: string): void {
  const i = M.disabled.indexOf(id);
  if (i >= 0) M.disabled.splice(i, 1); else if (entry('mod:' + id) && isUnlocked('mod:' + id)) M.disabled.push(id);
  save();
}

// debug helpers
export function addDoubloons(n: number): void { M.doubloons = Math.max(0, M.doubloons + n); save(); }
export function unlockAll(): void { for (const c of CATALOG) if (!M.unlocked.includes(c.id)) M.unlocked.push(c.id); save(); }
export function resetMeta(): void { M.doubloons = 0; M.unlocked = []; M.disabled = []; M.stats = freshStats(); M.seasUnlocked = 1; M.seaQuests = []; resetRun(); save(); }
