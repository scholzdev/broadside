import { G, healPlayer } from './game';
import { L } from './loadout';
import type { ModuleId } from './modules';
import type { CrewId } from './relics';
import type { CaptainId } from './roster';
import { crewState } from './crewdefs';
import { modName, crewName, capName } from './lname';
import { t } from './i18n';
import { ICON } from './icons';
import { Enemy } from './enemies';
import { fireVolley, fireBall } from './weapons';
import { launchRocket } from './weapons2';
import { spawnShark } from './sharks';
import { spawnLongboat } from './summons';
import { activeSyn } from './evomul';
import { after, baseDmg, nearest, inRange, skyStrike, burnPatch, chainLightning, ring } from './evofx';
import { fx, embers } from './particles';
import type { Card } from './cards';

// ---- v10 synergies: passive bonuses between module pairs (or module + crew / captain), active while both are owned ----
type Part = { mod: ModuleId } | { crew: CrewId } | { cap: CaptainId };
export interface Syn { id: string; a: Part; b: Part; color: number }
export const SYNERGIES: Syn[] = [
  { id: 'napalm', a: { mod: 'siphon' }, b: { mod: 'kegs' }, color: 0xff7a2a },
  { id: 'rod', a: { mod: 'witch' }, b: { mod: 'harpoon' }, color: 0xb58cff },
  { id: 'barrel', a: { mod: 'mortar' }, b: { mod: 'net' }, color: 0x7fc8ff },
  { id: 'gundeck', a: { mod: 'broadside' }, b: { crew: 'gunner' }, color: 0xffd36a },
  { id: 'boardact', a: { mod: 'boarding' }, b: { crew: 'boarder' }, color: 0x9fd18b },
  { id: 'spotter', a: { mod: 'rockets' }, b: { crew: 'look' }, color: 0xff7a5a },
  { id: 'fortified', a: { mod: 'ward' }, b: { mod: 'pump' }, color: 0x7fe8d8 },
  { id: 'juggernaut', a: { mod: 'ram' }, b: { cap: 'bess' }, color: 0xb9c0c8 },
  { id: 'conduct', a: { mod: 'tesla' }, b: { mod: 'net' }, color: 0x6fd8ff },
  { id: 'blood', a: { mod: 'sharkcage' }, b: { mod: 'harpoon' }, color: 0x4aa0c0 },
  { id: 'marks', a: { mod: 'spyglass' }, b: { mod: 'crowsnest' }, color: 0xe8d890 },
];

const owns = (p: Part): boolean => 'mod' in p ? G.modules.some(m => m.id === p.mod) : 'crew' in p ? (crewState[p.crew]?.count ?? 0) > 0 : L.captain === p.cap;
const partName = (p: Part): string => 'mod' in p ? modName(p.mod) : 'crew' in p ? crewName(p.crew) : capName(p.cap);
const isPart = (p: Part, key: string): boolean => ('mod' in p && p.mod === key) || ('crew' in p && p.crew === key) || ('cap' in p && p.cap === key);
export const synActive = (s: Syn): boolean => owns(s.a) && owns(s.b);
export const synName = (s: Syn): string => t(`syn.${s.id}.n`);
export const synText = (s: Syn): string => t(`syn.${s.id}.t`);
export const activeSynergies = (): Syn[] => SYNERGIES.filter(synActive);

// ---- announcements ----
const announced = new Set<string>();
let toastFn: ((title: string, text: string, color: number) => void) | null = null;
export const setToast = (f: typeof toastFn): void => { toastFn = f; };
export function resetSyn(): void { announced.clear(); activeSyn.clear(); lastBlood = 0; acc = 0; }

let acc = 0, lastBlood = 0;
export function stepSyn(dt: number): void {
  activeSyn.clear();
  for (const s of SYNERGIES) {
    if (!synActive(s)) continue;
    activeSyn.add(s.id);
    if (!announced.has(s.id)) {
      announced.add(s.id);
      toastFn?.(t('syn.title'), `<b>${synName(s)}</b> &mdash; ${synText(s)}`, s.color);
      ring(G.player.x, G.player.z, s.color, 1.5, 9, 0.8);
    }
  }
  if (!activeSyn.size || (acc -= dt) > 0) return;
  acc = 0.3;
  let n = 0;
  for (const e of G.enemies) { // ambient visuals: the synergy is visible on the enemies it affects
    if (e.dead || n > 10) continue;
    if (e.burnT > 0 && activeSyn.has('napalm')) { fx(e.x + (Math.random() - 0.5) * e.r, 1.6, e.z, 0xff5a1a, 0.5, 1.3, 0.5, 0.8, false, { vx: 0, vy: 2.5, vz: 0 }, 'glow'); n++; }
    if (e.slowT > 0 && activeSyn.has('barrel')) { fx(e.x, 2.4, e.z, 0x9fe0ff, 0.4, 1.0, 0.45, 0.9, false, { vx: 0, vy: 1, vz: 0 }, 'glow'); n++; }
  }
  if (activeSyn.has('juggernaut') && G.player.speed > 0.5 * G.st.maxSpeed) {
    const p = G.player;
    embers(p.x + Math.sin(p.heading) * 3, 0.8, p.z + Math.cos(p.heading) * 3, 4, 1.2);
  }
}

