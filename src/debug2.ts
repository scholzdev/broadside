import { G } from './game';
import { M } from './meta';
import { PS, playerSpeedMul } from './pstatus';
import { hazardView, erupt } from './hazards';
import { reefs, reefAt, islands } from './world';
import { seaQuestView } from './seaquests';
import { arrowCount } from './edgearrows';
import { damageEnemy } from './enemies';
import { SEAS } from './seas';
import { holdKeys } from './input';
import { ehazardView } from './ehazards';
import { quests, questView, resetQuests, completeQuest } from './quests';
import { endlessView, endlessStep } from './endless';
import { heatView, makeElite } from './heat';
import { chooseEndless } from './game';
import { END } from './heatdefs';
import { spawnEnemy } from './enemies';
import type { EliteTrait } from './heatdefs';
import type { EnemyType } from './content';

/** v8 debug additions on window.__game: sea, statuses, hazards, sea quests (kept out of game.ts for size). */
export function installDebug2(api: Record<string, unknown> & { debug: Record<string, unknown> }): void {
  Object.defineProperties(api, {
    sea: { get: () => G.sea, enumerable: true },
    seaId: { get: () => SEAS[G.sea].id, enumerable: true },
    seaMeta: { get: () => ({ seasUnlocked: M.seasUnlocked, seaBest: [...M.stats.seaBest], seaWins: [...M.stats.seaWins], bossKills: { ...M.stats.bossKills }, seaQuests: [...M.seaQuests] }), enumerable: true },
    status: { get: () => ({ slowT: PS.slowT, slowMul: PS.slowMul, burnT: PS.burnT, burnDps: PS.burnDps, speedMul: playerSpeedMul() }), enumerable: true },
    hazards: { get: () => hazardView(), enumerable: true },
    seaQuests: { get: () => seaQuestView(), enumerable: true },
    arrows: { get: () => arrowCount(), enumerable: true },
    ehazards: { get: () => ehazardView(), enumerable: true },
    quests: { get: () => questView(), enumerable: true },
    endless: { get: () => endlessView(), enumerable: true },
    heat: { get: () => heatView(), enumerable: true },
  });
  Object.assign(api.debug, {
    setPos: (x: number, z: number) => { Object.assign(G.player, { x, z, px: x, pz: z, vx: 0, vz: 0, speed: 0 }); },
    /** Reef patches near the ship (nearest first). */
    reefs: () => reefs.map(r => ({ ...r, d: Math.hypot(r.x - G.player.x, r.z - G.player.z) })).sort((a, b) => a.d - b.d).slice(0, 8),
    islands: () => islands.map(i => ({ x: i.x, z: i.z, r: i.r, d: Math.hypot(i.x - G.player.x, i.z - G.player.z) })).sort((a, b) => a.d - b.d).slice(0, 8),
    /** Damage every live enemy (shows their HP bars). */
    damageAll: (n: number) => { for (const e of [...G.enemies]) damageEnemy(e, n); },
    /** Render-side view of enemies: mesh visible, HP bar shown, distance to the ship. */
    enemyVis: () => G.enemies.map(e => ({ type: e.type, d: Math.hypot(e.x - G.player.x, e.z - G.player.z), mesh: e.model.root.visible, bar: e.bar ? e.bar.style.display !== 'none' : null })),
    completeQuest: (i: number) => { if (quests[i]) completeQuest(quests[i]); },
    rollQuests: () => resetQuests(),
    /** Endless: advance one step now (every 3rd spawns a boss on the next tick). */
    endlessStep: () => { if (END.on) endlessStep(); },
    chooseEndless,
    /** Spawns an elite of a type and trait near the ship. */
    spawnElite: (type: EnemyType, trait: EliteTrait, x = G.player.x + 14, z = G.player.z) => { const e = spawnEnemy(type, x, z); makeElite(e, trait); return e.maxHp; },
    onReef: () => reefAt(G.player.x, G.player.z) !== null,
    erupt: (x?: number, z?: number) => erupt(x ?? G.player.x, z ?? G.player.z),
    /** Hold keys (e.g. ['KeyW']) for the following debug ticks; [] releases. */
    hold: (codes: string[]) => holdKeys(codes),
  });
}
