// Shared building blocks for the painted inline-SVG icon set (64x64 viewBox).
// Every shape gets a dark ink outline from the root (paint-order: stroke keeps the outline outside the fill and draws a separation line where shapes overlap).
// No <defs>, gradients or ids: dozens of icons share one page as innerHTML strings.
export const INK = '#1a1208';

export const svg = (body: string, style = ''): string =>
  `<svg class="ico" viewBox="0 0 64 64" aria-hidden="true" fill="currentColor" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"${style ? ` style="${style}"` : ''}>${body}</svg>`;

/** Fixed material palette, matched to the captain portraits. */
export const P = {
  wood: '#8a5a2b', woodL: '#b9803f', woodD: '#5a3a1a', mast: '#4a2e14',
  iron: '#59626c', ironL: '#9aa4ad', steel: '#dfe6ee',
  brass: '#c9993a', brassL: '#f2d27a', brassD: '#8a6414',
  sail: '#f3e7c9', parch: '#ecd9a8', smoke: '#e6dfcf',
  fire: '#ff8a2a', flame: '#ffd25a', core: '#fff4c0',
  red: '#c2412d', navy: '#1a3557', green: '#5aa05a', glass: '#a9d4e6', leather: '#7a3a1e',
};
export const f = (c: string): string => `fill="${c}"`;
/** Unoutlined overlays: shade (darkens whatever is under it) and highlight. */
export const SH = 'fill="#000" fill-opacity=".28" stroke="none"';
export const HL = 'fill="#fff" fill-opacity=".5" stroke="none"';
/** Thin ink detail line (no fill). */
export const DL = (w = 2.5): string => `fill="none" stroke-width="${w}"`;

/** A coloured line with an ink casing. */
export const line = (d: string, c = 'currentColor', w = 5): string =>
  `<path d="${d}" fill="none" stroke-width="${w + 4}"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
export const ring = (cx: number, cy: number, r: number, c = 'currentColor', w = 5): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="${w + 4}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;

/** Overlapping circles merged into one outlined blob (smoke, clouds, clover). */
export const blob = (c: string, cs: [number, number, number][]): string => {
  const g = cs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `<g fill="${INK}">${g}</g><g fill="${c}" stroke="none">${g}</g>`;
};

/** Star / burst polygon with n points alternating radii r1 (outer) and r2 (inner). */
export const burst = (cx: number, cy: number, r1: number, r2: number, n: number, c: string, rot = 0): string => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n - Math.PI / 2, r = i % 2 ? r2 : r1;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `<polygon fill="${c}" points="${pts.join(' ')}"/>`;
};
/** A muzzle flash / spark: outer fire burst with a pale core. */
export const flash = (cx: number, cy: number, r: number, n = 8): string =>
  burst(cx, cy, r, r * 0.45, n, P.fire) + burst(cx, cy, r * 0.55, r * 0.25, n, P.core, Math.PI / n);
