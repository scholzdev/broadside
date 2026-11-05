import * as THREE from 'three';
import { Builder, paintedMesh, rod, xf, Paint } from './geo';
import { makeShip, ShipModel } from './models';
import { BOSS_LOOKS } from './fleet';
import type { BossId, MonsterBossId } from './seas';

// ---- v8 pass 3b boss models that are not ships: the two leviathans and the Lighthouse Fortress. Forward = +Z, root > tilt. ----
// Leviathan parts (named, animated by leviathan.ts): head > jaw, arch0..arch4, finL/finR, tail; `shadow` hangs off the root.

interface Look { skin: number; belly: number; fin: number; spike: number; eye: number; grow: number[]; crack?: number }
const LOOKS: Record<'coral' | 'ash', Look> = {
  coral: { skin: 0x2f7a86, belly: 0xe6d6ae, fin: 0x3f9e9a, spike: 0xe8e0c8, eye: 0x7affe6, grow: [0xff7a8a, 0xff9a52, 0xb46ad8, 0xffd27a] },
  ash: { skin: 0x3b3337, belly: 0x5e4a3e, fin: 0x463a3a, spike: 0x141012, eye: 0xffb030, grow: [0x1a1517, 0x2a2224], crack: 0xff5a1a },
};
export const ARCHES = 5;

/** A cluster of coral branches (coral look) or obsidian spikes with lava tips (ash look) at (x, y, z). */
function growth(b: Builder, L: Look, x: number, y: number, z: number, s: number, seed: number): void {
  for (let i = 0; i < 4; i++) {
    const a = seed * 2.3 + i * 1.7, lean = 0.25 + (i % 2) * 0.3, h = s * (0.8 + ((seed + i) % 3) * 0.3);
    const c = L.grow[(seed + i) % L.grow.length];
    const m = xf(x + Math.sin(a) * s * 0.3, y + h * 0.4, z + Math.cos(a) * s * 0.3, Math.cos(a) * lean, 0, -Math.sin(a) * lean, [s * 0.35, h, s * 0.35]);
    if (L.crack) {
      b.add(new THREE.ConeGeometry(1, 1, 5), c, m);
      b.add(new THREE.ConeGeometry(0.5, 0.35, 5), 0xff7a2a, xf(x + Math.sin(a) * s * 0.3 + Math.cos(a) * lean * h * 0.4, y + h * 0.82, z + Math.cos(a) * s * 0.3, 0, 0, 0, s * 0.3), { emit: L.crack, glow: 3 });
    } else {
      b.add(new THREE.CylinderGeometry(0.22, 0.4, 1, 5), c, m, { jitter: 0.12 });
      b.add(new THREE.IcosahedronGeometry(0.42, 0), c, xf(x + Math.sin(a) * s * 0.3 + Math.cos(a) * lean * h * 0.45, y + h * 0.88, z + Math.cos(a) * s * 0.3 - Math.sin(a) * lean * h * 0.1, 0, 0, 0, s * 0.45));
    }
  }
}
const belly = (L: Look, cut: number): Paint => (_x, y) => (y < cut ? L.belly : L.skin);

