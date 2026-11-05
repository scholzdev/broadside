import * as THREE from 'three';
import { G } from './game';
import { Enemy, spawnEnemy, dmgK, steer } from './enemies';
import { fireBall, fireVolley, fireSkull, lobMortar } from './weapons';
import { firePool } from './ehazards';
import { burnPlayer } from './pstatus';
import { wrap } from './spatial';
import { nearIsland } from './world';
import { fx, flame, splash } from './particles';
import { trackArrow } from './edgearrows';
import { SEAS } from './seas';
import { ghostify, GHOST_ALPHA } from './enemymodels';
import { play } from './audio';
import { initLeviathan, aiLeviathan, leviathanVisual, stepLeviathanFx, clearLeviathanFx } from './leviathan';
import { initFortress, aiFortCore, fortVisual, stepFortress, fortDown, clearFortress } from './fortress';
import { FOG_ARROW_R } from './hazards';
import type { BossDef } from './content';

// ---- v8 pass 3a: boss AI. One circling-broadside core plus the data-driven patterns of BossDef (chain shot, escorts, rage,
// ghost phasing + teleport, skulls, ghost summons, lava mortars, fire trail, fire aura). Remix bosses are just more fields. ----
interface BossState { esc: number; sk: number; gh: number; mor: number; trail: number; aura: number }
const state = new WeakMap<Enemy, BossState>();
const st = (e: Enemy, bd: BossDef): BossState => {
  let s = state.get(e);
  if (!s) { s = { esc: (bd.escort?.every ?? 0) * 0.5, sk: 3, gh: (bd.ghosts?.every ?? 0) * 0.4, mor: 4, trail: 0, aura: 0 }; state.set(e, s); }
  return s;
};
const RED = new THREE.Color(0xff4a3a);
const MODE_SOLID = 0, MODE_TELE = 1, MODE_GHOST = 2;

/** Edge arrow to the boss while it is off-screen (the fog draws its own ring arrows, but only out to FOG_ARROW_R). */
const fogNear = (e: Enemy): boolean => SEAS[G.sea].hazard === 'fog' && Math.hypot(e.x - G.player.x, e.z - G.player.z) < FOG_ARROW_R;
trackArrow('boss', () => (G.boss && !G.boss.dead && !fogNear(G.boss) ? G.boss : null), 'boss');

/** Called once at spawn. */
export function initBoss(e: Enemy): void {
  const bd = e.bd as BossDef;
  if (bd.monster) initLeviathan(e);
  if (bd.fort) initFortress(e);
  if (bd.phase) { for (const r of e.mats) r.m.transparent = true; e.mode = MODE_SOLID; e.modeT = bd.phase.solid * 0.6; }
  if (bd.id === 'ghostgalleon' || bd.id === 'drownedadmiral') ghostify(e.model.root, e.mats, 6);
}
const raged = (e: Enemy, bd: BossDef): boolean => bd.rage !== undefined && e.hp < e.maxHp * bd.rage;

function ring(e: Enemy, n: number, speed: number, dmg: number): void {
  for (let i = 0; i < n; i++) fireBall(e.x, e.z, (i / n) * Math.PI * 2 + e.phase, speed, dmg * dmgK(e), 24, false);
}
function nearBoss(e: Enemy, type: 'swarm' | 'ghost', n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = e.r + spread * (0.5 + Math.random() * 0.5);
    spawnEnemy(type, e.x + Math.sin(a) * r, e.z + Math.cos(a) * r);
  }
}
const alive = (type: string): number => G.enemies.reduce((n, o) => n + (o.type === type && !o.dead ? 1 : 0), 0);

/** Pick a spot ~18 u from the ship that is open water. */
function teleportSpot(e: Enemy): void {
  const p = G.player;
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    e.ax = p.x + Math.sin(a) * 18; e.az = p.z + Math.cos(a) * 18;
    if (!nearIsland(e.ax, e.az, e.r + 2)) return;
  }
}

