import * as THREE from 'three';
import { Builder, V3, shade, xf } from './geo';

// ---- procedural hull: stations along the keel (t = 0 stern .. 1 bow), sheer, tumblehome, painted bands,
// stern/forecastles with lit windows, gunports with run-out cannons, deck planking and furniture ----

export interface HullSpec {
  L: number; B: number; F: number; D: number;
  hull: number; deck: number; trim: number; accent: number; bottom: number; inner: number;
  gunDecks: number; guns: number; castle: number; forecastle: number;
  windows: number; windowGlow: number; glow?: number;
}

const iron = 0x26272b, port = 0x150e09;

/** Half beam at station t (fraction of B/2): flat transom at the stern, full amidships, rounded bow. */
const beamK = (t: number): number => (t < 0.42 ? 0.74 + 0.26 * Math.sin((t / 0.42) * Math.PI / 2) : Math.pow(Math.max(0, 1 - Math.pow((t - 0.42) / 0.58, 2.2)), 0.62));
/** Deck-edge height: freeboard plus sheer rising toward both ends (more at the bow). */
const deckY = (h: HullSpec, t: number): number => h.F + 0.22 * Math.pow(Math.max(0, 0.38 - t) / 0.38, 2) + 0.42 * Math.pow(Math.max(0, t - 0.55) / 0.45, 2);
const keelY = (h: HullSpec, t: number): number => -h.D * (1 - 0.85 * THREE.MathUtils.smoothstep(t, 0.7, 1.0)) * (1 - 0.3 * THREE.MathUtils.smoothstep(0.15 - t, 0, 0.15));
const zOf = (h: HullSpec, t: number): number => (t - 0.5) * h.L;
/** Outer hull x at station t and freeboard fraction s (1 = gunwale, 0 = waterline). */
export const hullX = (h: HullSpec, t: number, s: number): number => (h.B / 2) * beamK(t) * (1 - 0.13 * s * s);
export const hullDeck = (h: HullSpec, t: number): number => deckY(h, t);
/** Station t for a model-space z. */
export const tOf = (h: HullSpec, z: number): number => z / h.L + 0.5;
const BULWARK = 0.2;
/** Height of the walkable deck at station t. */
export const deckAt = (h: HullSpec, t: number): number => deckY(h, t) - BULWARK;

/** Freeboard bands from gunwale down to the waterline: [s0, s1, colour]. */
function bands(h: HullSpec): [number, number, number][] {
  const rail = h.accent, boot = shade(h.hull, 0.62);
  if (h.gunDecks <= 1) return [[1, 0.9, rail], [0.9, 0.68, h.hull], [0.68, 0.48, h.trim], [0.48, 0.14, h.hull], [0.14, 0, boot]];
  const out: [number, number, number][] = [[1, 0.93, rail], [0.93, 0.8, h.hull]];
  const n = h.gunDecks, span = 0.66 / n;
  for (let i = 0; i < n; i++) {
    const top = 0.8 - i * span;
    out.push([top, top - span * 0.5, h.trim], [top - span * 0.5, top - span, h.hull]);
  }
  out.push([0.14, 0, boot]);
  return out;
}

const STATIONS = [0, 0.04, 0.1, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.71, 0.78, 0.84, 0.89, 0.93, 0.965, 0.99, 1];
const BELOW: [number, number][] = [[0.5, 0.92], [0.88, 0.56], [1, 0]]; // [fraction of keel depth, x factor]

export function buildHull(b: Builder, h: HullSpec): void {
  const rows = bands(h);
  const levels: { s: number; c: number }[] = rows.map(r => ({ s: r[0], c: r[2] }));
  levels.push({ s: 0, c: h.bottom });
  // section points per station (port side): above-water levels then below-water levels
  const sec = STATIONS.map(t => {
    const z = zOf(h, t), dy = deckY(h, t), ky = keelY(h, t), hb = (h.B / 2) * beamK(t);
    const pts: V3[] = levels.map(l => [hullX(h, t, l.s), l.s * dy, z]);
    for (const [f, k] of BELOW) pts.push([hb * k * 0.97, ky * f, z]);
    return pts;
  });
  const colors = [...levels.map(l => l.c).slice(0, -1), h.bottom, h.bottom, h.bottom, h.bottom];
  const glow = h.glow !== undefined ? { emit: h.glow, glow: 2.2 } : undefined;
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const a = sec[i], c = sec[i + 1];
    for (let k = 0; k < a.length - 1; k++) {
      const col = colors[k];
      const em = glow && col === h.trim ? glow : undefined;
      const P = (p: V3): V3 => p, S = (p: V3): V3 => [-p[0], p[1], p[2]];
      b.quad(P(a[k]), P(c[k]), P(c[k + 1]), P(a[k + 1]), col, em);
      b.quad(S(a[k]), S(a[k + 1]), S(c[k + 1]), S(c[k]), col, em);
    }
  }
  // transom: fan from the centre line of the stern section
  const st = sec[0], cy = st[st.length - 1][1] * 0.3 + deckY(h, 0) * 0.35;
  const z0 = st[0][2];
  for (let k = 0; k < st.length - 1; k++) {
    const col = k < rows.length ? (colors[k] === h.accent ? h.accent : shade(h.hull, 0.92)) : h.bottom;
    b.tris([0, cy, z0, st[k][0], st[k][1], z0, st[k + 1][0], st[k + 1][1], z0], col);
    b.tris([0, cy, z0, -st[k + 1][0], st[k + 1][1], z0, -st[k][0], st[k][1], z0], col);
  }
  buildDeck(b, h);
  gunports(b, h, rows);
}

