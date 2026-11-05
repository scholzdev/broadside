import * as THREE from 'three';
import { G, scene, hurtPlayer } from './game';
import { SEAS, HazardId } from './seas';
import { reefAt, nearIsland, islands } from './world';
import { slowPlayer, burnPlayer } from './pstatus';
import { makeTelegraph } from './overlays';
import { explosion, embers, flame, smoke, fx } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';
import { POST } from './post';
import { setArrows, Arrow } from './edgearrows';
import { checkSeaQuests } from './seaquests';
import { L } from './loadout';
import { dropMine } from './ehazards';
import { heatAt, REEF_DMG_K, FOG_LESS, ERUPT_FASTER } from './heatdefs';

// ---- sea hazards (v8): reef shallows (damage + slow), fog (vision radius), eruptions (telegraphed fire rain) ----
export const REEF_DPS = 6, REEF_SLOW = 0.7;
/** Fog Coast vision radius (world units on the sea plane); enemies, their bars and damage numbers beyond it are hidden. */
export const FOG_R = 16, FOG_ARROW_R = 40;
const ERUPT_EVERY = 8, ERUPT_T = 1.2, ERUPT_R = 4, ERUPT_DMG = 25;

const hazard = (): HazardId => SEAS[G.sea].hazard;
interface Rain { x: number; z: number; t: number; ring: THREE.Mesh }
const rains: Rain[] = [];
const H = { reefAcc: 0, onReef: false, eruptT: 5, fxT: 0, emT: 0, mineT: 4 };
/** A mine ~30 u out that drifts slowly toward where the ship is now. */
function driftMine(): void {
  H.mineT = 5;
  const p = G.player, a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 8, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
  if (nearIsland(x, z, 2)) return;
  dropMine(x, z, 20, { x: (p.x - x) / d * 1.6, z: (p.z - z) / d * 1.6 });
}
/** Ash cloud (Ash Leviathan): for `t` s the vision mask closes to `r` in any sea; `cur` eases toward it and back (OPEN = no mask). */
const OPEN = 60, ASH = { t: 0, r: 12, cur: OPEN };
const FOG_COL = POST.uFogCol.value.clone(), ASH_COL = new THREE.Color(0x6a5e56);
export function ashCloud(secs: number, r: number): void { ASH.t = Math.max(ASH.t, secs); ASH.r = r; }
/** Vision radius of the fog / ash mask, and whether a mask is up at all. */
const visionR = (): number => (hazard() === 'fog' ? Math.min(FOG_R - (heatAt(3) ? FOG_LESS : 0), ASH.cur) : ASH.cur) + G.st.vision; // + Eagle Eye
const masked = (): boolean => G.state !== 'menu' && (hazard() === 'fog' || ASH.cur < OPEN - 5);

export function clearHazards(): void {
  for (const r of rains) scene.remove(r.ring);
  rains.length = 0;
  Object.assign(H, { reefAcc: 0, onReef: false, eruptT: 5, fxT: 0, mineT: 4 });
  Object.assign(ASH, { t: 0, cur: OPEN });
}
/** A fire-rain circle landing on (x, z) after ERUPT_T seconds. */
export function erupt(x: number, z: number): void {
  const ring = makeTelegraph();
  ring.position.set(x, 0.4, z);
  ring.scale.setScalar(ERUPT_R / 3); // the telegraph mesh is built for r = 3
  scene.add(ring);
  rains.push({ x, z, t: ERUPT_T, ring });
}

/** Fixed-step hazard tick (only while playing). */
export function stepHazards(dt: number): void {
  checkSeaQuests();
  if (ASH.t > 0) ASH.t -= dt;
  ASH.cur += ((ASH.t > 0 ? ASH.r : OPEN) - ASH.cur) * Math.min(1, dt * (ASH.t > 0 ? 3 : 1.5));
  const p = G.player, hz = hazard();
  H.onReef = hz === 'reef' && reefAt(p.x, p.z) !== null;
  if (H.onReef) {
    slowPlayer(0.15, REEF_SLOW);
    H.reefAcc += REEF_DPS * (heatAt(3) ? REEF_DMG_K : 1) * dt;
    if (H.reefAcc >= 3) { H.reefAcc -= 3; hurtPlayer(3, true); play('clang'); }
    if ((H.fxT -= dt) <= 0) { H.fxT = 0.12; fx(p.x + (Math.random() - 0.5) * 3, 0.3, p.z + (Math.random() - 0.5) * 3, 0xff9ab0, 0.15, 0.04, 0.5, 0.9, false, { vx: (Math.random() - 0.5) * 3, vy: 3, vz: (Math.random() - 0.5) * 3, g: 12 }); }
  } else H.reefAcc = Math.max(0, H.reefAcc - dt * 2);
  if (hz === 'eruption' && (H.eruptT -= dt) <= 0) {
    H.eruptT = ERUPT_EVERY * (heatAt(3) ? ERUPT_FASTER : 1) * (0.85 + Math.random() * 0.3);
    const n = 3 + Math.floor(Math.random() * 3), lead = 0.8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : 3 + Math.random() * 9; // the first one aims where the ship is headed
      erupt(p.x + p.vx * lead + Math.sin(a) * d, p.z + p.vz * lead + Math.cos(a) * d);
    }
    play('boom');
  }
  if (hz === 'none' && heatAt(3) && (H.mineT -= dt) <= 0) driftMine(); // Calm Seas heat 3: drifting mines
  for (let i = rains.length - 1; i >= 0; i--) {
    const r = rains[i];
    if ((r.t -= dt) > 0) continue;
    scene.remove(r.ring);
    rains.splice(i, 1);
    explosion(r.x, 0.6, r.z, ERUPT_R);
    embers(r.x, 1, r.z, 10, ERUPT_R * 0.6);
    for (let k = 0; k < 4; k++) flame(r.x + (Math.random() - 0.5) * 4, 0.6, r.z + (Math.random() - 0.5) * 4, 1.6);
    smoke(r.x, 1.5, r.z, 2);
    play('explode');
    if (Math.hypot(p.x - r.x, p.z - r.z) < ERUPT_R + L.geo.r * 0.5) { hurtPlayer(ERUPT_DMG); burnPlayer(3, 4); addTrauma(0.4); }
  }
}

