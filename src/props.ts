import * as THREE from 'three';
import { Builder, paintedMesh, rod, shade, xf, PAINTED } from './geo';
import type { ShipModel } from './models';
import { IS, withStyle, pine, stump, spire, crater, coralBit } from './islandstyle';

// ---- islands, palms, huts, flotsam and the fire raft (each a single merged painted mesh) ----


function palm(b: Builder, x: number, y: number, z: number, h: number, lean: number, dir: number, rand: () => number): void {
  const seg = 5, lx = Math.sin(dir), lz = Math.cos(dir);
  let px = x, py = y, pz = z;
  for (let i = 0; i < seg; i++) {
    const k = (i + 1) / seg, bend = lean * k * k * h;
    const nx = x + lx * bend, ny = y + h * k, nz = z + lz * bend;
    rod(b, [px, py, pz], [nx, ny, nz], 0.13 - 0.06 * k, i % 2 ? IS.trunk : shade(IS.trunk, 0.82), 6);
    px = nx; py = ny; pz = nz;
  }
  const fronds = 6 + Math.floor(rand() * 2);
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + rand() * 0.4, len = 1.5 + rand() * 0.5, c = shade(IS.leaf, 0.85 + rand() * 0.35);
    const dx = Math.sin(a), dz = Math.cos(a), sx = dz, sz = -dx;
    const pts: number[] = [];
    let prev: [number, number, number] = [px, py, pz];
    for (let s = 1; s <= 4; s++) {
      const u = s / 4, w = 0.32 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.04;
      const cur: [number, number, number] = [px + dx * len * u, py + 0.25 * u - 1.1 * u * u * u, pz + dz * len * u];
      const pw = 0.32 * Math.sin(Math.PI * Math.min(1, (u - 0.25) * 1.15)) + 0.04;
      // V-shaped frond: centre rib slightly raised, edges droop
      pts.push(...prev, cur[0] + sx * w, cur[1] - 0.08, cur[2] + sz * w, ...cur);
      pts.push(...prev, ...cur, cur[0] - sx * w, cur[1] - 0.08, cur[2] - sz * w);
      if (s > 1) {
        pts.push(...prev, prev[0] + sx * pw, prev[1] - 0.08, prev[2] + sz * pw, cur[0] + sx * w, cur[1] - 0.08, cur[2] + sz * w);
        pts.push(...prev, cur[0] - sx * w, cur[1] - 0.08, cur[2] - sz * w, prev[0] - sx * pw, prev[1] - 0.08, prev[2] - sz * pw);
      }
      prev = cur;
    }
    b.tris(pts, c, { jitter: 0.08 });
  }
  const nut = new THREE.IcosahedronGeometry(0.11, 0);
  for (let i = 0; i < 3; i++) b.add(nut, 0x5a3b1c, xf(px + Math.sin(i * 2.1) * 0.12, py - 0.12, pz + Math.cos(i * 2.1) * 0.12));
  nut.dispose();
}

function rock(b: Builder, x: number, y: number, z: number, s: number, rand: () => number, c = IS.rock): void {
  const g = new THREE.DodecahedronGeometry(1, 0);
  b.add(g, c, xf(x, y, z, rand() * 3, rand() * 3, rand() * 3, [s * (0.8 + rand() * 0.5), s * (0.55 + rand() * 0.4), s * (0.8 + rand() * 0.5)]), { jitter: 0.12 });
  g.dispose();
}
function bush(b: Builder, x: number, y: number, z: number, s: number, rand: () => number): void {
  const g = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 3; i++) b.add(g, shade(IS.bush, 0.85 + rand() * 0.35), xf(x + (rand() - 0.5) * s, y + s * 0.35, z + (rand() - 0.5) * s, rand(), rand(), 0, s * (0.45 + rand() * 0.25)), { jitter: 0.1 });
  g.dispose();
}