function buildDeck(b: Builder, h: HullSpec): void {
  const planks = [shade(h.deck, 1), shade(h.deck, 0.9), shade(h.deck, 1.05), shade(h.deck, 0.93)];
  const n = STATIONS.length - 1;
  for (let i = 0; i < n; i++) {
    const t0 = STATIONS[i], t1 = STATIONS[i + 1];
    const y0 = deckY(h, t0) - BULWARK, y1 = deckY(h, t1) - BULWARK;
    const x0 = hullX(h, t0, 1) * 0.93, x1 = hullX(h, t1, 1) * 0.93, z0 = zOf(h, t0), z1 = zOf(h, t1);
    for (let c = 0; c < 4; c++) {
      const u0 = -1 + c * 0.5, u1 = u0 + 0.5;
      b.quad([x0 * u0, y0, z0], [x0 * u1, y0, z0], [x1 * u1, y1, z1], [x1 * u0, y1, z1], planks[c], { jitter: 0.03 });
    }
    // inner bulwark (painted), from the gunwale down to the deck edge
    const g0 = deckY(h, t0), g1 = deckY(h, t1), o0 = hullX(h, t0, 1), o1 = hullX(h, t1, 1);
    for (const sx of [1, -1]) b.quad([sx * o0, g0, z0], [sx * o1, g1, z1], [sx * x1, y1, z1], [sx * x0, y0, z0], h.inner);
  }
}

function gunports(b: Builder, h: HullSpec, rows: [number, number, number][]): void {
  const trimRows = rows.filter(r => r[2] === h.trim);
  if (h.guns <= 0) return;
  const barrel = new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6);
  const portBox = new THREE.BoxGeometry(0.05, 1, 0.15);
  for (const [s0, s1] of trimRows) {
    const s = (s0 + s1) / 2;
    for (let g = 0; g < h.guns; g++) {
      const t = h.guns === 1 ? 0.5 : 0.24 + (g / (h.guns - 1)) * 0.5;
      const z = zOf(h, t), y = s * deckY(h, t), x = hullX(h, t, s), ph = (s0 - s1) * deckY(h, t) * 0.7;
      for (const sx of [1, -1]) {
        b.add(portBox, port, xf(sx * (x + 0.012), y, z, 0, 0, 0, [1, ph, 1]));
        b.add(barrel, iron, xf(sx * (x + 0.1), y, z, 0, 0, Math.PI / 2));
      }
    }
  }
  barrel.dispose(); portBox.dispose();
}

/** Raised deck between stations t0..t1 (stern castle or forecastle). */
export function raised(b: Builder, h: HullSpec, t0: number, t1: number, H: number, opts: { windows?: boolean; front?: boolean; back?: boolean; lift?: number; inset?: number }): void {
  const N = 6, top = shade(h.deck, 0.95), wall = h.hull, lift = opts.lift ?? 0, ins = opts.inset ?? 1;
  const at = (k: number): number => t0 + ((t1 - t0) * k) / N;
  for (let k = 0; k < N; k++) {
    const ta = at(k), tb = at(k + 1), za = zOf(h, ta), zb = zOf(h, tb);
    const xa = hullX(h, ta, 1) * ins, xb = hullX(h, tb, 1) * ins, ya = deckY(h, ta) + lift, yb = deckY(h, tb) + lift;
    const xa2 = xa * 0.95, xb2 = xb * 0.95;
    for (const sx of [1, -1]) {
      b.quad([sx * xa, ya, za], [sx * xb, yb, zb], [sx * xb2, yb + H * 0.82, zb], [sx * xa2, ya + H * 0.82, za], wall);
      b.quad([sx * xa2, ya + H * 0.82, za], [sx * xb2, yb + H * 0.82, zb], [sx * xb2 * 0.99, yb + H, zb], [sx * xa2 * 0.99, ya + H, za], h.accent, h.glow !== undefined ? { emit: h.glow, glow: 1.6 } : undefined);
    }
    const da = ya + H - BULWARK * 0.6, db = yb + H - BULWARK * 0.6;
    b.quad([-xa2, da, za], [xa2, da, za], [xb2, db, zb], [-xb2, db, zb], top, { jitter: 0.03 });
  }
  const endWall = (t: number, face: number): void => {
    const z = zOf(h, t), x = hullX(h, t, 1) * 0.95 * ins, y = deckY(h, t) - BULWARK + lift;
    b.quad([-x, y, z], [x, y, z], [x, y + H + BULWARK, z], [-x, y + H + BULWARK, z], shade(wall, 0.9));
    if (opts.windows && h.windows > 0) {
      const n = Math.max(2, Math.round(x * 3.2)), w = Math.min(0.16, (x * 1.6) / n);
      for (let i = 0; i < n; i++) {
        const wx = -x * 0.75 + (i / (n - 1)) * x * 1.5;
        b.add(new THREE.BoxGeometry(w, 0.16, 0.04), h.windows, xf(wx, y + BULWARK + H * 0.45, z + face * 0.02), { emit: h.windows, glow: h.windowGlow });
      }
    }
  };
  if (opts.back) endWall(t0, -1);
  if (opts.front) endWall(t1, 1);
}

