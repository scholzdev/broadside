import * as THREE from 'three';
import { scene } from './game';
import { makeCrate } from './props';

// ---- world marker of the treasure quest: a pulsing gold ring on the water with a chest prop in the middle ----
const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc83a).multiplyScalar(2), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
const ringGeo = new THREE.RingGeometry(3.3, 4, 48).rotateX(-Math.PI / 2);
const discMat = new THREE.MeshBasicMaterial({ color: 0xffc83a, transparent: true, opacity: 0.16, depthWrite: false });
const discGeo = new THREE.CircleGeometry(3.3, 40).rotateX(-Math.PI / 2);
let mark: THREE.Group | null = null;

export function showMark(x: number, z: number): void {
  hideMark();
  mark = new THREE.Group();
  mark.add(new THREE.Mesh(ringGeo, ringMat), new THREE.Mesh(discGeo, discMat));
  const chest = makeCrate();
  chest.name = 'chest'; chest.scale.setScalar(2.2);
  mark.add(chest);
  mark.position.set(x, 0.12, z);
  scene.add(mark);
}
export function hideMark(): void { if (mark) { scene.remove(mark); mark = null; } }
/** Pulse and bob (sim time, so it freezes while paused). */
export function animateMark(time: number): void {
  if (!mark) return;
  const s = 1 + Math.sin(time * 3) * 0.06;
  mark.children[0].scale.set(s, 1, s);
  const chest = mark.getObjectByName('chest');
  if (chest) { chest.position.y = 0.5 + Math.sin(time * 2) * 0.15; chest.rotation.y = time * 0.8; }
}
