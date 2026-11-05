import { G, scene, hurtPlayer, bossDown, gainKill, addGold, healPlayer } from './game';
import { SP } from './spelldata';
import { TUT } from './tutorialdata';
import { ENEMIES, ENEMY_GOLD, ACT_HP, ACT_DMG, BOSSES, BossDef, EnemyDef, EnemyType } from './content';
import { Grid, wrap, Prev, lerp, lerpAngle } from './spatial';
import { getShip, makeRaft, makeShip, cloneMats, MatRec, ShipModel } from './models';
import { ENEMY_LOOKS } from './fleet';
import { NEW_MODELS } from './enemymodels';
import { aiBoss, initBoss, bossVisual, bossDied, stepBossFx, clearBossFx } from './bosses';
import { bossFactory } from './monsters';
import { fortPart } from './fortress';
import { initNew, aiNew, spawnPack, spawnBattery, fireshipBlast, newVisual, dive } from './enemies2';
import { stepEHazards, renderEHazards, clearEHazards } from './ehazards';
import { pushOut, nearIsland, reefAt } from './world';
import { fireBall, fireVolley, explode, lobMortar } from './weapons';
import { smoke, splinters, explosion, embers, flame } from './particles';
import { addTrauma, addHitstop, hitNumber } from './juice';
import { seaPose, Pose } from './anim';
import { play } from './audio';
import { L } from './loadout';
import { bump, runCount } from './meta';
import { SEAS, BOSS_IDS, seaBoss, pickEnemy, BossId } from './seas';
import { maybeElite, heatDeath, heatBoss } from './heat';
import { endHp, endDmg, endDensity, EliteTrait, END, HEAT } from './heatdefs';
import { fogHides } from './hazards';
import { stepStatus, ignite, spreadBurn, speedMul, dmgTakenMul } from './status';
import { queueBlast } from './relicfx';
import { spawnOrb } from './edibles';
import { crewDmgMul, boardRam } from './crew';
import { evoDmgMul } from './evomul';
import type * as THREE from 'three';

export interface Enemy extends Prev {
  type: EnemyType; def: EnemyDef; x: number; z: number; heading: number; speed: number;
  hp: number; maxHp: number; r: number; model: ShipModel; fireT: number; ringT: number; side: number;
  contactT: number; dead: boolean; bar: HTMLElement | null; fill: HTMLElement | null; phase: number;
  auxT: number; bd: BossDef | null;
  mats: MatRec[]; flash: number; flashOn: boolean; sink: boolean; sinkT: number; smokeT: number;
  burnT: number; burnDps: number; burnTick: number; stunT: number; slowT: number; slowMul: number; hexT: number; fxT: number; lostT: number; trackT: number; burned?: boolean;
  /** v8 pass 2: hidden = submerged serpent / phased ghost (not targetable); mode/modeT = AI state machine; vis = 0..1 presence (opacity); ax/az = serpent surface point; aim = battery turret. */
  hidden: boolean; mode: number; modeT: number; vis: number; ax: number; az: number; aim: number;
  /** v10 heat 1+: elite trait (heat.ts). */
  elite?: EliteTrait;
}
/** The one targetability rule: the enemy grid only holds targetable enemies, damageEnemy ignores the rest. */
export const targetable = (e: Enemy): boolean => !e.dead && !e.hidden;
/** Never moves: batteries (turrets included) and the Lighthouse Fortress core. No AI movement, pushOut, separation or ram shove. */
const fixed = (e: Enemy): boolean => e.type === 'battery' || !!e.bd?.fort;
export type DmgSource = 'auto' | 'crew' | 'ability' | 'spell' | 'ram' | 'burn' | 'summon' | 'hazard' | 'other';
type DmgHook = (e: Enemy, dealt: number, source: DmgSource) => void;
const dmgHooks: DmgHook[] = [];
/** Pass 4 (quests): called for every damage dealt to a targetable enemy, with where it came from. */
export const onEnemyDamaged = (cb: DmgHook): void => { dmgHooks.push(cb); };
export const enemyGrid = new Grid<Enemy>(8);
/** Killed enemies playing their sink animation. Kept out of G.enemies, the grid and the spawn cap. */
export const sinking: Enemy[] = [];
const SINK_T = 1.2;

