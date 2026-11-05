import { fx } from './particles';

/** Jagged lightning between two points, drawn as short-lived glow particles. */
export function bolt(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, jag = 0.6): void {
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0), n = Math.max(3, Math.ceil(len / 1.2));
  for (let i = 0; i <= n; i++) {
    const t = i / n, j = i === 0 || i === n ? 0 : jag;
    const x = x0 + (x1 - x0) * t + (Math.random() - 0.5) * 2 * j, y = y0 + (y1 - y0) * t, z = z0 + (z1 - z0) * t + (Math.random() - 0.5) * 2 * j;
    fx(x, y, z, 0xcfe4ff, 0.45, 0.06, 0.2, 1, false, undefined, 'glow');
    if (i % 2 === 0) fx(x, y, z, 0xb58cff, 0.9, 0.2, 0.28, 0.5, false, undefined, 'glow');
  }
}
/** A strike from the sky onto the water: bolt, flash and splash ring. */
export function strike(x: number, z: number): void {
  bolt(x + (Math.random() - 0.5) * 3, 30, z + (Math.random() - 0.5) * 3, x, 0.8, z, 0.9);
  fx(x, 0.8, z, 0xeaf2ff, 0.8, 2.6, 0.22, 1, false, undefined, 'glow');
  fx(x, 0.1, z, 0xcfe4ff, 0.5, 3, 0.5, 0.6, true);
}
