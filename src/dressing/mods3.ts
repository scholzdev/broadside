import { Builder } from '../geo';
import type { Build } from './types';
import { C, box, cyl, prim, rod, tube, cannon } from './kit';

// ---- 3D attachments of the v10 modules (Swivel Gun, Chain-Shot, Fire Arrows, Bomb Ketch, Tesla Coil, Gatling, Shark Cage, Spyglass, Magnet) ----
const glow = (c: number, g = 3) => ({ emit: c, glow: g });

/** Swivel gun: a short barrel in a forked iron yoke on a post, port of the bowsprit (alternates with a second mount). */
export const swivel: Build = (b, a, c) => {
  const x = c.idx % 2 ? -0.28 : 0.28, t = 0.8, z = a.z(t), dy = a.top(t), y = dy + 0.4;
  cyl(b, C.wood, [x, dy + 0.18, z], 0.06, 0.36, undefined, 6);
  for (const s of [1, -1]) rod(b, [x, y - 0.12, z], [x + s * 0.09, y + 0.02, z], 0.025, C.iron, 4);
  tube(b, C.iron, [x, y, z - 0.22], [x, y + 0.03, z + 0.4], 0.055, 0.04);
  tube(b, c.color, [x, y + 0.005, z + 0.1], [x, y + 0.01, z + 0.16], 0.065, 0.065);
  rod(b, [x, y, z - 0.22], [x, y - 0.12, z - 0.32], 0.02, C.dark, 4);
  prim(b, 'sph', C.brass, [x, y + 0.03, z + 0.41], 0.045);
};

/** Chain-shot cannons: two long guns each side with a loop of chain slung over the breech. */
export const chain: Build = (b, a, c) => {
  const [t0, t1] = a.sideRange(c.idx, c.n);
  for (let i = 0; i < 2; i++) {
    const t = t0 + ((t1 - t0) * (i + 0.5)) / 2, z = a.z(t), rx = a.railX(t), ry = a.railTop(t), dy = a.top(t);
    for (const sx of [1, -1]) {
      box(b, C.dark, [sx * (rx - 0.2), dy + 0.08, z], [0.5, 0.06, 0.18]);
      cannon(b, [sx * (rx - 0.3), ry + 0.04, z], [sx * (rx + 0.28), ry + 0.06, z], 0.075, c.color);
      for (let k = 0; k < 4; k++) prim(b, 'torus', 0xb4bac2, [sx * (rx - 0.3 + k * 0.05), ry + 0.15, z], 0.045, [0, k % 2 ? Math.PI / 2 : 0, 0]);
      prim(b, 'sph', C.ironHi, [sx * (rx - 0.18), dy + 0.2, z + 0.12], 0.07);
      prim(b, 'sph', C.ironHi, [sx * (rx - 0.18), dy + 0.2, z + 0.26], 0.07);
      rod(b, [sx * (rx - 0.18), dy + 0.2, z + 0.12], [sx * (rx - 0.18), dy + 0.2, z + 0.26], 0.012, C.ironHi, 3);
    }
  }
};

/** Fire arrows: an iron brazier glowing on a tripod with a quiver of arrows beside it. */
export const firearrows: Build = (b, a, c) => {
  const x = c.idx % 2 ? -0.42 : 0.42, z = a.deckSpot() + 0.5, dy = a.top(a.t(z));
  for (let i = 0; i < 3; i++) { const an = (i / 3) * Math.PI * 2; rod(b, [x + Math.cos(an) * 0.14, dy, z + Math.sin(an) * 0.14], [x, dy + 0.3, z], 0.02, C.iron, 4); }
  cyl(b, C.iron, [x, dy + 0.33, z], 0.15, 0.1, undefined, 8);
  prim(b, 'cone6', 0xff8a2a, [x, dy + 0.46, z], [0.11, 0.24, 0.11], [0, 0, 0], glow(0xff7a20, 3.2));
  prim(b, 'cone6', 0xffd27a, [x, dy + 0.45, z], [0.05, 0.16, 0.05], [0, 0, 0], glow(0xffc060, 3.4));
  const qx = x + (x > 0 ? 0.32 : -0.32);
  cyl(b, C.plank, [qx, dy + 0.2, z], 0.07, 0.4, undefined, 6);
  for (let i = 0; i < 4; i++) rod(b, [qx + (i - 1.5) * 0.02, dy + 0.38, z + (i % 2 ? 0.02 : -0.02)], [qx + (i - 1.5) * 0.03, dy + 0.62, z], 0.008, C.rope, 3);
  prim(b, 'sph', c.color, [qx, dy + 0.63, z], 0.03, [0, 0, 0], glow(c.color, 2));
};

