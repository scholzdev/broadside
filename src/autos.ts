import { G } from './game';
import { SLOTS, ArcId } from './content';
import { modArcHalf, inArc } from './arcs';
import { Owned, ModuleId } from './modules';
import { enemyGrid, damageEnemy, Enemy } from './enemies';
import { shotDmg, deleteEnemyProjectiles } from './weapons';
import { nearestEnemy, spawnLongboat } from './summons';
import { ignite } from './status';
import { autoShot } from './relicfx';
import { bolt } from './bolt';
import { fx, flame } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';
import { autoK } from './spelldata';
import { snipe, pumpTick } from './autos2';
import { isCustom3, stepAuto3 } from './autos3';
import { evoFired } from './evolutions';
import { wardMend } from './synergies';

// ---- timer-driven autos of the new modules (Sea Witch, Greek Fire Siphon, Boarding Party, Ward Charm) ----
const CUSTOM = new Set<ModuleId>(['witch', 'siphon', 'boarding', 'ward', 'crowsnest', 'pump']);
export const isCustomAuto = (id: ModuleId): boolean => CUSTOM.has(id) || isCustom3(id);

function chain(m: Owned): boolean {
  const p = G.player, a = G.modStats.witch?.auto;
  if (!a) return false;
  const first = nearestEnemy(p.x, p.z, a.range * G.st.rangeMul);
  if (!first) return false;
  const dmg = shotDmg(m), hit = new Set<Enemy>();
  let from = { x: p.x, y: 2.8, z: p.z }, cur: Enemy | null = first;
  for (let i = 0; i < a.jumps && cur; i++) {
    hit.add(cur);
    bolt(from.x, from.y, from.z, cur.x, 1.4, cur.z);
    damageEnemy(cur, dmg, true, 'auto');
    from = { x: cur.x, y: 1.4, z: cur.z };
    cur = nearestEnemy(cur.x, cur.z, a.hop, hit);
  }
  addTrauma(0.05); play('zap');
  return true;
}

function cone(m: Owned): boolean {
  const p = G.player, a = G.modStats.siphon?.auto;
  if (!a) return false;
  const range = a.range * G.st.rangeMul;
  const victims = new Set<Enemy>(), sides: [number, number][] = [];
  for (const arc of ['port', 'starboard'] as ArcId[]) {
    const base = p.heading + SLOTS[arc].center, half = modArcHalf('siphon', arc);
    let any = false;
    enemyGrid.query(p.x, p.z, range + 6, e => {
      if (e.dead) return;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d - e.r > range) return;
      const slack = Math.asin(Math.min(1, (e.r * 0.5) / Math.max(d, 0.1)));
      if (inArc(Math.atan2(dx, dz) - p.heading, arc, half, slack)) { victims.add(e); any = true; }
    });
    if (any) sides.push([base, half]);
  }
  if (!victims.size) return false;
  const dmg = shotDmg(m);
  for (const e of victims) { damageEnemy(e, dmg, true, 'auto'); ignite(e); }
  for (const [base, half] of sides) {
    for (let i = 0; i < 14; i++) {
      const a = base + (Math.random() - 0.5) * half * 1.6, s = 8 + Math.random() * 6;
      fx(p.x + Math.sin(base) * 1.2, 1.0, p.z + Math.cos(base) * 1.2, Math.random() < 0.5 ? 0xff7a1a : 0xffa830, 0.25, 0.9, 0.35, 0.9, false,
        { vx: Math.sin(a) * s, vy: 0.4, vz: Math.cos(a) * s }, 'glow');
    }
  }
  play('fire');
  return true;
}

export function stepAuto(m: Owned, dt: number): void {
  if (m.id === 'pump') { pumpTick(dt); return; }
  if (isCustom3(m.id)) { stepAuto3(m, dt); return; }
  if ((m.timer -= dt * autoK()) > 0) return;
  const a = G.modStats[m.id]?.auto, p = G.player;
  if (!a) return;
  const cd = a.cd * G.st.cooldownMul * G.st.autoRateMul;
  let fired = false;
  if (m.id === 'witch') fired = chain(m);
  else if (m.id === 'crowsnest') fired = snipe(m);
  else if (m.id === 'siphon') fired = cone(m);
  else if (m.id === 'ward') {
    const gone = deleteEnemyProjectiles(p.x, p.z, a.range * G.st.rangeMul, a.count);
    fired = gone > 0;
    wardMend(gone);
    if (fired) { flame(p.x, 1.5, p.z, 1.5); play('zap'); }
  } else if (m.id === 'boarding' && nearestEnemy(p.x, p.z, a.range * G.st.rangeMul)) {
    const first = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < a.count; i++) {
      const h = p.heading + (i % 2 === 0 ? first : -first) * Math.PI / 2 + Math.floor(i / 2) * 0.4;
      spawnLongboat(p.x + Math.sin(h) * 2, p.z + Math.cos(h) * 2, h, a.dmg * G.st.autoDmgMul, a.life, a.speed);
    }
    play('whoosh');
    fired = true;
  }
  if (fired) { autoShot(); evoFired(m, nearestEnemy(p.x, p.z, 30)); }
  m.timer = fired ? cd : 0.15;
}
