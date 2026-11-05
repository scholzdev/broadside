import { SEAS } from './seas';
import { resetWorld } from './world';
import { setSeaPalette } from './sea';
import { setLightTheme } from './render';

/** Re-themes the whole world for sea `k`: lights and grade, water colours, then regenerates islands and reefs around the origin. */
export function applySea(k: number): void {
  const p = SEAS[k].pal;
  setLightTheme(p);
  setSeaPalette(p);
  resetWorld(k);
}
