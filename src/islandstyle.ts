import * as THREE from 'three';
import { Builder, paintedMesh, rod, shade, xf } from './geo';
import type { IslandStyle } from './seas';

// ---- per-sea island palettes and the extra dressing pieces (pines, stumps, spires, lava craters, reef coral) ----

export interface StylePal {
  sand: number; wet: number; grass: number; grass2: number; rock: number; trunk: number; leaf: number; bush: number;
  tree: 'palm' | 'pine' | 'stump'; hill: number; crater: boolean; spires: number; lighthouse: number; shoreCoral: boolean;
}
export const STYLES: Record<IslandStyle, StylePal> = {
  tropical: { sand: 0xead39a, wet: 0xc4a970, grass: 0x6aa547, grass2: 0x7fb653, rock: 0x8d877a, trunk: 0x8a6238, leaf: 0x3f9a45, bush: 0x3f8a3a, tree: 'palm', hill: 1, crater: false, spires: 0, lighthouse: 0.35, shoreCoral: false },
  coral: { sand: 0xf8eedb, wet: 0xdccaa2, grass: 0x78c24c, grass2: 0x98d462, rock: 0xf29aa6, trunk: 0x9a7040, leaf: 0x48b84a, bush: 0x44a446, tree: 'palm', hill: 0.6, crater: false, spires: 0, lighthouse: 0.15, shoreCoral: true },
  rocky: { sand: 0x8c8a7c, wet: 0x66665c, grass: 0x4c6a4a, grass2: 0x5d7a55, rock: 0x6c706e, trunk: 0x5a4a38, leaf: 0x2f5a3c, bush: 0x3a5a3c, tree: 'pine', hill: 1.6, crater: false, spires: 3, lighthouse: 0.8, shoreCoral: false },
  volcanic: { sand: 0x2c2826, wet: 0x1c1918, grass: 0x3c332c, grass2: 0x4a3e34, rock: 0x262220, trunk: 0x1e1814, leaf: 0x3a2a1e, bush: 0x2e2620, tree: 'stump', hill: 2.2, crater: true, spires: 1, lighthouse: 0, shoreCoral: false },
};
/** The style the next islands are dressed with (set by world.resetWorld). */
export let IS: StylePal = STYLES.tropical;
export const setIslandStyle = (s: IslandStyle): void => { IS = STYLES[s]; };
/** Runs `f` with style `p` active (queued islands are dressed in the style they were generated with). */
export const withStyle = (p: StylePal, f: () => void): void => { const cur = IS; IS = p; try { f(); } finally { IS = cur; } };

export function pine(b: Builder, x: number, y: number, z: number, h: number, rand: () => number): void {
  rod(b, [x, y, z], [x, y + h * 0.4, z], 0.12, IS.trunk, 5);
  const g = new THREE.ConeGeometry(1, 1, 7);
  for (let i = 0; i < 3; i++) {
    const s = (0.95 - i * 0.25) * (0.9 + rand() * 0.2);
    b.add(g, shade(IS.leaf, 0.85 + rand() * 0.3), xf(x, y + h * (0.45 + i * 0.22), z, 0, rand() * 3, 0, [s, h * 0.38, s]), { jitter: 0.1 });
  }
  g.dispose();
}
/** Charred tree: a bare, bent trunk with two broken branches. */
export function stump(b: Builder, x: number, y: number, z: number, h: number, rand: () => number): void {
  const a = rand() * 6.3, lx = Math.sin(a) * 0.3, lz = Math.cos(a) * 0.3;
  rod(b, [x, y, z], [x + lx, y + h * 0.7, z + lz], 0.13, IS.trunk, 5);
  for (const k of [0.45, 0.6]) {
    const ba = rand() * 6.3;
    rod(b, [x + lx * k, y + h * 0.7 * k, z + lz * k], [x + lx * k + Math.sin(ba) * 0.6, y + h * 0.7 * k + 0.45, z + lz * k + Math.cos(ba) * 0.6], 0.05, IS.trunk, 4);
  }
}
export function spire(b: Builder, x: number, y: number, z: number, h: number, rand: () => number): void {
  const g = new THREE.CylinderGeometry(0.25, 0.75, 1, 6);
  b.add(g, shade(IS.rock, 0.85 + rand() * 0.3), xf(x, y + h / 2 - 0.2, z, (rand() - 0.5) * 0.2, rand() * 3, (rand() - 0.5) * 0.2, [1, h, 1]), { jitter: 0.14 });
  g.dispose();
}
/** Glowing lava pool and a dark rim at the summit of a volcanic island. */
export function crater(b: Builder, y: number, r: number): void {
  b.add(new THREE.CylinderGeometry(r * 0.9, r * 1.25, 0.6, 9, 1, true), shade(IS.rock, 0.8), xf(0, y + 0.1, 0), { jitter: 0.15 });
  b.add(new THREE.CircleGeometry(r * 0.85, 9).rotateX(-Math.PI / 2), 0xff6a1a, xf(0, y + 0.2, 0), { emit: 0xff4a10, glow: 2.6 });
}
const CORAL = [0xff6f8e, 0xff9a5a, 0xc86ad8, 0xffd36a, 0xf25a6a];
export function coralBit(b: Builder, x: number, z: number, s: number, rand: () => number, y = -0.15): void {
  const c = CORAL[Math.floor(rand() * CORAL.length)], kind = rand();
  if (kind < 0.5) { // branching coral
    for (let i = 0; i < 4; i++) {
      const a = rand() * 6.3, l = s * (0.6 + rand() * 0.6);
      rod(b, [x, y, z], [x + Math.sin(a) * l * 0.5, y + l, z + Math.cos(a) * l * 0.5], 0.07 * s + 0.03, c, 4, { emit: c, glow: 0.15 });
    }
  } else { // brain / boulder coral
    b.add(new THREE.IcosahedronGeometry(1, 0), c, xf(x, y, z, rand(), rand(), 0, [s * 0.6, s * 0.4, s * 0.6]), { jitter: 0.15 });
  }
}
/** Coral heads poking out of a reef patch (one merged mesh). */
export function makeReefMesh(x: number, z: number, r: number, rand: () => number): THREE.Mesh {
  const b = new Builder(), n = 5 + Math.floor(r * 1.5);
  for (let i = 0; i < n; i++) {
    const a = rand() * 6.3, d = Math.sqrt(rand()) * r * 0.85;
    coralBit(b, Math.sin(a) * d, Math.cos(a) * d, 0.5 + rand() * 0.6, rand);
  }
  const m = paintedMesh(b.build(), false);
  m.position.set(x, 0, z);
  return m;
}
