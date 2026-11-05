import { MODS, ModuleId, PLUS_LV } from './modules';
import { EXTRA3, TRACKS3 } from './modstats3';

// ---- per-run module stat record: every auto / active / passive reads its numbers ONLY from here ----
// Seeded from MODS (dmg, cooldown, range, speed) plus the literals that used to live in the cast functions (EXTRA).
// Angles are stored in degrees. Keys ending in 'Plus' are added when the ability track is Lv 4+ ("+" effect).
export type Track = 'auto' | 'ability';
export type Num = Record<string, number>;
export interface ModStats { autoLv: number; abilityLv: number; auto: Num; ability: Num }
export type StatMap = Partial<Record<ModuleId, ModStats>>;

const EXTRA: Record<ModuleId, { auto: Num; ability: Num }> = {
  broadside: { auto: { count: 0, pierce: 0 }, ability: { count: 3, countPlus: 2, interval: 0.2, charges: 1 } },
  chaser: { auto: { count: 0, pierce: 0, fan: 6 }, ability: { speed: 40, range: 30, pierce: 99, count: 1, countPlus: 1, fan: 8, charges: 1 } },
  mortar: { auto: { radius: 3, count: 0, scatter: 1.5, minFlight: 0.5 }, ability: { gate: 22, cluster: 5, count: 8, countPlus: 6, spread: 1.5, scatter: 4, flight: 0.9, radius: 3, charges: 1 } },
  kegs: { auto: { radius: 3.5, life: 8, trigger: 3, count: 0 }, ability: { duration: 4, durationPlus: 3, radius: 1.6, radiusPlus: 1, segLife: 3, charges: 1 } },
  ram: { auto: { ramMul: 1.6, contactMul: 0.8 }, ability: { duration: 0.8, durationPlus: 0.4, dashSpd: 2.2, dashMul: 3, dmg: 40, radius: 5, charges: 1 } },
  boarding: { auto: { life: 6, count: 1 }, ability: { count: 5, life: 6, lifePlus: 4, speed: 12, charges: 1 } },
  witch: { auto: { jumps: 3, hop: 8 }, ability: { count: 8, countPlus: 6, radius: 25, stun: 1, gap: 0.12, charges: 1 } },
  siphon: { auto: { half: 45 }, ability: { duration: 3, radius: 7, radiusPlus: 3, charges: 1 } },
  ward: { auto: { count: 1 }, ability: { radius: 18, duration: 2, taken: 0.2, dmg: 30, push: 8, charges: 1 } },
  lantern: { auto: { chance: 0.15 }, ability: { blink: 14, mult: 2, charges: 1, chargesPlus: 1 } },
  harpoon: { auto: { count: 0, pierce: 0, fan: 5, slow: 0.3, slowT: 1 }, ability: { range: 25, count: 3, countPlus: 2, stun: 1, charges: 1 } },
  carronade: { auto: { count: 0, pierce: 0, knock: 3 }, ability: { count: 12, countPlus: 8, range: 12, half: 35, speed: 26, charges: 1 } },
  rockets: { auto: { count: 0, turn: 3.5, radius: 2 }, ability: { count: 12, countPlus: 8, span: 0.7, turn: 3.5, charges: 1 } },
  net: { auto: { radius: 4, slow: 0.4, slowT: 2, count: 0 }, ability: { radius: 12, radiusPlus: 6, slow: 0.6, slowT: 3, charges: 1 } },
  crowsnest: { auto: { count: 0 }, ability: { range: 40, bossDmg: 150, stun: 0, stunPlus: 1.5, charges: 1 } },
  pump: { auto: { hps: 1, threshold: 0.5 }, ability: { heal: 0.25, shield: 0, shieldPlus: 3, taken: 0.5, charges: 1 } },
  ...EXTRA3,
};

/** Base-damage buff on every module seed (dmg / bossDmg keys): the player out-damages the waves from the first minute. */
export const SEED_DMG_K = 1.6;
const buffDmg = (n: Num): Num => { for (const k of ['dmg', 'bossDmg']) if (n[k]) n[k] = Math.round(n[k] * SEED_DMG_K * 10) / 10; return n; };
export function seedStats(id: ModuleId): ModStats {
  const m = MODS[id], x = EXTRA[id];
  return {
    autoLv: 1, abilityLv: 1,
    auto: buffDmg({ dmg: m.auto.dmg, cd: m.auto.cooldown, range: m.auto.range, speed: m.auto.speed, ...x.auto }),
    ability: buffDmg({ cd: m.active.cd, dmg: m.active.dmg ?? 0, ...x.ability }),
  };
}
/** Pristine seed per module, used as the reference for caps and floors. */
export const BASE = Object.fromEntries((Object.keys(MODS) as ModuleId[]).map(id => [id, seedStats(id)])) as Record<ModuleId, ModStats>;

