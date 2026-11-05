import { t } from './i18n';
import { G, healPlayer } from './game';
import { L } from './loadout';
import { nearestEnemy } from './summons';
import { damageEnemy, Enemy } from './enemies';
import { bolt } from './bolt';
import { popText, addTrauma, hitNumber } from './juice';
import { play } from './audio';
import { explode } from './weapons';
import { fx } from './particles';

// ---- run-time relic effects that need game state (the stat-only ones live in content.deriveStats) ----
const STORM_EVERY = 10, STORM_DMG = 15, STORM_RANGE = 28;

/** Second Wind: once per run, a lethal hit leaves the ship at 30% HP instead. True when it saved the player. */
export function secondWind(): boolean {
  if (L.relic !== 'wind' || G.windUsed) return false;
  G.windUsed = true;
  G.hp = Math.max(1, Math.round(G.maxHp * 0.3));
  addTrauma(0.6);
  popText(G.player.x, 4.5, G.player.z, t('pop.secondWind'), 'heal');
  play('heal'); play('horn');
  return true;
}

/** Bottled Storm: call once per auto shot / fire event; every 10th chains lightning to the 2 nearest enemies. */
export function autoShot(): void {
  if (L.relic !== 'storm' || ++G.shots % STORM_EVERY) return;
  const p = G.player, hit = new Set<Enemy>();
  let fx = p.x, fz = p.z, fy = 2.8;
  for (let i = 0; i < 2; i++) {
    const t = nearestEnemy(fx, fz, STORM_RANGE, hit);
    if (!t) break;
    hit.add(t);
    bolt(fx, fy, fz, t.x, 1.4, t.z);
    damageEnemy(t, STORM_DMG, true, 'other');
    fx = t.x; fz = t.z; fy = 1.4;
  }
  if (hit.size) { addTrauma(0.05); play('zap'); }
}

// ---- Ghost Lantern: a sunk enemy leaves a ghost-fire blast 0.4 s later (queued, so a chain of kills never recurses inside damageEnemy) ----
const blasts: { x: number; z: number; t: number }[] = [];
export function queueBlast(x: number, z: number): void {
  blasts.push({ x, z, t: 0.4 });
  fx(x, 1, z, 0x9fe8d8, 0.8, 2.2, 0.4, 0.8, false, { vx: 0, vy: 2, vz: 0 }, 'glow');
}
export function stepBlasts(dt: number): void {
  for (let i = blasts.length - 1; i >= 0; i--) {
    const b = blasts[i];
    if ((b.t -= dt) > 0) continue;
    blasts.splice(i, 1);
    fx(b.x, 0.6, b.z, 0x7fffe0, 1, 5, 0.35, 0.8, false, undefined, 'glow');
    explode(b.x, b.z, 3, 15, true);
  }
}
export const clearBlasts = (): void => { blasts.length = 0; };

/** Rum Flask: casting the captain spell heals 10 HP. */
export function rumSip(): void {
  if (L.relic !== 'rum') return;
  healPlayer(10);
  hitNumber(G.player, G.player.x, 3.4, G.player.z, 10, 'heal');
}
