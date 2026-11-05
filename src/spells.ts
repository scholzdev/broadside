import * as THREE from 'three';
import { t } from './i18n';
import { G, scene, healPlayer, addGold } from './game';
import { L, CaptainId } from './loadout';
import { SPELLS, SP, clearSP } from './spelldata';
import { enemyGrid, damageEnemy, Enemy } from './enemies';
import { explode } from './weapons';
import { stun, ignite } from './status';
import { pushOut } from './world';
import { projGeo, projMat } from './projvis';
import { plunder } from './edibles';
import { fx, flame, embers, splinters } from './particles';
import { addTrauma, hitNumber, popText } from './juice';
import { play } from './audio';
import { lerp } from './spatial';
import { CAST2, stepSpells2, renderSpells2, clearSpells2 } from './spells2';
import { rumSip } from './relicfx';
import { aimPoint, aim } from './aim';

// ---- captain signature spells (fire on their own, see autocast.ts). Data lives in spelldata.ts; casts are below. Sim runs in stepSpells (fixed step),
// meshes are interpolated per frame in renderSpells, particles are fire-and-forget like the module actives. ----
export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
let cd = 0;
const cdMax = (): number => SPELLS[L.captain].cd * G.st.spellCdMul * (L.relic === 'log' ? 0.8 : 1);

interface Lob { kind: 'barrel' | 'fire'; sx: number; sz: number; tx: number; tz: number; t: number; T: number; x: number; z: number; y: number; px: number; pz: number; py: number; mesh: THREE.Mesh; tr: number }
interface Pool { x: number; z: number; t: number; R: number; tick: number; fxT: number }
interface Whirl { x: number; z: number; t: number; R: number; spin: number; tick: number; inside: Set<Enemy> }
const lobs: Lob[] = [], pools: Pool[] = [], whirls: Whirl[] = [];
const heal = { left: 0, rate: 0, acc: 0, accT: 0, fxT: 0 };
const T = { glint: 0, shim: 0, wind: 0 };

export function near(x: number, z: number, r: number): Enemy[] {
  const out: Enemy[] = [];
  enemyGrid.query(x, z, r + 6, e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.r * 0.5) out.push(e); });
  return out;
}
/** Expanding foam ring on the water. */
export const ring = (x: number, z: number, color: number, r0: number, r1: number, life = 0.6, op = 0.7): void => { fx(x, 0.1, z, color, r0, r1, life, op, true); fx(x, 0.1, z, 0xffffff, r0 * 0.7, r1 * 0.85, life * 1.2, op * 0.5, true); };
/** Glow motes flying from (x,z) to the ship over `life` seconds. */
function stream(x: number, z: number, color: number, n: number, life = 0.5): void {
  const p = G.player;
  for (let i = 0; i < n; i++) {
    const px = x + rnd(-0.8, 0.8), pz = z + rnd(-0.8, 0.8), y = rnd(0.6, 1.8);
    fx(px, y, pz, color, 0.28, 0.06, life, 0.9, false, { vx: (p.x - px) / life, vy: (1.5 - y) / life, vz: (p.z - pz) / life }, 'glow');
  }
}

