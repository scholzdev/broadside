import { heatAt } from './heatdefs';
import * as THREE from 'three';
import { G, scene, hurtPlayer } from './game';
import { Enemy, spawnEnemy, dmgK } from './enemies';
import { islands, reefAt, Island } from './world';
import { fireBall, lobMortar } from './weapons';
import { slowPlayer } from './pstatus';
import { LAMP_Y, FORT_R, TURRET_R } from './monsters';
import { SEAS } from './seas';
import { L } from './loadout';
import { wrap } from './spatial';
import { fx, explosion, smoke, splinters, embers } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';
import type { BossDef } from './content';

// ---- v8 pass 3b: Lighthouse Fortress. A stationary core on its own island collider, guarded by turrets (battery-type enemies
// with their own HP bars). The core stays hidden (untargetable) until every turret is down. The lantern sweeps a light beam
// over the water that hurts and slows the ship inside it; once exposed it sweeps two beams and adds ball rings. ----
const BEAM_R = 17, BEAM_HALF = 0.2, BEAM_DMG = 7;
interface Fort { core: Enemy; turrets: Enemy[]; isl: Island; beam: THREE.Group; ang: number; hitT: number; ringT: number; morT: number; alt: boolean; open: boolean; fxT: number }
let F: Fort | null = null;

/** Core or one of its turrets (exempt from straggler cleanup, pinned to their spots). */
export const fortPart = (e: Enemy): boolean => !!F && (F.core === e || F.turrets.includes(e));
export const isFortTurret = (e: Enemy): boolean => !!F && F.turrets.includes(e);

const beamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uR: { value: BEAM_R }, uHalf: { value: BEAM_HALF } },
  vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uR, uHalf; varying vec2 vP;
    void main() {
      float d = length(vP) / uR, a = abs(atan(vP.x, vP.y)) / uHalf;
      float k = (1.0 - smoothstep(0.75, 1.0, d)) * smoothstep(0.08, 0.25, d) * (1.0 - smoothstep(0.55, 1.0, a));
      float rim = (1.0 - smoothstep(0.0, 0.06, abs(a - 0.95))) * 0.5 * (1.0 - smoothstep(0.85, 1.0, d));
      gl_FragColor = vec4(vec3(1.0, 0.86, 0.5) * (k * 0.6 + rim) * 0.8, 1.0);
    }`,
});
const volMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe0a0).multiplyScalar(0.22), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** One beam: a lit sector on the water plus a faint light cone from the lantern (local +Z = beam direction). */
function beamPart(lamp: number): THREE.Group {
  const g = new THREE.Group();
  const sector = new THREE.Mesh(new THREE.CircleGeometry(BEAM_R, 24, -Math.PI / 2 - BEAM_HALF, BEAM_HALF * 2).rotateX(-Math.PI / 2), beamMat);
  sector.position.y = 0.3;
  const len = Math.hypot(lamp, BEAM_R * 0.9), dir = new THREE.Vector3(0, -lamp, BEAM_R * 0.9).normalize();
  const vol = new THREE.Mesh(new THREE.ConeGeometry(BEAM_R * Math.tan(BEAM_HALF) * 0.9, len, 16, 1, true).translate(0, -len / 2, 0), volMat);
  vol.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  vol.position.y = lamp;
  g.add(sector, vol);
  return g;
}

/** Open water ~30 u from the ship, clear of islands and reefs. */
function fortSpot(): [number, number] {
  const p = G.player;
  let best: [number, number] = [p.x + 30, p.z];
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 8, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
    best = [x, z];
    if (!reefAt(x, z, FORT_R + 2) && !islands.some(o => Math.hypot(o.x - x, o.z - z) < o.r + FORT_R + 9)) break;
  }
  return best;
}

export function initFortress(e: Enemy): void {
  clearFortress();
  const bd = e.bd as BossDef, fd = bd.fort as NonNullable<BossDef['fort']>, k = bd.scale / 1.8;
  const [x, z] = fortSpot();
  e.x = e.px = e.ax = x; e.z = e.pz = e.az = z; e.heading = e.ph = 0; e.hidden = true;
  const isl: Island = { x, z, r: FORT_R * k, group: new THREE.Group(), huts: [], fort: true };
  islands.push(isl);
  const turrets: Enemy[] = [];
  for (let i = 0; i < fd.turrets; i++) {
    const a = Math.PI / 4 + (i / fd.turrets) * Math.PI * 2, tx = x + Math.sin(a) * TURRET_R * k, tz = z + Math.cos(a) * TURRET_R * k;
    const t = spawnEnemy('battery', tx, tz);
    t.hp = t.maxHp = fd.hp * G.st.enemyHp * SEAS[G.sea].hpMul;
    t.ax = tx; t.az = tz; t.heading = t.ph = a; t.aim = a; t.fireT = 1.5 + i * 0.8; t.auxT = 2 + i * 0.6;
    turrets.push(t);
  }
  const beam = new THREE.Group();
  beam.add(beamPart(LAMP_Y * k));
  const back = beamPart(LAMP_Y * k);
  back.rotation.y = Math.PI; back.visible = false; back.name = 'back';
  beam.add(back);
  beam.position.set(x, 0, z);
  scene.add(beam);
  F = { core: e, turrets, isl, beam, ang: Math.random() * 6, hitT: 0, ringT: 3, morT: 4, alt: false, open: false, fxT: 0 };
}

/** Turret AI (battery-type): mortars at range, a three-ball fan up close. Returns 0 (never moves). */
export function aiTurret(e: Enemy, dt: number, d: number, toP: number): number {
  const p = G.player;
  e.aim += wrap(toP - e.aim) * Math.min(1, dt * 4);
  if (e.fireT <= 0 && d < 34) {
    e.fireT = 4.5;
    lobMortar(e.x, e.z, p.x + p.vx * 0.6, p.z + p.vz * 0.6, 12 * dmgK(e));
    smoke(e.x + Math.sin(e.aim) * 2, 2.6, e.z + Math.cos(e.aim) * 2, 1.4);
  }
  if ((e.auxT -= dt) <= 0 && d < 20) {
    e.auxT = 3.4;
    for (const o of [-0.18, 0, 0.18]) fireBall(e.x + Math.sin(e.aim) * 2, e.z + Math.cos(e.aim) * 2, e.aim + o, 15, 4 * dmgK(e), 22, false);
    play('boom');
  }
  return 0;
}

/** Core AI: shield while turrets stand, the sweeping beam(s), and once exposed rings of balls and mortar salvos. */
export function aiFortCore(e: Enemy, dt: number, d: number, toP: number): number {
  if (!F || F.core !== e) return 0;
  const p = G.player, left = F.turrets.reduce((n, t) => n + (t.dead ? 0 : 1), 0);
  e.hidden = left > 0;
  if (!e.hidden && !F.open) {
    F.open = true;
    (F.beam.getObjectByName('back') as THREE.Object3D).visible = true;
    explosion(e.x, 6, e.z, 4); embers(e.x, 10, e.z, 20, 3); addTrauma(0.5); play('horn');
  }
  F.ang += dt * (0.5 + 0.1 * (F.turrets.length - left)) * (F.open ? 1.2 : 1);
  F.beam.rotation.y = F.ang;
  F.hitT -= dt;
  const pr = L.geo.r * 0.5;
  for (const b of F.open ? [F.ang, F.ang + Math.PI] : [F.ang]) {
    if (F.hitT > 0 || d > BEAM_R + pr || d < 3) continue;
    if (Math.abs(wrap(toP - b)) < BEAM_HALF + pr / d) {
      F.hitT = 0.45;
      hurtPlayer(BEAM_DMG * dmgK(e)); slowPlayer(1, 0.6);
      fx(p.x, 1.2, p.z, 0xffe8a0, 0.6, 2.4, 0.3, 0.9, false, undefined, 'glow');
    }
  }
  if (F.open) {
    if ((F.ringT -= dt) <= 0) {
      F.ringT = heatAt(2) ? 2.5 : 5; // heat 2: a second ring, offset by half a gap, every other beat
      const off = heatAt(2) && F.alt ? Math.PI / 14 : 0;
      F.alt = !F.alt;
      for (let i = 0; i < 14; i++) fireBall(e.x, e.z, (i / 14) * Math.PI * 2 + F.ang + off, 10, 6 * dmgK(e), 30, false);
      play('boom');
    }
    if ((F.morT -= dt) <= 0 && d < 36) {
      F.morT = 6;
      for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5; lobMortar(e.x, e.z, p.x + p.vx * 0.9 + Math.sin(a) * r, p.z + p.vz * 0.9 + Math.cos(a) * r, 15 * dmgK(e)); }
    }
  }
  return 0;
}

/** Fixed step: pin the core and turrets to their spots (spells, knockback and ram shoves never move them). */
export function stepFortress(): void {
  if (!F) return;
  for (const e of [F.core, ...F.turrets]) { e.x = e.px = e.ax; e.z = e.pz = e.az; }
}

/** Per frame: no bob or roll, lantern glare. */
export function fortVisual(e: Enemy, t: number): void {
  e.model.root.position.y = 0;
  e.model.tilt.rotation.set(0, 0, 0);
  if (F && Math.sin(t * 9) > 0.6) fx(e.x, LAMP_Y * (e.bd as BossDef).scale / 1.8, e.z, 0xffe0a0, 1.4, 2.2, 0.12, F.open ? 0.9 : 0.6, false, undefined, 'glow');
}

/** Core sunk: the remaining turrets crumble with it (no credit), the collider and beam go. */
export function fortDown(): void {
  if (!F) return;
  const { core } = F;
  for (const t of F.turrets) if (!t.dead) { t.dead = true; t.sink = false; explosion(t.x, 1.5, t.z, 2.5); }
  for (let i = 0; i < 6; i++) explosion(core.x + (Math.random() - 0.5) * 9, 1 + Math.random() * 8, core.z + (Math.random() - 0.5) * 9, 3);
  splinters(core.x, 4, core.z, 20, 6);
  clearFortress();
}

export function clearFortress(): void {
  if (!F) return;
  const i = islands.indexOf(F.isl);
  if (i >= 0) islands.splice(i, 1);
  scene.remove(F.beam);
  F = null;
}
