import * as THREE from 'three';
import { Builder, paintedMesh, rod, xf } from './geo';
import { makeShip, makeRaft, ShipModel } from './models';
import { ENEMY_LOOKS } from './fleet';

// ---- v8 pass 2 enemy models. Forward = +Z. Every factory returns root > tilt (see getShip). ----

function wrap(...meshes: THREE.Object3D[]): ShipModel {
  const root = new THREE.Group(), tilt = new THREE.Group();
  root.add(tilt);
  for (const m of meshes) tilt.add(m);
  return { root, tilt, sails: [] };
}

/** A spiked naval mine of body radius `s` (also used for the floating mines in ehazards). */
export function mineGeometry(s: number): THREE.BufferGeometry {
  const b = new Builder();
  b.add(new THREE.IcosahedronGeometry(s, 1), 0x2b2d2f, undefined, { smooth: true, jitter: 0.04 });
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]];
  for (const d of dirs) {
    const v = new THREE.Vector3(d[0], d[1], d[2]).normalize();
    const m = new THREE.Matrix4().compose(v.clone().multiplyScalar(s * 1.08), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v), new THREE.Vector3(1, 1, 1));
    b.add(new THREE.ConeGeometry(s * 0.2, s * 0.55, 5), 0x6b6f72, m);
  }
  b.add(new THREE.IcosahedronGeometry(s * 0.2, 0), 0xff4a2a, xf(0, s * 1.18, 0), { emit: 0xff3a1a, glow: 5 });
  return b.build();
}

/** Squat tarred ship with a stern rack of three mines. */
export function makeMinelayer(): ShipModel {
  const m = makeShip(ENEMY_LOOKS.minelayer);
  const b = new Builder();
  for (const x of [-0.8, 0, 0.8]) b.add(mineGeometry(0.34), 0x2b2d2f, xf(x, 1.0, -2.0));
  rod(b, [-1.1, 0.5, -2.3], [1.1, 0.5, -2.3], 0.06, 0x4a3a2a, 5);
  rod(b, [-1.1, 0.5, -1.7], [1.1, 0.5, -1.7], 0.06, 0x4a3a2a, 5);
  for (const x of [-1.1, 1.1]) rod(b, [x, 0.3, -2.3], [x, 0.75, -1.7], 0.05, 0x4a3a2a, 5);
  m.tilt.add(paintedMesh(b.build()));
  return m;
}

/** Bigger burning raft: wider logs, a tall pyre and a charred mast. */
export function makeFireShip(): ShipModel {
  const m = makeRaft();
  m.tilt.scale.setScalar(1.6);
  const b = new Builder(), fl = new THREE.ConeGeometry(1, 1, 6);
  b.add(fl, 0xff5a10, xf(0, 1.3, -0.2, 0, 0.3, 0, [0.75, 2.1, 0.75]), { emit: 0xff4a08, glow: 3.8 });
  b.add(fl, 0xffa030, xf(0.35, 1.1, -0.5, 0, 0.9, 0.12, [0.45, 1.5, 0.45]), { emit: 0xff8a18, glow: 4.2 });
  fl.dispose();
  rod(b, [0, 0.2, -0.2], [0, 2.4, -0.2], 0.07, 0x1c120c, 5);
  m.tilt.add(paintedMesh(b.build()));
  return m;
}

/** Segmented sea serpent; segments are named seg0 (head) .. seg8 and are waved by the visuals. */
export const SERPENT_SEGS = 9;
export function makeSerpent(): ShipModel {
  const meshes: THREE.Object3D[] = [];
  for (let i = 0; i < SERPENT_SEGS; i++) {
    const r = Math.max(0.2, 0.62 - i * 0.045), b = new Builder();
    b.add(new THREE.IcosahedronGeometry(r, 1), i % 2 ? 0x2a8a72 : 0x2f9a7e, xf(0, 0, 0, 0, 0, 0, [1, 0.85, 1.15]), { smooth: true, jitter: 0.07 });
    b.add(new THREE.IcosahedronGeometry(r * 0.8, 0), 0xc9e6c0, xf(0, -r * 0.35, 0, 0, 0, 0, [0.9, 0.5, 1]));
    if (i > 0 && i < SERPENT_SEGS - 1) b.add(new THREE.ConeGeometry(r * 0.35, r * 1.1, 4), 0xd8502a, xf(0, r * 0.95, 0, 0, 0, 0, [0.5, 1, 1.2]));
    if (i === 0) {
      for (const x of [-0.26, 0.26]) b.add(new THREE.IcosahedronGeometry(0.1, 0), 0xffe066, xf(x, 0.2, 0.42), { emit: 0xffd030, glow: 4 });
      for (const x of [-0.3, 0.3]) b.add(new THREE.ConeGeometry(0.1, 0.5, 4), 0xd8502a, xf(x, 0.5, -0.1, -0.5, 0, x * -1.2));
      b.add(new THREE.ConeGeometry(0.28, 0.5, 5), 0x1f6a58, xf(0, -0.15, 0.55, Math.PI / 2, 0, 0));
    }
    if (i === SERPENT_SEGS - 1) b.add(new THREE.ConeGeometry(0.4, 0.9, 3), 0xd8502a, xf(0, 0, -0.7, -Math.PI / 2, 0, 0, [1, 1, 0.3]));
    const mesh = paintedMesh(b.build());
    mesh.name = 'seg' + i;
    mesh.position.set(0, 0.2, 1.3 - i * 0.72);
    meshes.push(mesh);
  }
  return wrap(...meshes);
}

