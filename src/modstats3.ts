import type { Spec, TrackDef, Track, Num } from './modstats';

// v10: stat seeds and upgrade tracks of the nine newest modules (swivel .. magnet). Merged into modstats.ts (EXTRA / TRACKS).
type Kind = Spec['kind'];
const sp = (key: string, label: string, kind: Kind, step: number, dec = 1, o: Partial<Spec> = {}): Spec => ({ key, label, kind, step, dec, ...o });
const DMG = sp('dmg', 'Damage', 'add', 0.12), CD = sp('cd', 'Cooldown', 'cd', 0.08, 2), SPD = sp('speed', 'Proj. speed', 'add', 0.1), RNG = sp('range', 'Range', 'add', 0.08);
const RAD = (label = 'Radius', plusOnly = false): Spec => sp('radius', label, 'rad', 0.1, 1, { plusOnly });
const CH = sp('charges', 'Charges', 'cnt', 1, 0, { max: 3 }), PIERCE = sp('pierce', 'Pierce', 'cnt', 1, 0);
const cnt = (label: string, step = 1, key = 'count'): Spec => sp(key, label, 'cnt', step, 0);
const T = (stats: Spec[], specials: Spec[] = []): TrackDef => ({ stats, specials });

export const EXTRA3 = {
  swivel: { auto: { count: 0, spread: 5, pierce: 0 }, ability: { count: 30, countPlus: 20, span: 1, fan: 70, speed: 30, range: 16, charges: 1 } },
  chain: { auto: { count: 0, slow: 0.35, slowT: 2.5, pierce: 0 }, ability: { radius: 16, slow: 0.6, slowT: 4, stun: 0, stunPlus: 1, charges: 1 } },
  firearrows: { auto: { count: 0, pierce: 0 }, ability: { count: 16, countPlus: 12, radius: 22, span: 1, charges: 1 } },
  bombketch: { auto: { radius: 3.5, count: 0, scatter: 1.5, minFlight: 0.6, fire: 3 }, ability: { count: 10, countPlus: 6, span: 1.5, radius: 3.5, fire: 3, charges: 1 } },
  tesla: { auto: { jumps: 2, hop: 7, stun: 0.4 }, ability: { radius: 14, radiusPlus: 6, stun: 1, pulses: 1, pulsesPlus: 1, charges: 1 } },
  gatling: { auto: { cdMin: 0.07, spin: 2.5, spread: 4, pierce: 0 }, ability: { duration: 4, durationPlus: 2, speed: 28, range: 14, charges: 1 } },
  sharkcage: { auto: { life: 10, bite: 0.7, swim: 9, max: 3, count: 0 }, ability: { count: 5, countPlus: 3, life: 10, biteMul: 0.5, charges: 1 } },
  spyglass: { auto: { count: 0, pierce: 1, bonus: 1, crit: 0.1, critMul: 1.5 }, ability: { count: 5, countPlus: 3, range: 40, charges: 1 } },
  magnet: { auto: { gold: 1 }, ability: { radius: 20, radiusPlus: 10, mult: 3, charges: 1 } },
} satisfies Record<string, { auto: Num; ability: Num }>;

export const TRACKS3: Record<string, Record<Track, TrackDef>> = {
  swivel: { auto: T([DMG, CD, SPD, RNG, sp('spread', 'Inaccuracy', 'abs', -0.5, 1, { min: 1 })], [cnt('Extra bullets'), PIERCE]), ability: T([DMG, CD, cnt('Bullets', 4), sp('fan', 'Fan width', 'rad', 0.1, 0)], [CH]) },
  chain: { auto: T([DMG, CD, SPD, RNG, sp('slow', 'Slow', 'abs', 0.04, 2, { max: 0.65 }), sp('slowT', 'Slow time', 'add', 0.12, 2)], [cnt('Extra chain shots'), PIERCE]),
    ability: T([DMG, CD, RAD('Dismast radius'), sp('slow', 'Slow', 'abs', 0.04, 2, { max: 0.85 }), sp('slowT', 'Slow time', 'add', 0.12, 2), sp('stunPlus', 'Stun time', 'add', 0.12, 2, { plusOnly: true })], [CH]) },
  firearrows: { auto: T([DMG, CD, SPD, RNG], [cnt('Extra arrows'), PIERCE]), ability: T([DMG, CD, cnt('Arrows', 3), RAD('Reach')], [CH]) },
  bombketch: { auto: T([DMG, CD, SPD, RNG, RAD('Blast radius'), sp('fire', 'Fire time', 'add', 0.12)], [cnt('Extra bombs')]), ability: T([DMG, CD, cnt('Bombs', 2), RAD('Blast radius'), sp('fire', 'Fire time', 'add', 0.12)], [CH]) },
  tesla: { auto: T([DMG, CD, RNG, sp('hop', 'Hop range', 'rad', 0.1), sp('stun', 'Stun time', 'add', 0.12, 2)], [cnt('Arc jumps', 1, 'jumps')]), ability: T([DMG, CD, RAD('Ring radius'), sp('stun', 'Stun time', 'add', 0.12, 2)], [CH]) },
  gatling: { auto: T([DMG, SPD, RNG, sp('spin', 'Spin-up time', 'abs', -0.2, 1, { min: 1 })], [PIERCE]), ability: T([DMG, CD, sp('duration', 'Duration', 'add', 0.12), RNG], [CH]) },
  sharkcage: { auto: T([DMG, CD, RNG, sp('life', 'Shark life', 'add', 0.12), sp('swim', 'Swim speed', 'add', 0.1)], [cnt('Extra sharks', 1), cnt('Max sharks', 1, 'max')]),
    ability: T([DMG, CD, cnt('Sharks', 2), sp('life', 'Shark life', 'add', 0.12)], [CH]) },
  spyglass: { auto: T([DMG, CD, SPD, RNG, sp('bonus', 'Distance bonus', 'abs', 0.1, 2), sp('crit', 'Crit chance (others)', 'abs', 0.02, 2, { max: 0.4 })], [cnt('Extra shots'), PIERCE]),
    ability: T([DMG, CD, sp('range', 'Reach', 'add', 0.08), cnt('Targets', 1)], [CH]) },
  magnet: { auto: T([RNG, CD, sp('gold', 'Gold per pull', 'abs', 0.5, 1)]), ability: T([CD, RAD('Tide radius'), sp('mult', 'Gold multiplier', 'abs', 0.25, 2, { max: 5 })], [CH]) },
};
