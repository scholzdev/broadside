import { Builder } from '../geo';
import { C, box, cyl, prim, rod, tube } from './kit';

// ---- relic trinkets: a small glowing charm in the relic's colour (hung on the stern lantern) ----

type Shape = 'coin' | 'gem' | 'bottle' | 'tooth' | 'book' | 'scale' | 'biscuit' | 'match' | 'scroll' | 'compass' | 'barnacle' | 'anchor' | 'vane';
/** Relic id -> colour and trinket shape. Unknown relics get a gold gem. */
export const RELIC_LOOK: Record<string, { col: number; shape: Shape }> = {
  coin: { col: 0xf2c94a, shape: 'coin' },
  biscuit: { col: 0xd8b070, shape: 'biscuit' },
  wind: { col: 0xbfe8ff, shape: 'gem' },
  opal: { col: 0xff6a2a, shape: 'gem' },
  quickmatch: { col: 0xff9a2a, shape: 'match' },
  log: { col: 0xc0703a, shape: 'book' },
  kraken: { col: 0xefe6d0, shape: 'tooth' },
  mermaid: { col: 0x4fd8c8, shape: 'scale' },
  storm: { col: 0x7fb8ff, shape: 'bottle' },
  map: { col: 0xe8d8a8, shape: 'scroll' },
  barnacle: { col: 0x9ab0a0, shape: 'barnacle' },
  compass: { col: 0xe3b546, shape: 'compass' },
  cursed: { col: 0x8aff6a, shape: 'coin' },
  siren: { col: 0xffb0c8, shape: 'scale' },
  pearl: { col: 0xf4f0ff, shape: 'gem' },
  rum: { col: 0xc0702a, shape: 'bottle' },
  anchor: { col: 0x9aa4b0, shape: 'anchor' },
  ghostlamp: { col: 0x7affd8, shape: 'bottle' },
  medal: { col: 0xf2c94a, shape: 'compass' },
  vane: { col: 0xd8e4f0, shape: 'vane' },
};
export const RELIC0 = { col: 0xf2c14e, shape: 'gem' as Shape };

/** Trinket geometry hanging below its pivot (origin), centre about 0.2 down. */
export function trinketGeo(id: string): { geo: ReturnType<Builder['build']>; col: number } {
  const { col, shape } = RELIC_LOOK[id] ?? RELIC0, b = new Builder(), y = -0.2, g = { emit: col, glow: 1.6 }, hot = { emit: col, glow: 3 };
  rod(b, [0, 0, 0], [0, y + 0.07, 0], 0.008, C.brass, 3);
  switch (shape) {
    case 'coin': cyl(b, col, [0, y, 0], 0.08, 0.02, [Math.PI / 2, 0, 0], 10, g); break;
    case 'gem': prim(b, 'oct', col, [0, y, 0], [0.065, 0.1, 0.065], undefined, hot); break;
    case 'bottle':
      cyl(b, col, [0, y - 0.02, 0], 0.06, 0.1, undefined, 8, hot);
      cyl(b, 0x8a6a3a, [0, y + 0.06, 0], 0.025, 0.05, undefined, 6);
      break;
    case 'tooth': prim(b, 'cone6', col, [0, y - 0.02, 0], [0.045, 0.16, 0.045], [Math.PI, 0, 0], g); break;
    case 'book': box(b, col, [0, y, 0], [0.12, 0.14, 0.04], undefined, g); box(b, 0xf0e6c8, [0.005, y, 0], [0.11, 0.12, 0.045]); break;
    case 'scale': prim(b, 'sph', col, [0, y, 0], [0.07, 0.09, 0.02], undefined, hot); break;
    case 'biscuit': box(b, col, [0, y, 0], [0.11, 0.11, 0.03], [0, 0, Math.PI / 4], g); break;
    case 'match': rod(b, [0, y + 0.06, 0], [0, y - 0.08, 0], 0.012, 0x8a6a3a, 4); prim(b, 'ico', col, [0, y - 0.1, 0], 0.035, undefined, hot); break;
    case 'scroll': cyl(b, col, [0, y, 0], 0.035, 0.16, [0, 0, Math.PI / 2], 6, g); tube(b, 0xa0302a, [-0.01, y, 0], [0.01, y, 0], 0.04, 0.04, 6); break;
    case 'compass': cyl(b, col, [0, y, 0], 0.075, 0.025, [Math.PI / 2, 0, 0], 10, g); box(b, 0xc0392b, [0, y, 0.016], [0.015, 0.1, 0.01]); break;
    case 'anchor':
      rod(b, [0, y + 0.07, 0], [0, y - 0.08, 0], 0.014, col, 4);
      prim(b, 'torus', col, [0, y - 0.05, 0], [0.06, 0.06, 0.04], [0, 0, 0], g);
      prim(b, 'torus', col, [0, y + 0.08, 0], 0.02, [0, 0, 0], g);
      box(b, col, [0, y + 0.04, 0], [0.09, 0.015, 0.015], undefined, g);
      break;
    case 'vane':
      rod(b, [0, y + 0.07, 0], [0, y - 0.07, 0], 0.01, C.iron, 4);
      prim(b, 'cone3', col, [0.06, y, 0], [0.025, 0.08, 0.01], [0, 0, -Math.PI / 2], g);
      box(b, col, [-0.05, y, 0], [0.06, 0.05, 0.008], undefined, g);
      break;
    case 'barnacle': for (const [dx, dy] of [[0, 0], [0.05, -0.03], [-0.05, -0.02], [0, -0.07]]) prim(b, 'cone6', col, [dx, y + dy, 0], [0.04, 0.05, 0.04], undefined, g); break;
  }
  return { geo: b.build(), col };
}