/** Dock hut on stilts with a short jetty pointing out to sea (local +z). */
export function makeHut(groundY = 0.8): THREE.Group {
  const b = new Builder(), floor = Math.max(groundY, 0) + 0.45;
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [-0.25, 1.2], [0.25, 1.2], [-0.25, 1.9], [0.25, 1.9]]) {
    rod(b, [x, -0.6, z], [x, floor, z], 0.05, 0x5e4026, 5);
  }
  b.add(new THREE.BoxGeometry(1.4, 0.08, 1.4), 0x9b7446, xf(0, floor, 0));
  b.add(new THREE.BoxGeometry(0.6, 0.06, 1.2), 0x8d6a3e, xf(0, floor - 0.02, 1.4));
  b.add(new THREE.BoxGeometry(1.1, 0.75, 1.0), 0xc79a5c, xf(0, floor + 0.42, -0.05));
  b.add(new THREE.BoxGeometry(0.3, 0.45, 0.04), 0x3a2414, xf(0.15, floor + 0.3, 0.46));
  b.add(new THREE.BoxGeometry(0.22, 0.2, 0.04), 0xffcf7a, xf(-0.3, floor + 0.5, 0.46), { emit: 0xffb347, glow: 0.8 });
  b.add(new THREE.ConeGeometry(1.15, 0.85, 4), 0xc9a45a, xf(0, floor + 1.2, -0.05, 0, Math.PI / 4, 0, [1, 1, 0.95]), { jitter: 0.1 });
  b.add(new THREE.ConeGeometry(0.5, 0.3, 4), 0xa8843f, xf(0, floor + 1.62, -0.05, 0, Math.PI / 4, 0));
  const g = new THREE.Group();
  g.add(paintedMesh(b.build()));
  return g;
}

export interface IslandModel { group: THREE.Group; huts: { lx: number; lz: number; mesh: THREE.Object3D }[] }

/**
 * Island with an irregular beach that stays inside the collision radius r. The `rand` calls up to the hut
 * angles happen in the original order (palm count, 4 per palm, hut count, 1 per hut), so hut positions are unchanged.
 */
export function makeIsland(r: number, rand: () => number): IslandModel {
  const st = IS; // the style at generation time (dressing runs a few frames later)
  const nPalms = 2 + Math.floor(rand() * 4);
  const palms = Array.from({ length: nPalms }, () => ({ a: rand() * Math.PI * 2, d: r * (0.1 + rand() * 0.55), h: 2.2 + rand() * 0.8, lean: (rand() - 0.5) * 0.25 }));
  const nh = Math.floor(rand() * 3);
  const hutA = Array.from({ length: nh }, () => rand() * Math.PI * 2);
  const group = new THREE.Group();
  const huts: IslandModel['huts'] = hutA.map(a => {
    const lx = Math.sin(a) * r * 0.97, lz = Math.cos(a) * r * 0.97;
    const hut = new THREE.Group(); // placeholder: the hut mesh is added when the island is dressed
    hut.position.set(lx, 0, lz);
    hut.rotation.y = a;
    group.add(hut);
    return { lx, lz, mesh: hut };
  });
  pending.push(() => withStyle(st, () => dress(group, huts as { lx: number; lz: number; mesh: THREE.Group }[], r, rand, palms)));
  return { group, huts };
}

const pending: (() => void)[] = [];
export const queueBuild = (f: () => void): void => { pending.push(f); };
export const clearPending = (): void => { pending.length = 0; };
/**
 * Build queued island meshes for up to `budgetMs` (at least one per call). Islands are generated inside a sim
 * step when a new cell loads (several at once, ~3 ms each) far off-screen, so spreading them over frames never shows.
 */
export function buildPendingIslands(budgetMs: number): void {
  const t0 = performance.now();
  while (pending.length) {
    (pending.shift() as () => void)();
    if (performance.now() - t0 > budgetMs) break;
  }
}