/** Fog Coast: true when (x, z) lies outside the vision radius (never in menus). */
export const fogHides = (x: number, z: number): boolean => masked() && Math.hypot(x - G.player.x, z - G.player.z) > visionR();

const v = new THREE.Vector3(), arrows: Arrow[] = [];
/** Per render frame: telegraph fill, fog mask uniforms and the fog edge arrows. `px, pz` = the ship's render position. */
export function renderHazards(cam: THREE.OrthographicCamera, pitch: number, yaw: number, px: number, pz: number, t: number): void {
  for (const r of rains) {
    (r.ring.getObjectByName('fill') as THREE.Object3D).scale.setScalar(0.05 + 0.95 * (1 - r.t / ERUPT_T));
    r.ring.scale.setScalar((ERUPT_R / 3) * (1 + 0.06 * Math.sin(t * 18)));
  }
  if (hazard() === 'eruption' && (H.emT -= 1 / 60) <= 0) { // ash and embers drifting over the Volcanic Isles
    H.emT = 0.06;
    const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 30;
    fx(px + Math.sin(a) * d, 0.5 + Math.random() * 3, pz + Math.cos(a) * d, Math.random() < 0.6 ? 0xff7a20 : 0xffb040, 0.09, 0.02, 1.6, 1, false, { vx: 0.6, vy: 1.2 + Math.random(), vz: 0.4 });
  }
  const fog = masked(), R = visionR();
  POST.uFogOn.value = fog ? 1 : 0;
  arrows.length = 0;
  if (fog) {
    v.set(px, 0, pz).project(cam);
    POST.uFogC.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
    POST.uFogK.value.set(cam.right - cam.left, (cam.top - cam.bottom) / Math.sin(pitch));
    POST.uFogP.value.set(px * Math.cos(yaw) - pz * Math.sin(yaw), -px * Math.sin(yaw) - pz * Math.cos(yaw));
    POST.uFogT.value = t;
    // lighthouse beams: up to three nearby islands (picked by a position hash, so the set is stable) sweep a light arm pair
    const cy = Math.cos(yaw), sy = Math.sin(yaw), sx0 = px * cy - pz * sy, sz0 = -px * sy - pz * cy;
    let nb = 0;
    for (const isl of islands) {
      if (nb >= 3) break;
      if (Math.abs(isl.x * 7 + isl.z * 13) % 5 > 2 || Math.hypot(isl.x - px, isl.z - pz) > 90) continue;
      POST.uBeam.value[nb++].set(isl.x * cy - isl.z * sy - sx0, -isl.x * sy - isl.z * cy - sz0, t * (0.5 + (nb % 2) * 0.2) + nb * 2.1);
    }
    POST.uBeamN.value = nb;
    POST.uFogR.value = R;
    POST.uFogCol.value.copy(FOG_COL).lerp(ASH_COL, Math.max(0, Math.min(1, (OPEN - ASH.cur) / (OPEN - ASH.r))));
    for (const e of G.enemies) {
      const d = Math.hypot(e.x - px, e.z - pz);
      if (!e.dead && !(e.type === 'serpent' && e.hidden) && d > R && d < FOG_ARROW_R) arrows.push({ x: e.x, z: e.z, kind: e.bd ? 'boss' : 'enemy', ring: R - 1.5, d });
    }
    arrows.sort((a, b) => (a.d ?? 0) - (b.d ?? 0));
    if (arrows.length > 12) arrows.length = 12;
  }
  setArrows('fog', arrows);
}
export const hazardView = () => ({ hazard: hazard(), onReef: H.onReef, rains: rains.map(r => ({ x: r.x, z: r.z, t: r.t })), ash: { t: ASH.t, vision: masked() ? visionR() : null } });
