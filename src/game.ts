import * as THREE from 'three';
import { Levels, EnemyType, ACTS, deriveStats } from './content';
import { Card, rollCards as rollSet, applyTrackCard } from './cards';
import { StatMap, seedStats, modLevel } from './modstats';
import { MODS, ModuleId, Owned, freeIdx, freeSlots } from './modules';
import { stepAbilities, resetAbilities, modulesView, castBySlotKey } from './abilities';
import { castSpell, spellView, clearSpellFx } from './spells';
import { SP } from './spelldata';
import { stepSummons, clearSummons } from './summons';
import { takeTaps, pad } from './input';
import { stepShip, shipTap, initShip, model as shipModel } from './ship';
import { L, setLoadout, saveLoadout, sanitizeExtras, startModules, Extras, ShipId, CaptainId, SHIPS, CAPTAINS } from './loadout';
import { secondWind } from './relicfx';
import { killBonus, doubloonMul, resetPassives } from './capfx';
import { absorbShield } from './spells2';
import { stepWeapons, stepProjectiles, projectiles, clearEnemyProjectiles } from './weapons';
import { shopPrice, buyCard } from './loot';
import { crewState } from './crewdefs';
import { stepCrew, noteHit, resetCrewRuntime, crewView, addCrew, setCrewLevel } from './crew';
import { applyCrewCard } from './crewcards';
import { evolve, stepEvo, installEvoDebug } from './evolutions';
import type { CrewId } from './relics';
import { stepEdibles, edibles, orbs } from './edibles';
import { snap } from './spatial';
import { loadAround, updateWind, worldSea } from './world';
import type { BossId } from './seas';
import { stepPlayerStatus, resetPlayerStatus } from './pstatus';
import { stepHazards, clearHazards } from './hazards';
import { checkSeaQuests } from './seaquests';
import { stepQuests, resetQuests } from './quests';
import { applySea } from './seatheme';
import { installDebug2 } from './debug2';
import { addTrauma, addHitstop, hitNumber, activeNumbers, J } from './juice';
import { play, audio } from './audio';
import { stepEnemies, spawnEnemy, damageEnemy, clearEnemies, resetSpawner, sinking, Enemy } from './enemies';
import { showCards, hideCards, showEnd, hideEnd } from './hud';
import { settingsView } from './settings';
import { missingTranslations } from './i18ncheck';
import { menuTap, menuBack, showPause, hideMenu } from './menu';
import { aim } from './aim';
import { TUT } from './tutorialdata';
import { tutTap, stepTutorial, stopTutorial, startTutorial, jumpTutorial } from './tutorial';
import { HEAT, END, heatAt, resetEndless } from './heatdefs';
import { worldHeat } from './world';
import { beginEndless, stepEndless } from './endless';
import { showChoice, hideChoice } from './endlessui';
import { resetCosmetics } from './cosmetics';
import { bump, runCount, noteModLevel, noteAct, noteBoss, noteGold, resetRun, settleRun, checkUnlocks, freeRollsPerRun, M, addDoubloons, unlockAll, resetMeta, unlockedIds } from './meta';

export type RunState = 'menu' | 'paused' | 'playing' | 'levelup' | 'loot' | 'choice' | 'dead' | 'won';
export const FAST = new URLSearchParams(location.search).has('fast');
export const scene = new THREE.Scene();