/** Terrain, palms, rocks, bushes and hut meshes; uses only the island's own rand stream after the hut angles. */
function dress(group: THREE.Group, huts: { lx: number; lz: number; mesh: THREE.Group }[], r: number, rand: () => number, palms: { a: number; d: number; h: number; lean: number }[]): void {
  const ph = [rand() * 6.3, rand() * 6.3, rand() * 6.3], big = r > 6.5, hill = (big ? 0.5 + rand() * 1.3 : rand() * 0.3) * IS.hill;
  const R = (a: number): number => r * (0.94 + 0.06 * (0.5 * Math.sin(2 * a + ph[0]) + 0.3 * Math.sin(3 * a + ph[1]) + 0.2 * Math.sin(5 * a + ph[2])));
  // radial profile: [fraction of R, height, colour]
  const prof: [number, number, number][] = [
    [1.14, -1.0, IS.wet], [1.0, -0.06, IS.wet], [0.9, 0.3, IS.sand], [0.8, 0.44, IS.sand], [0.71, 0.66, IS.grass2],
    [0.52, 0.86 + hill * 0.45, IS.grass], [0.28, 0.98 + hill * 0.85, big ? shade(IS.grass, 0.9) : IS.grass], [0, 1.05 + hill, big ? IS.rock : IS.grass],
  ];
  const height = (f: number): number => {
    for (let i = 0; i < prof.length - 1; i++) {
      const [f0, h0] = prof[i], [f1, h1] = prof[i + 1];
      if (f <= f0 && f >= f1) return h0 + ((h1 - h0) * (f0 - f)) / (f0 - f1);
    }
    return f > prof[0][0] ? -1 : prof[prof.length - 1][1];
  };
  const groundAt = (x: number, z: number): number => height(Math.hypot(x, z) / R(Math.atan2(x, z)));
  const b = new Builder(), SEG = 30;
  for (let s = 0; s < SEG; s++) {
    const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 1) / SEG) * Math.PI * 2, r0 = R(a0), r1 = R(a1);
    for (let k = 0; k < prof.length - 1; k++) {
      const [fa, ha] = prof[k], [fb, hb, cb] = prof[k + 1];
      const p = (a: number, rr: number, f: number, hh: number): [number, number, number] => [Math.sin(a) * rr * f, hh, Math.cos(a) * rr * f];
      const col = k <= 1 ? (k === 0 ? IS.wet : IS.sand) : cb;
      if (fb === 0) b.tris([...p(a0, r0, fa, ha), ...p(a1, r1, fa, ha), ...p(a0, r0, 0, hb)], col, { jitter: 0.1 });
      else b.quad(p(a0, r0, fa, ha), p(a1, r1, fa, ha), p(a1, r1, fb, hb), p(a0, r0, fb, hb), col, { jitter: 0.08 });
    }
  }
  for (const p of palms) {
    const x = Math.sin(p.a) * p.d, z = Math.cos(p.a) * p.d;
    const gy = groundAt(x, z) - 0.05;
    if (IS.tree === 'palm') palm(b, x, gy, z, p.h, Math.abs(p.lean) + 0.12, rand() * 6.3, rand);
    else if (IS.tree === 'pine') pine(b, x, gy, z, p.h * 1.1, rand);
    else stump(b, x, gy, z, p.h * 0.7, rand);
  }
  const nRocks = 2 + Math.floor(rand() * (big ? 6 : 3));
  for (let i = 0; i < nRocks; i++) {
    const a = rand() * 6.3, f = big && i < 3 ? rand() * 0.35 : 0.78 + rand() * 0.22, x = Math.sin(a) * R(a) * f, z = Math.cos(a) * R(a) * f;
    rock(b, x, groundAt(x, z), z, (big && i < 3 ? 0.7 : 0.35) + rand() * 0.4, rand);
  }
  const nBush = 2 + Math.floor(rand() * 4);
  for (let i = 0; i < nBush; i++) {
    const a = rand() * 6.3, f = 0.2 + rand() * 0.45, x = Math.sin(a) * R(a) * f, z = Math.cos(a) * R(a) * f;
    bush(b, x, groundAt(x, z), z, 0.5 + rand() * 0.4, rand);
  }
  for (let i = 0; i < IS.spires * (big ? 2 : 1); i++) {
    const a = rand() * 6.3, f = 0.55 + rand() * 0.35, x = Math.sin(a) * R(a) * f, z = Math.cos(a) * R(a) * f;
    spire(b, x, groundAt(x, z), z, 1.6 + rand() * (big ? 2.6 : 1.4), rand);
  }
  if (IS.shoreCoral) for (let i = 0; i < 6; i++) { const a = rand() * 6.3, d = R(a) * (1.02 + rand() * 0.1); coralBit(b, Math.sin(a) * d, Math.cos(a) * d, 0.35 + rand() * 0.3, rand); }
  if (IS.crater && r > 5) crater(b, groundAt(0, 0), 0.9 + hill * 0.25);
  else if (big && rand() < IS.lighthouse) tower(b, 0, groundAt(0, 0), 0, IS.lighthouse > 0.5 || rand() < 0.5);
  group.add(paintedMesh(b.build()));
  for (const h of huts) h.mesh.add(makeHut(Math.max(0, groundAt(h.lx, h.lz))));
}