/** Bomb ketch mortar: a stubby mortar angled aft on a timber bed, a rack of round bombs with lit fuses beside it. */
export const bombketch: Build = (b, a, c) => {
  const t = 0.12, z = a.z(t), dy = a.top(t), x = c.idx % 2 ? -0.3 : 0.3;
  box(b, C.wood, [x, dy + 0.06, z], [0.46, 0.12, 0.5]);
  tube(b, C.iron, [x, dy + 0.14, z + 0.1], [x, dy + 0.52, z - 0.14], 0.17, 0.2, 10);
  tube(b, c.color, [x, dy + 0.3, z - 0.0], [x, dy + 0.34, z - 0.03], 0.19, 0.19, 10);
  tube(b, C.black, [x, dy + 0.5, z - 0.13], [x, dy + 0.525, z - 0.142], 0.14, 0.14, 8);
  for (let i = 0; i < 3; i++) {
    const bx = x + (x > 0 ? -0.36 : 0.36), bz = z + (i - 1) * 0.17;
    prim(b, 'sph', C.black, [bx, dy + 0.1, bz], 0.075);
    prim(b, 'ico', 0xffb040, [bx, dy + 0.2, bz], 0.025, [0, 0, 0], glow(0xff8a2a, 4));
  }
};

/** Tesla coil: a brass-wound coil on an iron base topped by a crackling pale-blue sphere. */
export const tesla: Build = (b, a, c) => {
  const z = a.deckSpot() - 0.45, dy = a.top(a.t(z)), x = c.idx % 2 ? -0.1 : 0.1;
  cyl(b, C.iron, [x, dy + 0.06, z], 0.2, 0.12, undefined, 8);
  cyl(b, 0x4a3a2a, [x, dy + 0.4, z], 0.1, 0.55, undefined, 8);
  for (let i = 0; i < 6; i++) prim(b, 'torus', 0xd08a4a, [x, dy + 0.18 + i * 0.08, z], 0.11, [Math.PI / 2, 0, 0]);
  rod(b, [x, dy + 0.65, z], [x, dy + 0.78, z], 0.02, C.brass, 4);
  const g = new Builder();
  prim(g, 'sph', c.color, [0, 0, 0], 0.11, [0, 0, 0], glow(c.color, 3.4));
  for (let i = 0; i < 4; i++) { const an = (i / 4) * Math.PI * 2; rod(g, [Math.cos(an) * 0.09, 0, Math.sin(an) * 0.09], [Math.cos(an) * 0.2, 0.06, Math.sin(an) * 0.2], 0.01, 0xcfefff, 3, glow(0x9fe8ff, 3)); }
  c.anims.push({ geo: g.build(), at: [x, dy + 0.9, z], kind: 'spin', halo: { color: c.color, size: 1.1 } });
};

/** Gatling swivel: a bundle of six barrels with brass bands and a crank, on a slide each side. */
export const gatling: Build = (b, a, c) => {
  const [t0, t1] = a.sideRange(c.idx, c.n), t = (t0 + t1) / 2, z = a.z(t), rx = a.railX(t), ry = a.railTop(t), dy = a.top(t);
  for (const sx of [1, -1]) {
    box(b, C.wood, [sx * (rx - 0.2), dy + 0.1, z], [0.4, 0.05, 0.2]);
    cyl(b, C.iron, [sx * (rx - 0.2), ry - 0.05, z], 0.04, 0.28, undefined, 6);
    for (let i = 0; i < 6; i++) {
      const an = (i / 6) * Math.PI * 2, oy = Math.cos(an) * 0.035, oz = Math.sin(an) * 0.035;
      tube(b, C.iron, [sx * (rx - 0.2), ry + 0.1 + oy, z + oz], [sx * (rx + 0.2), ry + 0.1 + oy, z + oz], 0.016, 0.016, 5);
    }
    for (const k of [-0.1, 0.12]) cyl(b, c.color, [sx * (rx + k), ry + 0.1, z], 0.06, 0.03, [0, 0, Math.PI / 2], 8);
    rod(b, [sx * (rx - 0.22), ry + 0.1, z], [sx * (rx - 0.22), ry + 0.1, z + 0.14], 0.012, C.brass, 3);
    prim(b, 'sph', C.brass, [sx * (rx - 0.22), ry + 0.1, z + 0.15], 0.025);
  }
};

