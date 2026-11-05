import { L as LD, baseStats } from './loadout';
import type { StatMap } from './modstats';
import { t } from './i18n';
import { crewFx } from './crewdefs';
import type { BossId } from './seas';
// Heading convention: forward = (sin h, 0, cos h); heading 0 = +Z.
// Port (left of bow) = (cos h, 0, -sin h) = +X at h=0. Slot angles are relative to the bow,
// +angle toward port; world direction angle = heading + slot angle (dir = (sin a, cos a)).
/** Fire arcs (where an auto can aim). Mount slots (bow/side/deck/stern) live in modules.ts. */
export type ArcId = 'bow' | 'port' | 'starboard' | 'stern' | 'deck';
export type EnemyType = 'gunboat' | 'raft' | 'brig' | 'ketch' | 'boss' | 'swarm' | 'serpent' | 'minelayer' | 'ghost' | 'battery' | 'fireship';

const D = Math.PI / 180;
export const SLOTS: Record<ArcId, { center: number; half: number }> = {
  bow: { center: 0, half: 35 * D },
  port: { center: 90 * D, half: 60 * D },
  starboard: { center: -90 * D, half: 60 * D },
  stern: { center: 180 * D, half: 55 * D },
  deck: { center: 0, half: Math.PI },
};
/** Half-width of an arc after the Swivel bonus (radians): +bonus on every non-deck arc, never past a full hemisphere (90 degrees) unless the base is already wider. */
export const arcHalfWith = (arc: ArcId, bonus: number, override?: number): number => {
  const base = override ?? SLOTS[arc].half;
  return arc === 'deck' ? base : Math.min(base + bonus, Math.max(base, Math.PI / 2));
};

export interface EnemyDef { name: string; hp: number; speed: number; r: number; turn: number; contact: number; xp: number }
export const ENEMIES: Record<EnemyType, EnemyDef> = {
  gunboat: { name: 'Gunboat', hp: 20, speed: 7, r: 1.2, turn: 2.2, contact: 4, xp: 2 },
  raft: { name: 'Fire Raft', hp: 10, speed: 10, r: 1.0, turn: 3.0, contact: 15, xp: 2 },
  brig: { name: 'Brig', hp: 70, speed: 4, r: 2.1, turn: 1.2, contact: 8, xp: 6 },
  ketch: { name: 'Bomb Ketch', hp: 35, speed: 5, r: 1.8, turn: 1.5, contact: 6, xp: 5 },
  boss: { name: "Man-o'-War", hp: 800, speed: 5.5, r: 4.6, turn: 0.9, contact: 20, xp: 0 },
  swarm: { name: 'Swarm Cutter', hp: 8, speed: 11, r: 0.7, turn: 3.5, contact: 3, xp: 1 },
  serpent: { name: 'Sea Serpent', hp: 60, speed: 8, r: 1.4, turn: 3.2, contact: 14, xp: 6 },
  minelayer: { name: 'Minelayer', hp: 45, speed: 5, r: 1.5, turn: 1.6, contact: 6, xp: 5 },
  ghost: { name: 'Ghost Ship', hp: 50, speed: 6, r: 1.9, turn: 1.6, contact: 8, xp: 6 },
  battery: { name: 'Coastal Battery', hp: 90, speed: 0, r: 1.8, turn: 0, contact: 0, xp: 8 },
  fireship: { name: 'Fire Ship', hp: 30, speed: 9, r: 1.5, turn: 2.4, contact: 30, xp: 4 },
};

