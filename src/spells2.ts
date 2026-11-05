import * as THREE from 'three';
import { t } from './i18n';
import { G, scene } from './game';
import { L, CaptainId } from './loadout';
import { SP } from './spelldata';
import { damageEnemy, enemyGrid, targetable, Enemy } from './enemies';
import { fireBall } from './weapons';
import { stun } from './status';
import { pushOut, nearIsland } from './world';
import { getShip, makeShip, ShipModel } from './models';
import { PLAYER_SHIPS } from './fleet';
import { seaPose, Pose } from './anim';
import { nearestEnemy } from './summons';
import { spawnTreasure } from './edibles';
import { stepBlasts, clearBlasts } from './relicfx';
import { stepPassives } from './capfx';
import { near, ring, rnd } from './spells';
import { aimPoint } from './aim';
import { fx, muzzle } from './particles';
import { addTrauma, popText } from './juice';
import { play } from './audio';
import { lerp, lerpAngle } from './spatial';
import { leadShot } from './lead';

// ---- captains 11-20 spells (cast by themselves, see autocast.ts). Data in spelldata.ts; spells.ts dispatches casts, steps, renders and clears here. ----
const TAU = Math.PI * 2;
interface Escort { x: number; z: number; px: number; pz: number; ph: number; heading: number; a: number; life: number; fireT: number; model: ShipModel }
interface Pull { e: Enemy; left: number }
const escorts: Escort[] = [], pulls: Pull[] = [], phantomHit = new Set<Enemy>();
const S = { flotHp: 0, fxT: 0, hexT: 0, stopT: 0, trailT: 0 };
const pose: Pose = { y: 0, pitch: 0, roll: 0 };
const FLOT_HP = 40, FLOT_T = 8, ESC_R = 8, ESC_N = 3, ESC_T = 10;

/** Glow motes rising from a point (coin pops, sparkles). */
const pop = (x: number, z: number, color: number, n: number, up = 6): void => {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rnd(0.5, 2.5); fx(x, 1.2, z, color, 0.22, 0.05, rnd(0.6, 1), 1, false, { vx: Math.cos(a) * s, vy: rnd(up * 0.6, up), vz: Math.sin(a) * s, g: 18 }, 'glow'); }
};
/** A line of glow motes between two points (rope, beams). */
const beam = (x0: number, z0: number, x1: number, z1: number, color: number, life = 0.3): void => {
  const n = Math.max(4, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1.2));
  for (let i = 0; i <= n; i++) { const k = i / n; fx(lerp(x0, x1, k), 1.6 - Math.sin(k * Math.PI) * 0.6, lerp(z0, z1, k), color, 0.3, 0.06, life, 0.95, false, undefined, 'glow'); }
};

/** Flotsam Shield: soaks incoming damage (called by hurtPlayer after multipliers); returns what gets through. */
export function absorbShield(n: number): number {
  if (SP.flot <= 0 || S.flotHp <= 0) return n;
  const take = Math.min(n, S.flotHp), p = G.player;
  S.flotHp -= take;
  fx(p.x, 1.4, p.z, 0xd9b27a, 0.5, 1.6, 0.25, 0.8, false, undefined, 'glow');
  play('clang');
  if (S.flotHp <= 0) { SP.flot = 0; ring(p.x, p.z, 0xb08a58, 2, 6, 0.4); for (let i = 0; i < 14; i++) fx(p.x + rnd(-2, 2), 1, p.z + rnd(-2, 2), 0x8a5a2b, 0.25, 0.05, 0.7, 1, false, { vx: rnd(-5, 5), vy: rnd(2, 6), vz: rnd(-5, 5), g: 14 }); }
  return n - take;
}

function harpoon(): boolean {
  const p = G.player, foes = near(p.x, p.z, 25);
  if (!foes.length) return false;
  const big = (e: Enemy): number => (e.bd ? 1e6 : 0) + e.r * 100 + e.maxHp;
  const e = foes.sort((a, b) => big(b) - big(a))[0]; // boss first, then the biggest hull
  beam(p.x, p.z, e.x, e.z, 0xe8eef6, 0.5);
  fx(e.x, 1.4, e.z, 0xffffff, 0.5, 2.2, 0.25, 1, false, undefined, 'glow');
  damageEnemy(e, 100, true, 'spell');
  if (!e.dead) { e.stunT = Math.max(e.stunT, 1.5); pulls.push({ e, left: 8 }); } // full stun even on bosses
  addTrauma(0.3); play('clang'); play('whoosh');
  return true;
}

