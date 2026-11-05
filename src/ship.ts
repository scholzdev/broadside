import * as THREE from 'three';
import { G, scene } from './game';
import { SLOTS, ArcId } from './content';
import { modArcHalf } from './arcs';
import { MODS, MOD_IDS, ModuleId } from './modules';
import { abilityTap } from './abilities';
import { SP } from './spelldata';
import { makeShip, cloneMats, MatRec, ShipModel } from './models';
import { PLAYER_SHIPS } from './fleet';
import { L } from './loadout';
import { makeArc } from './overlays';
import { S } from './settings';
import { turnAxis, fwdHeld, backHeld, boostHeld, kbDrive, stickVec } from './input';
import { lerp, lerpAngle, wrap } from './spatial';
import { pushOut, wind } from './world';
import { fx } from './particles';
import { kick } from './juice';
import { seaPose, Pose } from './anim';
import { bump } from './meta';
import { playerSpeedMul } from './pstatus';
import { resetDressing, stepDressing } from './dressing';
import { withCosmetics, applyCosmetics, wakeColor } from './cosmetics';

export let model: ShipModel;
/** `key` is the range|half the mesh was built for; syncArcs rebuilds it only when that changes. */
const arcs: { mesh: THREE.Mesh; id: ModuleId; arc: ArcId; key: string }[] = [];
// ~90% of max speed after 1.2 s of W (ln10/1.2); coasts to a stop in ~3 s
const ACCEL_K = Math.LN10 / 1.2, COAST_K = 1.15, REVERSE_FRAC = 0.25, LATERAL_DAMP = 8, TURN_BASE = 1.9, TURN_RAMP = 0.12;
export const renderPos = { x: 0, z: 0 };
let sailVis = 0.12, roll = 0, wakeT = 0, sprayT = 0, mats: MatRec[] = [], hurtOn = false;
const pose: Pose = { y: 0, pitch: 0, roll: 0 };

/** (Re)builds the player model for the current loadout ship: removes the old one and its arcs first. */
export function initShip(): void {
  if (model) scene.remove(model.root);
  arcs.length = 0; hurtOn = false;
  model = makeShip(withCosmetics(PLAYER_SHIPS[L.ship]));
  applyCosmetics(model); // v10 Decorations: sail pattern + figurehead (before cloneMats so they flash too)
  mats = cloneMats(model.root); // own materials so the hit flash does not tint other meshes
  resetDressing(model, L.ship); // modules, crew, captain and relic share the cloned painted material (they flash too)
  // Arc wedges drawn on the water: they show where each mount can fire.
  for (const id of MOD_IDS) {
    const m = MODS[id];
    for (const arc of m.arcs) {
      if (arc === 'deck') continue;
      arcs.push({ mesh: new THREE.Mesh(), id, arc, key: '' });
    }
  }
  syncArcs();
  scene.add(model.root);
}

/** Wedge radius = this run's range for the mount, width = its current half-angle; the mesh is rebuilt only when either changes. */
function syncArcs(): void {
  for (const a of arcs) {
    a.mesh.visible = S.arcs;
    const m = MODS[a.id], ms = G.modStats[a.id], owned = !!ms;
    const range = (ms?.auto.range ?? m.auto.range) * G.st.rangeMul * (owned && m.slot === 'bow' ? L.cap.bowRange : 1), half = modArcHalf(a.id, a.arc);
    const key = `${range.toFixed(2)}|${half.toFixed(3)}`;
    if (key === a.key) continue;
    a.key = key;
    if (a.mesh.parent) { a.mesh.parent.remove(a.mesh); a.mesh.geometry.dispose(); (a.mesh.material as THREE.Material).dispose(); }
    a.mesh = makeArc(L.geo.arcIn, range, Math.PI / 2 - SLOTS[a.arc].center - half, half * 2, m.color);
    a.mesh.position.y = 0.5;
    a.mesh.visible = S.arcs;
    model.root.add(a.mesh);
  }
}

export function shipTap(code: string): void {
  abilityTap(code);
}

let fitCache: { id: string; r: number; cx: number; cy: number; cz: number } | null = null;
/** Bounding sphere of the hull and rigging (arc wedges and equipment dressing excluded), relative to the model root; cached per ship. */
export function shipFit(): { r: number; cx: number; cy: number; cz: number } {
  if (fitCache && fitCache.id === L.ship) return fitCache;
  const skip = new Set<THREE.Object3D>(arcs.map(a => a.mesh)), box = new THREE.Box3(), part = new THREE.Box3();
  model.root.updateMatrixWorld(true);
  model.root.traverse(o => { if (!skip.has(o) && (o as THREE.Mesh).isMesh && !o.userData.dress) box.union(part.setFromObject(o)); });
  const c = box.getCenter(new THREE.Vector3()).sub(model.root.position);
  fitCache = { id: L.ship, r: box.min.distanceTo(box.max) / 2, cx: c.x, cy: c.y, cz: c.z };
  return fitCache;
}