function phaseStep(e: Enemy, bd: BossDef, dt: number): void {
  const ph = bd.phase as NonNullable<BossDef['phase']>;
  e.modeT -= dt;
  if (e.mode === MODE_SOLID && e.modeT <= 0) {
    e.hidden = true;
    if (ph.tele) { teleportSpot(e); e.mode = MODE_TELE; e.modeT = 1.3; } else { e.mode = MODE_GHOST; e.modeT = ph.ghost; }
  } else if (e.mode === MODE_TELE) {
    if ((e.fxT -= dt) <= 0) { // shimmer: rings contracting on the spot where it will return
      e.fxT = 0.12;
      fx(e.ax, 0.15, e.az, 0x8affc8, 7 * (e.modeT / 1.3) + 1, 1, 0.3, 0.7, true);
      fx(e.ax + (Math.random() - 0.5) * e.r, 1 + Math.random() * 3, e.az + (Math.random() - 0.5) * e.r, 0x8affc8, 0.3, 0.05, 0.6, 0.6, false, { vx: 0, vy: 1, vz: 0 }, 'glow');
    }
    if (e.modeT <= 0) {
      e.x = e.ax; e.z = e.az; e.px = e.x; e.pz = e.z; e.heading = e.ph = Math.atan2(G.player.x - e.x, G.player.z - e.z);
      splash(e.x, e.z);
      e.mode = MODE_GHOST; e.modeT = ph.ghost;
    }
  } else if (e.mode === MODE_GHOST && e.modeT <= 0) {
    e.mode = MODE_SOLID; e.modeT = ph.solid; e.hidden = false;
    ring(e, 10, 9, 5); // spectral ring as it solidifies
    play('horn');
  }
  e.vis += ((e.hidden ? 0.2 : 1) - e.vis) * Math.min(1, dt * 6);
}

