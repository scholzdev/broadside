import * as THREE from 'three';
import { G, scene, hurtPlayer } from './game';
import { Enemy, spawnEnemy, dmgK, steer } from './enemies';
import { slowPlayer, burnPlayer } from './pstatus';
import { firePool } from './ehazards';
import { ashCloud } from './hazards';
import { makeTelegraph } from './overlays';
import { ARCHES } from './monsters';
import { paintedMesh, Builder } from './geo';
import { SP } from './spelldata';
import { L } from './loadout';
import { fx, splash, explosion, embers, flame, smoke } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';
import type { BossDef } from './content';

// ---- v8 pass 3b: Coral / Ash Leviathan. Surfaced it chases, bites and tail-slams (expanding wave ring); then it dives
// (hidden = untargetable), swims under the sea as a shadow and resurfaces under the ship after a 1.2 s telegraph ring.
// The coral one summons serpents, the ash one spits arcing fireballs and blows an ash cloud that closes the vision. ----
const SURF = 0, DIVE = 1, UNDER = 2, TELE = 3;
const SURF_T = 10, DIVE_T = 0.9, UNDER_T = 2.6, TELE_T = 1.2, RISE_R = 6, SLAM_WIND = 0.8, BITE_WIND = 0.45;
interface MState { slam: number; wind: number; bite: number; biteW: number; sum: number; spit: number; ash: number; tele: THREE.Mesh | null; jaw: number }
const state = new WeakMap<Enemy, MState>();
const st = (e: Enemy): MState => state.get(e) as MState;
interface Ring { x: number; z: number; R: number; max: number; hit: boolean; dmg: number; mesh: THREE.Mesh }
interface Spit { sx: number; sz: number; tx: number; tz: number; t: number; dmg: number; mesh: THREE.Mesh; ring: THREE.Mesh }
const rings: Ring[] = [], spits: Spit[] = [];
const ringGeo = new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2);
let ballGeo: THREE.BufferGeometry | null = null;
const isAsh = (e: Enemy): boolean => (e.bd as BossDef).monster?.look === 'ash';

export function initLeviathan(e: Enemy): void {
  const m = (e.bd as BossDef).monster as NonNullable<BossDef['monster']>;
  state.set(e, { slam: 4, wind: 0, bite: 0, biteW: 0, sum: (m.serpents ?? 0) * 0.4, spit: 2.5, ash: (m.ash ?? 0) * 0.5, tele: null, jaw: 0 });
  e.mode = SURF; e.modeT = SURF_T; e.vis = 0; // rises out of the sea on spawn
}

function dropTele(s: MState): void { if (s.tele) { scene.remove(s.tele); s.tele = null; } }

/** Comes up at (ax, az): big hit if the ship is still inside the ring. */
function emerge(e: Enemy, s: MState): void {
  dropTele(s);
  e.x = e.px = e.ax; e.z = e.pz = e.az; e.hidden = false; e.mode = SURF; e.modeT = SURF_T;
  const p = G.player, ash = isAsh(e);
  e.heading = e.ph = Math.atan2(p.x - e.x, p.z - e.z);
  for (let i = 0; i < 6; i++) splash(e.x + (Math.random() - 0.5) * RISE_R, e.z + (Math.random() - 0.5) * RISE_R);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    fx(e.x + Math.sin(a) * 2, 0.5, e.z + Math.cos(a) * 2, ash ? 0x6a5a50 : 0xe8f6ff, 1.2, 3, 1.0, 0.8, false, { vx: Math.sin(a) * 4, vy: 9 + Math.random() * 4, vz: Math.cos(a) * 4, g: 14 });
  }
  fx(e.x, 0.15, e.z, 0xe8f6ff, 2, RISE_R * 2.2, 0.8, 0.5, true);
  if (ash) { explosion(e.x, 0.8, e.z, RISE_R * 0.8); embers(e.x, 1, e.z, 16, RISE_R * 0.6); firePool(e.x + 2, e.z - 1); firePool(e.x - 2, e.z + 1.5); }
  addTrauma(0.6); play('explode');
  if (Math.hypot(p.x - e.x, p.z - e.z) < RISE_R + L.geo.r * 0.5) {
    hurtPlayer(32 * dmgK(e));
    if (ash) burnPlayer(3, 5);
  }
}