// ---- lobbed projectiles (Lucky Barrel, Firebomb) ----
function lob(kind: Lob['kind'], dist: number, color: number, r: number): void {
  const p = G.player, maxR = SPELLS[L.captain].maxRange ?? dist, T = 0.8, q = aimPoint(maxR, dist, SPELLS[L.captain].radius);
  let tx = q.x, tz = q.z;
  if (aim.active) { // lead the target (boss) or the cluster's mean drift over the flight, still within range
    tx += aim.vx * T; tz += aim.vz * T;
    const d = Math.hypot(tx - p.x, tz - p.z);
    if (d > maxR) { tx = p.x + (tx - p.x) * maxR / d; tz = p.z + (tz - p.z) * maxR / d; }
  }
  const mesh = kind === 'barrel' ? new THREE.Mesh(projGeo.keg, projMat.keg) : new THREE.Mesh(projGeo.shell, projMat.shell);
  if (kind === 'fire') mesh.scale.setScalar(1.5); else mesh.scale.setScalar(1.8);
  mesh.castShadow = true;
  scene.add(mesh);
  lobs.push({ kind, sx: p.x, sz: p.z, tx, tz, t: 0, T, x: p.x, z: p.z, y: 1, px: p.x, pz: p.z, py: 1, mesh, tr: 0 });
  fx(tx, 0.1, tz, color, r * 1.1, r * 0.35, 0.8, 0.55, true); // landing marker shrinks as it falls
  addTrauma(0.15); play('whoosh');
}
function land(b: Lob): void {
  const { tx, tz } = b;
  if (b.kind === 'fire') {
    explode(tx, tz, 6, 60, true);
    pools.push({ x: tx, z: tz, t: 4, R: 6, tick: 0, fxT: 0 });
    fx(tx, 0.06, tz, 0x1c0c06, 1.2, 6.2, 4, 0.55, true); // scorched water
    for (let i = 0; i < 14; i++) flame(tx + rnd(-4, 4), 0.5, tz + rnd(-4, 4), 2.4);
    play('fire');
    return;
  }
  const roll = Math.random(), p = G.player;
  if (roll < 0.4) {
    explode(tx, tz, 7, 80, true); splinters(tx, 1, tz, 14, 7);
    popText(tx, 3.5, tz, t('pop.bigBlast'), 'blast');
  } else if (roll < 0.7) {
    addGold(15);
    popText(tx, 3.5, tz, t('pop.gold15'), 'gold');
    for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, s = rnd(2, 5); fx(tx, 0.8, tz, i % 2 ? 0xffd84a : 0xfff0a0, 0.2, 0.05, rnd(0.8, 1.2), 1, false, { vx: Math.cos(a) * s, vy: rnd(7, 12), vz: Math.sin(a) * s, g: 22 }, 'glow'); }
    ring(tx, tz, 0xffd84a, 0.5, 4);
    play('coin'); play('coin');
  } else {
    healPlayer(25);
    popText(tx, 3.5, tz, t('pop.grog'), 'grog');
    hitNumber(heal, p.x, 3, p.z, 25, 'heal');
    stream(tx, tz, 0x9affc0, 22, 0.7); ring(tx, tz, 0x8dffb0, 0.5, 3.5);
    for (let i = 0; i < 12; i++) fx(tx, 0.7, tz, 0xe8c070, 0.22, 0.06, 0.6, 0.9, false, { vx: rnd(-3, 3), vy: rnd(4, 8), vz: rnd(-3, 3), g: 16 });
    play('heal');
  }
  addTrauma(roll < 0.4 ? 0.3 : 0.1);
}

// ---- casts: false means nothing happened and no cooldown is spent ----
const CAST: Partial<Record<CaptainId, () => boolean>> = {
  salt() { // Patch Up
    heal.left = G.maxHp * 0.3; heal.rate = heal.left / 3; heal.acc = 0; heal.accT = 0;
    const p = G.player;
    ring(p.x, p.z, 0x5adf7a, 1, 7);
    play('heal');
    return true;
  },
  rosa() { // Tailwind
    const p = G.player;
    p.nitro = 1; SP.tail = 4;
    ring(p.x, p.z, 0x9fe6ff, 1, 8);
    addTrauma(0.15); play('whoosh');
    return true;
  },
  bess() { // Iron Hull
    const p = G.player;
    SP.iron = 4;
    ring(p.x, p.z, 0xaab6c4, 1, 7);
    for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, s = rnd(4, 9); fx(p.x, 1.2, p.z, 0xdfe6ee, 0.1, 0.02, rnd(0.3, 0.6), 1, false, { vx: Math.cos(a) * s, vy: rnd(2, 6), vz: Math.sin(a) * s, g: 14 }, 'glow'); }
    addTrauma(0.3); play('clang');
    return true;
  },
  tom() { lob('barrel', 12, 0xe8a23a, 7); return true; }, // Lucky Barrel
  corvo() { // Blood Tithe
    const p = G.player, foes = near(p.x, p.z, 15);
    if (!foes.length) return false;
    let dealt = 0;
    for (const e of foes) { const hp = e.hp; damageEnemy(e, 20, true, 'spell'); dealt += hp - Math.max(0, e.hp); }
    foes.slice(0, 14).forEach(e => {
      const d = Math.hypot(p.x - e.x, p.z - e.z) || 1, nx = -(p.z - e.z) / d, nz = (p.x - e.x) / d;
      for (let k = 0; k < 7; k++) { // curved tendrils: each mote leaves the enemy on an arc and converges on the ship
        const f = k / 7, bend = Math.sin(f * Math.PI) * rnd(1, 2.4) * (k % 2 ? 1 : -1), life = 0.45 + f * 0.25;
        const sx = e.x + (p.x - e.x) * f * 0.35 + nx * bend, sz = e.z + (p.z - e.z) * f * 0.35 + nz * bend;
        fx(sx, 1.2, sz, k % 2 ? 0xff2040 : 0x901030, 0.35, 0.08, life, 0.95, false, { vx: (p.x - sx) / life, vy: (1.6 - 1.2) / life, vz: (p.z - sz) / life }, 'glow');
      }
      fx(e.x, 1.2, e.z, 0x8a0c24, e.r * 0.5, e.r * 1.4, 0.5, 0.6, false, { vx: 0, vy: 1.5, vz: 0 }, 'soft');
    });
    const h = dealt * 0.5;
    healPlayer(h);
    if (h >= 0.5) hitNumber(heal, p.x, 3, p.z, h, 'heal');
    ring(p.x, p.z, 0xc01030, 2, 16, 0.5, 0.6);
    addTrauma(0.3); play('tithe');
    return true;
  },
  hana() { // Dead Eye
    const p = G.player;
    SP.dead = 5;
    ring(p.x, p.z, 0xff6a3a, 1, 6);
    addTrauma(0.1); play('ready'); play('clang');
    return true;
  },
  morwen() { // Maelstrom
    const { x, z } = aimPoint(SPELLS.morwen.maxRange ?? 18, 10, SPELLS.morwen.radius);
    whirls.push({ x, z, t: 5, R: 8, spin: 0, tick: 0, inside: new Set() });
    ring(x, z, 0x8ad0ff, 2, 9, 0.7);
    addTrauma(0.25); play('swirl');
    return true;
  },
  flint() { lob('fire', 12, 0xff7a1a, 6); return true; }, // Firebomb
  gwen() { // Plunder
    const p = G.player;
    plunder(30);
    SP.plunder = 6;
    ring(p.x, p.z, 0xffd84a, 2, 30, 0.7, 0.6);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU, x = p.x + Math.cos(a) * 30, z = p.z + Math.sin(a) * 30;
      fx(x, 1, z, i % 2 ? 0xffd84a : 0xfff0a0, 0.4, 0.1, 0.6, 0.9, false, { vx: (p.x - x) / 0.6, vy: 0, vz: (p.z - z) / 0.6 }, 'glow');
    }
    addTrauma(0.2); play('coin'); play('whoosh');
    return true;
  },
  dorian() { // Riposte
    const p = G.player;
    SP.rip = 1.5;
    ring(p.x, p.z, 0xffcf5a, 1, 8, 0.5);
    addTrauma(0.2); play('clang');
    return true;
  },
};

