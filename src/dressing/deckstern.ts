import { Builder, V3, shade } from '../geo';
import type { Build } from './types';
import { C, box, cyl, prim, rod, tube, keg } from './kit';

// ---- deck and stern attachments ----

const glow = (c: number, g = 3) => ({ emit: c, glow: g });

/** Squat mortar on a timber bed over the hatch, with a few shells beside it. */
export const mortar: Build = (b, a) => {
  const z = a.deckSpot(), dy = a.top(a.t(z));
  box(b, C.wood, [0, dy + 0.07, z], [0.8, 0.14, 0.8]);
  box(b, C.iron, [0, dy + 0.17, z], [0.6, 0.06, 0.6]);
  const p0: V3 = [0, dy + 0.3, z - 0.08], p1: V3 = [0, dy + 0.68, z + 0.08];
  tube(b, C.iron, p0, p1, 0.36, 0.27, 10);
  tube(b, C.brass, [0, dy + 0.42, z - 0.03], [0, dy + 0.47, z - 0.01], 0.35, 0.34, 10);
  tube(b, C.ironHi, [0, dy + 0.66, z + 0.075], [0, dy + 0.71, z + 0.09], 0.3, 0.3, 10);
  tube(b, C.black, [0, dy + 0.705, z + 0.09], [0, dy + 0.715, z + 0.094], 0.2, 0.2, 10);
  for (const s of [1, -1]) cyl(b, C.brass, [s * 0.37, dy + 0.34, z], 0.06, 0.06, [0, 0, Math.PI / 2], 8);
  for (const [dx, dz, dyy] of [[0.48, 0.3, 0], [0.6, 0.18, 0], [0.54, 0.24, 0.1]] as const) prim(b, 'sph', C.black, [dx, dy + 0.08 + dyy, z + dz], 0.08);
};

/** Sea Witch: a brass lightning rod above the mainmast head with a pulsing violet crystal. */
export const witch: Build = (b, a, c) => {
  const m = a.main, y = m.top;
  rod(b, [0, y - 0.1, m.z], [0, y + 0.92, m.z], 0.022, C.brass, 5);
  for (const k of [0.45, 0.58]) prim(b, 'torus', C.brass, [0, y + k, m.z], 0.07, [Math.PI / 2, 0, 0]);
  for (const s of [1, -1]) rod(b, [0, y + 0.66, m.z], [s * 0.1, y + 0.76, m.z], 0.012, C.brass, 3);
  const g = new Builder();
  prim(g, 'oct', c.color, [0, 0, 0], [0.11, 0.24, 0.11], [0, 0, 0], glow(c.color, 3.2));
  for (let i = 0; i < 3; i++) {
    const an = (i / 3) * Math.PI * 2;
    prim(g, 'oct', 0xe8d8ff, [Math.cos(an) * 0.2, -0.06 + i * 0.05, Math.sin(an) * 0.2], 0.04, [0, 0, 0], glow(c.color, 2));
  }
  c.anims.push({ geo: g.build(), at: [0, y + 0.92, m.z], kind: 'spin', halo: { color: c.color, size: 1.3 } });
};

/** Crow's nest: an open tub at the mainmast head with a module-coloured pennant. */
export const crowsnest: Build = (b, a, c) => {
  const m = a.main, y = m.top - 0.05;
  cyl(b, C.plank, [0, y + 0.14, m.z], 0.32, 0.28, undefined, 10);
  cyl(b, shade(C.plank, 0.55), [0, y + 0.285, m.z], 0.27, 0.01, undefined, 10);
  prim(b, 'torus', C.dark, [0, y + 0.28, m.z], 0.32, [Math.PI / 2, 0, 0]);
  for (const s of [1, -1]) rod(b, [s * 0.3, y, m.z], [0, y - 0.35, m.z], 0.018, C.dark, 4);
  rod(b, [0.26, y + 0.25, m.z - 0.1], [0.26, y + 0.75, m.z - 0.1], 0.015, C.dark, 4);
  b.tris([0.26, y + 0.75, m.z - 0.1, 0.26, y + 0.59, m.z - 0.1, 0.26, y + 0.67, m.z - 0.45], c.color, { jitter: 0 });
};