export const G = {
  state: 'menu' as RunState,
  /** v8: the sea of this run (index into SEAS); bossT0 = time the act boss spawned. */
  sea: 0, bossT0: 0,
  time: 0, actTime: 0, act: 1, lootT: 0, shopBuys: 0, goldFrac: 0, hp: 100, maxHp: 100, level: 1, xp: 0, gold: 0, kills: 0,
  bossTimer: FAST ? 20 : 150, boss: null as Enemy | null, bossSpawned: false, god: false,
  modules: [] as Owned[], modStats: {} as StatMap, buffs: { ram: 0, ward: 0, vanish: false, lantern: 0, pump: 0 }, lv: {} as Levels, st: deriveStats({}), crew: crewState, buy: [] as (Card | null)[],
  cards: [] as Card[], cd: {} as Record<string, number>, hitFlash: 0, baseRoll: false, freeRoll: false, freeRolls: 0,
  // relic run state: Second Wind spent, auto shot counter (Bottled Storm), Golden Compass pending / last act used
  windUsed: false, shots: 0, rareUp: false, compassAct: 0,
  // heading 0 = +Z; forward = (sin h, cos h); turning to port (left) increases heading
  player: { x: 0, z: 0, heading: 0, speed: 0, vx: 0, vz: 0, nitro: 1, nitroDelay: 0, boost: false, turn: 0, turnIn: 0, thr: 0, px: 0, pz: 0, ph: 0 },
  enemies: [] as Enemy[],
};

export const xpNeed = (level: number): number => 5 + 4 * level;
export const STEP = 1 / 60;
export const gainKill = (): void => {
  G.kills++; bump('kills');
  if (killBonus()) { refreshStats(); G.hp = Math.min(G.maxHp, G.hp + 1); } // Admiral Thorne
};

export function gainXp(n: number): void {
  G.xp += n * G.st.xpMul;
  if (TUT.noLevel) G.xp = Math.min(G.xp, xpNeed(G.level) - 1); // tutorial: the level-up comes only at step 6
  checkLevel();
}
function checkLevel(): void {
  if (G.state !== 'playing' || G.xp < xpNeed(G.level)) return;
  G.xp -= xpNeed(G.level);
  G.level++;
  G.state = 'levelup';
  G.baseRoll = true; G.freeRoll = L.cap.freeRoll > 0;
  G.rareUp = L.relic === 'compass' && G.compassAct !== G.act;
  play('levelup');
  rollCards(true);
}
/** States that show the card screen: level-up and boss loot (Rare or better, at most one new module). Both also show the two-card buy row. */
export const isPick = (s: RunState): boolean => s === 'levelup' || s === 'loot';
const cardCtx = () => ({ lv: G.lv, ms: G.modStats, free: freeSlots(L.def.slots, G.modules), rareUp: G.rareUp || G.state === 'loot', loot: G.state === 'loot' });
/** Opens the loot card screen with the same free rerolls as a level-up. */
export function beginPick(): void {
  G.state = 'loot'; G.baseRoll = true; G.freeRoll = L.cap.freeRoll > 0;
  rollCards(true);
}
/** Rolls the 3 free cards (a reroll keeps the buy row) and, when `fresh`, the 2 buyable cards (never a duplicate of a free card). */
function rollCards(fresh = false): void {
  G.cards = rollSet(cardCtx(), G.state === 'loot' && heatAt(4) ? 2 : 3, true, fresh ? undefined : new Set(G.buy.flatMap(c => (c ? [c.id] : [])))); // heat 4: loot shows 2 cards; a reroll never repeats a buy-row card
  if (!G.cards.length) { // everything maxed: nothing to offer
    G.buy = [];
    if (G.state === 'loot') setSail(); else G.state = 'playing';
    return;
  }
  if (fresh) G.buy = heatAt(5) ? [] : rollSet(cardCtx(), 2, true, new Set(G.cards.map(c => c.id))); // heat 5: no buy row
  showCards();
}
/** Applies a rolled card exactly as shown (free pick or purchase). */
export function applyCard(c: Card): void {
  if (c.kind === 'newmod') addModule(c.ref as ModuleId);
  else if (c.kind === 'ship') { G.lv[c.id] = (G.lv[c.id] ?? 0) + 1; refreshStats(); }
  else if (c.kind === 'crew') applyCrewCard(c);
  else if (c.kind === 'evo') evolve(c.ref as ModuleId);
  else if (c.mod && G.modStats[c.mod]) { applyTrackCard(G.modStats[c.mod]!, c); refreshStats(); noteModLevel(c.mod, modLevel(G.modStats[c.mod])); }
  if (c.id === 'hull') G.hp = Math.min(G.maxHp, G.hp + 25);
}