function head(L: Look): THREE.Group {
  const g = new THREE.Group(), b = new Builder(), j = new Builder();
  g.name = 'head'; g.position.set(0, 0.7, 3.2);
  b.add(new THREE.IcosahedronGeometry(1.9, 1), belly(L, -0.2), xf(0, 0.55, 0.2, 0, 0, 0, [1.15, 0.72, 1.4]), { jitter: 0.1 });
  b.add(new THREE.IcosahedronGeometry(1.2, 1), belly(L, -0.1), xf(0, 0.3, 2.0, 0.1, 0, 0, [1.0, 0.55, 1.35]), { jitter: 0.1 });
  for (const s of [-1, 1]) {
    b.add(new THREE.ConeGeometry(0.5, 1.6, 4), L.skin, xf(s * 0.95, 1.25, 0.9, -1.2, 0, s * 0.35, [1, 1, 0.5])); // brow ridge
    b.add(new THREE.IcosahedronGeometry(0.44, 1), 0x0a0c10, xf(s * 1.14, 0.98, 0.95));
    b.add(new THREE.IcosahedronGeometry(0.3, 1), L.eye, xf(s * 1.3, 1.02, 1.08), { emit: L.eye, glow: 5, smooth: true });
    b.add(new THREE.ConeGeometry(0.28, 1.8, 5), L.spike, xf(s * 0.7, 1.5, -0.9, -1.0, 0, s * 0.5)); // swept horn
    for (let k = 0; k < 5; k++) b.add(new THREE.ConeGeometry(0.11, 0.45, 4), 0xf4eedc, xf(s * (0.95 - k * 0.06), -0.05, 0.9 + k * 0.42, Math.PI, 0, 0)); // upper teeth
  }
  growth(b, L, 0, 1.0, -0.3, 1.1, 1);
  growth(b, L, 0.6, 0.85, 0.6, 0.7, 4);
  if (L.crack) for (const s of [-1, 1]) rod(b, [s * 0.4, 1.0, 1.9], [s * 1.0, 0.95, -0.6], 0.07, L.crack, 4, { emit: L.crack, glow: 3 });
  g.add(paintedMesh(b.build()));
  const jaw = new THREE.Group();
  jaw.name = 'jaw'; jaw.position.set(0, -0.1, 0.1);
  j.add(new THREE.IcosahedronGeometry(1.5, 1), L.belly, xf(0, -0.3, 1.3, 0, 0, 0, [0.95, 0.38, 1.55]), { jitter: 0.1 });
  j.add(new THREE.IcosahedronGeometry(1.0, 1), 0x8a2a2a, xf(0, -0.08, 1.4, 0, 0, 0, [0.7, 0.15, 1.2]));
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) j.add(new THREE.ConeGeometry(0.1, 0.4, 4), 0xf4eedc, xf(s * (0.8 - k * 0.07), 0.05, 0.7 + k * 0.42));
  jaw.add(paintedMesh(j.build()));
  g.add(jaw);
  return g;
}

function arch(L: Look, i: number): THREE.Mesh {
  const R = 1.9 - i * 0.24, tube = 0.78 - i * 0.09, b = new Builder();
  b.add(new THREE.TorusGeometry(R, tube, 7, 14, Math.PI), belly(L, R * 0.15), xf(0, -R * 0.3, 0, 0, Math.PI / 2, 0, [1, 1, 1.9]), { jitter: 0.1 });
  const top = R * 0.7 + tube;
  for (let k = -1; k <= 1; k++) b.add(new THREE.ConeGeometry(0.22 - i * 0.02, 1.2 - i * 0.12, 4), L.spike, xf(0, top + 0.35, k * R * 0.55, k * -0.35, 0, 0, [0.6, 1, 1.4]));
  if (i % 2 === 0) growth(b, L, tube * 0.6, top - 0.1, -R * 0.5, 0.7 - i * 0.06, i + 2);
  if (L.crack) for (const s of [-1, 1]) {
    rod(b, [s * tube * 1.6, R * 0.1, -R * 0.8], [s * tube * 1.2, top - 0.2, s * 0.2], 0.13, L.crack, 4, { emit: L.crack, glow: 4 });
    rod(b, [s * tube * 1.2, top - 0.2, s * 0.2], [s * tube * 1.5, R * 0.3, R * 0.8], 0.12, L.crack, 4, { emit: L.crack, glow: 4 });
  }
  const m = paintedMesh(b.build());
  m.name = 'arch' + i;
  m.position.set(0, 0, -0.9 - i * 3.0);
  return m;
}

