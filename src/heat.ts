import * as THREE from 'three';
import { G } from './game';
import { Enemy, spawnEnemy } from './enemies';
import { firePool } from './ehazards';
import { BOSSES, BossDef } from './content';
import type { BossId } from './seas';
import { HEAT, heatAt, ELITE_CHANCE, ELITE_HP, ELITE_TRAITS, EliteTrait } from './heatdefs';

// ---- Heat 1-3 enemy mechanics: elites (gold trim, +80% HP, one trait), burning wreckage; Heat 2 boss patterns ----
const GOLD = new THREE.Color(0xffc83a), STEEL = new THREE.Color(0x9fb4c8);
const ringGeo = new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2);
const ringMats: Record<EliteTrait, THREE.MeshBasicMaterial> = {
  fast: new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  armoured: new THREE.MeshBasicMaterial({ color: 0xc9dcf0, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  splitting: new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
};
const ELITE_TYPES = new Set(['gunboat', 'brig', 'ketch', 'minelayer', 'ghost']);

/** Makes `e` an elite (given trait, or a random one): gold trim ring and tint, +80% HP. */
export function makeElite(e: Enemy, trait: EliteTrait = ELITE_TRAITS[Math.floor(Math.random() * ELITE_TRAITS.length)]): void {
  e.elite = trait;
  e.hp = e.maxHp = e.maxHp * ELITE_HP;
  for (const r of e.mats) {
    r.m.color.lerp(trait === 'armoured' ? STEEL : GOLD, trait === 'armoured' ? 0.55 : 0.3);
    if (trait === 'armoured') { r.m.metalness = 0.85; r.m.roughness = 0.35; }
    r.e = trait === 'armoured' ? 0x1a2430 : 0x5a3a00; r.m.emissive.setHex(r.e);
  }
  const ring = new THREE.Mesh(ringGeo, ringMats[trait]);
  ring.scale.setScalar(e.r * 1.5 + 0.8); ring.position.y = 0.25; ring.name = 'elitering';
  e.model.root.add(ring);
  if (e.bar) { e.bar.style.boxShadow = '0 0 0 1px #ffc83a'; if (e.fill) e.fill.style.background = '#ffc83a'; }
}
/** Spawn hook (enemies.ts): at heat 1+ about 12% of ordinary ships come out as elites. */
export function maybeElite(e: Enemy): void {
  if (heatAt(1) && ELITE_TYPES.has(e.type) && Math.random() < ELITE_CHANCE) makeElite(e);
}
/** Kill hook (enemies.ts): splitting elites burst into two swarm cutters; heat 3 leaves burning wreckage. */
export function heatDeath(e: Enemy): void {
  if (e.bd || e.type === 'swarm' || e.type === 'battery') return;
  if (e.elite === 'splitting') for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28; spawnEnemy('swarm', e.x + Math.sin(a) * 1.5, e.z + Math.cos(a) * 1.5); }
  if (heatAt(3) && e.type !== 'raft' && e.type !== 'fireship' && e.type !== 'serpent') firePool(e.x, e.z, 0.55);
}

/** Heat 2 extra pattern per boss (merged over the base BossDef). Monsters and the fortress get stronger versions of their own moves. */
const EXTRA: Partial<Record<BossId, (bd: BossDef) => Partial<BossDef>>> = {
  cutter: () => ({ escort: { every: 12, n: 3 } }),
  manowar: () => ({ ringBelow: 1.01 }),
  firegalleon: () => ({ trail: true }),
  flagship: () => ({ mortar: { every: 9, n: 3 } }),
  corsair: () => ({ ringBelow: 1.01, ringEvery: 7 }),
  manowar_r: () => ({ skulls: 5 }),
  pirateking: () => ({ mortar: { every: 9, n: 3 } }),
  ghostgalleon: () => ({ skulls: 4 }),
  cutter_r: () => ({ ringBelow: 1.01 }),
  drownedadmiral: () => ({ ringBelow: 1.01, spd: 1.15 }),
  firegalleon_r: () => ({ mortar: { every: 9, n: 3 } }),
  magma: () => ({ escort: { every: 12, n: 3 } }),
  flagship_r: () => ({ skulls: 4 }),
  leviathan: bd => ({ monster: { ...bd.monster!, serpents: 8, spit: 4 } }),
  ashleviathan: bd => ({ monster: { ...bd.monster!, serpents: 12, spit: 2.4 } }),
  lighthouse: () => ({}), // fortress.ts doubles its ring rate at heat 2 (offset second ring)
};
/** The BossDef to spawn for `id` at the current heat (heat 2+: one extra pattern). */
export function heatBoss(id: BossId): BossDef {
  const bd = BOSSES[id];
  return heatAt(2) && EXTRA[id] ? { ...bd, ...EXTRA[id]!(bd) } : bd;
}
export const heatView = () => ({ level: HEAT.level, elites: G.enemies.filter(e => e.elite && !e.dead).map(e => ({ type: e.type, trait: e.elite, maxHp: e.maxHp })) });
