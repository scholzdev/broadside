import { G, healPlayer, refreshStats } from './game';
import { L } from './loadout';
import { t } from './i18n';
import type { CrewId } from './relics';
import { crewState, CREW_ORDER, FX, lvK, musketDmg, isAdv, crewTotal, crewCap, MAX_CREW_LV, resetCrew, startCrew, DECK_T } from './crewdefs';
import { spawn } from './weapons';
import { intercept } from './lead';
import { nearestEnemy } from './summons';
import { damageEnemy, Enemy, targetable } from './enemies';
import { cleansePlayer } from './pstatus';
import { hitNumber, popText } from './juice';

// ---- v9 active crew runtime. State = crewdefs.crewState (G.crew); stat effects live in crewdefs.crewFx -> content.deriveStats.
// This file runs the active behaviours (musket shots, repairs, heals, leaps, grog, marks) and publishes events for the visual pass.

export type CrewKind = 'fire' | 'repair' | 'heal' | 'leap' | 'grog' | 'spot';
/** `index` = which figure of that type (0-based, deck order); `target` = world point shot at / leapt to / marked. */
export interface CrewEvent { type: CrewId; index: number; kind: CrewKind; target?: { x: number; z: number }; t: number }
type Cb = (e: CrewEvent) => void;
const subs: [CrewKind | '*', Cb][] = [], ring: CrewEvent[] = [];
/** `crewEvents.on('fire', cb)` (or '*') returns an unsubscribe function; `recent` holds the last 64 events (oldest first). */
export const crewEvents = {
  on(kind: CrewKind | '*', cb: Cb): () => void { const s: [CrewKind | '*', Cb] = [kind, cb]; subs.push(s); return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); }; },
  get recent(): readonly CrewEvent[] { return ring; },
};
function emit(type: CrewId, index: number, kind: CrewKind, target?: { x: number; z: number }): void {
  const e: CrewEvent = { type, index, kind, target, t: G.time };
  ring.push(e); if (ring.length > 64) ring.shift();
  for (const [k, cb] of subs) if (k === '*' || k === kind) cb(e);
}

// ---- where a figure stands (world space) ----
export interface FigPos { x: number; y: number; z: number }
export type FigureLocator = (type: CrewId, index: number, out: FigPos) => boolean;
let locator: FigureLocator | null = null;
/** The visual pass registers a locator that reads the real dressing position (return false to fall back to the rail approximation). */
export const setFigureLocator = (f: FigureLocator | null): void => { locator = f; };
/** World position of figure `index` of `type`. Approximation: the deck slots of the dressing (alternating rails, fore to aft), rotated by the heading. */
export function figurePos(type: CrewId, index: number, out: FigPos = { x: 0, y: 1.4, z: 0 }): FigPos {
  if (locator?.(type, index, out)) return out;
  let g = index;
  for (const id of CREW_ORDER) { if (id === type) break; g += crewState[id]?.count ?? 0; }
  const side = g % 2 ? -1 : 1, tt = DECK_T[g % DECK_T.length], p = G.player;
  const along = (tt - 0.5) * L.def.length, across = side * L.def.beam * 0.4;
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  out.x = p.x + fx * along + fz * across; out.z = p.z + fz * along - fx * across; out.y = 1.4;
  return out;
}

// ---- state ----
const timers: Partial<Record<CrewId, number[]>> = {};
let sinceHit = 99, grogT = 0, feastT = 0, markT = 0, repT = 0, spotT = 0, crewShots = 0, marked: Enemy | null = null;
export function resetCrewRuntime(startId: CrewId | null): void {
  resetCrew(startCrew(startId));
  for (const k of Object.keys(timers)) delete timers[k as CrewId];
  sinceHit = 99; grogT = 0; feastT = FX.cook.every; markT = 0; repT = 0; spotT = 4; crewShots = 0; marked = null; ring.length = 0;
}
/** Cooldown slots of a type, one per figure, staggered so the figures do not all act in the same frame. */
function slots(type: CrewId, n: number, period: number): number[] {
  const a = timers[type] ?? (timers[type] = []);
  while (a.length < n) a.push(period * (a.length / Math.max(1, n)) + 0.3);
  a.length = n;
  return a;
}
export const noteHit = (): void => { sinceHit = 0; };

/** Adds figures (clamped to the ship's cap); returns how many joined. A new type starts at Lv 1. */
export function addCrew(type: CrewId, n: number): number {
  const room = Math.max(0, crewCap(L.ship) - crewTotal()), add = Math.min(n, room);
  if (add <= 0) return 0;
  const e = crewState[type] ?? (crewState[type] = { count: 0, level: 1 });
  e.count += add;
  restat();
  return add;
}
export function setCrewLevel(type: CrewId, lv: number): void {
  const e = crewState[type];
  if (!e) return;
  e.level = Math.max(1, Math.min(MAX_CREW_LV, Math.round(lv)));
  restat();
}
/** Recomputes ship stats after a crew change; extra max HP (Cook) also fills the new hull. */
function restat(): void {
  const before = G.maxHp;
  refreshStats();
  if (G.maxHp > before) G.hp += G.maxHp - before;
  else G.hp = Math.min(G.hp, G.maxHp);
}