/** Rocket rack: six tubes angled up over the bow on a timber frame. */
export const rockets: Build = (b, a, c) => {
  const z = a.deckSpot(), dy = a.top(a.t(z)), ang = 0.8, d: V3 = [0, Math.sin(ang), Math.cos(ang)], up: V3 = [0, Math.cos(ang), -Math.sin(ang)];
  const cy = dy + 0.4, at = (x: number, j: number, s: number): V3 => [x, cy + d[1] * s + up[1] * j * 0.13, z + d[2] * s + up[2] * j * 0.13];
  for (const sx of [1, -1]) {
    box(b, C.wood, [sx * 0.27, cy + 0.04, z], [0.04, 0.3, 0.75], [-ang, 0, 0]);
    rod(b, [sx * 0.27, cy - 0.15, z - 0.2], [sx * 0.27, dy, z - 0.25], 0.025, C.dark, 4);
    rod(b, [sx * 0.27, cy - 0.05, z + 0.15], [sx * 0.27, dy, z + 0.2], 0.025, C.dark, 4);
  }
  box(b, C.dark, [0, cy - 0.06, z - 0.04], [0.56, 0.03, 0.7], [-ang, 0, 0]);
  for (let i = -1; i <= 1; i++) for (let j = 0; j < 2; j++) {
    const x = i * 0.15;
    tube(b, 0xe4dcc6, at(x, j, -0.32), at(x, j, 0.22), 0.042, 0.042, 6);
    tube(b, C.red, at(x, j, -0.05), at(x, j, 0.03), 0.046, 0.046, 6);
    tube(b, c.color, at(x, j, 0.22), at(x, j, 0.38), 0.046, 0.004, 6);
    rod(b, at(x, j, -0.32), at(x, j, -0.62), 0.008, C.plank, 3);
  }
};


/** Powder kegs: a stack of kegs with a lit fuse and a drop chute over the transom. */
export const kegs: Build = (b, a, c) => {
  const z = a.z(0.1), dy = a.top(0.1), x0 = 0.32;
  for (const [dx, dz] of [[-0.15, -0.14], [0.15, -0.14], [-0.15, 0.14], [0.15, 0.14]] as const) keg(b, [x0 + dx, dy + 0.15, z + dz], 0.13, 0.3, c.color, C.black);
  keg(b, [x0, dy + 0.45, z], 0.13, 0.3, shade(c.color, 1.1), C.black);
  rod(b, [x0, dy + 0.6, z], [x0 + 0.04, dy + 0.72, z], 0.01, C.rope, 3);
  prim(b, 'ico', 0xffb040, [x0 + 0.045, dy + 0.74, z], 0.035, [0, 0, 0], glow(0xff8a2a, 4));
  const zt = -a.L / 2, ty = a.top(0.02);
  box(b, C.plank, [-0.25, ty + 0.02, zt + 0.12], [0.4, 0.03, 0.55], [0.35, 0, 0]);
  for (const s of [1, -1]) box(b, C.dark, [-0.25 + s * 0.21, ty + 0.05, zt + 0.12], [0.03, 0.08, 0.55], [0.35, 0, 0]);
  keg(b, [-0.25, ty + 0.14, zt + 0.22], 0.12, 0.28, c.color, C.black, true);
};

/** Fog lantern: a big caged lantern hanging off a gooseneck post over the stern, glowing pale blue-white. */
export const lantern: Build = (b, a, c) => {
  const zp = a.z(0.03), base = a.top(0.03), y = a.sternTop + 0.95, ze = -a.L / 2 - 0.35;
  rod(b, [0, base, zp], [0, y, zp], 0.04, C.iron, 6);
  rod(b, [0, y, zp], [0, y + 0.08, ze + 0.25], 0.03, C.iron, 5);
  rod(b, [0, y + 0.08, ze + 0.25], [0, y, ze], 0.03, C.iron, 5);
  rod(b, [0, y - 0.35, zp], [0, y + 0.04, ze + 0.12], 0.02, C.iron, 4);
  const g = new Builder();
  rod(g, [0, 0, 0], [0, -0.1, 0], 0.015, C.iron, 4);
  prim(g, 'cone8', C.iron, [0, -0.17, 0], [0.2, 0.14, 0.2]);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) rod(g, [sx * 0.15, -0.22, sz * 0.15], [sx * 0.15, -0.6, sz * 0.15], 0.018, C.iron, 4);
  box(g, c.color, [0, -0.41, 0], [0.24, 0.34, 0.24], [0, 0, 0], glow(0xbfe0ff, 3.4));
  box(g, C.iron, [0, -0.62, 0], [0.34, 0.05, 0.34]);
  box(g, C.iron, [0, -0.22, 0], [0.34, 0.04, 0.34]);
  c.anims.push({ geo: g.build(), at: [0, y, ze], kind: 'swing', halo: { color: 0xa8d4ff, size: 2.0, dy: -0.41 } });
};

