import * as THREE from 'three';
import { G, scene } from './game';
import { L } from './loadout';
import { SPELLS } from './spelldata';
import { mouse } from './input';
import { padAim, padAiming } from './gamepad';

// ---- mouse aim for captain spells: the cursor is raycast onto the sea plane each frame; idle for IDLE_MS or outside the window = inactive ----
export const aim = { x: 0, z: 0, active: false };
const IDLE_MS = 4000;
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
const out = { x: 0, z: 0 };

export function updateAim(camera: THREE.Camera, now: number): void {
  if (G.state === 'playing' && padAiming(now)) { // right stick: aim relative to the ship, up to the spell's max range
    const r = (SPELLS[L.captain].maxRange ?? 20) * Math.max(0.35, padAim.mag);
    aim.x = G.player.x + padAim.dx * r; aim.z = G.player.z + padAim.dz * r; aim.active = true;
    return;
  }
  aim.active = G.state === 'playing' && mouse.inside && now - mouse.t < IDLE_MS;
  if (!aim.active) return;
  ndc.set((mouse.x / innerWidth) * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (ray.ray.intersectPlane(plane, hit)) { aim.x = hit.x; aim.z = hit.z; } else aim.active = false;
}

/** Spell target: the aim point clamped to `maxRange` from the ship, or `fallback` units ahead of the ship when the mouse is idle. Returns a shared object. */
export function aimPoint(maxRange: number, fallback: number): { x: number; z: number } {
  const p = G.player;
  let dx = Math.sin(p.heading), dz = Math.cos(p.heading), d = fallback;
  if (aim.active) {
    const ax = aim.x - p.x, az = aim.z - p.z, ad = Math.hypot(ax, az);
    if (ad > 0.01) { dx = ax / ad; dz = az / ad; }
    d = ad > 0.01 ? ad : 0;
  }
  d = Math.min(d, maxRange);
  out.x = p.x + dx * d; out.z = p.z + dz * d;
  return out;
}

// ---- reticle: effect-radius ring + readiness arc at the aim point, dashed max-range circle around the ship ----
let rootG: THREE.Group | null = null, ringM: THREE.Mesh, arcM: THREE.Mesh, fillM: THREE.Mesh, dotM: THREE.Mesh, rangeM: THREE.Mesh;
const SEG = 64;
function mat(op: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ transparent: true, opacity: op, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide });
}
function flat(g: THREE.BufferGeometry, m: THREE.Material, order: number): THREE.Mesh {
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = order; mesh.frustumCulled = false;
  return mesh;
}
function ensure(): void {
  if (rootG) return;
  rootG = new THREE.Group();
  ringM = flat(new THREE.RingGeometry(0.95, 1, 72), mat(1), 21);
  arcM = flat(new THREE.RingGeometry(0.86, 0.93, SEG), mat(1), 21);
  fillM = flat(new THREE.CircleGeometry(1, 48), mat(0.1), 20);
  dotM = flat(new THREE.CircleGeometry(0.35, 16), mat(1), 22);
  const dashed = new THREE.RingGeometry(0.992, 1, 96, 1), idx = dashed.getIndex()!, keep: number[] = [];
  for (let i = 0; i < idx.count; i += 6) if ((i / 6) % 2 === 0) for (let k = 0; k < 6; k++) keep.push(idx.getX(i + k));
  dashed.setIndex(keep);
  rangeM = flat(dashed, mat(0.3), 19);
  for (const m of [ringM, arcM, fillM, dotM, rangeM]) { m.visible = false; scene.add(m); }
}

/** Per render frame. `cd`/`cdMax` come from the spell cooldown; hidden unless the captain's spell is aimed and the mouse is active. */
export function renderAim(t: number, sx: number, sz: number, cd: number, cdMax: number): void {
  ensure();
  const def = SPELLS[L.captain], on = !!def.aimed && aim.active;
  for (const m of [ringM, arcM, fillM, dotM, rangeM]) m.visible = on;
  if (!on) return;
  const R = def.radius ?? 3, maxR = def.maxRange ?? 20, ready = cd <= 0, col = def.color;
  const p = aimPoint(maxR, 0), pulse = 1 + (ready ? 0.03 * Math.sin(t * 8) : 0);
  const op = ready ? 0.95 : 0.35;
  ringM.position.set(p.x, 0.2, p.z); ringM.scale.setScalar(R * pulse);
  fillM.position.set(p.x, 0.19, p.z); fillM.scale.setScalar(R);
  arcM.position.set(p.x, 0.21, p.z); arcM.scale.setScalar(R);
  dotM.position.set(p.x, 0.22, p.z);
  rangeM.position.set(sx, 0.18, sz); rangeM.scale.setScalar(maxR); rangeM.rotation.z = t * 0.05;
  for (const [m, o] of [[ringM, op], [arcM, ready ? 0 : 0.8], [fillM, ready ? 0.14 : 0.05], [dotM, op], [rangeM, 0.28]] as [THREE.Mesh, number][]) {
    const mm = m.material as THREE.MeshBasicMaterial;
    mm.color.setHex(col); mm.opacity = o;
  }
  const frac = cdMax > 0 ? 1 - Math.min(1, cd / cdMax) : 1; // arc fills as the spell recharges
  arcM.geometry.setDrawRange(0, Math.round(frac * SEG) * 6);
}