export function refreshStats(): void {
  G.st = deriveStats(G.lv, G.modStats);
  G.maxHp = G.st.maxHp;
}
/** Mounts a module (level 1) in the first free mount of its slot. False if the slot is full or it is already owned. */
export function addModule(id: ModuleId): boolean {
  const def = MODS[id], idx = freeIdx(L.def.slots, G.modules, def.slot);
  if (idx < 0 || G.modules.some(m => m.id === id)) return false;
  G.modules.push({ id, slot: def.slot, idx, cd: 0, cdMax: 0, charges: 1, maxCharges: 1, timer: 1 });
  G.modStats[id] = seedStats(id);
  if (id === 'lantern') G.buffs.lantern = 1;
  noteModLevel(id, modLevel(G.modStats[id]));
  refreshStats();
  return true;
}

export function pickCard(i: number): void {
  const c = G.cards[i], mode = G.state;
  if (!c || !isPick(mode)) return;
  applyCard(c);
  if (mode === 'levelup' && G.rareUp) { G.rareUp = false; G.compassAct = G.act; }
  G.cards = []; G.buy = [];
  hideCards();
  if (mode === 'loot') { setSail(); return; }
  G.state = 'playing';
  checkLevel();
}
/** Free rerolls for the current choice: 1 base, Tankard Tom's per-level one, and the run-wide pool. */
export const rerollsLeft = (): number => (heatAt(5) ? 0 : (G.baseRoll ? 1 : 0) + (G.freeRoll ? 1 : 0) + G.freeRolls); // heat 5: Ironman
export function reroll(): void {
  if (!isPick(G.state) || rerollsLeft() <= 0) return;
  if (G.baseRoll) G.baseRoll = false; else if (G.freeRoll) G.freeRoll = false; else G.freeRolls--;
  bump('rerolls');
  rollCards();
}

/** Gold from any source; the Quartermaster bonus is applied here and fractions carry over. */
export function addGold(n: number): void {
  G.goldFrac += n * G.st.goldMul * (SP.plunder > 0 ? 2 : 1); // Plunder: gold x2
  const whole = Math.floor(G.goldFrac + 1e-9);
  G.gold += whole; G.goldFrac -= whole; noteGold(whole);
}
/** Act 1-3 boss kill: +30 gold, the hull mends (Count Corvo: not at all), then the Plunder card screen opens after a short beat. Act 4 wins. */
export function bossDown(id: BossId): void {
  const final = G.act >= ACTS && !END.on;
  noteBoss(id, final);
  if (G.time - G.bossT0 < 60) runCount('fastBoss');
  if (final) { G.state = 'choice'; showChoice(chooseEndless); return; } // v10: Retire (win) or Sail On (endless)
  addGold(30);
  const before = G.hp;
  if (!heatAt(4)) healPlayer(G.maxHp * L.cap.repair); // heat 4: no repair after bosses
  if (G.hp > before) hitNumber(G.player, G.player.x, 3, G.player.z, G.hp - before, 'heal');
  G.lootT = 1.5;
}
/** The choice after the act-4 boss: Sail On starts endless mode, Retire wins the run. */
export function chooseEndless(sail: boolean): void {
  if (G.state !== 'choice') return;
  hideChoice();
  if (!sail) { endRun(true); return; }
  beginEndless();
  clearEnemies(); clearEnemyProjectiles(); resetSpawner(); clearSpellFx(); clearHazards();
  G.boss = null; G.lootT = 0;
  G.state = 'playing';
}
export function setSail(): void {
  if (G.state !== 'loot') return;
  clearEnemies();
  clearEnemyProjectiles();
  resetSpawner();
  clearSpellFx();
  clearHazards();
  if (!END.on) { // endless: the act stays at 4 and the natural boss never returns
    G.act++;
    noteAct(G.act);
    G.actTime = 0;
    G.bossTimer = FAST ? 20 : 150;
  }
  G.boss = null; G.bossSpawned = END.on; G.lootT = 0;
  G.cards = []; G.buy = []; hideCards();
  G.state = 'playing';
  if (!END.on) resetQuests();
}