function bribe(): boolean {
  const p = G.player, foes = near(p.x, p.z, 18).filter(e => !e.bd);
  if (!foes.length) return false;
  foes.forEach((e, i) => { stun(e, 4); if (i < 18) pop(e.x, e.z, i % 2 ? 0xffd84a : 0xfff0a0, 4); });
  popText(foes[0].x, 4, foes[0].z, t('pop.bribed'), 'gold');
  ring(p.x, p.z, 0xffd84a, 2, 18, 0.7, 0.6);
  play('coin'); play('coin');
  return true;
}

function treasure(): boolean {
  const p = G.player;
  let n = 0;
  for (let i = 0; i < 18 && n < 6; i++) {
    const a = (n / 6) * TAU + rnd(-0.4, 0.4), d = rnd(6, 12), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    if (nearIsland(x, z, 2)) continue;
    spawnTreasure(x, z, 5);
    pop(x, z, 0xffd84a, 6, 8);
    fx(x, 0.1, z, 0xffd84a, 0.5, 2.4, 0.6, 0.7, true);
    n++;
  }
  ring(p.x, p.z, 0xf0c050, 2, 14, 0.7, 0.6);
  play('coin'); play('ready');
  return true;
}

export const CAST2: Partial<Record<CaptainId, () => boolean>> = {
  thorne() { // Rally the Guns
    const p = G.player;
    for (const m of G.modules) if (m.charges < m.maxCharges) m.cd = Math.max(0.001, m.cd - 3);
    SP.rally = 4;
    ring(p.x, p.z, 0xe0b040, 1, 9);
    for (let i = 0; i < 20; i++) { const a = Math.random() * TAU; fx(p.x, 1.4, p.z, 0xffd36a, 0.2, 0.04, 0.5, 1, false, { vx: Math.cos(a) * 9, vy: rnd(1, 4), vz: Math.sin(a) * 9 }, 'glow'); }
    addTrauma(0.25); play('boom'); play('ready');
    return true;
  },
  isabeau() { // Royal Escort
    const p = G.player;
    for (let i = 0; i < ESC_N; i++) {
      const a = (i / ESC_N) * TAU, model = getShip('escort', () => makeShip({ ...PLAYER_SHIPS.sloop, hull: 0xf3ead2, trim: 0x8a3ac0, accent: 0xe3b546, inner: 0x8a3ac0, flag: 0x8a3ac0, emblem: 'crown' }));
      model.root.scale.setScalar(0.7);
      scene.add(model.root);
      escorts.push({ x: p.x, z: p.z, px: p.x, pz: p.z, ph: p.heading, heading: p.heading, a, life: ESC_T, fireT: 0.3 + i * 0.25, model });
    }
    ring(p.x, p.z, 0xb070e0, 1, 10);
    addTrauma(0.15); play('horn');
    return true;
  },
  driftwood() { // Flotsam Shield
    const p = G.player;
    S.flotHp = FLOT_HP; SP.flot = FLOT_T;
    ring(p.x, p.z, 0xb08a58, 1, 6);
    for (let i = 0; i < 16; i++) { const a = Math.random() * TAU; fx(p.x + Math.cos(a) * 3, 0.5, p.z + Math.sin(a) * 3, 0x8a5a2b, 0.3, 0.06, 0.8, 1, false, { vx: 0, vy: rnd(2, 5), vz: 0, g: 8 }); }
    play('clang'); play('splash');
    return true;
  },
  goldtooth: bribe,
  cass() { // Time Stop
    const p = G.player;
    SP.stop = 3;
    ring(p.x, p.z, 0x9fd8ff, 2, 45, 0.9, 0.8);
    fx(p.x, 1.5, p.z, 0xffffff, 3, 30, 0.35, 0.6, false, undefined, 'glow');
    addTrauma(0.3); play('clang'); play('swirl');
    return true;
  },
  brick() { // All Hands
    const p = G.player;
    SP.hands = 6;
    ring(p.x, p.z, 0xe0883a, 1, 8);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; fx(p.x + Math.cos(a) * 2.5, 1.2, p.z + Math.sin(a) * 2.5, 0xffb060, 0.25, 0.05, 0.6, 1, false, { vx: 0, vy: 5, vz: 0 }, 'glow'); }
    addTrauma(0.2); play('horn'); play('ready');
    return true;
  },
  ines: treasure,
  ghost() { // Phantom Ship
    const p = G.player;
    SP.phantom = 3; phantomHit.clear();
    ring(p.x, p.z, 0x9fe8d8, 1, 9);
    addTrauma(0.2); play('swirl');
    return true;
  },
  hal: harpoon,
  coral() { // Hex
    const c = aimPoint(14, 0, 16), foes = near(c.x, c.z, 16);
    for (const e of foes) { e.hexT = 6; pop(e.x, e.z, 0xc060e0, 3, 4); }
    ring(c.x, c.z, 0xb050d0, 2, 16, 0.7, 0.7);
    addTrauma(0.2); play('tithe');
    return true;
  },
};

