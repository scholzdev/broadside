import * as THREE from 'three';
import type { CrewId } from '../relics';
import { MUSKET, PIVOT_L, PIVOT_R } from './figures';

// ---- arm poses of the crew figures: each arm part has a rest pose (its pivot, no rotation) and one action pose.
// crewanim blends between them with k in 0..1 (position lerp + quaternion slerp), written straight into instance matrices.

/** Action pose of an arm part's origin, in figure space at scale 1. */
export interface ArmPose { at: THREE.Vector3; q: THREE.Quaternion }
export interface Rig { r: ArmPose; l: ArmPose | null }

const pose = (pivot: readonly number[], rx: number, ry = 0, rz = 0): ArmPose =>
  ({ at: new THREE.Vector3(pivot[0], pivot[1], pivot[2]), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)) });

/** Musket shouldered and level: the butt at the right shoulder, the barrel along +z (the muzzle ends MUZZLE ahead). */
export const AIM_BUTT = new THREE.Vector3(-0.06, 0.37, -0.02);
function aim(): ArmPose {
  const b = new THREE.Vector3(...MUSKET.butt), m = new THREE.Vector3(...MUSKET.muzzle);
  const q = new THREE.Quaternion().setFromUnitVectors(m.clone().sub(b).normalize(), new THREE.Vector3(0, 0, 1));
  const at = AIM_BUTT.clone().sub(b.sub(new THREE.Vector3(...PIVOT_R)).applyQuaternion(q)); // pivot lands where the butt maps onto the shoulder
  return { at, q };
}
/** Length of the musket (butt to muzzle): the muzzle sits this far ahead of AIM_BUTT when aimed. */
export const MUZZLE = Math.hypot(MUSKET.muzzle[0] - MUSKET.butt[0], MUSKET.muzzle[1] - MUSKET.butt[1], MUSKET.muzzle[2] - MUSKET.butt[2]);

const RAISE_R = pose(PIVOT_R, -1.45, 0, 0.1); // right arm forward (points, offers)
/** Per type; types without an entry use RAISE_R and keep the left arm in the body. */
export const RIGS: Partial<Record<CrewId, Rig>> = {
  musket: { r: aim(), l: null },
  carp: { r: pose(PIVOT_R, -2.4, 0, 0.15), l: null }, // hammer raised overhead; the swing blends k
  surgeon: { r: pose(PIVOT_R, -2.9, 0, 0.35), l: pose(PIVOT_L, -2.9, 0, -0.35) }, // both arms up
  cook: { r: RAISE_R, l: pose(PIVOT_L, -2.6, 0, -0.25) }, // mug raised
  look: { r: pose(PIVOT_R, -1.35, 0.25, 0.1), l: null },
};
export const rigOf = (id: CrewId): Rig => RIGS[id] ?? { r: RAISE_R, l: null };

const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _id = new THREE.Quaternion();
/** Local matrix of an arm part at blend k (pivot and offsets scaled by the figure scale s). */
export function armMatrix(rest: readonly number[], p: ArmPose, k: number, s: number, out: THREE.Matrix4): THREE.Matrix4 {
  _p.set(rest[0], rest[1], rest[2]).lerp(p.at, k).multiplyScalar(s);
  _q.slerpQuaternions(_id, p.q, k);
  return out.compose(_p, _q, _one);
}
export { PIVOT_L, PIVOT_R };
