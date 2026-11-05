import { deriveStats, Levels, MAX_LV, Stats } from './content';
import { shipView } from './cardfmt';
import { modInPool } from './meta';
import { L } from './loadout';
import { MODS, MOD_IDS, ModuleId, Slot, MAX_MOD_LV, PLUS_LV, SLOT_KEY } from './modules';
import { t } from './i18n';
import { modName, modInfo, modActive, slotName, statLabel } from './lname';
import type { CrewId } from './relics';
import { crewCandidates } from './crewcards';
import { evoCandidates } from './evolutions';
import { BASE, ModStats, StatMap, TRACKS, Spec, Track, nextValue } from './modstats';

// ---- level-up cards: built and rolled with their concrete deltas; pickCard applies exactly what was rolled ----
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';
export const RARITIES: Record<Rarity, { weight: number; mag: number; label: string }> = {
  common: { weight: 60, mag: 1, label: 'Common' }, uncommon: { weight: 28, mag: 1.6, label: 'Uncommon' },
  rare: { weight: 10, mag: 2.4, label: 'Rare' }, epic: { weight: 2, mag: 3.5, label: 'Epic' },
};
export interface StatLine { key: string; label: string; from: number; to: number; dec: number; special?: boolean; worse?: boolean; pre?: string; suf?: string }
export interface Change { key: string; to: number }
export type CardKind = 'auto' | 'ability' | 'newmod' | 'ship' | 'crew' | 'evo';
/** kind/mod/rarity/trackLevel/lines/special are the data the visual card pass reads; `changes` is what pickCard applies. */
export interface Card {
  id: string; kind: CardKind; ref: string; mod?: ModuleId; title: string; text: string;
  rarity?: Rarity; trackLevel?: number; lines: StatLine[]; notes?: string[]; special?: string; unlock?: string; changes?: Change[];
  /** Crew cards (crewcards.ts): recruit `n` figures of `type`, or train it to level `to`. */
  crew?: { op: 'recruit' | 'train'; type: CrewId; n: number; to: number };
}
export interface Ctx { lv: Levels; ms: StatMap; free: Record<Slot, number>; rareUp?: boolean; loot?: boolean }

const rand = (): number => Math.random();
/** `rareUp` (Golden Compass) rolls only Rare and Epic. */
export function pickRarity(rareUp = false): Rarity {
  const ks = (Object.keys(RARITIES) as Rarity[]).slice(rareUp ? 2 : 0);
  let r = rand() * ks.reduce((s, k) => s + RARITIES[k].weight, 0);
  for (const k of ks) { if ((r -= RARITIES[k].weight) < 0) return k; }
  return ks[0];
}
const shuffled = <T>(a: T[]): T[] => {
  const o = [...a];
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
};
export const fmtVal = (l: StatLine, v: number): string => `${l.pre ?? ''}${v.toFixed(l.dec)}${l.suf ?? ''}`;
const fmt = (l: StatLine): string => `${fmtVal(l, l.from)} → ${fmtVal(l, l.to)} ${statLabel(l.label)}`;

function trackCard(id: ModuleId, track: Track, ms: ModStats, rareUp: boolean): Card | null {
  const lvl = track === 'auto' ? ms.autoLv : ms.abilityLv, next = lvl + 1;
  if (lvl >= MAX_MOD_LV) return null;
  const rarity = pickRarity(rareUp), mag = RARITIES[rarity].mag, cur = ms[track], base = BASE[id][track], def = TRACKS[id][track];
  const lines: StatLine[] = [];
  const add = (s: Spec, m: number, special = false): void => {
    const to = nextValue(s, base[s.key], cur[s.key], m);
    if (to !== cur[s.key] && !lines.some(l => l.key === s.key)) lines.push({ key: s.key, label: s.label, from: cur[s.key], to, dec: s.dec, special });
  };
  if (rarity === 'epic') for (const s of shuffled(def.specials)) { add(s, 1, true); if (lines.length) break; }
  const want = rarity === 'common' ? 1 : rarity === 'uncommon' ? 1 + (rand() < 0.5 ? 1 : 0) : rarity === 'rare' ? 2 + (rand() < 0.5 ? 1 : 0) : 3;
  for (const s of shuffled(def.stats)) {
    if (lines.length >= want) break;
    if (s.plusOnly && next < PLUS_LV) continue;
    add(s, mag);
  }
  if (!lines.length) return null;
  const m = MODS[id], sp = lines.find(l => l.special);
  return {
    id: `${track}:${id}`, kind: track, ref: id, mod: id, title: modName(id), rarity, trackLevel: next, lines, special: sp ? `${statLabel(sp.label)} +1` : undefined,
    unlock: track === 'ability' && next === PLUS_LV ? `${modActive(id).name}+ — ${modActive(id).plus}` : undefined,
    changes: lines.map(l => ({ key: l.key, to: l.to })),
    text: t('card.trackText', { name: track === 'auto' ? t('card.autoAttack') : `${modActive(id).name} (${SLOT_KEY[m.slot]?.key})`, n: next, lines: lines.map(fmt).join('; ') }),
  };
}