export function clearSpells2(): void {
  for (const e of escorts) scene.remove(e.model.root);
  escorts.length = 0; pulls.length = 0; phantomHit.clear(); clearBlasts();
  S.flotHp = 0;
}

function stepEscort(c: Escort, dt: number): void {
  const p = G.player;
  c.px = c.x; c.pz = c.z; c.ph = c.heading;
  c.a += dt * 0.8;
  const tx = p.x + Math.cos(c.a) * ESC_R, tz = p.z + Math.sin(c.a) * ESC_R, dx = tx - c.x, dz = tz - c.z, k = Math.min(1, 3 * dt);
  c.x += dx * k; c.z += dz * k;
  const d = Math.hypot(dx, dz), want = d > 0.8 ? Math.atan2(dx, dz) : Math.atan2(-Math.sin(c.a), Math.cos(c.a)) + Math.PI; // follow the orbit tangent when on station
  c.heading += Math.max(-4 * dt, Math.min(4 * dt, Math.atan2(Math.sin(want - c.heading), Math.cos(want - c.heading))));
  pushOut(c, 1);
  if ((c.fireT -= dt) > 0) return;
  const t = nearestEnemy(c.x, c.z, 24);
  if (!t) { c.fireT = 0.2; return; }
  c.fireT = 0.8;
  const q = leadShot(c.x, c.z, t, 26), aim = Math.atan2(q.x - c.x, q.z - c.z);
  fireBall(c.x + Math.sin(aim) * 1.2, c.z + Math.cos(aim) * 1.2, aim, 26, 7, 26, true);
  muzzle(c.x + Math.sin(aim) * 1.5, 1.0, c.z + Math.cos(aim) * 1.5, aim);
}

