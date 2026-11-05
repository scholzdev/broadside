import { G } from './game';
import { Owned, SLOT_ORDER, Slot } from './modules';
import { abil, modLevel } from './modstats';
import { CAST, stepActives, resetActives } from './actives';
import { stepSpells, resetSpells } from './spells';
import { stepSpellAuto, resetSpellAuto } from './autocast';
import { play } from './audio';
import { bump } from './meta';
import { evoCast, resetEvo } from './evolutions';

// ---- module actives belong to mount slots: Q fires the bow, E the stern, R the sides (gamepad LB / RB / Y). Deck modules have no active.
// Nothing casts by itself except the captain spell (autocast.ts). ----
export type CastSlot = 'bow' | 'stern' | 'side';
/** Key binding per castable slot, in ability-bar order: keyboard code, key label, gamepad glyph. */
export const SLOT_KEYS: { slot: CastSlot; code: string; key: string; pad: string }[] = [
  { slot: 'bow', code: 'KeyQ', key: 'Q', pad: 'LB' },
  { slot: 'stern', code: 'KeyE', key: 'E', pad: 'RB' },
  { slot: 'side', code: 'KeyR', key: 'R', pad: 'Y' },
];
export const hasActive = (slot: Slot): boolean => slot !== 'deck';
/** The key label that fires a slot's active ('' for deck). */
export const slotKey = (slot: Slot): string => SLOT_KEYS.find(k => k.slot === slot)?.key ?? '';

export const activeCdMax = (m: Owned): number => (G.modStats[m.id]?.ability.cd ?? 1) * G.st.activeCdMul;
const find = (slot: Slot, idx: number): Owned | undefined => G.modules.find(m => m.slot === slot && m.idx === idx);

/** Fires an active if it has a charge and the cast does something. `force` ignores the cooldown (debug). */
export function tryCast(m: Owned, force = false): boolean {
  if (G.state !== 'playing' || !hasActive(m.slot) || (!force && m.charges <= 0)) return false;
  const ms = G.modStats[m.id];
  if (!ms || !CAST[m.id]?.(m, ms)) return false;
  if (m.charges >= m.maxCharges) m.cd = activeCdMax(m);
  if (m.charges > 0) m.charges--;
  evoCast(m);
  return true;
}

/** Set by abar.ts: shakes a slot group when its key fires nothing. */
export const slotDeny = { f: (_slot: CastSlot): void => {} };
/** Casts every ready module in the slot; refused (sound + shake) when none fired. Returns the number cast. */
export function castSlot(slot: CastSlot): number {
  let n = 0;
  for (const m of G.modules) if (m.slot === slot && m.charges > 0 && tryCast(m)) { n++; bump('autoCasts'); }
  if (!n) { play('hit'); slotDeny.f(slot); }
  return n;
}

/** Handles a key tap while playing; true if the key was a slot key (the gamepad pushes the same codes). */
export function abilityTap(code: string): boolean {
  const k = SLOT_KEYS.find(s => s.code === code);
  if (!k) return false;
  castSlot(k.slot);
  return true;
}

/** Debug: a module id or a slot name ('bow', 'side', 'side2', 'deck', 'stern'); deck modules have nothing to cast. */
export function castBySlotKey(key: string): boolean {
  const mm = /^(bow|side|deck|stern)(\d?)$/.exec(key.toLowerCase());
  const m = mm ? find(mm[1] as Slot, mm[2] ? Number(mm[2]) - 1 : 0) : G.modules.find(o => o.id === key);
  return m ? tryCast(m, true) : false;
}

export const sortedMods = (): Owned[] => [...G.modules].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.idx - b.idx);

export const modulesView = (): { id: string; slot: string; level: number; cd: number; cdMax: number; charges: number; key: string }[] =>
  sortedMods().map(m => ({ id: m.id, slot: m.slot, level: modLevel(G.modStats[m.id]), cd: m.cd, cdMax: activeCdMax(m), charges: m.charges, key: slotKey(m.slot) }));

export function resetAbilities(): void { resetActives(); resetSpells(); resetSpellAuto(); resetEvo(); }

export function stepAbilities(dt: number): void {
  for (const m of G.modules) {
    if (!hasActive(m.slot)) continue;
    const ms = G.modStats[m.id];
    const want = ms ? Math.min(3, abil(ms, 'charges')) : 1;
    if (want > m.maxCharges) { m.maxCharges = want; m.charges++; }
    if (m.charges >= m.maxCharges) continue;
    if ((m.cd -= dt) <= 0) {
      if (m.charges++ === 0) play('ready');
      m.cd = m.charges < m.maxCharges ? activeCdMax(m) : 0;
    }
  }
  stepActives(dt);
  stepSpells(dt);
  stepSpellAuto(dt);
}
