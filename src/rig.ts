import * as THREE from 'three';
import { Builder, V3, rod, shade, xf } from './geo';

// ---- masts, yards, billowed sails, rigging lines, flags and pennants ----

export type Rig = 'square' | 'lateen' | 'gaff';
export type Emblem = 'skull' | 'cross' | 'crown' | 'plain' | `x:${string}`;
/** Extra flag emblems ('x:<name>', drawn on the 128x80 cloth); cosmetics.ts registers its flags here. `tint` is the relic ink, if any. */
export const EMBLEM_ART: Record<string, (g: CanvasRenderingContext2D, bg: string, tint?: string) => void> = {};
/**
 * A sail in ship space: geometry relative to `pivot` (its yard or head), so scale.y furls it toward the pivot.
 * Fore-and-aft sails billow along x; `foreAft` tells the animated path to turn them so local z is the billow axis.
 */
export interface Sail { geo: THREE.BufferGeometry; pivot: V3; foreAft?: boolean }

const _col = new THREE.Color();
/** Grid surface P(u,v) -> non-indexed geometry with smooth normals and per-triangle colours (linear). */
function surface(nu: number, nv: number, P: (u: number, v: number) => V3, paint: (u: number, v: number) => number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pos.push(...P(i / nu, j / nv));
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  g.dispose();
  const col: number[] = [];
  for (let f = 0; f < idx.length / 3; f++) {
    const q = Math.floor(f / 2), i = q % nu, j = Math.floor(q / nu);
    _col.set(paint((i + 0.5) / nu, (j + 0.5) / nv));
    for (let v = 0; v < 3; v++) col.push(_col.r, _col.g, _col.b);
  }
  ng.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return ng;
}

const panels = (base: number, stripe: number | undefined, n: number) => (u: number): number => {
  const k = Math.floor(u * n);
  if (stripe !== undefined) return k % 2 ? stripe : base;
  return k % 2 ? shade(base, 0.94) : base;
};

/** Square sail hanging from its yard (y = 0 down to -h), billowing toward +z (forward). */
export function squareSail(wTop: number, wBot: number, h: number, depth: number, color: number, stripe?: number): THREE.BufferGeometry {
  const pc = panels(color, stripe, 6);
  return surface(6, 4, (u, v) => {
    const x = (u * 2 - 1) * (wTop + (wBot - wTop) * v) / 2, k = 1 - (u * 2 - 1) ** 2;
    return [x, -v * h, depth * k * (Math.sin(Math.PI * v * 0.9) + 0.18 * v)];
  }, (u, v) => (v > 0.94 ? shade(color, 0.8) : pc(u)));
}

/** Fore-and-aft triangle or quad (lateen, gaff, jib) given corners; billows toward +x. */
function foreAft(c: V3[], depth: number, color: number): THREE.BufferGeometry {
  const quad = c.length === 4;
  return surface(5, 4, (u, v) => {
    // u along the foot (0 = luff), v up from the foot; triangles collapse the top edge to c[2]
    const a = c[0], b = c[1], top0 = quad ? c[3] : c[2], top1 = c[2];
    const lo: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    const hi: V3 = [top0[0] + (top1[0] - top0[0]) * u, top0[1] + (top1[1] - top0[1]) * u, top0[2] + (top1[2] - top0[2]) * u];
    const p: V3 = [lo[0] + (hi[0] - lo[0]) * v, lo[1] + (hi[1] - lo[1]) * v, lo[2] + (hi[2] - lo[2]) * v];
    p[0] += depth * Math.sin(Math.PI * Math.min(1, u * 1.1)) * Math.sin(Math.PI * v) * (quad ? 1 : 1 - v * 0.5);
    return p;
  }, u => (Math.floor(u * 5) % 2 ? shade(color, 0.94) : color));
}

export interface MastSpec { z: number; base: number; h: number; rig: Rig; tiers: number; width: number }
export interface RigOut { sails: Sail[]; tops: V3[] }