export function stepSpells2(dt: number): void {
  const p = G.player;
  for (const k of ['rally', 'hands', 'flot', 'phantom', 'stop'] as const) if (SP[k] > 0) SP[k] = Math.max(0, SP[k] - dt);
  stepBlasts(dt); stepPassives(dt);
  if (SP.tint === 0) { // ship sheen for the v7 buffs
    if (SP.phantom > 0) { SP.tint = 0x9fe8d8; SP.tintI = 1.5; } else if (SP.stop > 0) { SP.tint = 0x9fd8ff; SP.tintI = 1.1; } else if (SP.flot > 0) { SP.tint = 0xb08a58; SP.tintI = 0.6; } else if (SP.hands > 0 || SP.rally > 0) { SP.tint = 0xffa040; SP.tintI = 0.8; }
  }
  for (let i = escorts.length - 1; i >= 0; i--) {
    stepEscort(escorts[i], dt);
    if ((escorts[i].life -= dt) <= 0) { const e = escorts[i]; scene.remove(e.model.root); ring(e.x, e.z, 0xb070e0, 0.5, 3, 0.4); escorts.splice(i, 1); }
  }
  for (let i = pulls.length - 1; i >= 0; i--) { // Harpoon: the line reels the target in
    const { e } = pulls[i];
    const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz), stop = L.geo.contact + e.r + 0.6, s = Math.min(pulls[i].left, 45 * dt, Math.max(0, d - stop));
    if (e.dead || s <= 0.001) { pulls.splice(i, 1); continue; }
    e.x += (dx / d) * s; e.z += (dz / d) * s; pushOut(e, e.r);
    pulls[i].left -= s;
    beam(p.x, p.z, e.x, e.z, 0xe8eef6, 0.12);
  }
  if (SP.phantom > 0) { // sail through enemies: 20 damage to each, once per cast
    enemyGrid.query(p.x, p.z, 10, e => {
      if (e.dead || phantomHit.has(e) || Math.hypot(e.x - p.x, e.z - p.z) > e.r + L.geo.contact) return;
      phantomHit.add(e);
      damageEnemy(e, 20, true, 'spell');
      fx(e.x, 1.2, e.z, 0x9fe8d8, 0.6, 2.4, 0.3, 0.9, false, undefined, 'glow');
      addTrauma(0.08); play('hit');
    });
    if ((S.trailT -= dt) <= 0) { S.trailT = 0.04; const a = Math.random() * TAU; fx(p.x + Math.cos(a) * 1.4, rnd(0.4, 2.2), p.z + Math.sin(a) * 1.4, 0xbff5e8, 0.5, 0.1, 0.6, 0.55, false, { vx: -Math.sin(p.heading) * 2, vy: 1.2, vz: -Math.cos(p.heading) * 2 }, 'glow'); }
  }
  if (SP.stop > 0 && (S.stopT -= dt) <= 0) { // frozen shimmer on every enemy
    S.stopT = 0.15;
    for (const e of G.enemies) if (targetable(e)) fx(e.x + rnd(-1, 1) * e.r * 0.5, rnd(1, 2.5), e.z + rnd(-1, 1) * e.r * 0.5, 0xdff4ff, 0.18, 0.04, 0.5, 0.9, false, { vx: 0, vy: 1, vz: 0 }, 'glow');
  }
  if ((S.hexT -= dt) <= 0) { // Hex: purple sigil under every marked enemy
    S.hexT = 0.2;
    for (const e of G.enemies) if (targetable(e) && e.hexT > 0) {
      fx(e.x, 0.3, e.z, 0xb050d0, e.r * 1.1, e.r * 1.5, 0.35, 0.7, true);
      fx(e.x, 2.4 + e.r * 0.4, e.z, 0xd070ff, 0.4, 0.1, 0.4, 0.9, false, { vx: 0, vy: 1.5, vz: 0 }, 'glow');
    }
  }
}

// ---- visuals: escort sloops and the Flotsam ring (updated per frame) ----
let debris: THREE.Group | null = null;
function ensureDebris(): THREE.Group {
  if (debris) return debris;
  debris = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 });
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 1.1 + (i % 3) * 0.3), m), a = (i / 12) * TAU;
    b.position.set(Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3); b.rotation.y = -a + (i % 2 ? 0.4 : -0.3); b.castShadow = true;
    debris.add(b);
  }
  debris.visible = false;
  scene.add(debris);
  return debris;
}

export function renderSpells2(alpha: number, _dt: number, t: number, sx: number, sz: number): void {
  for (const c of escorts) {
    const x = lerp(c.px, c.x, alpha), z = lerp(c.pz, c.z, alpha), h = lerpAngle(c.ph, c.heading, alpha);
    seaPose(x, z, h, t, 1.2, 0.6, pose);
    c.model.root.position.set(x, pose.y, z);
    c.model.root.rotation.y = h;
    c.model.tilt.rotation.z = pose.roll; c.model.tilt.rotation.x = pose.pitch;
    c.model.root.visible = c.life > 0.5 || Math.floor(t * 12) % 2 === 0;
  }
  const d = ensureDebris();
  d.visible = SP.flot > 0 && S.flotHp > 0;
  if (!d.visible) return;
  d.position.set(sx, 0.35 + Math.sin(t * 3) * 0.08, sz);
  d.rotation.y = t * 1.4;
  const shown = Math.ceil((S.flotHp / FLOT_HP) * d.children.length);
  d.children.forEach((c, i) => { c.visible = i < shown; });
  d.scale.setScalar(SP.flot < 1.5 ? 0.75 + 0.25 * Math.abs(Math.sin(t * 14)) : 1);
}
