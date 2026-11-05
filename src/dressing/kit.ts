import * as THREE from 'three';
import { Builder, PartOpts, rod, xf, V3 } from '../geo';

// ---- tiny primitive kit for dressing builders: every call merges into one Builder (vertex colours, flat facets) ----

export const C = {
  iron: 0x2b2c31, ironHi: 0x4a4d55, brass: 0xc9993a, wood: 0x6b4424, dark: 0x3e2614, rope: 0xb39a6a,
  plank: 0x9a7448, canvas: 0xe8dcc0, red: 0xa8322a, black: 0x141416,
};

/** Primitive geometries are shared; Builder.add copies their triangles, so they are never disposed. */
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cyl10: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone3: new THREE.ConeGeometry(1, 1, 3),
  cone6: new THREE.ConeGeometry(1, 1, 6),
  cone8: new THREE.ConeGeometry(1, 1, 8),
  sph: new THREE.SphereGeometry(1, 8, 6),
  ico: new THREE.IcosahedronGeometry(1, 0),
  oct: new THREE.OctahedronGeometry(1, 0),
  hull: new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
  torus: new THREE.TorusGeometry(1, 0.18, 4, 10),
};
export type Prim = keyof typeof G;

/** Generic placed primitive: size is the per-axis scale (cylinders: [radius, height, radius]). */
export function prim(b: Builder, p: Prim, col: number, at: V3, size: V3 | number, rot: V3 = [0, 0, 0], o?: PartOpts): void {
  b.add(G[p], col, xf(at[0], at[1], at[2], rot[0], rot[1], rot[2], size), o);
}
export const box = (b: Builder, col: number, at: V3, size: V3, rot?: V3, o?: PartOpts): void => prim(b, 'box', col, at, size, rot, o);
/** Upright cylinder (radius r, height h) centred at `at`. */
export const cyl = (b: Builder, col: number, at: V3, r: number, h: number, rot?: V3, seg: 6 | 8 | 10 = 8, o?: PartOpts): void =>
  prim(b, seg === 6 ? 'cyl6' : seg === 8 ? 'cyl8' : 'cyl10', col, at, [r, h, r], rot, o);
export { rod };

/** Tapered tube from p0 (breech, radius r0) to p1 (muzzle, radius r1). */
export function tube(b: Builder, col: number, p0: V3, p1: V3, r0: number, r1: number, seg = 8, o?: PartOpts): void {
  const a = new THREE.Vector3(...p0), c = new THREE.Vector3(...p1), len = a.distanceTo(c);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize());
  b.add(g, col, new THREE.Matrix4().compose(a.add(c).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), o);
  g.dispose();
}

/** Cannon barrel from breech to muzzle with a reinforcing ring and a band in the module colour. */
export function cannon(b: Builder, p0: V3, p1: V3, r: number, band: number): void {
  tube(b, C.iron, p0, p1, r, r * 0.78);
  const lerp = (k: number): V3 => [p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k, p0[2] + (p1[2] - p0[2]) * k];
  tube(b, band, lerp(0.62), lerp(0.7), r * 1.12, r * 1.08, 8);
  tube(b, C.ironHi, lerp(0.94), p1, r * 1.05, r * 1.05, 8);
  prim(b, 'sph', C.iron, p0, r * 0.95);
}

/** Barrel (keg) standing upright, with two hoops. */
export function keg(b: Builder, at: V3, r: number, h: number, col: number, hoop: number, lying = false): void {
  const rot: V3 = lying ? [0, 0, Math.PI / 2] : [0, 0, 0];
  cyl(b, col, at, r, h, rot, 8);
  const off = h * 0.32;
  for (const s of [-1, 1]) {
    const p: V3 = lying ? [at[0] + s * off, at[1], at[2]] : [at[0], at[1] + s * off, at[2]];
    cyl(b, hoop, p, r * 1.06, h * 0.1, rot, 8);
  }
}

/** Small open boat hull (bow toward +z), keel at `at`. */
export function boat(b: Builder, at: V3, len: number, w: number, col: number, inner: number): void {
  prim(b, 'hull', col, [at[0], at[1] + w * 0.42, at[2]], [w / 2, w * 0.42, len / 2]);
  box(b, inner, [at[0], at[1] + w * 0.12, at[2]], [w * 0.5, 0.02, len * 0.6]);
  for (const k of [-0.22, 0.12]) box(b, C.plank, [at[0], at[1] + w * 0.3, at[2] + k * len], [w * 0.86, 0.03, 0.08]);
}