/** Captain heals (Count Corvo): clamped to max HP. */
export function healPlayer(n: number): void { if (n > 0) G.hp = Math.min(G.maxHp, G.hp + n * G.st.healMul); }
/** `dot` = damage over time (burn, reef): no shake, flash or hurt sound. */
export function hurtPlayer(n: number, dot = false): void {
  if (G.god || G.state !== 'playing' || SP.rip > 0 || SP.phantom > 0) return; // Riposte and Phantom Ship negate everything
  n *= G.st.dmgTakenMul * (G.buffs.ward > 0 ? G.modStats.ward?.ability.taken ?? 1 : 1) * (G.buffs.pump > 0 ? G.modStats.pump?.ability.taken ?? 1 : 1) * (SP.iron > 0 ? 0.3 : 1);
  n = absorbShield(n); // Flotsam Shield
  if (n <= 0) return;
  G.hp -= n;
  bump('damageTaken', n);
  if (G.hp < G.maxHp * 0.25) runCount('lowHp'); // sea quest: never below 25% HP
  noteHit(); // Carpenters wait 3 s
  if (n >= 0.5) hitNumber(G.player, G.player.x, 3, G.player.z, n, 'hurt');
  if (!dot) {
    G.hitFlash = 0.25;
    addTrauma(0.3);
    if (n >= 15) addHitstop(0.04);
    play('hurt');
  }
  checkDeath();
}
/** Every way the hull can reach 0 HP ends here: Second Wind may save it, otherwise the run ends. */
function checkDeath(): void {
  if (G.hp > 0 || G.god) return;
  if (!secondWind()) { G.hp = 0; endRun(false); }
}
export function endRun(won: boolean): void {
  if (G.state === 'dead' || G.state === 'won') return;
  G.state = won ? 'won' : 'dead';
  bump(won ? 'wins' : 'deaths');
  if (won) { runCount('win'); checkSeaQuests(); }
  showEnd(won, settleRun(doubloonMul()));
}

/** Begins a fresh run with the given loadout (also rebuilds the player model). Used by the menu, ?quick and debug.start. */
export function startRun(ship: ShipId, captain: CaptainId, opts?: Partial<Extras>): void {
  if (TUT.active) stopTutorial();
  const x = sanitizeExtras(ship, captain, opts);
  setLoadout(ship, captain, x);
  saveLoadout(ship, captain, x);
  clearEnemies(); clearEnemyProjectiles(); resetSpawner(); clearHazards(); resetPlayerStatus();
  HEAT.level = x.heat; resetEndless(); hideChoice();
  if (worldSea() !== x.sea || worldHeat() !== x.heat) applySea(x.sea);
  resetRun(x.sea, x.heat); bump('runs'); noteAct(1); checkUnlocks();
  hideCards(); hideEnd(); hideMenu();
  resetCrewRuntime(x.crew);
  const lv: Levels = {}, st = deriveStats(lv);
  Object.assign(G, {
    sea: x.sea, bossT0: 0, time: 0, actTime: 0, act: 1, lootT: 0, shopBuys: 0, goldFrac: 0, level: 1, xp: 0, gold: x.relic === 'map' ? 40 : 0, kills: 0, bossTimer: FAST ? 20 : 150,
    boss: null, bossSpawned: false, modules: [], modStats: {}, lv, st, hp: st.maxHp, maxHp: st.maxHp,
    cards: [], buy: [], cd: {}, hitFlash: 0, baseRoll: false, freeRoll: false, freeRolls: freeRollsPerRun() + (x.relic === 'map' ? 1 : 0),
    windUsed: false, shots: 0, rareUp: false, compassAct: 0,
  });
  resetPassives();
  Object.assign(G.player, { x: 0, z: 0, heading: 0, speed: 0, vx: 0, vz: 0, nitro: 1, nitroDelay: 0, boost: false, turn: 0, turnIn: 0, thr: 0, px: 0, pz: 0, ph: 0 });
  resetAbilities(); clearSummons();
  for (const id of startModules(ship, captain, x.startModule)) addModule(id);
  G.hp = G.maxHp;
  initShip();
  G.state = 'playing';
  resetQuests();
  if (x.relic === 'medal') { G.level = 2; G.state = 'levelup'; G.baseRoll = true; G.freeRoll = L.cap.freeRoll > 0; rollCards(true); } // Admiral's Medal: level 2 and one pick right away
}
const qs = (extra: string): string => location.pathname + '?' + [FAST ? 'fast' : '', extra].filter(Boolean).join('&');
/** Page reload keeps the saved ship and captain and skips the menu. */
export const restartRun = (): void => { location.href = qs('quick'); };
export const toMainMenu = (): void => { location.href = location.pathname + (FAST ? '?fast' : ''); };
export const QUICK = new URLSearchParams(location.search).has('quick');

