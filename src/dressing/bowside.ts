import { Builder, V3, shade } from '../geo';
import type { Build } from './types';
import { C, box, cyl, prim, rod, tube, cannon, boat } from './kit';

// ---- bow and side attachments ----

const glow = (c: number, g = 3) => ({ emit: c, glow: g });

/** Long bow chaser on a slide on the foredeck, just to port of the bowsprit, muzzle well past the stem. */
export const chaser: Build = (b, a, c) => {
  const x = 0.17, ts = 0.82, zs = a.z(ts), ze = a.L / 2 + 0.55, dy = a.top(0.86), y = dy + 0.17;
  box(b, C.wood, [x, dy + 0.06, zs + 0.35], [0.3, 0.12, 0.7]);
  for (const dz of [0.1, 0.6]) cyl(b, C.iron, [x, dy + 0.06, zs + dz], 0.06, 0.36, [0, 0, Math.PI / 2], 8);
  cannon(b, [x, y, zs], [x, y + 0.04, ze], 0.085, c.color);
  tube(b, C.ironHi, [x, y + 0.04, ze - 0.05], [x, y + 0.04, ze + 0.04], 0.1, 0.1);
};

/** Iron beak just above the waterline on the stem, with a riveted collar and a cheek plate each side. */
export const ram: Build = (b, a) => {
  const zb = a.L / 2, y = 0.3, cx = a.sideX(a.t(zb - 0.45), 0.4) + 0.02;
  prim(b, 'cone8', C.iron, [0, y, zb + 0.5], [0.26, 1.15, 0.2], [Math.PI / 2, 0, 0]);
  prim(b, 'cone8', C.ironHi, [0, y, zb + 1.0], [0.09, 0.22, 0.07], [Math.PI / 2, 0, 0]);
  box(b, C.iron, [0, 0.36, zb - 0.1], [0.4, 0.7, 0.36]);
  box(b, C.ironHi, [0, 0.72, zb - 0.1], [0.42, 0.06, 0.38]);
  for (const sx of [1, -1]) {
    box(b, C.iron, [sx * cx, y + 0.02, zb - 0.45], [0.05, 0.3, 0.8], [0, sx * 0.35, 0]);
    for (const yy of [0.2, 0.5]) prim(b, 'sph', 0xc9c2b0, [sx * 0.205, yy, zb + 0.0], 0.035);
  }
};

/** Ward charm: brass ring with a glowing blue gem swinging from the bowsprit. */
export const ward: Build = (b, a, c) => {
  const y0 = a.rail(0.9) - 0.05, z0 = a.z(0.86), k = 0.68;
  const p: V3 = [0, y0 + (a.tip[1] - y0) * k - 0.03, z0 + (a.tip[2] - z0) * k];
  cyl(b, C.brass, [p[0], p[1] + 0.01, p[2]], 0.06, 0.06, [Math.PI / 2 - 0.32, 0, 0]);
  const g = new Builder();
  rod(g, [0, 0, 0], [0, -0.24, 0], 0.012, C.brass, 4);
  prim(g, 'torus', C.brass, [0, -0.36, 0], 0.12, [0, 0, 0]);
  prim(g, 'oct', c.color, [0, -0.36, 0], [0.085, 0.12, 0.085], [0, 0, 0], glow(c.color, 2.6));
  c.anims.push({ geo: g.build(), at: p, kind: 'swing', halo: { color: c.color, size: 0.7, dy: -0.36 } });
};

/** Harpoon gun on a swivel post to starboard of the bowsprit, with a rope coil. */
export const harpoon: Build = (b, a, c) => {
  const x = -0.2, t = 0.86, z = a.z(t), dy = a.top(t), py = dy + 0.36;
  cyl(b, C.wood, [x, dy + 0.15, z], 0.06, 0.3);
  box(b, C.iron, [x, py - 0.04, z], [0.16, 0.08, 0.12]);
  tube(b, C.iron, [x, py, z - 0.3], [x, py + 0.12, z + 0.45], 0.065, 0.05);
  tube(b, c.color, [x, py + 0.02, z - 0.1], [x, py + 0.04, z + 0.02], 0.075, 0.075);
  box(b, C.dark, [x, py - 0.06, z - 0.32], [0.05, 0.14, 0.05]);
  const tipZ = z + 0.82, tipY = py + 0.18;
  rod(b, [x, py + 0.12, z + 0.45], [x, tipY, tipZ], 0.018, C.ironHi, 4);
  prim(b, 'cone6', 0xd8dde3, [x, tipY + 0.01, tipZ + 0.08], [0.05, 0.18, 0.05], [Math.PI / 2, 0, 0]);
  for (const s of [1, -1]) box(b, 0xd8dde3, [x + s * 0.045, tipY, tipZ + 0.02], [0.05, 0.02, 0.1], [0, s * 0.5, 0]);
  const cz = z - 0.25;
  cyl(b, C.rope, [x - 0.06, dy + 0.05, cz], 0.15, 0.1, undefined, 10);
  cyl(b, shade(C.rope, 0.7), [x - 0.06, dy + 0.1, cz], 0.08, 0.02, undefined, 8);
  rod(b, [x - 0.06, dy + 0.1, cz], [x, tipY - 0.02, tipZ - 0.15], 0.01, C.rope, 3);
};