/** Absolute stick steering: screen-up/right of the (yaw 45 deg) camera mapped to a world heading; null when keyboard tank steering is in use or the stick is idle. */
const STICK_ON = 0.25;
function stickAim(heading: number): { err: number; mag: number } | null {
  if (S.steer !== 'stick' || kbDrive()) return null;
  const v = stickVec();
  if (v.mag < STICK_ON) return null;
  const wx = (v.x - v.y) / Math.SQRT2, wz = (-v.x - v.y) / Math.SQRT2; // screen right = (1,-1)/sqrt2, screen up = (-1,-1)/sqrt2 in (x,z)
  return { err: wrap(Math.atan2(wx, wz) - heading), mag: v.mag };
}
let shiftPrev = false;
const NITRO_MIN = 0.1, NITRO_DELAY = 0.6;
export function stepShip(dt: number): void {
  const p = G.player, s = G.st;
  // Full Sail: hold Shift to burn the nitro meter (fullDur s from full); it recharges (fullCd s from empty) after a short delay
  const shift = boostHeld();
  if (p.boost && (!shift || p.nitro <= 0)) p.boost = false;
  else if (!p.boost && shift && !shiftPrev && p.nitro >= NITRO_MIN) { p.boost = true; bump('fullSails'); }
  shiftPrev = shift;
  if (p.boost) { p.nitro = Math.max(0, p.nitro - dt / s.fullDur); p.nitroDelay = NITRO_DELAY; }
  else if ((p.nitroDelay -= dt) <= 0) p.nitro = Math.min(1, p.nitro + dt / s.fullCd);
  const full = p.boost;
  let fx_ = Math.sin(p.heading), fz = Math.cos(p.heading);
  // lateral axis = port = (cos h, -sin h)
  let vf = p.vx * fx_ + p.vz * fz;
  let vl = p.vx * fz - p.vz * fx_;
  const wm = 1 + 0.2 * Math.cos(p.heading - wind.angle);
  const maxV = s.maxSpeed * wm * (SP.tail > 0 ? 1.6 : 1) * (L.relic === 'mermaid' && G.hp > G.maxHp * 0.8 ? 1.15 : 1) * playerSpeedMul(); // Tailwind, Mermaid Scale, slow (reefs)
  const dash = G.buffs.ram > 0; // Ramming Speed
  const aim = stickAim(p.heading);
  const gas = full || dash || (aim ? true : fwdHeld() && !backHeld());
  // stick throttle: 40% at the deadzone edge up to 100% at 0.9 deflection, eased off while the bow is far from the wanted heading
  const aimThr = aim ? (0.4 + 0.6 * Math.min(1, (aim.mag - STICK_ON) / (0.9 - STICK_ON))) * (1 - 0.65 * Math.max(0, Math.min(1, (Math.abs(aim.err) - 1.0) / 0.75))) : 1;
  p.thr = gas ? 1 : 0;
  if (gas) {
    const target = maxV * (dash ? G.modStats.ram?.ability.dashSpd ?? 1 : full ? s.fullSpd : aimThr);
    vf += (target - vf) * (vf < target ? ACCEL_K * (dash ? 4 : 1) : COAST_K) * dt;
  } else if (backHeld() && !fwdHeld()) {
    if (vf > 0.5) vf = Math.max(0.5, vf - (vf * 2.5 + maxV * 0.5) * dt);
    else vf += (-REVERSE_FRAC * maxV - vf) * 2.5 * dt;
  } else if (Math.abs(vf) < 0.3) vf = 0;
  else vf -= vf * COAST_K * dt;
  vl *= Math.exp(-LATERAL_DAMP * dt);

  // turn input ramps to full in ~0.12 s; rate is 55% at standstill, 100% at cruise
  const ax = aim ? Math.max(-1, Math.min(1, aim.err * 2.5)) : turnAxis(), ramp = dt / TURN_RAMP;
  p.turnIn += Math.max(-ramp, Math.min(ramp, ax - p.turnIn));
  const cruise = s.maxSpeed * 0.7;
  const rate = TURN_BASE * s.turnMul * (0.55 + 0.45 * Math.min(1, Math.abs(vf) / cruise));
  // Tankard Tom: sinusoidal steering wobble (about 1.3 Hz), plus a gentle drift when going straight
  const wob = s.wobble > 0 ? Math.sin(G.time * 8.2) * s.wobble : 0;
  p.turn = p.turnIn * rate * (1 + wob) + (s.wobble > 0 ? Math.sin(G.time * 5.3 + 1) * s.wobble * 0.5 * (1 - Math.abs(p.turnIn)) : 0);
  p.heading += p.turn * dt;

  fx_ = Math.sin(p.heading); fz = Math.cos(p.heading);
  p.vx = vf * fx_ + vl * fz;
  p.vz = vf * fz - vl * fx_;
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (pushOut(p, L.geo.r)) { p.vx *= 0.7; p.vz *= 0.7; vf *= 0.7; }
  p.speed = vf;

  wakeT -= dt;
  if (wakeT <= 0 && Math.abs(vf) > 1.5) {
    const f = Math.min(1, Math.abs(vf) / s.maxSpeed);
    wakeT = 0.11 - 0.05 * f;
    for (const sd of [-L.geo.wakeSide, L.geo.wakeSide]) fx(p.x - fx_ * L.geo.wakeBack + fz * sd, 0.12, p.z - fz * L.geo.wakeBack - fx_ * sd, wakeColor(), 0.5, 1.1 + 1.0 * f, 0.7 + 0.5 * f, 0.15 + 0.4 * f, true);
  }
}