/** Stone gun emplacement; the `turret` group (cannon on a carriage) is rotated by the visuals. */
export function makeBattery(): ShipModel {
  const b = new Builder();
  b.add(new THREE.CylinderGeometry(1.7, 1.95, 1.0, 10), 0x8c8a82, xf(0, 0.4, 0), { jitter: 0.1 });
  b.add(new THREE.CylinderGeometry(1.45, 1.45, 0.12, 10), 0x6e6c64, xf(0, 0.95, 0));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.5, 0.42, 0.42), 0x9a978e, xf(Math.sin(a) * 1.62, 1.17, Math.cos(a) * 1.62, 0, a, 0), { jitter: 0.1 });
  }
  for (const a of [2.5, 3.5, 4.5]) b.add(new THREE.IcosahedronGeometry(0.34, 0), 0xb59a6a, xf(Math.sin(a) * 2.1, 0.15, Math.cos(a) * 2.1, 0, a, 0, [1.3, 0.8, 1]));
  rod(b, [-1.0, 1.0, -1.1], [-1.0, 2.6, -1.1], 0.05, 0x3a2a1a, 5);
  b.tris([-1.0, 2.55, -1.1, -1.0, 2.05, -1.1, -1.55, 2.3, -1.1], 0x9c2a22);
  const turret = new THREE.Group();
  turret.name = 'turret';
  turret.position.set(0, 1.05, 0);
  const t = new Builder();
  t.add(new THREE.BoxGeometry(0.9, 0.35, 0.9), 0x5a3a1c, xf(0, 0.15, 0));
  t.add(new THREE.CylinderGeometry(0.28, 0.34, 1.8, 8), 0x2a2b30, xf(0, 0.55, 0.7, Math.PI / 2, 0, 0));
  t.add(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 8), 0x1c1d20, xf(0, 0.55, 1.55, Math.PI / 2, 0, 0));
  t.add(new THREE.IcosahedronGeometry(0.2, 0), 0xff6a2a, xf(0, 0.55, 1.65), { emit: 0xff4a10, glow: 2 });
  turret.add(paintedMesh(t.build()));
  const m = wrap(paintedMesh(b.build()), turret);
  return m;
}

/** Factories for the six pass-2 enemies. */
export const NEW_MODELS = {
  swarm: (): ShipModel => makeShip(ENEMY_LOOKS.swarm),
  serpent: makeSerpent,
  minelayer: makeMinelayer,
  ghost: (): ShipModel => makeShip(ENEMY_LOOKS.ghost),
  battery: makeBattery,
  fireship: makeFireShip,
};

/** Ghost ships (the ghost enemy, Ghost Galleon, Drowned Admiral): a green tint, an emissive spectral glow, a faint additive halo on the water and see-through hulls and sails. */
export const GHOST_ALPHA = 0.85;
let haloGeo: THREE.PlaneGeometry | null = null, haloMat: THREE.MeshBasicMaterial | null = null;
export function ghostify(root: THREE.Object3D, mats: { m: THREE.MeshStandardMaterial; e: number }[], size: number): void {
  for (const r of mats) {
    r.m.color.set(0x2fbf80);
    r.m.emissive.setHex(0x10d078);
    r.m.emissiveIntensity = 0.9;
    r.m.transparent = true;
    r.e = 0x10d078;
  }
  haloGeo ??= new THREE.PlaneGeometry(2, 2);
  if (!haloMat) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d') as CanvasRenderingContext2D, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    haloMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: 0x3dffb0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  }
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.12;
  halo.scale.setScalar(size);
  halo.name = 'ghosthalo';
  root.add(halo);
}