/** Lighthouse (glowing lamp) or ruined watchtower on a hilltop. */
function tower(b: Builder, x: number, y: number, z: number, light: boolean): void {
  const h = light ? 2.6 : 1.6;
  for (let i = 0; i < 4; i++) {
    const c = light ? (i % 2 ? 0xc0392b : 0xf2eee4) : shade(0xa29a88, 0.9 + i * 0.05);
    b.add(new THREE.CylinderGeometry(0.52 - i * 0.06 - 0.06, 0.52 - i * 0.06, h / 4, 8), c, xf(x, y + (i + 0.5) * (h / 4), z));
  }
  if (light) {
    b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.35, 8), 0xfff0b0, xf(x, y + h + 0.17, z), { emit: 0xffd27a, glow: 3 });
    b.add(new THREE.ConeGeometry(0.38, 0.4, 8), 0x2b2b30, xf(x, y + h + 0.55, z));
  } else {
    for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(0.16, 0.22, 0.16), 0xa29a88, xf(x + Math.sin(i) * 0.36, y + h + 0.1, z + Math.cos(i) * 0.36));
  }
}

// ---- floating cargo: a few cached variants, one mesh each ----
const cargo: THREE.BufferGeometry[] = [];
function cargoVariants(): THREE.BufferGeometry[] {
  if (cargo.length) return cargo;
  const crate = new Builder();
  crate.add(new THREE.BoxGeometry(0.9, 0.7, 0.9), 0xa06a35, xf(0, 0.1, 0));
  for (const [x, z] of [[-0.43, -0.43], [0.43, -0.43], [-0.43, 0.43], [0.43, 0.43]]) crate.add(new THREE.BoxGeometry(0.1, 0.74, 0.1), 0x6b4321, xf(x, 0.1, z));
  crate.add(new THREE.BoxGeometry(0.94, 0.08, 0.94), 0xc08a4c, xf(0, 0.47, 0));
  crate.add(new THREE.BoxGeometry(0.1, 0.06, 0.96), 0x6b4321, xf(0, 0.53, 0, 0, Math.PI / 4, 0));
  cargo.push(crate.build());
  const barrel = new Builder();
  barrel.add(new THREE.CylinderGeometry(0.36, 0.36, 0.95, 10), 0x93602f, xf(0, 0.15, 0, Math.PI / 2, 0, 0));
  for (const z of [-0.33, 0, 0.33]) barrel.add(new THREE.CylinderGeometry(0.39, 0.39, 0.07, 10), 0x3b3b40, xf(0, 0.15, z, Math.PI / 2, 0, 0));
  cargo.push(barrel.build());
  const bale = new Builder();
  bale.add(new THREE.BoxGeometry(1.0, 0.55, 0.75), 0xd8c28a, xf(0, 0.1, 0));
  bale.add(new THREE.BoxGeometry(1.04, 0.58, 0.08), 0x7a5a32, xf(0, 0.1, 0.18));
  bale.add(new THREE.BoxGeometry(1.04, 0.58, 0.08), 0x7a5a32, xf(0, 0.1, -0.18));
  cargo.push(bale.build());
  const chest = new Builder();
  chest.add(new THREE.BoxGeometry(0.85, 0.5, 0.6), 0x7a4220, xf(0, 0.1, 0));
  chest.add(new THREE.CylinderGeometry(0.3, 0.3, 0.85, 8, 1, false, 0, Math.PI), 0x8a4c26, xf(0, 0.35, 0, 0, 0, Math.PI / 2));
  chest.add(new THREE.BoxGeometry(0.9, 0.08, 0.64), 0xe0b040, xf(0, 0.36, 0));
  chest.add(new THREE.BoxGeometry(0.12, 0.16, 0.04), 0xffd86a, xf(0, 0.3, 0.31), { emit: 0xffc040, glow: 0.6 });
  cargo.push(chest.build());
  return cargo;
}
export const makeCrate = (): THREE.Group => {
  const v = cargoVariants(), r = Math.random();
  const g = new THREE.Group();
  const m = new THREE.Mesh(r < 0.45 ? v[0] : r < 0.75 ? v[1] : r < 0.94 ? v[2] : v[3], PAINTED);
  m.receiveShadow = true;
  g.add(m);
  return g;
};