/** Deck clutter: hatch grating, capstan, barrels, rope coils, deck guns along the bulwarks and a ship's boat on big hulls. */
export function deckFurniture(b: Builder, h: HullSpec, masts: number[]): void {
  const mid = (masts.length > 1 ? (masts[0] + masts[1]) / 2 : masts[0] - 0.9);
  const yAt = (z: number): number => deckAt(h, tOf(h, z));
  b.add(new THREE.BoxGeometry(h.B * 0.3, 0.08, 0.5), shade(h.deck, 0.5), xf(0, yAt(mid) + 0.03, mid));
  for (let i = -1; i <= 1; i++) b.add(new THREE.BoxGeometry(h.B * 0.3, 0.09, 0.04), shade(h.deck, 0.75), xf(0, yAt(mid) + 0.04, mid + i * 0.15));
  const cz = masts[masts.length - 1] + 0.55;
  b.add(new THREE.CylinderGeometry(0.1, 0.13, 0.22, 7), shade(h.deck, 0.6), xf(0, yAt(cz) + 0.1, cz));
  const bz = masts[0] + 0.5;
  for (const [dx, dz] of [[0.28, 0], [0.38, -0.22], [-0.3, 0.1]] as const) {
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 7), 0x7a5232, xf(dx * h.B / 2.4, yAt(bz + dz) + 0.08, bz + dz));
  }
  const coil = new THREE.CylinderGeometry(0.11, 0.11, 0.04, 8);
  for (const z of masts) b.add(coil, 0xb39a6a, xf(0.2, yAt(z - 0.3) + 0.02, z - 0.3));
  coil.dispose();
  if (h.guns >= 3) {
    const n = h.guns - 1, carriage = new THREE.BoxGeometry(0.16, 0.09, 0.22), gun = new THREE.CylinderGeometry(0.03, 0.04, 0.26, 6);
    for (let g = 0; g < n; g++) {
      const t = 0.32 + (g / Math.max(1, n - 1)) * 0.4, z = zOf(h, t), y = deckAt(h, t), x = hullX(h, t, 1) * 0.7;
      for (const sx of [1, -1]) {
        b.add(carriage, 0x5a3a1e, xf(sx * x, y + 0.05, z));
        b.add(gun, iron, xf(sx * (x + 0.08), y + 0.12, z, 0, 0, Math.PI / 2));
      }
    }
    carriage.dispose(); gun.dispose();
  }
  if (masts.length >= 3 && h.L >= 6) {
    const z = (masts[1] + masts[2]) / 2, y = yAt(z);
    const boat = new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    b.add(boat, 0x8a5a30, xf(0, y + 0.2, z, 0, 0, 0, [0.28, 0.18, 0.62]));
    b.add(new THREE.BoxGeometry(0.5, 0.02, 1.15), 0xd8cfb8, xf(0, y + 0.2, z));
    boat.dispose();
  }
}

/** Bowsprit spar (returns its tip for the jib and stays). */
export function bowsprit(b: Builder, h: HullSpec, paint: number): V3 {
  const z0 = zOf(h, 0.86), y0 = deckY(h, 0.9) - 0.05, len = h.L * 0.33, a = 0.32;
  const tip: V3 = [0, y0 + Math.sin(a) * len, z0 + Math.cos(a) * len];
  b.add(new THREE.CylinderGeometry(0.035, 0.06, len, 6), paint, xf(0, (y0 + tip[1]) / 2, (z0 + tip[2]) / 2, Math.PI / 2 - a, 0, 0));
  return tip;
}

/** Stern lanterns: small glowing boxes on the top corners of the stern. */
export function lanterns(b: Builder, h: HullSpec, color: number, topY: number): void {
  const z = zOf(h, 0) - 0.05, x = hullX(h, 0, 1) * 0.85;
  const g = new THREE.BoxGeometry(0.12, 0.18, 0.12);
  for (const sx of [1, -1]) b.add(g, color, xf(sx * x, topY + 0.12, z), { emit: color, glow: 3 });
  if (h.L * h.B > 17) b.add(g, color, xf(0, topY + 0.2, z), { emit: color, glow: 3 });
  g.dispose();
}
