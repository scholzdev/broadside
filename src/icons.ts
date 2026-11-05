// Painted inline-SVG icon set (64x64, ink outline + 2-3 tones). Bodies live in src/iconset/; this file is the public API.
import type { ShipId } from './loadout';
import { MODS, type ModuleId } from './modules';
import type { RelicId, CrewId } from './relics';
import { svg } from './iconset/kit';
import { SHIP } from './iconset/ships';
import { MOD } from './iconset/modules';
import { RELIC, CREW } from './iconset/relics';
import { GLYPH, UPG } from './iconset/ui';

const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');

export const shipIcon = (id: ShipId): string => svg(SHIP[id]);
/** Module icons carry their own accent colour, so they read the same on navy medals and parchment badges. */
export const modIcon = (id: ModuleId): string => svg(MOD[id], `color:${hex(MODS[id].color)}`);
export const relicIcon = (id: RelicId): string => svg(RELIC[id]);
export const crewIcon = (id: CrewId): string => svg(CREW[id]);
/** Ship-upgrade icon; the `h:` crew cards reuse the crew portraits (Copper Sheathing the sails icon). */
export const upgradeIcon = (ref: string): string => ref === 'h:sheath' ? svg(UPG.sails) : svg(UPG[ref] ?? UPG.hull);
export const ICON = Object.fromEntries(Object.entries(GLYPH).map(([k, v]) => [k, svg(v)])) as Record<keyof typeof GLYPH, string>;