function slam(e: Enemy): void {
  const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(isAsh(e) ? 0xff7a30 : 0xbff4ff).multiplyScalar(1.6), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  mesh.position.set(e.x, 0.35, e.z);
  scene.add(mesh);
  rings.push({ x: e.x, z: e.z, R: 2, max: 22, hit: false, dmg: 16 * dmgK(e), mesh });
  const tx = e.x - Math.sin(e.heading) * 14, tz = e.z - Math.cos(e.heading) * 14;
  for (let i = 0; i < 3; i++) splash(tx + (Math.random() - 0.5) * 3, tz + (Math.random() - 0.5) * 3);
  fx(e.x, 0.15, e.z, 0xffffff, 3, 10, 0.6, 0.7, true);
  addTrauma(0.35); play('boom');
}

function spit(e: Enemy, n: number): void {
  const p = G.player, hx = e.x + Math.sin(e.heading) * 5, hz = e.z + Math.cos(e.heading) * 5;
  ballGeo ??= new Builder().add(new THREE.IcosahedronGeometry(0.75, 1), 0xffa040, undefined, { emit: 0xff5a10, glow: 4, smooth: true }).build();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 2.5 + Math.random() * 4;
    const tx = p.x + p.vx * 1.0 + Math.sin(a) * r, tz = p.z + p.vz * 1.0 + Math.cos(a) * r;
    const ring = makeTelegraph();
    ring.position.set(tx, 0.4, tz);
    scene.add(ring);
    const mesh = paintedMesh(ballGeo, false);
    scene.add(mesh);
    spits.push({ sx: hx, sz: hz, tx, tz, t: 0, dmg: 12 * dmgK(e), mesh, ring });
  }
  flame(hx, 3, hz, 2.4); play('fire');
}

function ashBurst(e: Enemy, secs: number): void {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
    fx(e.x + Math.sin(a) * 2, 2 + Math.random() * 3, e.z + Math.cos(a) * 2, i % 3 ? 0x3a3430 : 0x5a504a, 2.5, 7 + Math.random() * 4, 2.6, 0.75, false, { vx: Math.sin(a) * v, vy: 2 + Math.random() * 2, vz: Math.cos(a) * v });
  }
  embers(e.x, 3, e.z, 14, 4);
  ashCloud(secs, 12);
  play('whoosh');
}

const alive = (type: string): number => G.enemies.reduce((n, o) => n + (o.type === type && !o.dead ? 1 : 0), 0);

