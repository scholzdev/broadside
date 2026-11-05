import * as THREE from 'three';
import { G, scene, addModule, refreshStats, addGold } from './game';
import { L } from './loadout';
import { MODS, ModuleId, Owned, MAX_MOD_LV, SLOT_ORDER, SLOT_KEY } from './modules';
import type { ArcId } from './content';
import { Enemy, onEnemyDamaged } from './enemies';
import type { Card } from './cards';
import { StatMap } from './modstats';
import { t } from './i18n';
import { ICON, modIcon } from './icons';
import { popText, addTrauma } from './juice';
import { fx, explosion } from './particles';
import { play } from './audio';
import { EVO, resetEvoTimers } from './evodefs';
import { evoName, evoText } from './evoname';
import { baseDmg, stepFxQueue, clearFx, ring } from './evofx';
import { stepSyn, resetSyn, synFired, activeSynergies, SYNERGIES, synName, synText, modSynergyText } from './synergies';
import { initEvoUi, toast } from './evoui';

// ---- v10 evolutions: a module with BOTH tracks at Lv 8 (deck modules: the auto track, they have no active) is offered an Evolution card; picking it sets `auto.evo = 1` on its stat record (reset with the run),
// applies the one-off stat changes of its EvoDef and switches on its fire / cast / step behaviours. ----
export const isEvolved = (id: ModuleId): boolean => !!G.modStats[id]?.auto.evo;
export const canEvolve = (ms: StatMap, id: ModuleId): boolean => {
  const s = ms[id];
  return !!s && !s.auto.evo && s.autoLv >= MAX_MOD_LV && (s.abilityLv >= MAX_MOD_LV || !SLOT_KEY[MODS[id].slot]);
};

/** Level-up / loot candidates: one Evolution card per ready module, heavily weighted so it shows up on the very next pick. */
export function evoCandidates(ms: StatMap): { w: number; make: () => Card | null }[] {
  const out: { w: number; make: () => Card | null }[] = [];
  for (const id of Object.keys(ms) as ModuleId[]) {
    if (!canEvolve(ms, id)) continue;
    out.push({ w: 400, make: () => ({ id: 'evo:' + id, kind: 'evo', ref: id, mod: id, title: evoName(id), text: evoText(id), lines: [] }) });
  }
  return out;
}

/** Transforms a module (card pick and debug). False if it is not owned or already evolved. */
export function evolve(id: ModuleId): boolean {
  const ms = G.modStats[id], def = EVO[id];
  if (!ms || !def || ms.auto.evo) return false;
  ms.auto.evo = 1;
  def.apply?.(ms);
  refreshStats();
  const p = G.player;
  toast(t('evo.toast'), `<b>${evoName(id)}</b>`, def.color);
  ring(p.x, p.z, def.color, 2, 14, 1);
  explosion(p.x, 1.5, p.z, 3);
  addTrauma(0.4); play('levelup'); play('horn');
  popText(p.x, 5, p.z, evoName(id), 'gold');
  return true;
}

// ---- hooks called from weapons / autos / abilities / the main step ----
const counts = new Map<ModuleId, number>();
export function evoFired(m: Owned, tg?: Enemy | null, arc?: ArcId): void {
  const ms = G.modStats[m.id];
  if (!ms) return;
  const n = (counts.get(m.id) ?? 0) + 1;
  counts.set(m.id, n);
  if (ms.auto.evo) EVO[m.id].fire?.({ m, ms, id: m.id, t: tg ?? undefined, arc, n, dmg: baseDmg(m.id) });
  synFired(m.id, tg ?? undefined);
}
export function evoCast(m: Owned): void {
  const ms = G.modStats[m.id];
  if (ms?.auto.evo) EVO[m.id].cast?.({ m, ms, id: m.id, n: counts.get(m.id) ?? 0, dmg: baseDmg(m.id) });
}

let hooked = false;
/** Called every tick while playing. */
export function stepEvo(dt: number): void {
  if (!hooked) {
    hooked = true;
    initEvoUi();
    onEnemyDamaged((e, dealt) => { // Midas Magnet: kills near the ship pay +1 gold
      if (dealt < e.hp - 1e-6 || !isEvolved('magnet') || Math.hypot(e.x - G.player.x, e.z - G.player.z) > 26) return;
      addGold(1); popText(e.x, 3, e.z, '+1', 'gold');
    });
  }
  stepFxQueue(dt);
  stepSyn(dt);
  for (const m of G.modules) {
    const ms = G.modStats[m.id];
    if (ms?.auto.evo) EVO[m.id].step?.(dt, { m, ms, id: m.id, n: counts.get(m.id) ?? 0, dmg: baseDmg(m.id) });
  }
  halos(dt);
}
export function resetEvo(): void {
  counts.clear(); clearFx(); resetEvoTimers(); resetSyn();
  for (const s of sprites.values()) scene.remove(s);
  sprites.clear();
}