/** Net drum: a spool of net between two posts on the transom, a curtain of net with cork floats hanging over the stern. */
export const net: Build = (b, a, c) => {
  const zt = -a.L / 2 + 0.12, ty = a.top(0.02), hy = ty + 0.36, w = Math.min(0.8, a.railX(0.02) * 1.1);
  for (const s of [1, -1]) box(b, C.wood, [s * (w / 2 + 0.06), ty + 0.2, zt], [0.08, 0.4, 0.12]);
  cyl(b, 0x4e5a3a, [0, hy, zt], 0.15, w, [0, 0, Math.PI / 2], 10);
  for (const s of [1, -1]) cyl(b, C.dark, [s * w / 2, hy, zt], 0.2, 0.04, [0, 0, Math.PI / 2], 10);
  cyl(b, C.iron, [w / 2 + 0.14, hy, zt], 0.03, 0.12, [0, 0, Math.PI / 2], 6);
  const z = zt - 0.2, top = hy - 0.05, bot = a.rail(0) - 0.6;
  box(b, 0x3e4a32, [0, (top + bot) / 2, z], [w * 0.95, top - bot, 0.015], [0, 0, 0], { jitter: 0.2 });
  for (let i = 0; i <= 4; i++) rod(b, [-w * 0.46 + i * w * 0.23, top, z - 0.015], [-w * 0.46 + i * w * 0.23, bot, z - 0.015], 0.01, C.rope, 3);
  for (let j = 1; j <= 3; j++) { const yy = bot + ((top - bot) * j) / 4; rod(b, [-w * 0.47, yy, z - 0.015], [w * 0.47, yy, z - 0.015], 0.01, C.rope, 3); }
  for (let i = 0; i < 4; i++) prim(b, 'sph', c.color, [-w * 0.36 + i * w * 0.24, bot, z - 0.02], 0.05);
};

/** Bilge pump: a banded wooden cylinder with a rocking handle, the spout pouring over the starboard rail. */
export const pump: Build = (b, a, c) => {
  const t = 0.1, z = a.z(t), dy = a.top(t), x = -0.38, rx = a.railX(t), ry = a.railTop(t);
  cyl(b, C.wood, [x, dy + 0.25, z], 0.11, 0.5, undefined, 8);
  for (const k of [0.1, 0.42]) cyl(b, C.brass, [x, dy + k, z], 0.12, 0.04, undefined, 8);
  box(b, C.iron, [x, dy + 0.54, z], [0.06, 0.1, 0.06]);
  rod(b, [x, dy + 0.56, z - 0.35], [x, dy + 0.62, z + 0.3], 0.022, C.dark, 5);
  rod(b, [x - 0.12, dy + 0.62, z + 0.3], [x + 0.12, dy + 0.62, z + 0.3], 0.02, C.dark, 5);
  tube(b, C.brass, [x, dy + 0.38, z], [-(rx + 0.12), ry + 0.06, z], 0.04, 0.045, 6);
  tube(b, C.brass, [-(rx + 0.12), ry + 0.06, z], [-(rx + 0.2), ry - 0.08, z], 0.045, 0.05, 6);
  prim(b, 'ico', 0x9fd8ff, [-(rx + 0.22), ry - 0.16, z], [0.04, 0.08, 0.04], [0, 0, 0], glow(c.color, 1.2));
};

/** Ship's wheel on a pedestal (static, part of every dressing), at station t. */
export function helm(b: Builder, a: { z(t: number): number; top(t: number): number }, t: number): void {
  const z = a.z(t), dy = a.top(t), wy = dy + 0.36;
  box(b, C.wood, [0, dy + 0.16, z], [0.1, 0.32, 0.12]);
  prim(b, 'torus', 0x5a3a1e, [0, wy, z - 0.07], 0.2);
  for (let i = 0; i < 4; i++) {
    const an = (i / 4) * Math.PI;
    rod(b, [Math.cos(an) * 0.27, wy + Math.sin(an) * 0.27, z - 0.07], [-Math.cos(an) * 0.27, wy - Math.sin(an) * 0.27, z - 0.07], 0.014, 0x6b4424, 4);
  }
  cyl(b, C.brass, [0, wy, z - 0.06], 0.045, 0.06, [Math.PI / 2, 0, 0], 8);
}