/** AI step; returns the movement speed. */
export function aiLeviathan(e: Enemy, dt: number, d: number, spd: number): number {
  const bd = e.bd as BossDef, m = bd.monster as NonNullable<BossDef['monster']>, p = G.player, s = st(e);
  e.modeT -= dt;
  e.vis = Math.max(0, Math.min(1, e.vis + (e.mode === SURF ? 1.6 : -1.3) * dt));
  if (e.mode === SURF) {
    steer(e, p.x, p.z, e.def.turn, dt);
    spd *= s.wind > 0 || s.biteW > 0 ? 0.3 : 0.95;
    s.bite -= dt;
    if (s.biteW > 0 && (s.biteW -= dt) <= 0) {
      s.bite = 2.4;
      if (d < e.r + 3.2) { hurtPlayer(18 * dmgK(e)); addTrauma(0.4); play('clang'); if (isAsh(e)) burnPlayer(2, 4); }
    } else if (s.biteW <= 0 && s.bite <= 0 && d < e.r + 3.5) s.biteW = BITE_WIND;
    if (s.wind > 0) { if ((s.wind -= dt) <= 0) slam(e); }
    else if ((s.slam -= dt) <= 0 && d < 22) { s.slam = 7.5; s.wind = SLAM_WIND; play('whoosh'); }
    if (m.serpents && (s.sum -= dt) <= 0) {
      s.sum = m.serpents;
      if (alive('serpent') < 5 && G.enemies.length < 40) {
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2; spawnEnemy('serpent', e.x + Math.sin(a) * (e.r + 4), e.z + Math.cos(a) * (e.r + 4)); }
        play('horn');
      }
    }
    if (m.spit && (s.spit -= dt) <= 0 && d < 38) { s.spit = m.spit; spit(e, 3); }
    if (m.ash && (s.ash -= dt) <= 0) { s.ash = m.ash; ashBurst(e, 4); }
    if (e.modeT <= 0 && s.wind <= 0 && s.biteW <= 0) { e.mode = DIVE; e.modeT = DIVE_T; e.hidden = true; splash(e.x, e.z); play('splash'); }
  } else if (e.mode === DIVE) {
    spd *= 0.5;
    if (e.modeT <= 0) { e.mode = UNDER; e.modeT = UNDER_T; }
  } else if (e.mode === UNDER) {
    steer(e, p.x, p.z, e.def.turn * 2, dt);
    spd = d > 6 ? 11 : 4;
    if (e.modeT <= 0) { // lock the spot under the ship (a little ahead) and telegraph it
      e.ax = p.x + p.vx * 0.5; e.az = p.z + p.vz * 0.5;
      e.mode = TELE; e.modeT = TELE_T;
      s.tele = makeTelegraph();
      s.tele.position.set(e.ax, 0.4, e.az);
      s.tele.scale.setScalar(RISE_R / 3);
      scene.add(s.tele);
      play('swirl');
    }
  } else {
    spd = 0;
    const k = Math.min(1, dt * 3);
    e.x += (e.ax - e.x) * k; e.z += (e.az - e.z) * k;
    if (s.tele) (s.tele.getObjectByName('fill') as THREE.Object3D).scale.setScalar(0.05 + 0.95 * (1 - Math.max(0, e.modeT) / TELE_T));
    if ((e.fxT -= dt) <= 0) { e.fxT = 0.1; fx(e.ax + (Math.random() - 0.5) * 4, 0.3, e.az + (Math.random() - 0.5) * 4, isAsh(e) ? 0xff8a3a : 0xe8f6ff, 0.3, 1.2, 0.5, 0.8, false, { vx: 0, vy: 3, vz: 0 }); }
    if (e.modeT <= 0) emerge(e, s);
  }
  return spd;
}

/** Fixed-step tick of the wave rings and fireballs (runs even while the boss is stunned or dead). */
export function stepLeviathanFx(dt: number): void {
  if (SP.stop > 0) return;
  const p = G.player;
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.R += 13 * dt;
    r.mesh.scale.setScalar(r.R);
    (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - r.R / r.max);
    const d = Math.hypot(p.x - r.x, p.z - r.z);
    if (!r.hit && Math.abs(d - r.R) < 1.3 + L.geo.r * 0.4) { r.hit = true; hurtPlayer(r.dmg); slowPlayer(1.2, 0.6); }
    if (r.R >= r.max) { scene.remove(r.mesh); (r.mesh.material as THREE.Material).dispose(); rings.splice(i, 1); }
  }
  for (let i = spits.length - 1; i >= 0; i--) {
    const f = spits[i];
    f.t += dt;
    const k = Math.min(1, f.t / 1.1), x = f.sx + (f.tx - f.sx) * k, z = f.sz + (f.tz - f.sz) * k, y = 3 + Math.sin(k * Math.PI) * 8 - 2.6 * k;
    f.mesh.position.set(x, y, z);
    (f.ring.getObjectByName('fill') as THREE.Object3D).scale.setScalar(0.05 + 0.95 * k);
    if (Math.random() < 0.6) flame(x, y, z, 1.4);
    if (k < 1) continue;
    scene.remove(f.mesh); scene.remove(f.ring); spits.splice(i, 1);
    explosion(f.tx, 0.6, f.tz, 3); embers(f.tx, 1, f.tz, 8, 2); smoke(f.tx, 1.5, f.tz, 1.6);
    if (Math.random() < 0.4) firePool(f.tx, f.tz);
    if (Math.hypot(p.x - f.tx, p.z - f.tz) < 3 + L.geo.r * 0.5) { hurtPlayer(f.dmg); burnPlayer(3, 5); }
  }
}