// ---- 3D accent: a pulsing additive halo on the evolved module's mount (the attachment meshes themselves belong to dressing/) ----
const sprites = new Map<ModuleId, THREE.Sprite>();
let tex: THREE.CanvasTexture | null = null;
function haloTex(): THREE.CanvasTexture {
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d') as CanvasRenderingContext2D, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (tex = new THREE.CanvasTexture(c));
}
/** Approximate world position of a mount (bow / stern / flanks / deck), matching the weapons' own firing offsets. */
function mountPos(m: Owned): [number, number, number] {
  const p = G.player, f = Math.sin(p.heading), r = Math.cos(p.heading), g = L.geo, k = m.idx % 2 ? -1 : 1, step = Math.ceil(m.idx / 2);
  let off = 0, lat = 0, y = 2;
  if (m.slot === 'bow') { off = g.chaserAt; lat = k * step * 1.1; y = 1.9; }
  else if (m.slot === 'stern') { off = -g.kegBack; lat = k * step * 1.1; y = 1.9; }
  else if (m.slot === 'side') { lat = k * g.flank; off = (m.idx >> 1) * 1.6 - 0.4; y = 1.7; }
  else { off = m.idx * 1.4 - 0.6; y = 3.2; }
  return [p.x + f * off + r * lat, y, p.z + r * off - f * lat];
}
function halos(dt: number): void {
  const live = new Set<ModuleId>();
  for (const m of G.modules) {
    if (!isEvolved(m.id)) continue;
    live.add(m.id);
    let s = sprites.get(m.id);
    if (!s) {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: EVO[m.id].color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 }));
      scene.add(s); sprites.set(m.id, s);
    }
    const [x, y, z] = mountPos(m), pulse = 0.5 + 0.5 * Math.sin(G.time * 4 + m.idx);
    s.position.set(x, y, z);
    s.scale.setScalar(2.2 + pulse * 0.9);
    (s.material as THREE.SpriteMaterial).opacity = 0.55 + pulse * 0.35;
    if (Math.random() < dt * 5) fx(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), EVO[m.id].color, 0.3, 0.05, 0.7, 0.9, false, { vx: 0, vy: 2.4, vz: 0 }, 'glow');
  }
  for (const [id, s] of sprites) if (!live.has(id)) { scene.remove(s); sprites.delete(id); }
}

// ---- ability bar / inventory strip ----
export const evoBadge = (id: ModuleId): string => (isEvolved(id) ? `<i class="evb">${ICON.star}</i>` : '');
export const evoClass = (id: ModuleId): string => (isEvolved(id) ? ' evo' : '');
/** Changes whenever an evolution or synergy appears, so the inventory strip / ability bar rebuild. */
export const evoSig = (): string => G.modules.map(m => (isEvolved(m.id) ? m.id : '')).join('') + '|' + activeSynergies().map(s => s.id).join();
export function evoEntries(): { key: string; icon: string; name: string; kind: string; body: string; lv: number }[] {
  const out: { key: string; icon: string; name: string; kind: string; body: string; lv: number }[] = [];
  for (const m of [...G.modules].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.idx - b.idx)) {
    if (!isEvolved(m.id)) continue;
    const syn = modSynergyText(m.id);
    out.push({ key: 'evo:' + m.id, icon: modIcon(m.id), name: evoName(m.id), kind: t('evo.label'), lv: MAX_MOD_LV, body: `${evoText(m.id)}${syn ? `<div class="synt">${syn}</div>` : ''}` });
  }
  return out;
}

// ---- debug: __game.debug.evolve(id) / maxTracks(id), __game.evo ----
function ensure(id: ModuleId): boolean {
  if (!MODS[id]) return false;
  if (!G.modStats[id]) {
    const slots = L.def.slots as Record<string, number>;
    if (!addModule(id)) { for (const k of Object.keys(slots)) slots[k] += 3; if (!addModule(id)) return false; }
  }
  return true;
}
export function maxTracks(id: ModuleId): boolean {
  if (!ensure(id)) return false;
  const ms = G.modStats[id]!;
  ms.autoLv = ms.abilityLv = MAX_MOD_LV;
  refreshStats();
  return true;
}
export function installEvoDebug(api: Record<string, unknown> & { debug: Record<string, unknown> }): void {
  Object.assign(api.debug, {
    maxTracks,
    evolve: (id: ModuleId) => maxTracks(id) && evolve(id),
  });
  Object.defineProperty(api, 'evo', {
    enumerable: true,
    get: () => ({ evolved: G.modules.filter(m => isEvolved(m.id)).map(m => m.id), synergies: activeSynergies().map(s => s.id), all: SYNERGIES.map(s => `${s.id}: ${synName(s)} - ${synText(s)}`) }),
  });
}
