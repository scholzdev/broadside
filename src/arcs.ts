import { G } from './game';
import { SLOTS, ArcId, arcHalfWith } from './content';
import { MODS, ModuleId } from './modules';
import { wrap } from './spatial';

// ---- firing-arc geometry shared by targeting, custom autos, auto-cast conditions and the wedge visuals ----
const D = Math.PI / 180;

/** Current half-width (radians) of an arc: base (or the module's own override) plus the run's Swivel bonus. */
export const arcHalf = (arc: ArcId, override?: number): number => arcHalfWith(arc, G.st.arcBonus, override);

/** Half-width a module actually fires with on an arc: its per-run `half` stat (degrees) if it has one, else MODS arcHalf, else the arc's own. */
export function modArcHalf(id: ModuleId, arc: ArcId): number {
  const h = G.modStats[id]?.auto.half;
  return arcHalf(arc, h !== undefined ? h * D : MODS[id].arcHalf);
}

/** True if a bearing relative to the heading (0 = dead ahead, +left) lies inside the arc. `slack` widens it (target radius). */
export function inArc(rel: number, arc: ArcId, half = arcHalf(arc), slack = 0): boolean {
  return half >= Math.PI || Math.abs(wrap(rel - SLOTS[arc].center)) <= half + slack;
}