export function castSpell(force = false): boolean {
  if (G.state !== 'playing' || (!force && cd > 0)) return false;
  if (!(CAST[L.captain] ?? CAST2[L.captain])?.()) return false;
  cd = cdMax();
  rumSip();
  return true;
}
export const spellView = (): { id: string; name: string; cd: number; cdMax: number } => ({ id: L.captain, name: SPELLS[L.captain].name, cd, cdMax: cdMax() });

/** Cooldown and display state for the ability bar. */
export const spellCd = (): { cd: number; cdMax: number } => ({ cd, cdMax: cdMax() });

// ---- persistent effects ----
function dropLob(i: number): void { scene.remove(lobs[i].mesh); lobs.splice(i, 1); }
/** Clears lobs, pools, whirlpools, timers and heal-over-time (setSail, new run). The cooldown is kept. */
export function clearSpellFx(): void {
  for (let i = lobs.length - 1; i >= 0; i--) dropLob(i);
  pools.length = 0; whirls.length = 0;
  heal.left = 0; clearSP(); clearSpells2();
}
export function resetSpells(): void { clearSpellFx(); cd = 0; }

function stepWhirl(w: Whirl, dt: number): void {
  w.t -= dt; w.spin += dt * 3.2;
  const dmgTick = (w.tick -= dt) <= 0;
  if (dmgTick) w.tick = 0.25;
  const hit: Enemy[] = [];
  enemyGrid.query(w.x, w.z, w.R + 6, e => {
    if (e.dead) return;
    const dx = w.x - e.x, dz = w.z - e.z, d = Math.hypot(dx, dz);
    if (d > w.R + e.r * 0.3) { w.inside.delete(e); return; }
    if (!w.inside.has(e)) { w.inside.add(e); stun(e, 0.5); }
    hit.push(e);
    if (e.bd) { e.x -= (e.x - e.px) * 0.6; e.z -= (e.z - e.pz) * 0.6; return; } // bosses are only slowed
    const s = Math.min(d, 7 * dt), k = d > 0.01 ? s / d : 0;
    e.x += dx * k - (dz / (d || 1)) * 3 * dt; e.z += dz * k + (dx / (d || 1)) * 3 * dt; // pull plus a little swirl
    pushOut(e, e.r);
  });
  if (dmgTick) for (const e of hit) damageEnemy(e, 6.25, false, 'spell'); // 25 dps in 0.25 s chunks
  // swirling foam arms, dark eye, spray
  for (let i = 0; i < 5; i++) {
    const r = rnd(0.8, w.R), a = w.spin + (i % 3) * (TAU / 3) + r * 0.4, sp = 3 + (w.R - r) * 0.5;
    fx(w.x + Math.cos(a) * r, 0.1, w.z + Math.sin(a) * r, 0xffffff, 0.45, 1.1, 0.6, 0.5, true, { vx: -Math.sin(a) * sp, vy: 0, vz: Math.cos(a) * sp });
  }
  if (Math.random() < 0.5) fx(w.x, 0.06, w.z, 0x0a2a48, w.R * 0.25, w.R * 0.6, 0.4, 0.5, true);
  if (Math.random() < 0.4) { const a = Math.random() * TAU, r = rnd(2, w.R); fx(w.x + Math.cos(a) * r, 0.4, w.z + Math.sin(a) * r, 0xcfeaff, 0.25, 0.08, 0.5, 0.8, false, { vx: -Math.sin(a) * 4, vy: rnd(2, 4), vz: Math.cos(a) * 4, g: 8 }); }
  if (w.t <= 0) ring(w.x, w.z, 0x8ad0ff, 2, w.R * 1.2, 0.6);
}

