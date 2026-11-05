import { G } from './game';
import { L } from './loadout';
import { Owned, ModuleId } from './modules';
import { ModStats, abil } from './modstats';
import { damageEnemy } from './enemies';
import { slow, stun, ignite } from './status';
import { rope } from './weapons2';
import { bullet, lobBomb, nearest, inRange } from './weapons3';
import { spawnShark, stepSharks, resetSharks } from './sharks';
import { fx, flame, splinters } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';
import { t } from './i18n';

// ---- actives of the v10 modules (Hail of Lead, Dismast, Volley of Flame, Carpet, Overload, Bullet Storm, Feeding Frenzy, Volley Fire, Golden Tide) + burning patches, sharks upkeep ----
type Cast = (m: Owned, ms: ModStats) => boolean;
const D = Math.PI / 180;
const queue: { t: number; fn: () => void }[] = [];
const after = (t0: number, fn: () => void): void => { queue.push({ t: t0, fn }); };
interface Patch { x: number; z: number; r: number; delay: number; life: number; fxT: number }
const patches: Patch[] = [];
const S = { storm: 0, stormAng: 0, stormT: 0, stormDmg: 0, stormSpd: 28, stormRng: 14 };

export function resetActives3(): void { queue.length = 0; patches.length = 0; Object.assign(S, { storm: 0, stormAng: 0, stormT: 0 }); resetSharks(); }
/** A fire patch on the water that ignites enemies inside it; it lights after `delay` s (when the bomb lands) and burns for `life` s. */
export function addPatch(x: number, z: number, r: number, delay: number, life: number): void { patches.push({ x, z, r, delay, life, fxT: 0 }); }

const ring = (x: number, z: number, color: number, r: number, life = 0.5): void => { fx(x, 0.2, z, color, r * 0.3, r, life, 0.7, true); };

function hail(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, n = abil(ms, 'count');
  if (!nearest(p.x, p.z, 24)) return false;
  for (let i = 0; i < n; i++) {
    after((i / n) * v.span, () => {
      const q = G.player, a = q.heading + (Math.random() - 0.5) * 2 * v.fan * D;
      bullet(q.x + Math.sin(q.heading) * L.geo.chaserAt, q.z + Math.cos(q.heading) * L.geo.chaserAt, a, v.speed, v.dmg * G.st.autoDmgMul, v.range * G.st.rangeMul, G.st.pierce);
      if (i % 4 === 0) play('hit');
    });
  }
  addTrauma(0.2);
  return true;
}

function dismast(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, foes = inRange(p.x, p.z, v.radius), st = abil(ms, 'stun');
  if (!foes.length) return false;
  for (const e of foes) {
    slow(e, v.slowT, 1 - v.slow);
    damageEnemy(e, v.dmg, true, 'ability');
    if (st > 0) stun(e, st);
    splinters(e.x, 1.2, e.z, 8);
    rope(p.x, p.z, e.x, e.z, 0xb4bac2, 0.3);
  }
  ring(p.x, p.z, 0xb4bac2, v.radius * 1.05, 0.6);
  addTrauma(0.35); play('boom'); play('clang');
  return true;
}

function carpet(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, n = abil(ms, 'count');
  if (!nearest(p.x, p.z, 40)) return false;
  for (let i = 0; i < n; i++) {
    after((i / n) * v.span, () => {
      const q = G.player, fx0 = Math.sin(q.heading), fz0 = Math.cos(q.heading), lat = (Math.random() - 0.5) * 4;
      lobBomb(q.x, q.z, q.x - fx0 * (7 + (i % 3) * 2) + fz0 * lat, q.z - fz0 * (7 + (i % 3) * 2) - fx0 * lat, v.dmg, 0.8, v.radius, v.fire);
      play('boom');
    });
  }
  return true;
}

function stormOn(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability;
  if (!nearest(p.x, p.z, v.range * G.st.rangeMul + 6)) return false;
  Object.assign(S, { storm: abil(ms, 'duration'), stormDmg: v.dmg * G.st.autoDmgMul, stormSpd: v.speed, stormRng: v.range * G.st.rangeMul });
  play('whoosh');
  return true;
}

function frenzy(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, a = ms.auto, n = abil(ms, 'count');
  if (!nearest(p.x, p.z, 40)) return false;
  for (let i = 0; i < n; i++) {
    const an = (i / n) * Math.PI * 2;
    spawnShark(p.x + Math.sin(an) * 3, p.z + Math.cos(an) * 3, v.life, a.dmg * G.st.autoDmgMul, a.bite * v.biteMul, a.swim * 1.25);
  }
  addTrauma(0.2);
  return true;
}

function volleyFire(_m: Owned, ms: ModStats): boolean {
  const p = G.player, v = ms.ability, a = ms.auto, n = abil(ms, 'count'), R = v.range * G.st.rangeMul;
  const foes = inRange(p.x, p.z, R).sort((x, y) => Math.hypot(y.x - p.x, y.z - p.z) - Math.hypot(x.x - p.x, x.z - p.z)).slice(0, n);
  if (!foes.length) return false;
  for (const e of foes) {
    const d = Math.hypot(e.x - p.x, e.z - p.z);
    rope(p.x, p.z, e.x, e.z, 0xfff0b0, 0.2);
    fx(e.x, 1.4, e.z, 0xffffff, 0.5, 2.2, 0.25, 1, false, undefined, 'glow');
    damageEnemy(e, v.dmg * (1 + a.bonus * Math.min(1, d / R)), true, 'ability');
  }
  addTrauma(0.25); play('snipe');
  return true;
}

export const CAST3: Partial<Record<ModuleId, Cast>> = {
  swivel: hail, chain: dismast, bombketch: carpet, gatling: stormOn, sharkcage: frenzy, spyglass: volleyFire,
};

export function stepActives3(dt: number): void {
  stepSharks(dt);
  for (let i = queue.length - 1; i >= 0; i--) {
    if ((queue[i].t -= dt) > 0) continue;
    const q = queue[i];
    queue.splice(i, 1);
    q.fn();
  }
  for (let i = patches.length - 1; i >= 0; i--) {
    const s = patches[i];
    if ((s.delay -= dt) > 0) continue;
    if ((s.life -= dt) <= 0) { patches[i] = patches[patches.length - 1]; patches.pop(); continue; }
    for (const e of inRange(s.x, s.z, s.r)) ignite(e);
    if ((s.fxT -= dt) <= 0) { s.fxT = 0.12; flame(s.x + (Math.random() - 0.5) * s.r, 0.5, s.z + (Math.random() - 0.5) * s.r, s.r * 0.9); }
  }
  if (S.storm > 0) {
    S.storm -= dt;
    const p = G.player;
    if ((S.stormT -= dt) <= 0) {
      S.stormT = 0.045; S.stormAng += 0.85;
      for (const o of [0, Math.PI]) {
        const a = S.stormAng + o;
        bullet(p.x + Math.sin(a) * 1.4, p.z + Math.cos(a) * 1.4, a, S.stormSpd, S.stormDmg, S.stormRng, 0);
      }
    }
  }
}
