import * as THREE from 'three';
import { Builder, xf } from './geo';

// ---- projectile models of the v10 modules: chain shot (two balls on a chain) and a flaming arrow ----
export function chainGeo(): THREE.BufferGeometry {
  const b = new Builder();
  for (const s of [-1, 1]) b.add(new THREE.IcosahedronGeometry(0.26, 1), 0x2a2b30, xf(0, s * 0.5, 0), { smooth: true, jitter: 0 });
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4), 0x8d939c, xf(0, 0, 0));
  for (const y of [-0.2, 0, 0.2]) b.add(new THREE.TorusGeometry(0.08, 0.03, 4, 6), 0xb4bac2, xf(0, y, 0, y ? 0 : Math.PI / 2, 0, 0));
  return b.build();
}
export function arrowGeo(): THREE.BufferGeometry {
  const b = new Builder(), Z = Math.PI / 2;
  b.add(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 4), 0x7a5632, xf(0, 0, 0, Z, 0, 0));
  b.add(new THREE.ConeGeometry(0.1, 0.3, 5), 0xdfe6ee, xf(0, 0, 0.75, Z, 0, 0));
  b.add(new THREE.IcosahedronGeometry(0.15, 0), 0xffd27a, xf(0, 0, 0.62), { emit: 0xff7a20, glow: 6 });
  for (const a of [0, Math.PI / 2]) b.add(new THREE.BoxGeometry(a ? 0.3 : 0.03, a ? 0.03 : 0.3, 0.22), 0xe8e0d0, xf(0, 0, -0.55));
  return b.build();
}