export const ENEMY_GOLD: Record<EnemyType, number> = { gunboat: 1, raft: 1, brig: 3, ketch: 2, boss: 0, swarm: 1, serpent: 5, minelayer: 3, ghost: 4, battery: 5, fireship: 2 };
export const ACTS = 4;
export const ACT_HP = [1, 1.6, 2.4, 3.4];
export const ACT_DMG = [1, 1.25, 1.5, 1.8];
/** Optional boss patterns (v8 pass 3a): every field is data, remixes just set more of them. */
export interface BossPat {
  /** Speed x. */ spd?: number;
  /** Broadside balls slow the ship (secs). */ chain?: number;
  /** Swarm cutter escorts: every N s, n cutters. */ escort?: { every: number; n: number };
  /** Below this hp fraction: rage (faster, red, rings every `ringEvery` / 2). */ rage?: number;
  /** Teleport + ghost phasing: solid secs, ghostly secs. */ phase?: { solid: number; ghost: number; tele?: boolean };
  /** Homing spectral skulls every N s. */ skulls?: number;
  /** Summons n ghost ships every N s. */ ghosts?: { every: number; n: number };
  /** Lava mortar barrage every N s (n shells). */ mortar?: { every: number; n: number };
  /** Leaves fire pools behind. */ trail?: boolean;
  /** Below this hp fraction: a burning aura around the boss. */ aura?: number;
  /** v8 pass 3b sea monster (leviathan.ts): look, serpent summons every N s, fireball spit every N s, ash cloud every N s. */
  monster?: { look: 'coral' | 'ash'; serpents?: number; spit?: number; ash?: number };
  /** v8 pass 3b stationary fortress (fortress.ts): n turrets of `hp` each guard an invulnerable core. */
  fort?: { turrets: number; hp: number };
}
export interface BossDef extends BossPat { id: BossId; name: string; hp: number; balls: number; ringBelow: number; ringEvery: number; rafts: boolean; scale: number }
// ringBelow: ring phase starts when hp fraction is below this (0 = never, 1.01 = always). Keyed by boss id (seas.ts picks one per sea and act).
export const BOSSES: Record<BossId, BossDef> = {
  cutter: { id: 'cutter', name: 'Revenue Cutter', hp: 350, balls: 4, ringBelow: 0, ringEvery: 6, rafts: false, scale: 1.4 },
  manowar: { id: 'manowar', name: "Man-o'-War", hp: 800, balls: 6, ringBelow: 0.5, ringEvery: 6, rafts: false, scale: 1.8 },
  firegalleon: { id: 'firegalleon', name: 'Fire Galleon', hp: 1300, balls: 6, ringBelow: 0.5, ringEvery: 6, rafts: true, scale: 2.0 },
  flagship: { id: 'flagship', name: "Admiral's Flagship", hp: 2200, balls: 8, ringBelow: 1.01, ringEvery: 5, rafts: false, scale: 2.4 },
  // Reef Coast
  corsair: { id: 'corsair', name: 'Reef Corsair', hp: 450, balls: 4, ringBelow: 0, ringEvery: 6, rafts: false, scale: 1.5, spd: 1.35, chain: 2.5 },
  manowar_r: { id: 'manowar_r', name: "Man-o'-War (Reef)", hp: 1500, balls: 7, ringBelow: 0.6, ringEvery: 6, rafts: false, scale: 1.9, escort: { every: 9, n: 4 } },
  pirateking: { id: 'pirateking', name: "Pirate King's Galleon", hp: 2800, balls: 8, ringBelow: 0, ringEvery: 5, rafts: false, scale: 2.3, escort: { every: 10, n: 5 }, rage: 0.3 },
  // Fog Coast
  ghostgalleon: { id: 'ghostgalleon', name: 'Ghost Galleon', hp: 420, balls: 4, ringBelow: 0, ringEvery: 7, rafts: false, scale: 1.6, phase: { solid: 5, ghost: 2.4, tele: true } },
  cutter_r: { id: 'cutter_r', name: 'Revenue Cutter (Fog)', hp: 1500, balls: 6, ringBelow: 0.5, ringEvery: 6, rafts: false, scale: 1.6, spd: 1.25, chain: 2, escort: { every: 11, n: 4 } },
  drownedadmiral: { id: 'drownedadmiral', name: 'Drowned Admiral', hp: 2700, balls: 6, ringBelow: 0.5, ringEvery: 6, rafts: false, scale: 2.3, ghosts: { every: 14, n: 2 }, skulls: 4 },
  // Volcanic Isles
  firegalleon_r: { id: 'firegalleon_r', name: 'Fire Galleon (Volcanic)', hp: 700, balls: 6, ringBelow: 0.6, ringEvery: 6, rafts: true, scale: 2.0, trail: true },
  magma: { id: 'magma', name: 'Magma Dreadnought', hp: 1250, balls: 6, ringBelow: 0, ringEvery: 6, rafts: false, scale: 2.4, spd: 0.85, mortar: { every: 7, n: 4 }, trail: true, aura: 0.5 },
  // pass 3b: monster and fortress bosses (balls / rings unused by their own AI)
  leviathan: { id: 'leviathan', name: 'Coral Leviathan', hp: 1100, balls: 0, ringBelow: 0, ringEvery: 7, rafts: false, scale: 1.95, monster: { look: 'coral', serpents: 14 } },
  lighthouse: { id: 'lighthouse', name: 'Lighthouse Fortress', hp: 900, balls: 0, ringBelow: 0, ringEvery: 6, rafts: false, scale: 1.8, fort: { turrets: 4, hp: 180 } },
  ashleviathan: { id: 'ashleviathan', name: 'Ash Leviathan', hp: 1800, balls: 0, ringBelow: 0, ringEvery: 7, rafts: false, scale: 2.2, monster: { look: 'ash', spit: 3.2, ash: 14 } },
  flagship_r: { id: 'flagship_r', name: "Admiral's Flagship (Volcanic)", hp: 2900, balls: 10, ringBelow: 1.01, ringEvery: 4.5, rafts: false, scale: 2.5, mortar: { every: 10, n: 3 }, escort: { every: 12, n: 4 } },
};