function stepPool(f: Pool, dt: number): void {
  f.t -= dt;
  if ((f.tick -= dt) <= 0) { f.tick = 0.2; for (const e of near(f.x, f.z, f.R)) ignite(e); }
  if ((f.fxT -= dt) <= 0) {
    f.fxT = 0.05;
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * f.R;
    flame(f.x + Math.cos(a) * r, 0.45, f.z + Math.sin(a) * r, 2.2);
    if (Math.random() < 0.3) embers(f.x + Math.cos(a) * r, 0.8, f.z + Math.sin(a) * r, 1, 1);
  }
}

export function stepSpells(dt: number): void {
  const p = G.player;
  if (cd > 0) cd = Math.max(0, cd - dt);
  for (const k of ['dead', 'iron', 'tail', 'rip', 'plunder'] as const) if (SP[k] > 0) SP[k] = Math.max(0, SP[k] - dt);
  // ship sheen: Riposte gold > Iron Hull grey > Patch Up green
  if (SP.rip > 0) { SP.tint = 0xffc030; SP.tintI = 1.6; } else if (SP.iron > 0) { SP.tint = 0x8d9bab; SP.tintI = 1.3; } else if (heal.left > 0) { SP.tint = 0x30c060; SP.tintI = 0.9; } else SP.tint = 0;
  stepSpells2(dt); // v7 captains' spells (spells2.ts); may claim the ship sheen when nothing above did

  if (SP.tail > 0) { // wind streaks rushing past
    const fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading);
    for (let i = 0; i < 2; i++) {
      const a = rnd(-6, 6), b = rnd(-3, 9), x = p.x + fz0 * a + fx0 * b, z = p.z - fx0 * a + fz0 * b, v = 38 + p.speed;
      for (let k = 0; k < 3; k++) fx(x - fx0 * k * 0.9, rnd(0.5, 2.4), z - fz0 * k * 0.9, 0xe8fbff, 0.16, 0.04, 0.35, 0.7, false, { vx: -fx0 * v, vy: 0, vz: -fz0 * v }, 'glow');
    }
  }
  if (SP.iron > 0 && (T.glint -= dt) <= 0) { // metallic glints on the hull
    T.glint = 0.07;
    const a = rnd(-1.2, 1.2), b = rnd(-L.geo.len * 0.4, L.geo.len * 0.4), fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading);
    fx(p.x + fz0 * a + fx0 * b, rnd(0.8, 1.6), p.z - fx0 * a + fz0 * b, 0xf0f6ff, 0.28, 0.04, 0.25, 1, false, undefined, 'glow');
  }
  if (SP.rip > 0 && (T.shim -= dt) <= 0) { // golden shield shimmer
    T.shim = 0.04;
    const a = Math.random() * TAU, h = rnd(0.2, 3), r = 3.2;
    fx(p.x + Math.cos(a) * r, h, p.z + Math.sin(a) * r, 0xffd870, 0.3, 0.06, 0.45, 0.9, false, { vx: 0, vy: 1.2, vz: 0 }, 'glow');
    if (Math.random() < 0.12) ring(p.x, p.z, 0xffcf5a, 2.5, 5, 0.4, 0.5);
  }
  if (heal.left > 0) { // Patch Up: heal over 3 s with green sparkles and merged numbers
    const amt = Math.min(heal.left, heal.rate * dt);
    heal.left -= amt; heal.acc += amt; healPlayer(amt);
    if ((heal.accT += dt) >= 0.5 || heal.left <= 0) { heal.accT = 0; if (heal.acc >= 0.5) hitNumber(heal, p.x, 3, p.z, heal.acc, 'heal'); heal.acc = 0; }
    if ((heal.fxT -= dt) <= 0) {
      heal.fxT = 0.04;
      const a = Math.random() * TAU, r = rnd(0.5, 3);
      fx(p.x + Math.cos(a) * r, 0.3, p.z + Math.sin(a) * r, Math.random() < 0.5 ? 0x7dffb0 : 0xd8ffe0, 0.2, 0.05, 0.8, 0.95, false, { vx: 0, vy: rnd(2, 3.5), vz: 0 }, 'glow');
    }
  }

  for (let i = lobs.length - 1; i >= 0; i--) {
    const b = lobs[i];
    b.px = b.x; b.pz = b.z; b.py = b.y;
    b.t += dt;
    const k = Math.min(1, b.t / b.T);
    b.x = lerp(b.sx, b.tx, k); b.z = lerp(b.sz, b.tz, k);
    b.y = 1 + Math.sin(k * Math.PI) * 6;
    if (k >= 1) { land(b); dropLob(i); }
  }
  for (let i = pools.length - 1; i >= 0; i--) { stepPool(pools[i], dt); if (pools[i].t <= 0) pools.splice(i, 1); }
  for (let i = whirls.length - 1; i >= 0; i--) { stepWhirl(whirls[i], dt); if (whirls[i].t <= 0) whirls.splice(i, 1); }
}