const factories: Record<EnemyType, () => ShipModel> = {
  gunboat: () => makeShip(ENEMY_LOOKS.gunboat),
  raft: makeRaft,
  brig: () => makeShip(ENEMY_LOOKS.brig),
  ketch: () => makeShip(ENEMY_LOOKS.ketch),
  boss: bossFactory('manowar'),
  ...NEW_MODELS,
};

/** Build every enemy and boss template up front (visual only, ~2-4 ms each) so a first spawn never hitches. */
export function prewarmShips(): void {
  for (const type of ['gunboat', 'raft', 'brig', 'ketch', 'swarm', 'serpent', 'minelayer', 'ghost', 'battery', 'fireship'] as const) getShip('enemy:' + type, factories[type]);
  for (const id of BOSS_IDS) getShip('boss:' + id, bossFactory(id));
}

/** Endless mode: the next 'boss' spawn is this one instead of the sea's act boss. */
let nextBoss: BossId | null = null;
export function spawnBoss(id: BossId, x: number, z: number): Enemy { nextBoss = id; return spawnEnemy('boss', x, z); }

export function spawnEnemy(type: EnemyType, x: number, z: number): Enemy {
  const def = ENEMIES[type];
  const bd = type === 'boss' ? heatBoss(nextBoss ?? seaBoss(G.sea, G.act)) : null;
  if (type === 'boss') nextBoss = null;
  const model = bd ? getShip('boss:' + bd.id, bossFactory(bd.id)) : getShip('enemy:' + type, factories[type]);
  // factory ship is sized for scale 1.8 (the Man-o'-War); per-boss scale is relative to that
  if (bd) model.root.scale.setScalar(bd.scale / 1.8);
  const mats = cloneMats(model.root);
  scene.add(model.root);
  let bar: HTMLElement | null = null, fill: HTMLElement | null = null;
  if (type !== 'boss') {
    bar = document.createElement('div'); bar.className = 'ebar'; bar.style.display = 'none';
    fill = document.createElement('i'); bar.appendChild(fill);
    document.getElementById('bars')?.appendChild(bar);
  }
  const p = G.player;
  const hp = (bd ? bd.hp : def.hp * ACT_HP[G.act - 1]) * G.st.enemyHp * SEAS[G.sea].hpMul * endHp();
  const e: Enemy = {
    type, def, x, z, px: x, pz: z, ph: Math.atan2(p.x - x, p.z - z), heading: Math.atan2(p.x - x, p.z - z), speed: def.speed, hp, maxHp: hp, r: bd ? def.r * bd.scale / 1.8 : def.r, model,
    fireT: 1 + Math.random() * 1.5, ringT: bd ? bd.ringEvery : 6, side: 1, contactT: 0, dead: false, bar, fill, phase: Math.random() * 6,
    auxT: 4, bd, mats, flash: 0, flashOn: false, sink: false, sinkT: 0, smokeT: 0,
    burnT: 0, burnDps: 0, burnTick: 0, stunT: 0, slowT: 0, slowMul: 1, hexT: 0, fxT: 0, lostT: 0, trackT: 0,
    hidden: false, mode: 0, modeT: 0, vis: 1, ax: 0, az: 0, aim: 0,
  };
  initNew(e);
  if (bd) initBoss(e); else maybeElite(e);
  G.enemies.push(e);
  if (targetable(e)) enemyGrid.insert(e);
  if (type === 'boss') { G.boss = e; G.bossSpawned = true; G.bossT0 = G.time; play('horn'); }
  return e;
}