export type Levels = Record<string, number>;
const L = (lv: Levels, k: string): number => lv[k] ?? 0;
export const MAX_LV = 5;

export interface Stats { ramMul: number; contactMul: number; enemyHp: number; cooldownMul: number; balls: number; pierce: number; maxHp: number; maxSpeed: number; turnMul: number; pickup: number; regen: number; goldMul: number; rangeMul: number;
  /** Captain hooks: active cooldown x, auto damage x, all damage x, damage taken x, auto cooldown x. */
  activeCdMul: number; autoDmgMul: number; dmgMul: number; dmgTakenMul: number; autoRateMul: number;
  /** Full Sail: duration, cooldown, speed factor. Captain: lucky chance, wobble, heals, regen-off, ignite. */
  fullDur: number; fullCd: number; fullSpd: number; lucky: number; wobble: number; healKill: number; healEat: number; ignite: boolean;
  /** v7: all healing x (captain, Surgeon), XP gained x (Clockwork Cass). */
  healMul: number; xpMul: number;
  /** Swivel Guns / Swivel Mounts: radians added to every non-deck firing arc's half-angle (see arcHalfWith). */
  arcBonus: number;
  /** v9 crew: captain spell cooldown x, explosion radius x, extra fog/ash vision radius (u). */
  spellCdMul: number; blastMul: number; vision: number }
/** `ms` (the per-run module records) feeds the Iron Ram passive; omit it before a run exists. */
export function deriveStats(lv: Levels, ms: StatMap = {}): Stats {
  const hull = L(lv, 'hull'), sails = L(lv, 'sails');
  const hh = L(lv, 'h:hull'), hs = L(lv, 'h:sheath');
  const b = baseStats(LD.ship, LD.captain);
  const ram = ms.ram?.auto, rl = LD.relic, cx = crewFx();
  const kills = L(lv, 'k:hp'); // Admiral Thorne: bonus max HP from kills (set by game.gainKill)
  return {
    ramMul: b.ram * (ram ? ram.ramMul : 1) * (rl === 'kraken' ? 1.6 : 1), contactMul: b.contact * (ram ? ram.contactMul : 1) * (rl === 'barnacle' ? 0.85 : 1),
    activeCdMul: b.activeCd * cx.activeCd, spellCdMul: b.activeCd * cx.spellCd, blastMul: cx.blast, vision: cx.vision, autoDmgMul: b.autoDmg, healMul: b.heal, xpMul: b.xp, dmgMul: b.dmg, dmgTakenMul: b.taken * cx.taken, autoRateMul: b.autoRate * (rl === 'quickmatch' ? 0.9 : 1) * cx.autoRate,
    fullDur: 2.5, fullCd: (8 * b.fullCd) / cx.nitro, fullSpd: b.fullSpd, lucky: b.lucky, wobble: b.wobble, healKill: b.healKill, healEat: b.healEat, ignite: b.ignite, enemyHp: b.enemyHp,
    cooldownMul: b.cd * Math.pow(0.88, L(lv, 'rate')),
    balls: b.balls + L(lv, 'cannon') + L(lv, 'h:deck'),
    pierce: L(lv, 'chain'),
    maxHp: Math.round(b.hp * (rl === 'cursed' ? 0.9 : 1) + 25 * hull + 30 * hh + (rl === 'biscuit' ? 20 : 0) + (rl === 'anchor' ? 40 : 0) + cx.hp + kills),
    maxSpeed: b.speed * Math.pow(0.94, hull) * Math.pow(0.96, hh) * (1 + 0.1 * sails + 0.08 * hs) * cx.speed * (rl === 'anchor' ? 0.9 : 1),
    turnMul: b.turn * (1 + 0.1 * sails + 0.08 * hs) * cx.speed,
    pickup: 4 * (1 + 0.3 * L(lv, 'hooks')) * LD.cap.pickup * cx.pull,
    regen: (rl === 'barnacle' ? 0.3 : 0) * b.regen,
    goldMul: b.gold * cx.gold * (rl === 'coin' ? 1.1 : 1),
    rangeMul: cx.range,
    arcBonus: (L(lv, 'swivel') + L(lv, 'h:swivel')) * 15 * D,
  };
}
/** Card/harbor text for the Swivel upgrades: exact half-angles (degrees) of the side, bow and stern arcs before and after. */
export const swivelText = (a: Stats, b: Stats): string => {
  const deg = (arc: ArcId, s: Stats): number => Math.round(arcHalfWith(arc, s.arcBonus) / D);
  const one = (name: string, arc: ArcId): string => t('swivel.one', { name: t('arc.' + name), a: deg(arc, a), b: deg(arc, b) });
  return t('swivel.text', { x: `${one('sides', 'port')}, ${one('bow', 'bow')}, ${one('stern', 'stern')}` });
};
