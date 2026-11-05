import * as THREE from 'three';
import { S, SHAKE_MUL } from './settings';

// ---- screen shake (trauma), hit-stop, recoil, floating damage numbers ----
export const J = { trauma: 0, hitstop: 0 };
export const addTrauma = (n: number): void => { J.trauma = Math.min(1, J.trauma + n); };
export const addHitstop = (s: number): void => { J.hitstop = Math.max(J.hitstop, s); };

/** Sprung roll offset (rad) from broadsides; ship.ts integrates it per render frame. */
export const kick = { x: 0, v: 0 };
export const addRecoil = (side: number): void => { kick.v += side * 1.2; };

const right = new THREE.Vector3(), up = new THREE.Vector3();
/** Offset the camera position (call AFTER follow + lookAt; never touches the follow target). */
export function applyShake(camera: THREE.Camera, dt: number, t: number): void {
  if (J.trauma <= 0) return;
  const m = J.trauma * J.trauma * 0.8 * SHAKE_MUL[S.shake];
  const nx = Math.sin(t * 53) + 0.5 * Math.sin(t * 91 + 1.3), ny = Math.sin(t * 47 + 2.1) + 0.5 * Math.sin(t * 83 + 0.4);
  right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  up.set(0, 1, 0).applyQuaternion(camera.quaternion);
  camera.position.addScaledVector(right, nx * m * 0.67).addScaledVector(up, ny * m * 0.67);
  J.trauma = Math.max(0, J.trauma - 1.6 * dt);
}

// ---- damage numbers: pooled DOM, projected each frame ----
type NumKind = 'hit' | 'boss' | 'hurt' | 'lucky' | 'heal' | 'blast' | 'gold' | 'grog';
interface Num { el: HTMLElement; on: boolean; key: object | null; age: number; amt: number; x: number; y: number; z: number; life: number }
const MAX_NUMS = 50, LIFE = 0.7, MERGE = 0.15;
const nums: Num[] = [];
let numIdx = 0;
export function initJuice(): void {
  const host = document.createElement('div');
  host.id = 'nums';
  document.getElementById('hud')?.appendChild(host);
  for (let i = 0; i < MAX_NUMS; i++) {
    const el = document.createElement('div');
    el.className = 'dn';
    host.appendChild(el);
    nums.push({ el, on: false, key: null, age: 0, amt: 0, x: 0, y: 0, z: 0, life: LIFE });
  }
}
export const activeNumbers = (): number => nums.reduce((n, d) => n + (d.on ? 1 : 0), 0);

/** Floating number at a world point. Hits on the same `key` within 0.15 s merge into one. */
export function hitNumber(key: object, x: number, y: number, z: number, amt: number, kind: NumKind): void {
  if (!S.nums) return;
  let d = nums.find(n => n.on && n.key === key && n.age < MERGE && n.el.dataset.k === kind);
  if (d) d.amt += amt;
  else {
    d = nums.find(n => !n.on) ?? nums[numIdx++ % MAX_NUMS];
    d.on = true; d.key = key; d.age = 0; d.amt = amt; d.life = LIFE; d.x = x; d.y = y; d.z = z;
    d.el.className = 'dn ' + kind;
    d.el.dataset.k = kind;
    d.el.style.display = 'none'; // shown by the next updateNumbers once positioned (no flash at the old spot)
  }
  d.el.textContent = String(Math.max(1, Math.round(d.amt)));
}

/** Longer-lived text popup (spell outcomes). Never merges. */
export function popText(x: number, y: number, z: number, text: string, kind: NumKind): void {
  const d = nums.find(n => !n.on) ?? nums[numIdx++ % MAX_NUMS];
  d.on = true; d.key = null; d.age = 0; d.amt = 0; d.x = x; d.y = y; d.z = z; d.life = 1.6;
  d.el.className = 'dn ' + kind;
  d.el.dataset.k = 'text';
  d.el.style.display = 'none';
  d.el.textContent = text;
}

const v3 = new THREE.Vector3();
let hideAt: (x: number, z: number) => boolean = () => false;
/** Hides damage numbers at world positions where `f` is true (set once by main.ts: the fog). */
export const setNumberFilter = (f: typeof hideAt): void => { hideAt = f; };
export function updateNumbers(camera: THREE.Camera, w: number, h: number, dt: number): void {
  for (const d of nums) {
    if (!d.on) continue;
    d.age += dt;
    if (d.age >= d.life) { d.on = false; d.key = null; d.el.style.display = 'none'; continue; }
    if (hideAt(d.x, d.z)) { d.el.style.display = 'none'; continue; } // Fog Coast: no numbers out in the murk
    v3.set(d.x, d.y, d.z).project(camera);
    const rise = (d.age / d.life) * (d.life > LIFE ? 60 : 38);
    d.el.style.display = '';
    d.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px,${(-v3.y * 0.5 + 0.5) * h - rise}px) translate(-50%,-100%)`;
    d.el.style.opacity = String(d.age < 0.35 ? 1 : 1 - (d.age - 0.35) / (d.life - 0.35));
  }
}
