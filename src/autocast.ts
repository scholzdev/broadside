import { G } from './game';
import { ModuleId } from './modules';
import { SLOTS, ArcId } from './content';
import { arcHalf } from './arcs';
import { enemyGrid } from './enemies';
import { projectiles } from './weapons';

// ---- auto-cast conditions: when a ready, non-signature active may fire by itself. Tune the numbers here. ----
const D = Math.PI / 180;
const wrapA = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

interface Foe { d: number; rel: number }
/** Living enemies within r of the ship, with distance and bearing relative to the heading (0 = dead ahead, +left). */
function foes(r: number): Foe[] {
  const p = G.player, out: Foe[] = [];
  enemyGrid.query(p.x, p.z, r + 6, e => {
    if (e.dead) return;
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) - e.r * 0.5;
    if (d < r) out.push({ d, rel: wrapA(Math.atan2(dx, dz) - p.heading) });
  });
  return out;
}
const inArc = (f: Foe, arc: ArcId): boolean => Math.abs(wrapA(f.rel - SLOTS[arc].center)) <= arcHalf(arc);
const shots = (r: number): number => {
  const p = G.player;
  return projectiles.reduce((n, q) => n + ((q.kind === 'eball' || q.kind === 'eshell' || q.kind === 'skull') && Math.hypot(q.x - p.x, q.z - p.z) < r ? 1 : 0), 0);
};
/** Highest HP among living enemies within 35 u. */
const strongest = (): number => {
  const p = G.player;
  let m = 0;
  enemyGrid.query(p.x, p.z, 41, e => { if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 35) m = Math.max(m, e.hp); });
  return m;
};
const hpFrac = (): number => G.hp / G.maxHp;

export const AUTO_COND: Record<ModuleId, () => boolean> = {
  broadside: () => foes((G.modStats.broadside?.auto.range ?? 0) * G.st.rangeMul).some(f => inArc(f, 'port') || inArc(f, 'starboard')),
  chaser: () => foes(25).some(f => inArc(f, 'bow')),
  mortar: () => true, // CAST checks for enemies in range
  witch: () => true,
  kegs: () => foes(14).some(f => Math.abs(f.rel) > Math.PI / 2) || foes(12).length >= 3,
  boarding: () => foes(25).length >= 2 || (!!G.boss && !G.boss.dead && Math.hypot(G.boss.x - G.player.x, G.boss.z - G.player.z) < 25),
  siphon: () => foes(9).length >= 3 || foes(5).length >= 1,
  ward: () => shots(12) >= 3 || (hpFrac() < 0.4 && shots(12) >= 1),
  ram: () => G.player.speed > 0.4 * G.st.maxSpeed && foes(9).some(f => Math.abs(f.rel) <= 15 * D),
  lantern: () => hpFrac() < 0.3 && foes(8).length >= 1,
  harpoon: () => foes(22).length >= 2 || (!!G.boss && !G.boss.dead && Math.hypot(G.boss.x - G.player.x, G.boss.z - G.player.z) < 25),
  carronade: () => foes(10).filter(f => inArc(f, 'port') || inArc(f, 'starboard')).length >= 2,
  rockets: () => foes(24).length >= 4,
  net: () => foes((G.modStats.net?.ability.radius ?? 12) * 0.8).length >= 4,
  crowsnest: () => (!!G.boss && !G.boss.dead && Math.hypot(G.boss.x - G.player.x, G.boss.z - G.player.z) < 38) || foes(35).some(() => true) && strongest() >= 60,
  pump: () => hpFrac() < 0.45,
  swivel: () => foes(18).some(f => inArc(f, 'bow')),
  chain: () => foes(14).filter(f => inArc(f, 'port') || inArc(f, 'starboard')).length >= 2 || foes(16).length >= 4,
  firearrows: () => foes(22).length >= 3,
  bombketch: () => foes(22).some(f => inArc(f, 'stern')) || foes(14).length >= 4,
  tesla: () => foes(14).length >= 3,
  gatling: () => foes(14).filter(f => inArc(f, 'port') || inArc(f, 'starboard')).length >= 2,
  sharkcage: () => foes(25).length >= 2 || (!!G.boss && !G.boss.dead && Math.hypot(G.boss.x - G.player.x, G.boss.z - G.player.z) < 30),
  spyglass: () => foes(40).length >= 2 && foes(40).some(f => f.d > 20),
  magnet: () => foes(24).length === 0, // nothing to fight: safe to gather the loot
};