/** Shark cage: a barred iron cage hanging from a davit over the stern, a grey fin inside. */
export const sharkcage: Build = (b, a, c) => {
  const zt = -a.L / 2, ty = a.top(0.02), x = c.idx % 2 ? -0.22 : 0.22, cy = a.rail(0) - 0.15;
  rod(b, [x, ty, zt + 0.18], [x, ty + 0.5, zt + 0.18], 0.035, C.wood, 5);
  rod(b, [x, ty + 0.5, zt + 0.18], [x, ty + 0.46, zt - 0.34], 0.03, C.wood, 5);
  rod(b, [x, ty + 0.46, zt - 0.34], [x, cy + 0.34, zt - 0.34], 0.01, C.rope, 3);
  box(b, C.iron, [x, cy + 0.34, zt - 0.34], [0.34, 0.03, 0.3]);
  box(b, C.iron, [x, cy - 0.12, zt - 0.34], [0.34, 0.03, 0.3]);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]] as const) rod(b, [x + sx * 0.16, cy - 0.12, zt - 0.34 + sz * 0.14], [x + sx * 0.16, cy + 0.34, zt - 0.34 + sz * 0.14], 0.012, C.ironHi, 3);
  prim(b, 'cone3', 0x7d8f9c, [x, cy + 0.12, zt - 0.34], [0.09, 0.26, 0.04], [0, 0, 0]);
  prim(b, 'cone3', c.color, [x, cy + 0.3, zt - 0.34], [0.03, 0.05, 0.03], [0, 0, 0], glow(c.color, 2));
};

/** Spyglass battery: a long brass spyglass on a swivel mount aimed past the stem. */
export const spyglass: Build = (b, a, c) => {
  const x = c.idx % 2 ? -0.24 : 0.24, t = 0.84, z = a.z(t), dy = a.top(t), y = dy + 0.42;
  for (const s of [-1, 1]) rod(b, [x + s * 0.12, dy, z - 0.06 * s], [x, y - 0.1, z], 0.022, C.wood, 4);
  rod(b, [x, dy, z + 0.12], [x, y - 0.1, z], 0.022, C.wood, 4);
  const zs = z - 0.35, ze = a.L / 2 + 0.35;
  tube(b, 0x8a6414, [x, y - 0.05, zs], [x, y + 0.07, z + 0.2], 0.05, 0.06);
  tube(b, C.brass, [x, y + 0.07, z + 0.2], [x, y + 0.1, ze - 0.2], 0.06, 0.075);
  tube(b, c.color, [x, y + 0.1, ze - 0.2], [x, y + 0.11, ze], 0.082, 0.09);
  prim(b, 'sph', 0xa9d4e6, [x, y + 0.11, ze + 0.005], 0.075, [0, 0, 0], glow(0xa9d4e6, 1.2));
  prim(b, 'torus', C.brass, [x, y + 0.08, z + 0.35], 0.07, [0, Math.PI / 2, 0]);
};

/** Treasure magnet: a big red horseshoe magnet with silver tips on a post, coins on the deck below. */
export const magnet: Build = (b, a, c) => {
  const z = a.deckSpot() - 1.0, dy = a.top(a.t(z)), x = c.idx % 2 ? -0.1 : 0.1;
  cyl(b, C.wood, [x, dy + 0.25, z], 0.05, 0.5, undefined, 6);
  const g = new Builder();
  for (let i = 0; i <= 6; i++) { const an = (i / 6) * Math.PI; prim(g, 'box', i === 6 || i === 0 ? 0xc03a2a : 0xc03a2a, [Math.cos(an) * 0.2, Math.sin(an) * 0.2, 0], [0.09, 0.09, 0.09], [0, 0, an + Math.PI / 2]); }
  for (const s of [1, -1]) { box(g, 0xe8eef4, [s * 0.2, -0.07, 0], [0.1, 0.09, 0.1]); box(g, 0xe8eef4, [s * 0.2, -0.13, 0], [0.1, 0.03, 0.1], undefined, glow(c.color, 1.4)); }
  c.anims.push({ geo: g.build(), at: [x, dy + 0.72, z], kind: 'bob', halo: { color: c.color, size: 0.9, dy: 0 } });
  for (let i = 0; i < 4; i++) cyl(b, C.brass, [x + (i - 1.5) * 0.09, dy + 0.02, z + 0.2 + (i % 2) * 0.05], 0.045, 0.012, undefined, 8);
};