export function updateShipVisual(t: number, dt: number, alpha: number): void {
  const p = G.player, h = lerpAngle(p.ph, p.heading, alpha);
  renderPos.x = lerp(p.px, p.x, alpha); renderPos.z = lerp(p.pz, p.z, alpha);
  seaPose(renderPos.x, renderPos.z, h, t, L.geo.seaF, L.geo.seaS, pose);
  model.root.position.set(renderPos.x, pose.y, renderPos.z);
  model.root.rotation.y = h;
  // broadside recoil: damped spring on roll
  kick.v += (-120 * kick.x - 8 * kick.v) * dt;
  kick.x += kick.v * dt;
  roll += (p.turn * 0.22 - roll) * Math.min(1, 4 * dt);
  model.tilt.rotation.z = roll + pose.roll + kick.x;
  model.tilt.rotation.x = pose.pitch - p.speed * 0.004;
  const target = 0.12 + 0.88 * p.thr;
  sailVis += (target - sailVis) * Math.min(1, 3 * dt);
  const spd = Math.max(0, Math.min(1, p.speed / G.st.maxSpeed));
  model.sails.forEach((sg, i) => {
    sg.scale.y = sailVis; sg.scale.x = 0.9 + 0.1 * sailVis;
    sg.scale.z = 1 + 1.6 * spd; // billow deepens with speed
    sg.rotation.x = 0.12 * spd + Math.sin(t * 5 + i * 1.7) * 0.025 * (0.3 + sailVis);
  });
  if (model.flag) model.flag.rotation.y = Math.sin(t * 7) * 0.35 + Math.sin(t * 11.3) * 0.12;
  syncArcs();
  for (const a of arcs) a.mesh.visible = G.modules.some(m => m.id === a.id);
  stepDressing(t, dt);

  // bow spray above 60% of top speed
  if (spd > 0.6 && (sprayT -= dt) <= 0) {
    sprayT = 0.05;
    const fx0 = Math.sin(h), fz0 = Math.cos(h);
    for (const sd of [-1, 1]) {
      const sp = 1.5 + Math.random() * 1.5;
      fx(renderPos.x + fx0 * L.geo.spray, 0.3, renderPos.z + fz0 * L.geo.spray, 0xffffff, 0.14, 0.05, 0.4, 0.85, false,
        { vx: fz0 * sd * sp + fx0 * p.speed * 0.3, vy: 2.5 + Math.random() * 1.5, vz: -fx0 * sd * sp + fz0 * p.speed * 0.3, g: 12 });
    }
  }
  // red flash when hurt; spell sheen (Iron Hull grey, Riposte gold, Patch Up green) otherwise
  const hurt = G.hitFlash > 0, tint = SP.tint > 0, on = hurt || tint;
  if (on || hurtOn) {
    const pulse = 0.75 + 0.25 * Math.sin(t * 10);
    for (const r of mats) {
      r.m.emissive.setHex(hurt ? 0xff2010 : tint ? SP.tint : r.e);
      r.m.emissiveIntensity = hurt ? Math.min(1, G.hitFlash / 0.25) : tint ? SP.tintI * pulse : 1;
    }
    hurtOn = on;
  }
}