/** `n` is scaled by the captain's global damage multiplier; `flash` is off for damage over time. */
export function damageEnemy(e: Enemy, n: number, flash = true, source: DmgSource = 'other'): void {
  if (e.dead || e.hidden) return; // submerged / phased: untouchable
  n *= G.st.dmgMul * dmgTakenMul(e) * crewDmgMul(e) * evoDmgMul(e, source);
  const lucky = flash && G.st.lucky > 0 && Math.random() < G.st.lucky; // Tankard Tom: double damage
  if (lucky) n *= 2;
  if (flash && G.st.ignite) ignite(e); // Firebrand Flint: every hit ignites
  const dealt = Math.min(n, e.hp);
  hitNumber(e, e.x, e.r * 0.6 + 1.2, e.z, dealt, lucky ? 'lucky' : e.bd ? 'boss' : 'hit');
  if (flash) e.flash = 0.08;
  if (source === 'spell' && flash && dealt > 0) runCount('spellHit');
  for (const h of dmgHooks) h(e, dealt, source);
  e.hp -= n;
  if (e.hp > 0) return;
  // every kill effect happens now; the sink animation is visual only (see reap/stepSinking)
  e.dead = true; e.sink = e.type !== 'battery'; // a battery crumbles in place
  gainKill(); runCount('kill:' + e.type);
  if (e.burnT > 0 && L.relic === 'opal') spreadBurn(e);
  if (L.relic === 'ghostlamp') queueBlast(e.x, e.z);
  healPlayer(G.st.healKill);
  explosion(e.x, 0.8, e.z, e.r * 1.6);
  splinters(e.x, 0.8, e.z, e.bd ? 14 : 7, 3 + e.r);
  play('explode');
  if (e.def.xp > 0) spawnOrb(e.x, e.z, e.def.xp);
  addGold(ENEMY_GOLD[e.type]);
  heatDeath(e);
  if (e.bd) { G.boss = null; addTrauma(1); addHitstop(0.12); bossDied(e); bossDown(e.bd.id); }
}

export function steer(e: Enemy, tx: number, tz: number, rate: number, dt: number): void {
  if (e.lostT > 0) return; // lost track of the player (Fog Lantern): keeps its heading
  const diff = wrap(Math.atan2(tx - e.x, tz - e.z) - e.heading);
  e.heading += Math.max(-rate * dt, Math.min(rate * dt, diff));
}

/** Reef avoidance (Coral Reefs): a probe ahead of the hull; on a hit, turn toward whichever tangent of the patch is closer to the current heading. */
function avoidReef(e: Enemy, dt: number): void {
  if (SEAS[G.sea].hazard !== 'reef' || e.hidden) return;
  const s = Math.sin(e.heading), c = Math.cos(e.heading), pad = e.r + 1;
  const r = reefAt(e.x + s * (e.r + 7), e.z + c * (e.r + 7), pad) ?? reefAt(e.x + s * (e.r + 2.5), e.z + c * (e.r + 2.5), pad);
  if (!r) return;
  const out = Math.atan2(e.x - r.x, e.z - r.z), t1 = out + Math.PI / 2, t2 = out - Math.PI / 2;
  const want = Math.abs(wrap(t1 - e.heading)) < Math.abs(wrap(t2 - e.heading)) ? t1 : t2;
  const k = e.def.turn * 1.2 * dt, diff = wrap(want - e.heading);
  e.heading += Math.max(-k, Math.min(k, diff));
}

export const dmgK = (e: Enemy): number => (e.bd ? 1 : ACT_DMG[G.act - 1]) * SEAS[G.sea].dmgMul * endDmg();