/** Fire raft: lashed logs, powder barrels and a burning pyre (HDR emissive flames). */
export function makeRaft(): ShipModel {
  const b = new Builder();
  for (let i = 0; i < 5; i++) rod(b, [-0.64 + i * 0.32, 0.02, -1.25], [-0.64 + i * 0.32, 0.02, 1.25], 0.17, i % 2 ? 0x6a4424 : 0x5a381c, 7);
  for (const z of [-0.8, 0.8]) b.add(new THREE.BoxGeometry(1.8, 0.1, 0.2), 0x3c2612, xf(0, 0.22, z));
  for (const [x, z] of [[0.45, -0.75], [-0.45, -0.7]]) {
    b.add(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 8), 0x7a4a24, xf(x, 0.45, z));
    b.add(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 8), 0xb8282b, xf(x, 0.55, z));
  }
  for (let i = 0; i < 5; i++) rod(b, [Math.sin(i * 1.3) * 0.5, 0.22, 0.25 + Math.cos(i * 1.3) * 0.45], [0, 0.85, 0.25], 0.06, 0x2a1a10, 5);
  const fl = new THREE.ConeGeometry(1, 1, 6);
  b.add(fl, 0xff6a1a, xf(0, 0.95, 0.25, 0, 0, 0, [0.55, 1.5, 0.55]), { emit: 0xff5a10, glow: 3.5 });
  b.add(fl, 0xffb43a, xf(0.25, 0.85, 0.05, 0, 0.5, 0.15, [0.35, 1.1, 0.35]), { emit: 0xff9a20, glow: 4 });
  b.add(fl, 0xffe08a, xf(-0.18, 0.75, 0.4, 0, 1, -0.2, [0.28, 0.8, 0.28]), { emit: 0xffd060, glow: 4.5 });
  fl.dispose();
  rod(b, [0, 0.2, -0.95], [0, 2.0, -0.95], 0.05, 0x3a2412, 5);
  b.tris([0.03, 1.9, -0.95, 0.03, 0.8, -0.95, 0.3, 1.0, -1.6], 0x4a3a2c);
  const root = new THREE.Group(), tilt = new THREE.Group();
  root.add(tilt);
  tilt.add(paintedMesh(b.build()));
  return { root, tilt, sails: [] };
}
