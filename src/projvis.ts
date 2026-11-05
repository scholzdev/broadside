import * as THREE from 'three';
import { Builder, PAINTED, xf } from './geo';
import { chainGeo, arrowGeo } from './projvis3';

// ---- projectile looks: dark iron for the player, red-hot glowing shot for enemies (easy to read and dodge) ----

export type ProjKind = 'fball' | 'hball' | 'eball' | 'shell' | 'eshell' | 'keg' | 'harp' | 'cball' | 'rocket' | 'net' | 'skull' | 'musket' | 'chain' | 'arrow';
/** Kinds modelled along +Z that must face their flight direction. */
export const ORIENTED = (k: ProjKind): boolean => k === 'harp' || k === 'rocket' || k === 'skull' || k === 'arrow';

const iron = new THREE.MeshStandardMaterial({ color: 0x2a2b30, metalness: 0.65, roughness: 0.32 });
const hot = new THREE.MeshStandardMaterial({ color: 0x5a1206, emissive: new THREE.Color(0xff4a14), emissiveIntensity: 2.6, roughness: 0.6 });

const spark = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: new THREE.Color(0xffc060), emissiveIntensity: 2.2, roughness: 0.5 });
function shellGeo(body: number, fuse: number): THREE.BufferGeometry {
  const b = new Builder();
  b.add(new THREE.IcosahedronGeometry(0.5, 1), body, undefined, { smooth: true, jitter: 0 });
  b.add(new THREE.CylinderGeometry(0.08, 0.1, 0.18, 6), 0x3a2a1a, xf(0, 0.52, 0));
  b.add(new THREE.IcosahedronGeometry(0.11, 0), 0xffd27a, xf(0, 0.64, 0), { emit: fuse, glow: 6 });
  return b.build();
}
function kegGeo(): THREE.BufferGeometry {
  const b = new Builder();
  b.add(new THREE.CylinderGeometry(0.36, 0.4, 0.72, 10), 0x8a5428, undefined, { jitter: 0.05 });
  for (const y of [-0.24, 0.24]) b.add(new THREE.CylinderGeometry(0.41, 0.41, 0.07, 10), 0x2c2c30, xf(0, y, 0));
  b.add(new THREE.CylinderGeometry(0.39, 0.39, 0.1, 10), 0xb8282b, xf(0, 0, 0));
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 4), 0x3a2a1a, xf(0, 0.44, 0));
  b.add(new THREE.IcosahedronGeometry(0.08, 0), 0xffd27a, xf(0, 0.56, 0), { emit: 0xffa040, glow: 6 });
  return b.build();
}

function harpGeo(): THREE.BufferGeometry {
  const b = new Builder(), Z = Math.PI / 2;
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 5), 0x6b4424, xf(0, 0, -0.1, Z, 0, 0));
  b.add(new THREE.ConeGeometry(0.16, 0.5, 5), 0xdfe6ee, xf(0, 0, 0.9, Z, 0, 0));
  b.add(new THREE.ConeGeometry(0.1, 0.3, 4), 0x9aa4ad, xf(0.12, 0, 0.65, Z, 0, -0.9));
  b.add(new THREE.ConeGeometry(0.1, 0.3, 4), 0x9aa4ad, xf(-0.12, 0, 0.65, Z, 0, 0.9));
  b.add(new THREE.BoxGeometry(0.04, 0.4, 0.3), 0xb39a6a, xf(0, 0, -0.75));
  return b.build();
}
function rocketGeo(): THREE.BufferGeometry {
  const b = new Builder(), Z = Math.PI / 2;
  b.add(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8), 0xe8e0d0, xf(0, 0, 0, Z, 0, 0));
  b.add(new THREE.ConeGeometry(0.15, 0.35, 8), 0xc2412d, xf(0, 0, 0.55, Z, 0, 0));
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 8), 0xc2412d, xf(0, 0, -0.25, Z, 0, 0));
  for (const a of [0, Math.PI / 2]) b.add(new THREE.BoxGeometry(a ? 0.45 : 0.04, a ? 0.04 : 0.45, 0.28), 0x59626c, xf(0, 0, -0.3));
  b.add(new THREE.IcosahedronGeometry(0.17, 0), 0xffd27a, xf(0, 0, -0.5), { emit: 0xff7a20, glow: 6 });
  return b.build();
}
function netGeo(): THREE.BufferGeometry {
  const b = new Builder();
  b.add(new THREE.IcosahedronGeometry(0.5, 1), 0xb39a6a, undefined, { jitter: 0.06 });
  b.add(new THREE.TorusGeometry(0.5, 0.05, 4, 10), 0x5a3a1a, xf(0, 0, 0, 0, 0, 0));
  b.add(new THREE.TorusGeometry(0.5, 0.05, 4, 10), 0x5a3a1a, xf(0, 0, 0, Math.PI / 2, 0, 0));
  return b.build();
}

function skullGeo(): THREE.BufferGeometry {
  const b = new Builder();
  b.add(new THREE.IcosahedronGeometry(0.42, 1), 0xd8f5e8, undefined, { emit: 0x2fd8a0, glow: 3 });
  b.add(new THREE.BoxGeometry(0.34, 0.2, 0.3), 0xd8f5e8, xf(0, -0.36, 0.06), { emit: 0x2fd8a0, glow: 3 });
  for (const sx of [-0.15, 0.15]) b.add(new THREE.IcosahedronGeometry(0.1, 0), 0x0a2018, xf(sx, 0.02, 0.34));
  return b.build();
}

export const projGeo: Record<ProjKind, THREE.BufferGeometry> = {
  fball: new THREE.IcosahedronGeometry(0.3, 1), hball: new THREE.IcosahedronGeometry(0.5, 1), eball: new THREE.IcosahedronGeometry(0.32, 1),
  shell: shellGeo(0x1a1a1e, 0xffb040), eshell: shellGeo(0x3a120c, 0xff5a20), keg: kegGeo(),
  harp: harpGeo(), cball: new THREE.IcosahedronGeometry(0.46, 1), rocket: rocketGeo(), net: netGeo(), skull: skullGeo(), musket: new THREE.IcosahedronGeometry(0.16, 0), chain: chainGeo(), arrow: arrowGeo(),
};
export const projMat: Record<ProjKind, THREE.Material> = { fball: iron, hball: hot, eball: hot, shell: PAINTED, eshell: PAINTED, keg: PAINTED, harp: PAINTED, cball: iron, rocket: PAINTED, net: PAINTED, skull: PAINTED, musket: spark, chain: PAINTED, arrow: PAINTED };
/** Shells and kegs cast shadows (a mortar's shadow shows where it will land); balls are too small to matter. */
export const projShadow = (k: ProjKind): boolean => k === 'shell' || k === 'eshell' || k === 'keg' || k === 'net';

/** Smoke for player shot, an ember streak for enemy shot. */
export const trailStyle = (k: ProjKind): { color: number; glow: boolean } =>
  k === 'skull' ? { color: 0x5fffc0, glow: true } : k === 'musket' ? { color: 0xffd890, glow: true } : k === 'eball' || k === 'eshell' || k === 'hball' || k === 'rocket' || k === 'arrow' ? { color: 0xff7a30, glow: true } : { color: 0xcfcac2, glow: false };