// ---- hooks used by other systems ----
/** Damage multiplier on an enemy: Feast grog and the Eagle Eye mark. */
export function crewDmgMul(e: Enemy): number { return (grogT > 0 ? 1 + FX.cook.dmg : 1) * (e === marked ? FX.look.mark : 1); }
/** Master Gunners: every 8th auto shot deals double. */
export function crewShotMul(): number { return isAdv(crewState.gunner) && ++crewShots % FX.gunner.every === 0 ? 2 : 1; }
/** An enemy rammed / touched the ship: every boarder leaps across and hits it. */
export function boardRam(e: Enemy): void {
  const b = crewState.boarder;
  if (!b || b.count <= 0 || e.dead) return;
  for (let i = 0; i < b.count; i++) emit('boarder', i, 'leap', { x: e.x, z: e.z });
  damageEnemy(e, b.count * FX.boarder.dmg * lvK(b.level), true, 'crew');
}

// ---- per-step behaviours ----
const pos: FigPos = { x: 0, y: 0, z: 0 };
export function stepCrew(dt: number): void {
  sinceHit += dt;
  if (grogT > 0) grogT -= dt;
  const st = crewState, p = G.player;
  const m = st.musket;
  if (m && m.count > 0) {
    const adv = isAdv(m), range = adv ? FX.musket.advRange : FX.musket.range, dmg = musketDmg(m.level) * (adv ? FX.musket.advMul : 1);
    const a = slots('musket', m.count, FX.musket.cd);
    for (let i = 0; i < m.count; i++) {
      if ((a[i] -= dt) > 0) continue;
      figurePos('musket', i, pos);
      const tg = nearestEnemy(pos.x, pos.z, range);
      if (!tg) { a[i] = 0.25; continue; }
      a[i] = FX.musket.cd;
      const t = intercept(tg.x - pos.x, tg.z - pos.z, Math.sin(tg.heading) * tg.speed, Math.cos(tg.heading) * tg.speed, FX.musket.speed);
      const ang = Math.atan2(tg.x + Math.sin(tg.heading) * tg.speed * t - pos.x, tg.z + Math.cos(tg.heading) * tg.speed * t - pos.z), s = spawn('musket', pos.x, pos.z, dmg, (range + 4) / FX.musket.speed);
      s.vx = Math.sin(ang) * FX.musket.speed; s.vz = Math.cos(ang) * FX.musket.speed; s.pierce = adv ? FX.musket.advPierce : 0; s.r = 0.4; s.src = 'crew'; s.y = s.py = pos.y;
      emit('musket', i, 'fire', { x: tg.x, z: tg.z }); // the deck figure draws the flash and smoke at its muzzle (dressing/crewanim.ts)
    }
  }
  const b = st.boarder;
  if (b && isAdv(b)) { // Raiders
    const a = slots('boarder', b.count, FX.boarder.leapEvery);
    for (let i = 0; i < b.count; i++) {
      if ((a[i] -= dt) > 0) continue;
      const tg = nearestEnemy(p.x, p.z, FX.boarder.leapR);
      if (!tg) { a[i] = 0.3; continue; }
      a[i] = FX.boarder.leapEvery;
      emit('boarder', i, 'leap', { x: tg.x, z: tg.z });
      damageEnemy(tg, FX.boarder.dmg * lvK(b.level), true, 'crew');
    }
  }
  const c = st.carp;
  if (c && c.count > 0 && sinceHit >= FX.carp.idle && G.hp < G.maxHp && L.cap.regen > 0) {
    G.hp = Math.min(G.maxHp, G.hp + c.count * FX.carp.hps * lvK(c.level) * G.st.healMul * L.cap.regen * dt);
    if ((repT -= dt) <= 0) { repT = 0.9 / c.count; emit('carp', Math.floor(Math.random() * c.count), 'repair'); }
  }
  const s = st.surgeon;
  if (s && s.count > 0) {
    const a = slots('surgeon', s.count, FX.surgeon.every);
    for (let i = 0; i < s.count; i++) {
      if ((a[i] -= dt) > 0) continue;
      a[i] = FX.surgeon.every;
      const before = G.hp;
      healPlayer(G.maxHp * FX.surgeon.frac * lvK(s.level));
      if (isAdv(s)) cleansePlayer(); // Field Surgeons
      if (G.hp > before) hitNumber(G.player, p.x, 3, p.z, G.hp - before, 'heal');
      emit('surgeon', i, 'heal');
    }
  }
  const k = st.cook;
  if (k && isAdv(k) && (feastT -= dt) <= 0) { // Feast
    feastT = FX.cook.every; grogT = FX.cook.dur;
    popText(p.x, 4.5, p.z, t('pop.feast'), 'grog');
    emit('cook', Math.floor(Math.random() * k.count), 'grog');
  }
  const l = st.look;
  if (l && l.count > 0) {
    if (isAdv(l) && (markT -= dt) <= 0) { // Eagle Eye marks the nearest elite
      markT = 1;
      if (marked && !targetable(marked)) marked = null;
      let best: Enemy | null = null, bd = 45;
      for (const e of G.enemies) {
        if (!targetable(e) || e.bd || e.def.hp < 45 || e.type === 'battery') continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (best && best !== marked) emit('look', 0, 'spot', { x: best.x, z: best.z });
      marked = best;
    } else if (!isAdv(l)) marked = null;
    if ((spotT -= dt) <= 0) { spotT = 8; const e = nearestEnemy(p.x, p.z, 40); if (e) emit('look', Math.floor(Math.random() * l.count), 'spot', { x: e.x, z: e.z }); }
  } else marked = null;
}

/** The elite Eagle Eye has marked (read-only, for the spyglass glint). */
export const crewMarked = (): Enemy | null => marked;
export const crewView = (): unknown => ({ state: JSON.parse(JSON.stringify(crewState)) as unknown, total: crewTotal(), cap: crewCap(L.ship), sinceHit, grogT, marked: marked ? { type: marked.type, x: marked.x, z: marked.z } : null, events: ring.slice(-16) });