// ---- per-frame visuals: lob meshes, Dead Eye crosshair, Riposte bubble ----
let cross: THREE.Group | null = null, bubble: THREE.Mesh | null = null;
const glowMat = (r: number, g: number, b: number, op: number): THREE.MeshBasicMaterial => {
  const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false });
  m.color.setRGB(r, g, b);
  return m;
};
function ensureMeshes(): void {
  if (cross) return;
  const m = glowMat(3, 0.8, 0.4, 0.9);
  cross = new THREE.Group();
  const rg = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.55, 40), m);
  rg.rotation.x = -Math.PI / 2;
  cross.add(rg);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, tick = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 1.4), m);
    tick.position.set(Math.sin(a) * 3.4, 0, Math.cos(a) * 3.4); tick.rotation.y = a;
    cross.add(tick);
  }
  cross.renderOrder = 20; cross.visible = false;
  bubble = new THREE.Mesh(new THREE.SphereGeometry(3.6, 28, 18), glowMat(1.6, 1.1, 0.35, 0.2));
  bubble.renderOrder = 19; bubble.visible = false;
  scene.add(cross, bubble);
}

export function renderSpells(alpha: number, dt: number, t: number, sx: number, sz: number): void {
  renderSpells2(alpha, dt, t, sx, sz);
  for (const b of lobs) {
    const x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha), z = lerp(b.pz, b.z, alpha);
    b.mesh.position.set(x, y, z);
    b.mesh.rotation.x += dt * 5; b.mesh.rotation.z += dt * 3;
    if ((b.tr += dt) > 0.03) {
      b.tr = 0;
      if (b.kind === 'fire') { flame(x, y, z, 1.6); fx(x, y, z, 0x4a4540, 0.3, 0.8, 0.5, 0.5, false, { vx: 0, vy: 0.5, vz: 0 }, 'soft'); }
      else fx(x, y, z, Math.random() < 0.5 ? 0xffd84a : 0xe8a23a, 0.18, 0.04, 0.4, 0.9, false, { vx: rnd(-1, 1), vy: rnd(0, 2), vz: rnd(-1, 1) }, 'glow');
    }
  }
  ensureMeshes();
  if (cross && bubble) {
    cross.visible = SP.dead > 0;
    if (cross.visible) {
      cross.position.set(sx, 1.4, sz); cross.rotation.y = t * 0.9;
      cross.scale.setScalar(1 + 0.06 * Math.sin(t * 12));
      ((cross.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.min(1, SP.dead / 0.6) * 0.9;
    }
    bubble.visible = SP.rip > 0;
    if (bubble.visible) {
      bubble.position.set(sx, 1.2, sz);
      bubble.scale.set(1.2, 0.8, 1.2).multiplyScalar(1 + 0.05 * Math.sin(t * 14));
      (bubble.material as THREE.MeshBasicMaterial).opacity = Math.min(1, SP.rip / 0.3) * (0.16 + 0.06 * Math.sin(t * 20));
    }
  }
}