function ai(e: Enemy, dt: number): void {
  const p = G.player, dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
  let spd = e.def.speed * speedMul(e, d);
  e.fireT -= dt;
  switch (e.type) {
    case 'gunboat':
      steer(e, p.x, p.z, e.def.turn, dt);
      if (d < 6) spd *= 0.3;
      if (d < 12 && e.fireT <= 0) {
        e.fireT = 2;
        fireBall(e.x + Math.sin(toP) * e.r, e.z + Math.cos(toP) * e.r, toP, 14, 5 * dmgK(e), 18, false);
      }
      break;
    case 'raft':
      steer(e, p.x, p.z, e.def.turn, dt);
      break;
    case 'brig': {
      // line up alongside: aim for a point 8 u abreast of the player on the brig's side
      const lx = Math.cos(p.heading), lz = -Math.sin(p.heading);
      const s = (e.x - p.x) * lx + (e.z - p.z) * lz > 0 ? 1 : -1;
      const tx = p.x + lx * s * 8, tz = p.z + lz * s * 8;
      if (Math.hypot(tx - e.x, tz - e.z) > 5) steer(e, tx, tz, e.def.turn, dt);
      else e.heading += Math.max(-e.def.turn * dt, Math.min(e.def.turn * dt, wrap(p.heading - e.heading)));
      const rel = wrap(toP - e.heading);
      for (const side of [1, -1]) {
        if (e.fireT <= 0 && d < 14 && Math.abs(rel - side * Math.PI / 2) < 0.8) {
          e.fireT = 3;
          fireVolley({ x: e.x, z: e.z, heading: e.heading, side, n: 3, aim: toP, len: 3.4, speed: 14, dmg: 6 * dmgK(e), range: 18, friendly: false });
        }
      }
      break;
    }
    case 'ketch': {
      const away = Math.atan2(-dx, -dz);
      const want = d > 18 ? toP : d < 14 ? away : toP + e.side * Math.PI / 2;
      steer(e, e.x + Math.sin(want) * 10, e.z + Math.cos(want) * 10, e.def.turn, dt);
      if (e.fireT <= 0 && d < 26) {
        e.fireT = 3.5;
        lobMortar(e.x, e.z, p.x, p.z, 12 * dmgK(e));
      }
      break;
    }
    case 'boss': spd = aiBoss(e, dt, d, toP, spd); break;
    default: spd = aiNew(e, dt, d, toP, spd);
  }
  e.speed = spd;
  if (fixed(e)) return; // stationary on its island: no movement, no hull rotation, no pushOut
  avoidReef(e, dt);
  e.x += Math.sin(e.heading) * spd * dt;
  e.z += Math.cos(e.heading) * spd * dt;
  pushOut(e, e.r);
}

const SPAWN_FLOOR = [1.5, 1.2, 1.0, 0.8], ALIVE_CAP = [12, 17, 22, 28];
let spawnT = 2;
export const resetSpawner = (): void => { spawnT = 2; };
function stepSpawner(dt: number): void {
  spawnT -= dt * TUT.spawnMul;
  if (spawnT > 0) return;
  const t = G.actTime, ai = Math.min(3, Math.max(0, G.act - 1));
  // Interval ramps down within an act but never below a per-act floor; packs (n) grow slowly and are capped per act.
  spawnT = (Math.max(SPAWN_FLOOR[ai], 3.2 - t * 0.012) * (G.boss ? 2 : 1)) / endDensity();
  // Alive cap rises with the act, endless step and heat; calmer while a boss is up. No spawn at the cap.
  const cap = Math.round((ALIVE_CAP[ai] + (END.on ? 2 * END.step : 0) + 3 * HEAT.level) * (G.boss ? 0.6 : 1));
  if (G.enemies.length >= cap) return;
  const n = 1 + Math.min(ai >= 2 ? 2 : 1, Math.floor(t / 70));
  const a = Math.random() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const type = pickEnemy(G.sea, G.act, t);
    if (type === 'battery') { spawnBattery(); continue; }
    for (let tries = 0; tries < 6; tries++) {
      const aa = a + (Math.random() - 0.5) * 0.5, dist = 50 + Math.random() * 10;
      const x = G.player.x + Math.sin(aa) * dist, z = G.player.z + Math.cos(aa) * dist;
      if (!nearIsland(x, z, 3)) { if (type === 'swarm') spawnPack(x, z); else spawnEnemy(type, x, z); break; }
    }
  }
}

function disposeEnemy(e: Enemy): void {
  scene.remove(e.model.root);
  for (const r of e.mats) r.m.dispose();
}
/** Remove every enemy, including sinking ones, through the normal removal path (no kill credit, no drops). */
export function clearEnemies(): void {
  clearEHazards(); clearBossFx();
  for (const e of G.enemies) { e.dead = true; e.sink = false; }
  reap();
  enemyGrid.clear();
  for (const e of sinking) disposeEnemy(e);
  sinking.length = 0;
}
function reap(): void {
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (!e.dead) continue;
    e.bar?.remove();
    if (G.boss === e) G.boss = null;
    G.enemies.splice(i, 1);
    if (e.sink) { e.sinkT = 0; sinking.push(e); } else disposeEnemy(e);
  }
}

