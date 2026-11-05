import { G, healPlayer } from './game';
import { Owned } from './modules';
import { enemyGrid, damageEnemy, Enemy } from './enemies';
import { shotDmg } from './weapons';
import { rope } from './weapons2';
import { fx } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';

// ---- Crow's Nest sniper and Bilge Pump regeneration (numbers from G.modStats only) ----
/** Sniper: hits the highest-HP enemy within range (360 degrees); extra shots take the next-highest. */
export function snipe(m: Owned): boolean {
  const p = G.player, a = G.modStats.crowsnest?.auto;
  if (!a) return false;
  const range = a.range * G.st.rangeMul, foes: Enemy[] = [];
  enemyGrid.query(p.x, p.z, range + 6, e => { if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) - e.r * 0.5 < range) foes.push(e); });
  if (!foes.length) return false;
  foes.sort((x, y) => y.hp - x.hp);
  const dmg = shotDmg(m);
  for (const e of foes.slice(0, 1 + a.count)) {
    rope(p.x, p.z, e.x, e.z, 0xcfeaff, 0.18);
    fx(e.x, 1.4, e.z, 0xffffff, 0.5, 1.8, 0.2, 1, false, undefined, 'glow');
    damageEnemy(e, dmg, true, 'auto');
  }
  addTrauma(0.08); play('snipe');
  return true;
}

let pumpFx = 0;
/** Passive: while HP is below the threshold, heal hps per second (healPlayer applies the healing multiplier). */
export function pumpTick(dt: number): void {
  const a = G.modStats.pump?.auto, p = G.player;
  if (!a || G.hp >= G.maxHp || G.hp / G.maxHp >= a.threshold) return;
  healPlayer(a.hps * dt);
  if ((pumpFx -= dt) <= 0) { pumpFx = 0.5; fx(p.x + (Math.random() - 0.5) * 2, 1.4, p.z + (Math.random() - 0.5) * 2, 0x9fdcff, 0.25, 0.05, 0.7, 0.9, false, { vx: 0, vy: 3, vz: 0, g: 6 }, 'glow'); }
}
