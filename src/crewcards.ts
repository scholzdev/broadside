import type { Card, Rarity, StatLine } from './cards';
import { crewState, CREW_ORDER, CREW_STAT, MAX_CREW_LV, crewCap, crewTotal, CrewEntry } from './crewdefs';
import type { CrewId } from './relics';
import { addCrew, setCrewLevel } from './crew';
import { crewName, crewAdv } from './lname';
import { isUnlocked } from './meta';
import { L } from './loadout';
import { t } from './i18n';

// ---- CREW cards (v9): recruit (+N figures) and train (Lv a -> b). Rolled with concrete values; applyCrewCard applies exactly what was rolled. ----
const RECRUIT: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4 };
const STEP: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 2, epic: 3 };
export interface CrewPick { op: 'recruit' | 'train'; type: CrewId; n: number; to: number }
interface Cand { w: number; make: () => Card | null }

const ln = (key: string, label: string, from: number, to: number, o: Partial<StatLine> = {}): StatLine => ({ key, label, from, to, dec: 0, ...o });
const effect = (type: CrewId, a: CrewEntry, b: CrewEntry): StatLine => {
  const s = CREW_STAT[type];
  return ln('eff', s.label, s.val(a), s.val(b), { dec: s.dec, pre: s.pre, suf: s.suf });
};
const room = (): number => Math.max(0, crewCap(L.ship) - crewTotal());
/** Crew can only be offered when unlocked in the meta catalog (musketeers and the three originals are free). */
const usable = (id: CrewId): boolean => isUnlocked('crew:' + id) && !(id === 'carp' && L.cap.regen <= 0); // Count Corvo cannot be repaired

/** Candidate cards for the level-up / loot pools. `pick` is cards.ts's rarity roll. */
export function crewCandidates(pick: (rareUp: boolean) => Rarity, rareUp: boolean): Cand[] {
  const out: Cand[] = [];
  for (const type of CREW_ORDER) {
    if (!usable(type)) continue;
    const have = crewState[type];
    if (room() > 0) out.push({ w: have ? 0.1 : 0.04, make: () => recruit(type, pick(rareUp)) });
    if (have && have.count > 0 && have.level < MAX_CREW_LV) out.push({ w: 0.22, make: () => train(type, pick(rareUp)) });
  }
  return out;
}
function recruit(type: CrewId, rarity: Rarity): Card | null {
  const n = Math.min(room(), RECRUIT[rarity] * L.cap.crewX);
  if (n <= 0) return null;
  const a = crewState[type] ?? { count: 0, level: 1 }, b = { count: a.count + n, level: a.level }, tot = crewTotal();
  const lines = [ln('crew', 'Crew figures', tot, tot + n), effect(type, a, b)];
  return {
    id: 'crew:r:' + type, kind: 'crew', ref: type, title: t('crew.recruit', { n, name: crewName(type) }), rarity, trackLevel: a.level, lines,
    text: t('crew.recruit', { n, name: crewName(type) }), crew: { op: 'recruit', type, n, to: a.level },
  };
}
function train(type: CrewId, rarity: Rarity): Card | null {
  const a = crewState[type];
  if (!a || a.level >= MAX_CREW_LV) return null;
  const to = Math.min(MAX_CREW_LV, a.level + STEP[rarity]), b = { count: a.count, level: to };
  return {
    id: 'crew:t:' + type, kind: 'crew', ref: type, title: t('crew.train', { name: crewName(type), a: a.level, b: to }), rarity, trackLevel: to,
    lines: [ln('lvl', 'Crew level', a.level, to), effect(type, a, b)], unlock: to >= MAX_CREW_LV ? crewAdv(type) : undefined,
    text: t('crew.train', { name: crewName(type), a: a.level, b: to }), crew: { op: 'train', type, n: 0, to },
  };
}
/** Can this crew card still be applied (a recruit needs room on deck)? */
export const crewCardOk = (c: Card): boolean => !c.crew || c.crew.op === 'train' || room() > 0;
export function applyCrewCard(c: Card): void {
  const k = c.crew;
  if (!k) return;
  if (k.op === 'recruit') addCrew(k.type, k.n); else setCrewLevel(k.type, k.to);
}
