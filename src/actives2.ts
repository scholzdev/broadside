import { t } from './i18n';
import { G, healPlayer } from './game';
import { L } from './loadout';
import { Owned } from './modules';
import { ModStats, abil } from './modstats';
import { enemyGrid, Enemy } from './enemies';
import { fireBall } from './weapons';
import { rope } from './weapons2';
import { slow, stun } from './status';
import { plunder } from './edibles';
import { pushOut } from './world';
import { fx, muzzle } from './particles';
import { addTrauma, popText } from './juice';
import { play } from './audio';
import { cleansePlayer } from './pstatus';

// ---- actives of the Harpoon Gun, Carronade, Rocket Rack, Net Thrower, Crow's Nest and Bilge Pump (numbers from G.modStats only) ----
export type Cast = (m: Owned, ms: ModStats) => boolean;
const queue: { t: number; fn: () => void }[] = [];
const after = (t: number, fn: () => void): void => { queue.push({ t, fn }); };
interface Pull { e: Enemy }
const pulls: Pull[] = [];
const S = { pumpFx: 0 };
const PULL_SPEED = 40;

export function resetActives2(): void { queue.length = 0; pulls.length = 0; S.pumpFx = 0; }

function inRange(x: number, z: number, r: number): Enemy[] {
  const out: Enemy[] = [];
  enemyGrid.query(x, z, r + 6, e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.r * 0.5) out.push(e); });
  return out;
}

function reelIn(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability;
  const foes = inRange(p.x, p.z, v.range).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, abil(ms, 'count'));
  if (!foes.length) return false;
  for (const e of foes) {
    rope(p.x, p.z, e.x, e.z, 0xe8d8a8, 0.4);
    fx(e.x, 1.4, e.z, 0xffffff, 0.5, 2, 0.25, 1, false, undefined, 'glow');
    stun(e, v.stun);
    if (!pulls.some(q => q.e === e)) pulls.push({ e });
  }
  addTrauma(0.25); play('clang'); play('whoosh');
  return true;
}

function grapeshot(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, n = abil(ms, 'count'), half = v.half * Math.PI / 180;
  for (const side of [1, -1]) {
    const base = p.heading + side * Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * half) + (Math.random() - 0.5) * 0.06;
      fireBall(p.x + Math.sin(base) * L.geo.flank, p.z + Math.cos(base) * L.geo.flank, a, v.speed * (0.9 + Math.random() * 0.2), v.dmg, v.range * G.st.rangeMul, true, G.st.pierce);
    }
    for (let k = 0; k < 3; k++) muzzle(p.x + Math.sin(base) * 1.6, 0.9, p.z + Math.cos(base) * 1.6, base + (k - 1) * half * 0.6);
  }
  addTrauma(0.35); play('boom'); play('boom');
  return true;
}

function dragNet(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, R = abil(ms, 'radius');
  const foes = inRange(p.x, p.z, R);
  for (const e of foes) slow(e, v.slowT, 1 - v.slow);
  const loot = plunder(R);
  if (!foes.length && !loot) return false;
  fx(p.x, 0.12, p.z, 0xd0a050, 1, R * 1.05, 0.7, 0.8, true);
  fx(p.x, 0.12, p.z, 0xffffff, 1, R * 0.8, 0.9, 0.4, true);
  for (let i = 0; i < 28; i++) { // net threads sweeping in from the rim
    const a = (i / 28) * Math.PI * 2, d = R * (0.7 + Math.random() * 0.3);
    fx(p.x + Math.sin(a) * d, 0.6, p.z + Math.cos(a) * d, 0xd9b26a, 0.35, 0.08, 0.7, 0.9, false, { vx: -Math.sin(a) * d * 1.3, vy: 0.5, vz: -Math.cos(a) * d * 1.3 }, 'glow');
  }
  for (const e of foes) rope(p.x, p.z, e.x, e.z, 0xd0a050, 0.35);
  addTrauma(0.2); play('swirl');
  return true;
}

function emergencyPump(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability;
  healPlayer(G.maxHp * v.heal);
  cleansePlayer(); // v8: washes off slow and burn
  const sh = abil(ms, 'shield');
  if (sh > 0) G.buffs.pump = sh;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 4;
    fx(p.x, 1.2, p.z, 0x9fdcff, 0.3, 0.05, 0.8, 0.9, false, { vx: Math.cos(a) * s, vy: 5 + Math.random() * 4, vz: Math.sin(a) * s, g: 14 }, 'glow');
  }
  fx(p.x, 0.15, p.z, 0x7fc8ff, 1, 8, 0.6, 0.7, true);
  popText(p.x, 4.5, p.z, t('pop.pumped'), 'heal');
  play('heal'); play('splash');
  return true;
}

export const CAST2 = { harpoon: reelIn, carronade: grapeshot, net: dragNet, pump: emergencyPump };

export function stepActives2(dt: number): void {
  const p = G.player;
  for (let i = queue.length - 1; i >= 0; i--) {
    if ((queue[i].t -= dt) > 0) continue;
    const q = queue[i];
    queue.splice(i, 1);
    q.fn();
  }
  for (let i = pulls.length - 1; i >= 0; i--) { // Reel In: the line drags the target alongside
    const { e } = pulls[i];
    const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1, s = Math.min(PULL_SPEED * dt, Math.max(0, d - (L.geo.contact + e.r + 0.6)));
    if (e.dead || s <= 0.001) { pulls.splice(i, 1); continue; }
    e.x += (dx / d) * s; e.z += (dz / d) * s;
    pushOut(e, e.r);
    rope(p.x, p.z, e.x, e.z, 0xe8d8a8, 0.1);
  }
  if (G.buffs.pump > 0) {
    G.buffs.pump -= dt;
    if ((S.pumpFx -= dt) <= 0) { S.pumpFx = 0.2; fx(p.x, 0.2, p.z, 0x7fc8ff, 2.6, 3.4, 0.4, 0.5, true); }
  }
}
