import { G } from './game';
import { Owned, SLOT_ORDER, Slot, ModuleId } from './modules';
import { abil, modLevel } from './modstats';
import { CAST, stepActives, resetActives } from './actives';
import { AUTO_COND } from './autocast';
import { castSpell, stepSpells, resetSpells } from './spells';
import { play } from './audio';
import { bump } from './meta';
import { evoCast, resetEvo } from './evolutions';
import { S } from './settings';

// ---- module active cooldowns and charges; every module active auto-casts (Space is the captain spell, see spells.ts) ----
export const activeCdMax = (m: Owned): number => (G.modStats[m.id]?.ability.cd ?? 1) * G.st.activeCdMul;
const find = (slot: Slot, idx: number): Owned | undefined => G.modules.find(m => m.slot === slot && m.idx === idx);

/** Fires an active if it has a charge and the cast does something. `force` ignores the cooldown (debug). */
export function tryCast(m: Owned, force = false): boolean {
  if (G.state !== 'playing' || (!force && m.charges <= 0)) return false;
  const ms = G.modStats[m.id];
  if (!ms || !CAST[m.id](m, ms)) return false;
  if (m.charges >= m.maxCharges) m.cd = activeCdMax(m);
  if (m.charges > 0) m.charges--;
  evoCast(m);
  return true;
}

const retry = new Map<ModuleId, number>();
const AUTO_RETRY = 0.25;

/** Handles a key tap while playing; true if the key was an ability key (Space = captain spell). */
export function abilityTap(code: string): boolean {
  if (code === 'Space' || code === 'MouseLeft') { castSpell(); return true; }
  const i = MANUAL_KEYS.indexOf(code) >= 0 ? MANUAL_KEYS.indexOf(code) : MANUAL_ALT.indexOf(code);
  if (S.manual && i >= 0) { castManual(i); return true; }
  return false;
}

/** Manual mode: the first three modules in ability-bar order are bound to Q / E / R ('Ability0..2' are the gamepad's synthetic taps). */
export const MANUAL_KEYS = ['KeyQ', 'KeyE', 'KeyR'];
const MANUAL_ALT = ['Ability0', 'Ability1', 'Ability2'];
export const manualMods = (): Owned[] => (S.manual ? sortedMods().slice(0, 3) : []);
/** Set by abar.ts: flashes the bound cell when a manual cast is refused. */
export const manualDeny = { f: (_i: number): void => {} };
function castManual(i: number): void {
  const m = manualMods()[i];
  if (!m) return;
  if (m.charges <= 0 || !tryCast(m)) { play('hit'); manualDeny.f(i); } else bump('autoCasts');
}

/** Debug: a module id or a slot name ('bow', 'side', 'side2', 'deck', 'stern'). */
export function castBySlotKey(key: string): boolean {
  const mm = /^(bow|side|deck|stern)(\d?)$/.exec(key.toLowerCase());
  const m = mm ? find(mm[1] as Slot, mm[2] ? Number(mm[2]) - 1 : 0) : G.modules.find(o => o.id === key);
  return m ? tryCast(m, true) : false;
}

const sortedMods = (): Owned[] => [...G.modules].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.idx - b.idx);

export const modulesView = (): { id: string; slot: string; level: number; cd: number; cdMax: number; charges: number; auto: boolean }[] =>
  sortedMods().map(m => ({ id: m.id, slot: m.slot, level: modLevel(G.modStats[m.id]), cd: m.cd, cdMax: activeCdMax(m), charges: m.charges, auto: !manualMods().includes(m) }));

export function resetAbilities(): void { resetActives(); resetSpells(); retry.clear(); resetEvo(); }

/** Ready actives fire when their condition holds; a failed check or a CAST that returns false waits AUTO_RETRY s. */
function stepAutocast(dt: number): void {
  const manual = manualMods();
  for (const m of G.modules) {
    if (m.charges <= 0 || manual.includes(m)) continue;
    const t = (retry.get(m.id) ?? 0) - dt;
    if (t > 0) { retry.set(m.id, t); continue; }
    retry.set(m.id, AUTO_RETRY);
    if (AUTO_COND[m.id]() && tryCast(m)) bump('autoCasts');
  }
}

export function stepAbilities(dt: number): void {
  for (const m of G.modules) {
    const ms = G.modStats[m.id];
    const want = ms ? Math.min(3, abil(ms, 'charges')) : 1;
    if (want > m.maxCharges) { m.maxCharges = want; m.charges++; }
    if (m.charges >= m.maxCharges) continue;
    if ((m.cd -= dt) <= 0) {
      if (m.charges++ === 0) play('ready');
      m.cd = m.charges < m.maxCharges ? activeCdMax(m) : 0;
    }
  }
  stepAutocast(dt);
  stepActives(dt);
  stepSpells(dt);
}