/** Run-out deck cannons over the rail: one per broadside ball each side (capped at 6). */
export const broadside: Build = (b, a, c) => {
  const [t0, t1] = a.sideRange(c.idx, c.n), k = Math.min(6, Math.max(1, c.balls));
  for (let i = 0; i < k; i++) {
    const t = t0 + ((t1 - t0) * (i + 0.5)) / k, z = a.z(t), rx = a.railX(t), ry = a.railTop(t), dy = a.top(t);
    for (const sx of [1, -1]) {
      box(b, C.wood, [sx * (rx - 0.24), dy + 0.08, z], [0.3, 0.14, 0.2]);
      for (const dz of [-0.09, 0.09]) cyl(b, C.dark, [sx * (rx - 0.2), dy + 0.05, z + dz], 0.05, 0.03, [Math.PI / 2, 0, 0], 8);
      cannon(b, [sx * (rx - 0.36), ry + 0.02, z], [sx * (rx + 0.24), ry + 0.05, z], 0.062, c.color);
    }
  }
};

/** Greek fire: brass tank amidships, copper pipes to two flared nozzles a side with pilot flames. */
export const siphon: Build = (b, a, c) => {
  const [t0, t1] = a.sideRange(c.idx, c.n), tm = (t0 + t1) / 2, z = a.z(tm), dy = a.top(tm), ty = dy + 0.25;
  cyl(b, 0xa8803a, [0, ty, z], 0.17, 0.66, [Math.PI / 2, 0, 0], 10);
  for (const s of [-1, 1]) {
    prim(b, 'sph', 0xa8803a, [0, ty, z + s * 0.33], [0.17, 0.17, 0.07]);
    cyl(b, C.iron, [0, ty, z + s * 0.2], 0.18, 0.05, [Math.PI / 2, 0, 0], 10);
    box(b, C.wood, [0, dy + 0.07, z + s * 0.25], [0.44, 0.14, 0.08]);
  }
  cyl(b, C.iron, [0, ty + 0.24, z], 0.035, 0.1);
  cyl(b, 0xf2ead0, [0, ty + 0.3, z], 0.06, 0.03, undefined, 10);
  const copper = 0xb8643a, flame = c.color;
  for (const sx of [1, -1]) for (const dt of [-0.22, 0.22]) {
    const tj = tm + (t1 - t0) * dt, zj = a.z(tj), rx = a.railX(tj), ry = a.railTop(tj);
    rod(b, [sx * 0.16, ty + 0.08, z + dt * 0.3], [sx * (rx - 0.1), ry + 0.12, zj], 0.03, copper, 5);
    tube(b, C.brass, [sx * (rx - 0.1), ry + 0.12, zj], [sx * (rx + 0.26), ry + 0.03, zj], 0.035, 0.065);
    prim(b, 'ico', flame, [sx * (rx + 0.3), ry + 0.03, zj], 0.05, [0, 0, 0], glow(flame, 3.2));
  }
};

/** Boarding party: a longboat hanging outboard on davits each side, oars stowed, gunwale striped in the module colour. */
export const boarding: Build = (b, a, c) => {
  const [t0, t1] = a.sideRange(c.idx, c.n), tm = (t0 + t1) / 2, z = a.z(tm), rx = a.railX(tm), ry = a.railTop(tm);
  const len = Math.min(1.3, (t1 - t0) * a.L * 0.7), w = 0.46, out = rx + 0.36, keel = ry - 0.34;
  for (const sx of [1, -1]) {
    const bx = sx * out;
    boat(b, [bx, keel, z], len, w, 0x7a5230, 0x5a3a20);
    for (const s of [1, -1]) box(b, c.color, [bx + s * w * 0.48, keel + w * 0.4, z], [0.04, 0.05, len * 0.78]);
    for (const s of [1, -1]) rod(b, [bx + s * 0.08, keel + w * 0.45, z - len * 0.36], [bx + s * 0.1, keel + w * 0.45, z + len * 0.36], 0.014, C.plank, 4);
    for (const s of [1, -1]) {
      const zd = z + s * len * 0.36, foot: V3 = [sx * (rx - 0.04), ry - 0.22, zd], bend: V3 = [sx * (rx + 0.04), ry + 0.3, zd], end: V3 = [sx * (out + 0.02), ry + 0.38, zd];
      rod(b, foot, bend, 0.025, C.iron, 5);
      rod(b, bend, end, 0.022, C.iron, 5);
      rod(b, end, [bx, keel + w * 0.45, zd], 0.008, C.rope, 3);
    }
  }
};

/** Carronades: two short, fat guns on red slides each side. */
export const carronade: Build = (b, a, c) => {
  const [t0, t1] = a.sideRange(c.idx, c.n);
  for (let i = 0; i < 2; i++) {
    const t = t0 + ((t1 - t0) * (i + 0.5)) / 2, z = a.z(t), rx = a.railX(t), ry = a.railTop(t), dy = a.top(t);
    for (const sx of [1, -1]) {
      box(b, 0x7a2a1c, [sx * (rx - 0.22), dy + 0.09, z], [0.42, 0.06, 0.2], [0, 0, sx * -0.15]);
      box(b, 0x5a1e14, [sx * (rx - 0.2), dy + 0.05, z], [0.1, 0.1, 0.22]);
      tube(b, C.iron, [sx * (rx - 0.18), ry + 0.06, z], [sx * (rx + 0.18), ry + 0.06, z], 0.1, 0.085);
      prim(b, 'sph', C.iron, [sx * (rx - 0.2), ry + 0.06, z], 0.11);
      tube(b, c.color, [sx * (rx + 0.1), ry + 0.06, z], [sx * (rx + 0.15), ry + 0.06, z], 0.1, 0.1);
    }
  }
};