/** Module level = max(autoLv, abilityLv); 0 when not owned. */
export const modLevel = (ms: ModStats | undefined): number => (ms ? Math.max(ms.autoLv, ms.abilityLv) : 0);
export const isPlus = (ms: ModStats): boolean => ms.abilityLv >= PLUS_LV;
/** Ability number including its "+" bonus (key + 'Plus') once the ability track is Lv 4+. */
export const abil = (ms: ModStats, key: string): number => ms.ability[key] + (isPlus(ms) ? ms.ability[key + 'Plus'] ?? 0 : 0);

// ---- upgradable stats per track ----
// add: +step of base per common level. abs: +step absolute. cd: -step of current (floor 30% of base). cnt: +round(step*mag) (cap base+4). rad: like add, cap 2x base.
type Kind = 'add' | 'abs' | 'cd' | 'cnt' | 'rad';
export interface Spec { key: string; label: string; kind: Kind; step: number; dec: number; min?: number; max?: number; plusOnly?: boolean }
export interface TrackDef { stats: Spec[]; specials: Spec[] }
const sp = (key: string, label: string, kind: Kind, step: number, dec = 1, o: Partial<Spec> = {}): Spec => ({ key, label, kind, step, dec, ...o });
const DMG = sp('dmg', 'Damage', 'add', 0.12), CD = sp('cd', 'Cooldown', 'cd', 0.08, 2), SPD = sp('speed', 'Proj. speed', 'add', 0.1), RNG = sp('range', 'Range', 'add', 0.08);
const RAD = (label = 'Radius', plusOnly = false): Spec => sp('radius', label, 'rad', 0.1, 1, { plusOnly });
const CH = sp('charges', 'Charges', 'cnt', 1, 0, { max: 3 }), PIERCE = sp('pierce', 'Pierce', 'cnt', 1, 0);
const cnt = (label: string, step = 1, key = 'count'): Spec => sp(key, label, 'cnt', step, 0);
const dur = sp('duration', 'Duration', 'add', 0.12), life = sp('life', 'Life', 'add', 0.12);
const T = (stats: Spec[], specials: Spec[] = []): TrackDef => ({ stats, specials });

export const TRACKS = {
  broadside: { auto: T([DMG, CD, SPD, RNG], [cnt('Balls per side'), PIERCE]), ability: T([DMG, CD, cnt('Volleys')], [CH]) },
  chaser: { auto: T([DMG, CD, SPD, RNG], [cnt('Extra shots'), PIERCE]), ability: T([DMG, CD, SPD, RNG, cnt('Shots')], [CH]) },
  mortar: { auto: T([DMG, CD, SPD, RNG, RAD('Blast radius')], [cnt('Extra shells')]), ability: T([DMG, CD, cnt('Shells', 2), RAD('Blast radius')], [CH]) },
  kegs: { auto: T([DMG, CD, RNG, RAD('Blast radius'), life], [cnt('Extra kegs')]), ability: T([CD, dur, RAD('Trail width')], [CH]) },
  ram: { auto: T([sp('ramMul', 'Ram damage', 'abs', 0.15, 2), sp('contactMul', 'Contact taken', 'abs', -0.03, 2, { min: 0.5 })]),
    ability: T([CD, dur, sp('dashSpd', 'Dash speed', 'abs', 0.2, 1, { max: 3.6 }), sp('dmg', 'Shockwave dmg', 'add', 0.12, 1, { plusOnly: true }), RAD('Shockwave radius', true)], [CH]) },
  boarding: { auto: T([sp('dmg', 'Damage/s', 'add', 0.12), CD, SPD, RNG, life], [cnt('Longboats')]), ability: T([sp('dmg', 'Damage/s', 'add', 0.12), CD, cnt('Longboats'), life, SPD], [CH]) },
  witch: { auto: T([DMG, CD, RNG, sp('hop', 'Hop range', 'rad', 0.1)], [cnt('Chain jumps', 1, 'jumps')]), ability: T([DMG, CD, cnt('Strikes', 2), RAD('Reach')], [CH]) },
  siphon: { auto: T([DMG, CD, RNG, sp('half', 'Cone width', 'rad', 0.1, 0)]), ability: T([CD, dur, RAD('Flame radius')], [CH]) },
  ward: { auto: T([CD, RNG], [cnt('Shots deleted')]), ability: T([CD, RAD('Ward radius'), dur, sp('dmg', 'Burst damage', 'add', 0.12, 1, { plusOnly: true })], [CH]) },
  lantern: { auto: T([sp('chance', 'Lose-track chance', 'abs', 0.03, 2, { max: 0.5 }), sp('range', 'Min. distance', 'abs', -1, 0, { min: 6 })]),
    ability: T([CD, sp('blink', 'Blink distance', 'add', 0.08), sp('mult', 'Next volley', 'abs', 0.25, 2)], [CH]) },
} as Record<ModuleId, Record<Track, TrackDef>>;

