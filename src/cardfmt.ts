// Structured "from → TO LABEL" lines for ship-upgrade cards (same StatLine shape the module cards use).
import { Stats, arcHalfWith, ArcId } from './content';
import { MODS } from './modules';
import { t } from './i18n';
import type { StatLine } from './cards';

export interface ShipView { lines: StatLine[]; notes: string[] }
const D = Math.PI / 180;

/** `lowerBetter` stats (cooldown) improve when they fall; any stat that moves the wrong way is flagged `worse`. */
const ln = (key: string, label: string, from: number, to: number, dec = 0, o: Partial<StatLine> = {}, lowerBetter = false): StatLine =>
  ({ key, label, from, to, dec, ...o, worse: lowerBetter ? to > from : to < from });
const hp = (a: Stats, b: Stats): StatLine => ln('maxHp', 'Max HP', a.maxHp, b.maxHp);
const speed = (a: Stats, b: Stats): StatLine => ln('maxSpeed', 'Max speed', a.maxSpeed, b.maxSpeed, 1);
const turn = (a: Stats, b: Stats, dec = 1): StatLine => ln('turnMul', 'Turn rate', a.turnMul, b.turnMul, dec, { suf: 'x' });
const balls = (a: Stats, b: Stats): StatLine => ln('balls', 'Balls per side', a.balls, b.balls);

export function swivelLines(a: Stats, b: Stats): StatLine[] {
  const deg = (arc: ArcId, s: Stats): number => Math.round(arcHalfWith(arc, s.arcBonus) / D);
  return (['port', 'bow', 'stern'] as ArcId[]).map(arc => ln('arc.' + arc, arc === 'port' ? 'Arc: sides' : arc === 'bow' ? 'Arc: bow' : 'Arc: stern', deg(arc, a), deg(arc, b), 0, { pre: '±', suf: '°' }));
}

/** Ship level-up cards (a = stats now, b = stats after the pick). */
export function shipView(id: string, a: Stats, b: Stats): ShipView {
  const cd = MODS.broadside.auto.cooldown;
  switch (id) {
    case 'cannon': return { lines: [balls(a, b)], notes: [] };
    case 'rate': return { lines: [ln('cd', 'Cooldown', cd * a.cooldownMul, cd * b.cooldownMul, 2, { suf: 's' }, true)], notes: [] };
    case 'chain': return { lines: [ln('pierce', 'Pierce', a.pierce, b.pierce)], notes: [] };
    case 'hull': return { lines: [hp(a, b), speed(a, b)], notes: [t('cf.heal', { n: 25 })] };
    case 'sails': return { lines: [speed(a, b), turn(a, b)], notes: [] };
    case 'hooks': return { lines: [ln('pickup', 'Pickup radius', a.pickup, b.pickup, 1)], notes: [] };
    case 'swivel': return { lines: swivelLines(a, b), notes: [] };
    case 'h:sheath': return { lines: [speed(a, b), turn(a, b, 2)], notes: [] };
    default: return { lines: [], notes: [] };
  }
}