export function stepEnemies(dt: number): void {
  stepSpawner(dt);
  if (!G.boss && !G.bossSpawned && G.bossTimer <= 0) {
    const a = Math.random() * Math.PI * 2;
    spawnEnemy('boss', G.player.x + Math.sin(a) * 40, G.player.z + Math.cos(a) * 40);
  }
  for (const e of G.enemies) {
    if (e.flash > 0) e.flash -= dt;
    if (e.dead) continue;
    e.contactT -= dt;
    stepStatus(e, dt);
    if (e.dead) continue;
    if (e.lostT > 0) e.lostT -= dt;
    else if (G.buffs.lantern > 0 && (e.trackT -= dt) <= 0) {
      e.trackT = 1;
      const ln = G.modStats.lantern?.auto;
      if (ln && Math.hypot(G.player.x - e.x, G.player.z - e.z) > ln.range && Math.random() < ln.chance) e.lostT = 1;
    }
    if (e.stunT > 0 || SP.stop > 0) e.speed = 0; else ai(e, dt); // Time Stop freezes everything
    // soft separation from neighbours (uses last step's grid)
    if (!fixed(e)) enemyGrid.query(e.x, e.z, e.r + 3, o => {
      if (o === e || o.dead) return;
      const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), min = (e.r + o.r) * 0.9;
      if (d < min && d > 0.001) { const k = (min - d) * 0.25 / d; e.x += dx * k; e.z += dz * k; }
    });
  }
  stepBossFx(dt);
  enemyGrid.clear();
  for (const e of G.enemies) if (targetable(e)) enemyGrid.insert(e);
  stepEHazards(dt);

  const p = G.player;
  if (SP.phantom <= 0) enemyGrid.query(p.x, p.z, 8, e => { // Phantom Ship: no contact either way (spells2 deals the damage)
    if (e.dead || Math.hypot(e.x - p.x, e.z - p.z) > e.r + L.geo.contact) return;
    if (e.type === 'raft' || e.type === 'fireship') {
      const safe = G.buffs.ram > 0 || SP.tail > 0, fs = e.type === 'fireship';
      explode(e.x, e.z, fs ? 4 : 3, safe ? 0 : e.def.contact * dmgK(e) * G.st.contactMul, false);
      if (fs) fireshipBlast(e, safe);
      e.dead = true; gainKill(); runCount('kill:' + e.type); // rafts blow up on contact: no sink
      return;
    }
    if (e.contactT <= 0) {
      e.contactT = 0.7;
      const dash = G.buffs.ram > 0;
      if (!dash && SP.tail <= 0 && e.def.contact > 0) hurtPlayer(e.def.contact * dmgK(e) * G.st.contactMul);
      bump('rams');
      damageEnemy(e, (8 + Math.max(0, p.speed)) * G.st.ramMul * (dash ? G.modStats.ram?.ability.dashMul ?? 1 : 1) * (SP.iron > 0 ? 2 : 1), true, 'ram');
      boardRam(e); // Boarders leap across
      if (e.type === 'serpent' && !e.dead) dive(e); // bite, then back under
    }
    if (fixed(e)) return; // never shoved off its island
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1, push = (e.r + L.geo.contact - d) * (G.buffs.ram > 0 ? 2.5 : 0.5);
    e.x += (dx / d) * push; e.z += (dz / d) * push;
  });

  for (const e of G.enemies) if (!e.dead && !fortPart(e) && Math.hypot(e.x - p.x, e.z - p.z) > 130) e.dead = true; // straggler cleanup, no kill credit
  reap();
}

function applyFlash(e: Enemy): void {
  const on = e.flash > 0;
  if (on === e.flashOn) return;
  e.flashOn = on;
  for (const r of e.mats) r.m.emissive.setHex(on ? 0xffffff : r.e);
}
const pose: Pose = { y: 0, pitch: 0, roll: 0 };
function flutter(e: Enemy, t: number): void {
  if (e.model.flag) e.model.flag.rotation.y = Math.sin(t * 6 + e.phase) * 0.35;
}