/** Fortified: every enemy projectile the Ward deletes (auto or Mirror Ward) mends 3% of max HP. */
export function wardMend(n: number): void {
  if (n <= 0 || !activeSyn.has('fortified')) return;
  healPlayer(G.maxHp * 0.03 * n);
  ring(G.player.x, G.player.z, 0x7fe8d8, 1, 6, 0.5);
}

/** A module's auto fired (t = its target when it has one). */
export function synFired(id: ModuleId, t0: Enemy | undefined): void {
  if (!activeSyn.size) return;
  const p = G.player;
  if (id === 'witch' && activeSyn.has('rod')) {
    let best: Enemy | null = null;
    for (const e of inRange(p.x, p.z, 26)) if (e.slowT > 0 && (!best || e.hp > best.hp)) best = e;
    if (best) skyStrike(best, baseDmg('witch') * 1.5, 0.3);
  } else if (id === 'broadside' && activeSyn.has('gundeck')) {
    const a = G.modStats.broadside?.auto;
    if (a) after(0.25, () => { for (const side of [1, -1]) fireVolley({ x: p.x, z: p.z, heading: p.heading, side, n: 2, aim: p.heading + side * Math.PI / 2, len: L.geo.volley, speed: a.speed, dmg: baseDmg('broadside') * 0.6, range: a.range * G.st.rangeMul, friendly: true }); });
  } else if (id === 'boarding' && activeSyn.has('boardact')) {
    const a = G.modStats.boarding?.auto;
    if (a) spawnLongboat(p.x - Math.sin(p.heading) * 2, p.z - Math.cos(p.heading) * 2, p.heading + Math.PI, a.dmg * G.st.autoDmgMul * 1.3, a.life, a.speed);
  } else if (id === 'rockets' && activeSyn.has('spotter')) {
    if (t0) { t0.hexT = Math.max(t0.hexT, 3); fx(t0.x, 3.2, t0.z, 0xff5a5a, 0.6, 1.4, 0.5, 0.9, false, undefined, 'glow'); }
    launchRocket(p.x, p.z, p.heading + (Math.random() - 0.5) * 1.5, G.modStats.rockets?.auto.speed ?? 15, baseDmg('rockets'), 3, 4);
  } else if (id === 'tesla' && activeSyn.has('conduct')) {
    const list = inRange(p.x, p.z, 15).filter(e => e.slowT > 0).slice(0, 3);
    for (const e of list) chainLightning(p.x, p.z, e, 1, 0, baseDmg('tesla') * 0.9, 0.6, 3.4);
  } else if (id === 'harpoon' && activeSyn.has('blood') && t0 && G.time - lastBlood > 4) {
    lastBlood = G.time;
    spawnShark(t0.x, t0.z, 8, baseDmg('sharkcage') * 1.2, 0.7, 9);
  } else if (id === 'spyglass' && activeSyn.has('marks') && t0) {
    t0.hexT = Math.max(t0.hexT, 2.5);
    fx(t0.x, 3.2, t0.z, 0xffe080, 0.6, 1.4, 0.5, 0.9, false, undefined, 'glow');
  } else if (id === 'kegs' && activeSyn.has('napalm')) {
    burnPatch(p.x - Math.sin(p.heading) * 3, p.z - Math.cos(p.heading) * 3, 2.5, 4);
  }
  void fireBall; void nearest;
}

// ---- UI helpers ----
const partsOf = (c: Card): { key: string } | null => c.mod ? { key: c.mod } : c.kind === 'crew' ? { key: c.ref } : null;
/** "Synergy with X" lines for a card (module, evolution or crew card); owned partners are lit. */
export function cardSynergyHtml(c: Card): string {
  const k = partsOf(c);
  if (!k) return '';
  const out: string[] = [];
  for (const s of SYNERGIES) {
    const other = isPart(s.a, k.key) ? s.b : isPart(s.b, k.key) ? s.a : null;
    if (!other) continue;
    const on = owns(other);
    out.push(`<div class="syn${on ? ' on' : ''}" title="${synText(s)}"><i>${ICON.star}</i>${t('syn.with', { x: partName(other) })}: <b>${synName(s)}</b></div>`);
  }
  return out.length ? `<div class="synl">${out.slice(0, 2).join('')}</div>` : '';
}
/** Inventory strip tooltip text for a module that has synergies. */
export function modSynergyText(id: ModuleId): string {
  return SYNERGIES.filter(s => isPart(s.a, id) || isPart(s.b, id)).map(s => `${t('syn.with', { x: partName(isPart(s.a, id) ? s.b : s.a) })}: ${synName(s)}${synActive(s) ? ' ✓' : ''}`).join('<br>');
}
/** Inventory strip entries: one per active synergy. */
export function synEntries(): { key: string; icon: string; name: string; kind: string; body: string; lv: number }[] {
  return activeSynergies().map(s => ({
    key: 'syn:' + s.id, icon: `<span class="synic" style="--c:#${s.color.toString(16).padStart(6, '0')}">${ICON.star}</span>`, name: synName(s), kind: t('syn.title'), lv: 0,
    body: `${synText(s)}<div>${partName(s.a)} + ${partName(s.b)}</div>`,
  }));
}
