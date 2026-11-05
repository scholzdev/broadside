import { G, STEP } from './game';
import { spawnBoss } from './enemies';
import { BOSS_IDS, BossId } from './seas';
import { END, ENDLESS_T, BOSS_EVERY, endReward, resetEndless } from './heatdefs';
import { noteEndless, runCount, bump } from './meta';
import { checkSeaQuests, toast } from './seaquests';
import { t } from './i18n';
import { bossName } from './lname';
import { play } from './audio';
import { addTrauma } from './juice';

// ---- Endless mode (v10): after the act-4 boss, "Sail On" escalates every ENDLESS_T s; every BOSS_EVERY-th step a random boss from any sea arrives ----
/** Bosses that can show up: every boss except the stationary Lighthouse Fortress. */
export const ENDLESS_BOSSES: BossId[] = BOSS_IDS.filter(id => id !== 'lighthouse');
let pendingBoss = false;

/** Called when the player chooses "Sail On": from now on the run is endless. */
export function beginEndless(): void {
  resetEndless();
  END.on = true; pendingBoss = false;
  runCount('win'); bump('wins'); checkSeaQuests(); // the sea counts as won the moment the act-4 boss falls
}
export function endlessStep(): void {
  END.step++; END.t = 0; END.dbl += endReward(END.step);
  noteEndless(END.step);
  toast(`<small>${t('endless.step', { n: END.step })}</small><b>${t('endless.stronger')}</b><span>+${endReward(END.step)} &#10687;</span>`);
  play('horn'); addTrauma(0.25);
  if (END.step % BOSS_EVERY === 0) pendingBoss = true;
}
function spawnRandomBoss(): void {
  const id = ENDLESS_BOSSES[Math.floor(Math.random() * ENDLESS_BOSSES.length)], a = Math.random() * Math.PI * 2;
  pendingBoss = false;
  spawnBoss(id, G.player.x + Math.sin(a) * 40, G.player.z + Math.cos(a) * 40);
  toast(`<small>${t('endless.boss')}</small><b>${bossName(id)}</b>`);
}
/** Fixed-step tick (playing only). The clock waits while a boss is alive. */
export function stepEndless(dt = STEP): void {
  if (!END.on || G.boss) return;
  if (pendingBoss) { spawnRandomBoss(); return; }
  if ((END.t += dt) >= ENDLESS_T) endlessStep();
}
export const endlessView = () => ({ on: END.on, step: END.step, t: END.t, doubloons: Math.floor(END.dbl), pendingBoss });