let lastT = 0;
/** Visual fire on burning ships: flame licks and embers on rafts, embers and smoke on the Fire Galleon. */
function fireVisual(e: Enemy, x: number, y: number, z: number, hd: number, dt: number): void {
  if ((e.smokeT -= dt) > 0) return;
  const s = Math.sin(hd), c = Math.cos(hd);
  if (e.type === 'raft' || e.type === 'fireship') {
    const k = e.type === 'fireship' ? 1.7 : 1;
    e.smokeT = 0.05;
    flame(x + s * 0.25, y + 0.9 * k, z + c * 0.25, 1.4 * k);
    if (Math.random() < 0.35) embers(x + s * 0.25, y + 1.3, z + c * 0.25, 1, 0.2);
  } else {
    e.smokeT = 0.06;
    const k = (Math.random() - 0.5) * e.r * 1.6, side = (Math.random() - 0.5) * e.r * 0.5;
    embers(x + s * k + c * side, y + 1.5, z + c * k - s * side, 1, 0.3);
    if (Math.random() < 0.25) smoke(x - s * e.r * 0.8, y + 2.5, z - c * e.r * 0.8, e.r * 0.5);
  }
}

export function updateEnemyVisuals(t: number, camera: THREE.Camera, w: number, h: number, v: THREE.Vector3, alpha: number): void {
  renderEHazards(t);
  const dt = Math.min(0.1, Math.max(0, t - lastT));
  lastT = t;
  for (const e of G.enemies) {
    const m = e.model, ex = lerp(e.px, e.x, alpha), ez = lerp(e.pz, e.z, alpha), hd = lerpAngle(e.ph, e.heading, alpha);
    seaPose(ex, ez, hd, t, Math.max(1, e.r * 1.3), Math.max(0.6, e.r * 0.5), pose);
    const hid = fogHides(ex, ez);
    m.root.visible = !hid;
    if (hid) { if (e.bar) e.bar.style.display = 'none'; continue; }
    m.root.position.set(ex, pose.y, ez);
    m.root.rotation.y = hd;
    m.tilt.rotation.z = pose.roll + Math.sin(t * 1.2 + e.phase) * 0.03;
    m.tilt.rotation.x = pose.pitch;
    flutter(e, t);
    applyFlash(e);
    if (e.type === 'raft' || e.type === 'fireship' || e.bd?.rafts) fireVisual(e, ex, pose.y, ez, hd, dt);
    if (e.bd) bossVisual(e, t, pose.y);
    if (newVisual(e, t, ex, ez, pose.y, dt) && e.bar) { e.bar.style.display = 'none'; continue; }
    if (e.bar && e.fill) {
      if (e.hp >= e.maxHp) { e.bar.style.display = 'none'; continue; }
      v.set(ex, e.r * 0.8 + 1.8, ez).project(camera);
      e.bar.style.display = '';
      e.bar.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-100%)`;
      e.fill.style.width = Math.max(0, (e.hp / e.maxHp) * 100) + '%';
    }
  }
}

/** Render-time sink animation for killed enemies: tilt ~40 deg, drop to y -3 over 1.2 s, smoke and debris, then remove. */
export function stepSinking(t: number, dt: number): void {
  for (let i = sinking.length - 1; i >= 0; i--) {
    const e = sinking[i], m = e.model;
    e.sinkT += dt;
    if (e.flash > 0) e.flash -= dt;
    applyFlash(e);
    const k = Math.min(1, e.sinkT / SINK_T);
    e.x += Math.sin(e.heading) * e.speed * 0.3 * (1 - k) * dt;
    e.z += Math.cos(e.heading) * e.speed * 0.3 * (1 - k) * dt;
    seaPose(e.x, e.z, e.heading, t, Math.max(1, e.r * 1.3), Math.max(0.6, e.r * 0.5), pose);
    m.root.position.set(e.x, pose.y - 3 * k * k, e.z);
    m.root.visible = !fogHides(e.x, e.z);
    m.root.rotation.y = e.heading;
    m.tilt.rotation.z = pose.roll + 0.7 * k;
    m.tilt.rotation.x = pose.pitch + 0.15 * k;
    if ((e.smokeT -= dt) <= 0) {
      e.smokeT = 0.1;
      smoke(e.x + (Math.random() - 0.5) * e.r, 0.9 - 1.5 * k, e.z + (Math.random() - 0.5) * e.r, e.r * 0.7);
      if (Math.random() < 0.5) splinters(e.x, 0.6, e.z, 1, 2.5);
    }
    if (e.sinkT >= SINK_T) { disposeEnemy(e); sinking.splice(i, 1); }
  }
}