export function togglePause(): void {
  if (G.state === 'playing') { G.state = 'paused'; showPause(); }
  else if (G.state === 'paused') { G.state = 'playing'; hideMenu(); }
}

export function stepGame(dt: number): void {
  snap(G.player);
  for (const e of G.enemies) snap(e);
  for (const e of edibles) snap(e);
  for (const o of orbs) snap(o);
  for (const p of projectiles) { snap(p); p.py = p.y; }
  for (const c of takeTaps()) {
    if (tutTap(c)) continue;
    if (c === 'Escape' || c === 'KeyP') {
      if (G.state === 'paused' && menuBack()) continue; // settings screen: back to the pause menu
      if (G.state === 'playing' || G.state === 'paused') { togglePause(); continue; }
    }
    if (G.state === 'choice') { if (c === 'Digit1' || c === 'Numpad1') chooseEndless(false); else if (c === 'Digit2' || c === 'Numpad2' || c === 'Enter') chooseEndless(true); }
    else if (G.state === 'menu' || G.state === 'paused') menuTap(c);
    else if (isPick(G.state)) {
      if (c === 'Digit1' || c === 'Numpad1') pickCard(0);
      else if (c === 'Digit2' || c === 'Numpad2') pickCard(1);
      else if (c === 'Digit3' || c === 'Numpad3') pickCard(2);
      else if (c === 'Digit4' || c === 'Numpad4') buyCard(0);
      else if (c === 'Digit5' || c === 'Numpad5') buyCard(1);
      else if (c === 'KeyR') reroll();
    } else if (G.state === 'playing') shipTap(c);
  }
  G.hitFlash = Math.max(0, G.hitFlash - dt);
  if (TUT.active) stepTutorial(dt);
  if (G.state !== 'playing') return;
  G.time += dt;
  G.actTime += dt;
  if (G.st.regen > 0) G.hp = Math.min(G.maxHp, G.hp + G.st.regen * G.st.healMul * dt);
  if (G.lootT > 0 && (G.lootT -= dt) <= 0) { beginPick(); return; }
  if (!G.bossSpawned) G.bossTimer = Math.max(0, G.bossTimer - dt);
  updateWind(dt, G.time);
  stepPlayerStatus(dt);
  stepHazards(dt);
  stepShip(dt);
  loadAround(G.player.x, G.player.z);
  stepEnemies(dt);
  stepEndless(dt);
  stepWeapons(dt);
  stepCrew(dt);
  stepAbilities(dt);
  stepSummons(dt);
  stepProjectiles(dt);
  stepEdibles(dt, G.time);
  stepQuests(dt);
  stepEvo(dt);
  checkDeath();
}