export function clearLeviathanFx(e?: Enemy): void {
  for (const r of rings) { scene.remove(r.mesh); (r.mesh.material as THREE.Material).dispose(); }
  for (const f of spits) { scene.remove(f.mesh); scene.remove(f.ring); }
  rings.length = 0; spits.length = 0;
  const s = e && state.get(e);
  if (s) dropTele(s);
}

let lastT = 0;
/** Per-frame animation: rises/sinks with `vis`, waves the back arches, opens the jaw, lifts the tail before a slam; shadow and bubbles while under. */
export function leviathanVisual(e: Enemy, t: number): void {
  const dt = Math.min(0.1, Math.max(0, t - lastT)), s = st(e), m = e.model, tilt = m.tilt;
  lastT = t;
  const v = e.vis, ash = isAsh(e);
  tilt.visible = v > 0.02;
  tilt.position.y = -(1 - v) * 5.5;
  for (let i = 0; i < ARCHES; i++) {
    const a = tilt.getObjectByName('arch' + i) as THREE.Object3D;
    a.position.y = Math.sin(t * 2.2 - i * 0.9 + e.phase) * 0.35 - 0.1;
    a.position.x = Math.sin(t * 1.3 - i * 0.7 + e.phase) * (0.2 + i * 0.12);
  }
  const head = tilt.getObjectByName('head') as THREE.Object3D, jaw = head.getObjectByName('jaw') as THREE.Object3D;
  const open = s.biteW > 0 ? 1 - s.biteW / BITE_WIND : e.mode === SURF && s.wind <= 0 ? 0.12 + Math.sin(t * 1.7) * 0.08 : 0;
  s.jaw += (open - s.jaw) * Math.min(1, dt * 12);
  jaw.rotation.x = s.jaw * 0.65;
  head.rotation.x = -s.jaw * 0.25 + Math.sin(t * 1.1 + e.phase) * 0.05;
  head.position.y = 0.7 + Math.sin(t * 1.6 + e.phase) * 0.15;
  const tail = tilt.getObjectByName('tail') as THREE.Object3D, lift = s.wind > 0 ? 1 - s.wind / SLAM_WIND : 0;
  tail.position.y = 0.2 + lift * 3.2 + Math.sin(t * 2 + e.phase) * 0.2;
  tail.rotation.x = -lift * 0.9;
  for (const [n, k] of [['finL', 1], ['finR', -1]] as const) (tilt.getObjectByName(n) as THREE.Object3D).rotation.z = k * Math.sin(t * 2.4 + e.phase) * 0.18;
  const sh = m.root.getObjectByName('shadow') as THREE.Mesh;
  (sh.material as THREE.ShaderMaterial).uniforms.uOp.value = 0.6 * (1 - v) * (e.hidden ? 1 : 0);
  if (!e.hidden || (e.smokeT -= dt) > 0) return;
  e.smokeT = 0.07;
  const bx = e.x - Math.sin(e.heading) * Math.random() * 10 + (Math.random() - 0.5) * 3, bz = e.z - Math.cos(e.heading) * Math.random() * 10 + (Math.random() - 0.5) * 3;
  fx(bx, 0.2, bz, ash ? 0x6a5a52 : 0xeaf8ff, 0.2, 0.5, 0.6, 0.8, false, { vx: 0, vy: 2.5, vz: 0 });
  if (Math.random() < 0.3) fx(e.x, 0.1, e.z, ash ? 0xff9a50 : 0xdff4ff, 1, 5, 0.9, 0.35, true);
  if (ash && Math.random() < 0.2) embers(bx, 0.4, bz, 1, 0.5);
}