/** Boss AI step; returns the movement speed. */
export function aiBoss(e: Enemy, dt: number, d: number, toP: number, spd: number): number {
  const bd = e.bd as BossDef;
  if (bd.monster) return aiLeviathan(e, dt, d, spd * (bd.spd ?? 1));
  if (bd.fort) return aiFortCore(e, dt, d, toP);
  const p = G.player, s = st(e, bd), hpf = e.hp / e.maxHp, rage = raged(e, bd);
  if (rage && e.mode !== 1 && !bd.phase) { // Jolly Roger: red tint, faster
    e.mode = 1;
    for (const r of e.mats) { r.m.color.lerp(RED, 0.4); r.e = 0x4a0a06; r.m.emissive.setHex(r.e); }
    play('horn');
  }
  if (bd.phase) phaseStep(e, bd, dt);
  spd *= (bd.spd ?? 1) * (rage ? 1.4 : 1);
  if (e.mode === MODE_TELE) spd = 0;
  // circle the player at 15 u. e.side = +1 keeps the player on the boss's port flank.
  const ang = Math.atan2(e.x - p.x, e.z - p.z) + e.side * 0.5;
  steer(e, p.x + Math.sin(ang) * 15, p.z + Math.cos(ang) * 15, e.def.turn * (rage ? 1.3 : 1), dt);
  const rel = wrap(toP - e.heading), live = !e.hidden;
  if (live && e.fireT <= 0 && Math.abs(rel - e.side * Math.PI / 2) < 0.6) {
    e.fireT = rage ? 2 : 3;
    fireVolley({ x: e.x, z: e.z, heading: e.heading, side: e.side, n: bd.balls, aim: toP, len: 8, speed: 16, dmg: 7 * dmgK(e), range: 32, friendly: false, chain: bd.chain });
    e.side = -e.side;
  }
  if (live && bd.rafts && (e.auxT -= dt) <= 0) {
    e.auxT = 8;
    const a = Math.random() * Math.PI * 2;
    spawnEnemy('raft', e.x + Math.sin(a) * (e.r + 2), e.z + Math.cos(a) * (e.r + 2));
  }
  if (live && (rage || hpf < bd.ringBelow) && (e.ringT -= dt) <= 0) {
    e.ringT = bd.ringEvery * (rage ? 0.6 : 1);
    ring(e, 12, 11, 6);
  }
  if (live && bd.escort && (s.esc -= dt) <= 0) {
    s.esc = bd.escort.every * (rage ? 0.7 : 1);
    if (alive('swarm') < 12 && G.enemies.length < 40) nearBoss(e, 'swarm', bd.escort.n, 4);
  }
  if (live && bd.ghosts && (s.gh -= dt) <= 0) {
    s.gh = bd.ghosts.every;
    if (alive('ghost') < 4 && G.enemies.length < 40) { nearBoss(e, 'ghost', bd.ghosts.n, 5); play('horn'); }
  }
  if (live && bd.skulls && d < 45 && (s.sk -= dt) <= 0) {
    s.sk = bd.skulls;
    for (const o of [-0.5, 0.5]) fireSkull(e.x, e.z, toP + o, 9 * dmgK(e));
  }
  if (live && bd.mortar && d < 40 && (s.mor -= dt) <= 0) {
    s.mor = bd.mortar.every;
    for (let i = 0; i < bd.mortar.n; i++) {
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 6;
      lobMortar(e.x, e.z, p.x + p.vx * 0.9 + Math.sin(a) * r, p.z + p.vz * 0.9 + Math.cos(a) * r, 16 * dmgK(e));
    }
  }
  if (bd.trail && (s.trail -= dt) <= 0) {
    s.trail = 0.9;
    firePool(e.x - Math.sin(e.heading) * e.r * 0.9, e.z - Math.cos(e.heading) * e.r * 0.9);
  }
  if (bd.aura !== undefined && hpf < bd.aura) {
    const R = e.r + 4;
    if (d < R + 1) burnPlayer(1.5, 5);
    if ((s.aura -= dt) <= 0) {
      s.aura = 0.1;
      fx(e.x, 0.12, e.z, 0xff5a1a, R * 2, R * 2.1, 0.2, 0.2, true);
      const a = Math.random() * Math.PI * 2;
      flame(e.x + Math.sin(a) * R, 0.4, e.z + Math.cos(a) * R, 1.6);
    }
  }
  return spd;
}

/** Per-frame visual of a boss: phased bosses go translucent and bob. */
export function bossVisual(e: Enemy, t: number, y: number): void {
  const bd = e.bd as BossDef;
  if (bd.monster) { leviathanVisual(e, t); return; }
  if (bd.fort) { fortVisual(e, t); return; }
  if (bd.id === 'drownedadmiral') { for (const r of e.mats) { r.m.opacity = GHOST_ALPHA; r.m.depthWrite = false; } return; }
  if (!bd.phase) return;
  const ghostly = bd.id === 'ghostgalleon';
  for (const r of e.mats) { r.m.opacity = ghostly ? e.vis * GHOST_ALPHA : e.vis; r.m.depthWrite = !ghostly && e.vis > 0.9; }
  e.model.root.position.y = y + 0.4 + Math.sin(t * 1.6 + e.phase) * 0.15;
}

/** Boss killed (damageEnemy, before bossDown): tear down its linked parts and effects. */
export function bossDied(e: Enemy): void {
  const bd = e.bd as BossDef;
  if (bd.fort) fortDown();
  if (bd.monster) clearLeviathanFx(e);
}
/** Fixed-step tick of boss-owned effects that outlive stuns and the boss itself. */
export function stepBossFx(dt: number): void { stepLeviathanFx(dt); stepFortress(); }
/** Act change / new run: drop every boss-owned object (fortress collider, beam, rings, fireballs). */
export function clearBossFx(): void { clearLeviathanFx(G.boss ?? undefined); clearFortress(); }