export function installDebug(): void {
  const p = G.player;
  const api = {
    get state() { return G.state; }, get ship() { return L.ship; }, get captain() { return L.captain; },
    get relic() { return L.relic; },
    get loadout() { return { ship: L.ship, captain: L.captain, startModule: L.startModule, relic: L.relic, crew: L.crew, sea: L.sea, heat: L.heat }; },
    get stats() { return { ...G.st }; }, get hp() { return G.hp; }, get maxHp() { return G.maxHp; },
    get level() { return G.level; }, get xp() { return G.xp; }, get gold() { return G.gold; },
    get kills() { return G.kills; }, get bossTimer() { return G.bossTimer; },
    get bossAlive() { return G.boss !== null; },
    player: {
      get x() { return p.x; }, get z() { return p.z; }, get heading() { return p.heading; }, get speed() { return p.speed; },
      get nitro() { return p.nitro; }, get boost() { return p.boost; },
    },
    counts: {
      get enemies() { return G.enemies.length; }, get edibles() { return edibles.length; }, get projectiles() { return projectiles.length; },
    },
    get act() { return G.act; }, get shopPrice() { return shopPrice(); },
    get meta() { return { doubloons: M.doubloons, unlocked: unlockedIds(), disabled: [...M.disabled], stats: JSON.parse(JSON.stringify(M.stats)) as unknown }; },
    fx: {
      get trauma() { return J.trauma; }, get hitstop() { return J.hitstop; },
      get dmgNumbers() { return activeNumbers(); }, get sinking() { return sinking.length; },
    },
    audio: { get muted() { return audio.muted; } },
    get settings() { return settingsView(); },
    render: { get x() { return shipModel.root.position.x; }, get z() { return shipModel.root.position.z; } },
    get weapons() { return G.modules.map(m => m.id); },
    get modules() { return modulesView(); },
    get modStats() { return JSON.parse(JSON.stringify(G.modStats)) as unknown; },
    get enemyList() { return G.enemies.filter(e => !e.dead).map(e => ({ type: e.type, x: e.x, z: e.z, hp: e.hp, hidden: e.hidden, mode: e.mode })); },
    get cards() { return JSON.parse(JSON.stringify(G.cards)) as unknown; },
    get buyRow() { return JSON.parse(JSON.stringify(G.buy)) as unknown; },
    get crew() { return crewView(); },
    get spell() { return spellView(); },
    get aim() { return { ...aim }; },
    get pad() { return { connected: pad.connected, id: pad.id, lastInput: pad.lastInput }; },
    get tutorial() { return { active: TUT.active, step: Math.min(TUT.step + 1, 7), done: TUT.done, confirm: TUT.confirm }; },
    debug: {
      tick: (seconds: number) => { for (let n = Math.round(seconds / STEP); n > 0; n--) stepGame(STEP); },
      spawnEnemy: (type: EnemyType | 'manowar', x: number, z: number) => { spawnEnemy(type === 'manowar' ? 'boss' : type, x, z); },
      addXp: (n: number) => gainXp(n),
      rollCards: (n: number) => rollSet(cardCtx(), n, false),
      pickCard, reroll,
      widenSlots: () => { for (const k of Object.keys(L.def.slots) as (keyof typeof L.def.slots)[]) L.def.slots[k] += 3; },
      hurt: (n: number) => hurtPlayer(n),
      setHp: (n: number) => { G.hp = n; checkDeath(); },
      killBoss: () => {
        if (!G.boss) spawnEnemy('boss', G.player.x + 20, G.player.z);
        if (G.boss) { G.boss.hidden = false; damageEnemy(G.boss, 1e9); }
      },
      addGold: (n: number) => { G.gold += n; },
      setSail, buyCard,
      addCrew: (type: CrewId, n: number) => addCrew(type, n), crewLevel: (type: CrewId, lv: number) => setCrewLevel(type, lv),
      start: (ship: ShipId, captain: CaptainId, opts?: Partial<Extras>) => { if (SHIPS[ship] && CAPTAINS[captain]) startRun(ship, captain, opts); },
      pause: togglePause, tutorial: startTutorial, tutorialStep: jumpTutorial,
      skipToBoss: () => { G.bossTimer = 0; },
      addModule: (id: ModuleId) => MODS[id] !== undefined && addModule(id),
      cast: (key: string) => castBySlotKey(key),
      castSpell: () => castSpell(true),
      addDoubloons, unlockAll, resetMeta: () => { resetMeta(); resetCosmetics(); },
      missingTranslations,
      godMode: (on: boolean) => { G.god = on; },
    },
  };
  (window as unknown as { __game: unknown }).__game = api;
  installDebug2(api);
  installEvoDebug(api);
}