function makeLeviathan(look: 'coral' | 'ash'): ShipModel {
  const L = LOOKS[look], root = new THREE.Group(), tilt = new THREE.Group();
  root.add(tilt);
  tilt.add(head(L));
  const neck = new Builder();
  neck.add(new THREE.IcosahedronGeometry(1.7, 1), belly(L, -0.3), xf(0, 0.25, 1.4, 0, 0, 0, [1.15, 0.8, 1.3]), { jitter: 0.1 });
  if (L.crack) for (const s of [-1, 1]) rod(neck, [s * 1.4, 0.9, 2.2], [s * 1.7, 0.4, 0.4], 0.13, L.crack, 4, { emit: L.crack, glow: 4 });
  tilt.add(paintedMesh(neck.build()));
  for (let i = 0; i < ARCHES; i++) tilt.add(arch(L, i));
  for (const s of [-1, 1]) {
    const f = new Builder();
    f.add(new THREE.ConeGeometry(0.9, 3.2, 4), L.fin, xf(s * 1.4, 0, -0.6, Math.PI / 2 + 0.5, s * -0.9, 0, [1, 1, 0.22]));
    for (let k = 0; k < 3; k++) rod(f, [0, 0.05, 0], [s * (2.2 + k * 0.2), 0.05, -1.2 - k * 0.5], 0.05, L.spike, 3);
    const fin = paintedMesh(f.build());
    fin.name = s < 0 ? 'finR' : 'finL';
    fin.position.set(s * 1.7, 0.1, 1.0);
    tilt.add(fin);
  }
  const tb = new Builder();
  tb.add(new THREE.IcosahedronGeometry(0.6, 1), L.skin, xf(0, 0, 0.6, 0, 0, 0, [0.7, 0.6, 1.5]));
  for (const s of [-1, 1]) tb.add(new THREE.ConeGeometry(0.9, 2.6, 4), L.fin, xf(s * 1.1, 0.1, -0.6, 0, 0, s * 1.2 + Math.PI, [1, 1, 0.25]));
  const tail = paintedMesh(tb.build());
  tail.name = 'tail'; tail.position.set(0, 0.2, -15.6);
  tilt.add(tail);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOp: { value: 0 }, uCol: { value: new THREE.Color(look === 'ash' ? 0x1a0a04 : 0x02161c) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uOp; uniform vec3 uCol; varying vec2 vUv;
      void main() { float d = length(vUv * 2.0 - 1.0); gl_FragColor = vec4(uCol, uOp * (1.0 - smoothstep(0.2, 1.0, d))); }`,
  }));
  sh.name = 'shadow'; sh.scale.set(3.4, 1, 10); sh.position.set(0, 0.45, -5.5); // soft dark body shape under the water (opacity set by leviathan.ts)
  root.add(sh);
  return { root, tilt, sails: [] };
}

/** Lighthouse Fortress core: rock island, curtain wall, a red-and-white tower with a glowing lantern (lamp at y = LAMP_Y). */
export const LAMP_Y = 10.9, FORT_R = 7.2, TURRET_R = 4.7;
function makeLighthouse(): ShipModel {
  const b = new Builder();
  b.add(new THREE.CylinderGeometry(6.6, 7.6, 2.4, 16, 1), (_x, y) => (y < -0.6 ? 0x3e4a3a : 0x6e6a62), xf(0, -0.6, 0), { jitter: 0.14 });
  for (let i = 0; i < 14; i++) {
    const a = i * 0.45 + (i % 3) * 0.2, r = 7.1 + (i % 2) * 0.5, s = 0.8 + (i % 4) * 0.22;
    b.add(new THREE.IcosahedronGeometry(s, 0), i % 2 ? 0x5e5a52 : 0x7a756a, xf(Math.sin(a) * r, 0.1, Math.cos(a) * r, i, i * 2, 0, [1.2, 0.8, 1]));
  }
  b.add(new THREE.CylinderGeometry(5.4, 5.4, 0.2, 8), 0x8c867a, xf(0, 0.7, 0), { jitter: 0.12 });
  b.add(new THREE.CylinderGeometry(5.5, 5.7, 1.5, 8, 1, true), 0x9a958a, xf(0, 1.35, 0, 0, Math.PI / 8, 0), { jitter: 0.1 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    b.add(new THREE.BoxGeometry(0.9, 0.5, 0.5), 0xa8a397, xf(Math.sin(a) * 5.55, 2.3, Math.cos(a) * 5.55, 0, a, 0), { jitter: 0.1 });
  }
  b.add(new THREE.CylinderGeometry(2.3, 2.7, 1.3, 10), 0x8a857a, xf(0, 1.3, 0), { jitter: 0.1 });
  b.add(new THREE.CylinderGeometry(1.25, 1.8, 8, 12, 5), (_x, y) => (Math.floor((y - 1.9) / 1.6) % 2 ? 0xb8322a : 0xece6d8), xf(0, 5.9, 0), { jitter: 0.04 });
  for (const [a, y] of [[0, 3.2], [2.1, 5.4], [4.2, 7.6], [1.1, 8.9]]) b.add(new THREE.BoxGeometry(0.4, 0.6, 0.2), 0x1c2228, xf(Math.sin(a) * 1.55, y, Math.cos(a) * 1.55, 0, a, 0));
  b.add(new THREE.BoxGeometry(0.9, 1.4, 0.3), 0x3a2a1a, xf(0, 2.5, 1.95));
  b.add(new THREE.CylinderGeometry(1.9, 1.6, 0.3, 12), 0x3a3e44, xf(0, 9.95, 0));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rod(b, [Math.sin(a) * 1.8, 10.1, Math.cos(a) * 1.8], [Math.sin(a) * 1.8, 10.6, Math.cos(a) * 1.8], 0.04, 0x2a2e34, 3);
  }
  b.add(new THREE.TorusGeometry(1.8, 0.05, 3, 24), 0x2a2e34, xf(0, 10.6, 0, Math.PI / 2, 0, 0));
  b.add(new THREE.CylinderGeometry(1.0, 1.0, 1.5, 10), 0xfff0b0, xf(0, LAMP_Y, 0), { emit: 0xffd27a, glow: 4.5 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    rod(b, [Math.sin(a) * 1.02, 10.1, Math.cos(a) * 1.02], [Math.sin(a) * 1.02, 11.7, Math.cos(a) * 1.02], 0.05, 0x1c1e22, 4);
  }
  b.add(new THREE.ConeGeometry(1.35, 1.2, 10), 0x7a1e18, xf(0, 12.2, 0));
  b.add(new THREE.IcosahedronGeometry(0.2, 0), 0xe8c14a, xf(0, 12.9, 0));
  rod(b, [-4.2, 2.0, -2.6], [-4.2, 5.0, -2.6], 0.06, 0x3a2a1a, 4);
  b.tris([-4.2, 4.95, -2.6, -4.2, 4.1, -2.6, -5.5, 4.5, -2.6], 0x9c2a22);
  for (const [x, z] of [[2.4, -2.6], [-2.6, 2.2], [2.8, 2.0]]) b.add(new THREE.BoxGeometry(0.7, 0.6, 0.7), 0x7a5a38, xf(x, 1.1, z, 0, x, 0));
  const root = new THREE.Group(), tilt = new THREE.Group();
  root.add(tilt);
  tilt.add(paintedMesh(b.build()));
  return { root, tilt, sails: [] };
}

const BOSS_MODELS: Record<MonsterBossId, () => ShipModel> = {
  leviathan: () => makeLeviathan('coral'),
  ashleviathan: () => makeLeviathan('ash'),
  lighthouse: makeLighthouse,
};
/** Factory of any boss model: a custom monster/fortress mesh, otherwise the ship look from fleet.ts. */
export const bossFactory = (id: BossId): (() => ShipModel) =>
  id in BOSS_MODELS ? BOSS_MODELS[id as MonsterBossId] : () => makeShip(BOSS_LOOKS[id as Exclude<BossId, MonsterBossId>]);