interface Cand { w: number; nm?: boolean; make: () => Card | null }
/** Card title key: the harbor-era crew/hull upgrades keep their `h:` stat ids. */
const upName = (id: string): string => t(id.startsWith('h:') ? `h.${id.slice(2)}.n` : `up.${id}.n`);
function candidates(ctx: Ctx): Cand[] {
  const out: Cand[] = [];
  const { lv } = ctx, a: Stats = deriveStats(lv, ctx.ms);
  const up = (id: string, max = MAX_LV, w = 0.22): void => {
    const n = lv[id] ?? 0;
    if (n >= max) return;
    const b = deriveStats({ ...lv, [id]: n + 1 }, ctx.ms), ttl = `${upName(id)} (${n + 1}/${max})`, v = shipView(id, a, b);
    out.push({ w, make: () => ({ id, kind: 'ship', ref: id, title: ttl, lines: v.lines, notes: v.notes, text: [...v.lines.map(fmt), ...v.notes].join('; ') }) });
  };
  if (!ctx.loot) { // boss loot is all module upgrades; ship upgrades come from level-ups and the shop
    for (const id of ['cannon', 'rate', 'chain', 'hull', 'sails', 'hooks']) up(id);
    up('swivel', 4);
    up('h:sheath', 5, 0.15);
  }
  out.push(...crewCandidates(pickRarity, !!ctx.rareUp));
  out.push(...evoCandidates(ctx.ms)); // v10: Evolution cards for modules with both tracks at Lv 8
  const nNew = MOD_IDS.filter(id => !ctx.ms[id] && ctx.free[MODS[id].slot] > 0 && modInPool(id)).length; // new mounts share one weight so they stay occasional
  for (const id of MOD_IDS) {
    const m = MODS[id], ms = ctx.ms[id];
    if (ms) {
      for (const track of (SLOT_KEY[m.slot] ? ['auto', 'ability'] : ['auto']) as Track[]) out.push({ w: 1, make: () => trackCard(id, track, ms, !!ctx.rareUp) }); // deck modules: no active, no ability track
    } else if (ctx.free[m.slot] > 0 && modInPool(id)) {
      out.push({ w: 0.8 / nNew, nm: true, make: () => ({ id: 'mod:' + id, kind: 'newmod', ref: id, mod: id, title: t('card.newModule', { name: modName(id) }), lines: [],
        text: SLOT_KEY[m.slot] ? t('card.mount', { info: modInfo(id), slot: slotName(m.slot), k: SLOT_KEY[m.slot]!.key, an: modActive(id).name, cd: m.active.cd, at: modActive(id).text }) : t('card.mountDeck', { info: modInfo(id), slot: slotName(m.slot) }) }) });
    }
  }
  return out;
}

/** Rolls n cards. `distinct` draws without replacement (a real level-up); otherwise every card is an independent draw (distribution tests). */
export function rollCards(ctx: Ctx, n: number, distinct = true, skip?: Set<string>): Card[] {
  const pool = candidates(ctx), out: Card[] = [];
  while (out.length < n && pool.length) {
    let r = rand() * pool.reduce((s, c) => s + c.w, 0), i = 0;
    for (; i < pool.length - 1; i++) { if ((r -= pool[i].w) < 0) break; }
    const p = pool[i], c = p.make();
    if (distinct || !c) pool.splice(i, 1);
    if (c && skip?.has(c.id)) continue;
    if (c) {
      out.push(c);
      if (ctx.loot && p.nm) for (let j = pool.length - 1; j >= 0; j--) if (pool[j].nm) pool.splice(j, 1); // loot: at most one new module
    }
  }
  return out;
}

/** Applies a rolled track card to its module's record: stores the exact rolled values and raises the track level. */
export function applyTrackCard(ms: ModStats, c: Card): void {
  const t = c.kind === 'auto' ? ms.auto : ms.ability;
  for (const ch of c.changes ?? []) t[ch.key] = ch.to;
  if (c.kind === 'auto') ms.autoLv++; else ms.abilityLv++;
}