/** Spars and sails for every mast. Spars go into `b`; sails are returned so the caller can merge or animate them. */
export function buildRig(b: Builder, masts: MastSpec[], c: { wood: number; sail: number; stripe?: number; deckLen: number }): RigOut {
  const sails: Sail[] = [], tops: V3[] = [];
  const spar = shade(c.wood, 0.85);
  for (const m of masts) {
    const top = m.base + m.h, lower = m.base + m.h * 0.62;
    b.add(new THREE.CylinderGeometry(0.065, 0.09, lower - m.base, 7), c.wood, xf(0, (m.base + lower) / 2, m.z));
    b.add(new THREE.CylinderGeometry(0.035, 0.06, top - lower + 0.1, 6), c.wood, xf(0, (lower + top) / 2, m.z));
    b.add(new THREE.CylinderGeometry(0.2, 0.15, 0.06, 8), shade(c.wood, 0.75), xf(0, lower, m.z));
    tops.push([0, top, m.z]);
    if (m.rig === 'square') {
      const ratios = [0.44, 0.33, 0.23].slice(0, m.tiers), sum = ratios.reduce((s, r) => s + r, 0);
      let y = top - 0.12;
      const span = top - 0.12 - (m.base + 0.7);
      ratios.slice().reverse().forEach((r, ri) => {
        const tier = m.tiers - 1 - ri, h = (span * r) / sum - 0.05, w = m.width * Math.pow(0.8, tier);
        b.add(new THREE.CylinderGeometry(0.03, 0.03, w + 0.3, 5), spar, xf(0, y, m.z + 0.06, 0, 0, Math.PI / 2));
        sails.push({ geo: squareSail(w * 0.92, w * 1.04, h, 0.07, c.sail, c.stripe), pivot: [0, y, m.z + 0.08] });
        y -= h + 0.05;
      });
    } else if (m.rig === 'lateen') {
      const len = Math.min(c.deckLen * 0.42, m.h * 0.95), lo: V3 = [0, m.base + m.h * 0.2, m.z + len * 0.45];
      const hi: V3 = [0, m.base + m.h * 1.05, m.z - len * 0.55], clew: V3 = [0, m.base + 0.55, m.z - len * 0.5];
      rod(b, lo, hi, 0.03, spar, 5);
      const piv: V3 = [0, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
      const rel = (p: V3): V3 => [p[0] + 0.06, p[1] - piv[1], p[2] - piv[2]];
      sails.push({ geo: foreAft([rel(lo), rel(clew), rel(hi)], 0.25, c.sail), pivot: piv, foreAft: true });
    } else {
      const boomY = m.base + 0.6, gaffY = m.base + m.h * 0.72, len = Math.min(c.deckLen * 0.45, m.h * 0.8);
      const tack: V3 = [0, boomY, m.z - 0.08], clew: V3 = [0, boomY + 0.1, m.z - len], throat: V3 = [0, gaffY, m.z - 0.08], peak: V3 = [0, gaffY + len * 0.45, m.z - len * 0.9];
      rod(b, tack, clew, 0.03, spar, 5);
      rod(b, throat, peak, 0.026, spar, 5);
      const rel = (p: V3): V3 => [p[0] + 0.05, p[1] - gaffY, p[2]];
      sails.push({ geo: foreAft([rel(tack), rel(clew), rel(peak), rel(throat)], 0.3, c.sail), pivot: [0, gaffY, 0], foreAft: true });
    }
  }
  return { sails, tops };
}

/** Jib from the bowsprit tip to the foremast head (fore-and-aft triangle). */
export function jib(tip: V3, head: V3, footZ: number, footY: number, color: number): Sail {
  const piv = head;
  const rel = (p: V3): V3 => [p[0] + 0.04, p[1] - piv[1], p[2] - piv[2]];
  return { geo: foreAft([rel([0, tip[1] + 0.05, tip[2] - 0.1]), rel([0, footY, footZ]), rel([0, head[1] - 0.15, head[2] + 0.1])], 0.18, color), pivot: piv, foreAft: true };
}

/** Shrouds to the gunwale, stays between mastheads and to the bowsprit, backstay to the stern. */
export function rigging(b: Builder, masts: MastSpec[], gunwale: (z: number) => [number, number], bowTip: V3 | null, stern: V3, r: number, color: number): void {
  masts.forEach((m, i) => {
    const hy = m.base + m.h * 0.6;
    for (const sx of [1, -1]) for (const dz of [-0.4, -0.1, 0.2]) {
      const [gx, gy] = gunwale(m.z + dz);
      rod(b, [0, hy, m.z], [sx * (gx + 0.04), gy, m.z + dz], r, color);
    }
    const top: V3 = [0, m.base + m.h - 0.05, m.z];
    if (i === 0) { if (bowTip) rod(b, top, bowTip, r, color); }
    else { const p = masts[i - 1]; rod(b, top, [0, p.base + p.h * 0.55, p.z], r, color); }
    if (i === masts.length - 1) rod(b, top, stern, r, color);
  });
}

/** Long streamer at a masthead (static). */
export function pennant(b: Builder, top: V3, color: number, len: number): void {
  const pts: number[] = [];
  const n = 5, w = 0.09;
  for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n;
    const P = (u: number, side: number): V3 => [Math.sin(u * 5) * 0.08 * u, top[1] + 0.05 + side * w * (1 - u) - u * 0.12, top[2] - u * len];
    pts.push(...P(u0, 1), ...P(u0, -1), ...P(u1, -1), ...P(u0, 1), ...P(u1, -1), ...P(u1, 1));
  }
  b.tris(pts, color, { jitter: 0 });
  rod(b, [0, top[1] - 0.05, top[2]], [0, top[1] + 0.2, top[2]], 0.02, 0x2a2018, 4);
}