TRACKS.harpoon = {
  auto: T([DMG, CD, SPD, RNG, sp('slow', 'Slow', 'abs', 0.04, 2, { max: 0.6 }), sp('slowT', 'Slow time', 'add', 0.12, 2)], [cnt('Extra harpoons'), PIERCE]),
  ability: T([CD, sp('range', 'Reach', 'add', 0.08), cnt('Targets'), sp('stun', 'Stun time', 'add', 0.12, 2)], [CH]),
};
TRACKS.carronade = {
  auto: T([DMG, CD, SPD, RNG, sp('knock', 'Knockback', 'add', 0.12)], [cnt('Extra shots'), PIERCE]),
  ability: T([DMG, CD, cnt('Pellets', 2), sp('range', 'Range', 'add', 0.08), sp('half', 'Cone width', 'rad', 0.1, 0)], [CH]),
};
TRACKS.rockets = {
  auto: T([DMG, CD, SPD, RNG, sp('turn', 'Homing', 'add', 0.12)], [cnt('Extra rockets')]),
  ability: T([DMG, CD, cnt('Rockets', 2), sp('turn', 'Homing', 'add', 0.12)], [CH]),
};
TRACKS.net = {
  auto: T([CD, RNG, RAD('Net radius'), sp('slow', 'Slow', 'abs', 0.04, 2, { max: 0.7 }), sp('slowT', 'Slow time', 'add', 0.12, 2)], [cnt('Extra nets')]),
  ability: T([CD, RAD('Net radius'), sp('slow', 'Slow', 'abs', 0.04, 2, { max: 0.85 }), sp('slowT', 'Slow time', 'add', 0.12, 2)], [CH]),
};
TRACKS.crowsnest = {
  auto: T([DMG, CD, RNG], [cnt('Extra shots')]),
  ability: T([DMG, CD, sp('bossDmg', 'Boss damage', 'add', 0.12), sp('range', 'Reach', 'add', 0.08), sp('stunPlus', 'Stun time', 'add', 0.12, 2, { plusOnly: true })], [CH]),
};
TRACKS.pump = {
  auto: T([sp('hps', 'Heal/s', 'abs', 0.25, 2), sp('threshold', 'Works below HP', 'abs', 0.05, 2, { max: 0.8 })]),
  ability: T([CD, sp('heal', 'Heal (of max HP)', 'abs', 0.03, 2, { max: 0.6 }), sp('shieldPlus', 'Shield time', 'add', 0.12, 1, { plusOnly: true })], [CH]),
};

Object.assign(TRACKS, TRACKS3);

// Balance pass: every upgrade card is a clearly visible jump. Damage steps are big (a share of the BASE seed, so linear not compounding), ability
// track steeper than the auto track; cooldown steps are x2.25; other additive/absolute-positive steps x1.8. Specs are shared consts, so clone.
const isDmg = (s: Spec): boolean => s.kind === 'add' && (s.key === 'dmg' || s.key === 'bossDmg');
export const DMG_STEP = { auto: 1.0, ability: 1.0 }; // linear: + base * step * mag per damage card
for (const def of Object.values(TRACKS)) {
  for (const tr of ['auto', 'ability'] as Track[]) {
    const k = DMG_STEP[tr], rescale = (s: Spec): Spec => isDmg(s) ? { ...s, step: k } : s.kind === 'cd' ? { ...s, step: s.step * 2.25 } : s.kind === 'cnt' || s.step < 0 ? s : { ...s, step: s.step * 1.8 };
    def[tr] = { stats: def[tr].stats.map(rescale), specials: def[tr].specials };
  }
}

const round = (v: number, dec: number): number => Math.round(v * 10 ** dec) / 10 ** dec;
/** The stored value after one upgrade of `spec` at magnitude `mag` (caps and floors applied). Unchanged value = no room left. */
export function nextValue(spec: Spec, base: number, cur: number, mag: number): number {
  let v: number;
  if (spec.kind === 'cd') v = Math.max(base * 0.3, cur * (1 - spec.step * mag));
  else if (spec.kind === 'cnt') v = Math.min(spec.max ?? base + 4, cur + Math.max(1, Math.round(spec.step * mag)));
  else if (spec.kind === 'rad') v = Math.min(base * 2.5, cur + base * spec.step * mag);
  else if (spec.kind === 'abs') v = cur + spec.step * mag;
  else v = cur + base * spec.step * mag;
  if (spec.min !== undefined) v = Math.max(spec.min, v);
  if (spec.max !== undefined) v = Math.min(spec.max, v);
  return round(v, spec.dec);
}