// ---- flags: waving cloth with a canvas emblem, one cached texture per colour + emblem ----
const flagTex = new Map<string, THREE.CanvasTexture>();
/** Flag cloth texture; `tint` recolours the emblem ink (relic flags). */
export function emblemTexture(color: number, emblem: Emblem, tint?: number): THREE.CanvasTexture {
  const key = color + emblem + (tint ?? '');
  let t = flagTex.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 80;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#' + color.toString(16).padStart(6, '0');
  g.fillRect(0, 0, 128, 80);
  const ink = tint !== undefined ? '#' + tint.toString(16).padStart(6, '0') : emblem === 'crown' ? '#f2c14e' : '#f4efe2';
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round';
  if (emblem === 'skull') {
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(42, 22); g.lineTo(86, 64); g.moveTo(86, 22); g.lineTo(42, 64); g.stroke();
    g.beginPath(); g.arc(64, 34, 15, 0, Math.PI * 2); g.fill();
    g.fillRect(56, 42, 16, 12);
    g.fillStyle = '#' + color.toString(16).padStart(6, '0');
    g.beginPath(); g.arc(58, 33, 4.5, 0, Math.PI * 2); g.arc(70, 33, 4.5, 0, Math.PI * 2); g.fill();
  } else if (emblem === 'cross') {
    g.fillRect(0, 32, 128, 16); g.fillRect(48, 0, 16, 80);
    g.fillStyle = '#b8282b'; g.fillRect(0, 36, 128, 8); g.fillRect(52, 0, 8, 80);
  } else if (emblem === 'crown') {
    g.beginPath(); g.moveTo(40, 56); g.lineTo(36, 24); g.lineTo(52, 40); g.lineTo(64, 18); g.lineTo(76, 40); g.lineTo(92, 24); g.lineTo(88, 56); g.closePath(); g.fill();
    g.fillRect(38, 58, 52, 8);
  } else EMBLEM_ART[emblem]?.(g, '#' + color.toString(16).padStart(6, '0'), tint !== undefined ? ink : undefined);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  flagTex.set(key, t);
  return t;
}

/** Flag group named 'flag' (the pole pivot), cloth streaming aft. Its own material carries the emblem texture. */
export function makeFlag(color: number, emblem: Emblem, size: number): THREE.Group {
  const geo = new THREE.PlaneGeometry(0.9 * size, 0.56 * size, 8, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + 0.45 * size; // hoist at the pole
    p.setXYZ(i, Math.sin(x * 5 / size) * 0.06 * size * (x / size), p.getY(i), -x);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: emblemTexture(color, emblem), side: THREE.DoubleSide, roughness: 0.9 }));
  mesh.position.y = -0.28 * size;
  mesh.castShadow = true;
  const g = new THREE.Group();
  g.name = 'flag';
  g.add(mesh);
  return g;
}
