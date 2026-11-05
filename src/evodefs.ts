import { G, healPlayer } from './game';
import { L } from './loadout';
import type { ModuleId, Owned } from './modules';
import type { ModStats } from './modstats';
import type { ArcId } from './content';
import { Enemy, damageEnemy } from './enemies';
import { ignite, stun, slow } from './status';
import { projectiles, release, fireBall } from './weapons';
import { bullet } from './weapons3';
import { launchRocket, rope } from './weapons2';
import { spawnShark } from './sharks';
import { spawnLongboat } from './summons';
import { wardMend } from './synergies';
import {
  after, rnd, baseDmg, nearest, inRange, vortex, chainLightning, skyStrike, blast, burnPatch, hitLine, shove, ring,
} from './evofx';
import { fx, flame, explosion } from './particles';
import { addTrauma } from './juice';
import { play } from './audio';

// ---- v10 module evolutions: the table. `apply` runs once when the card is picked (stat changes on the module's own record);
// `fire` runs after each auto shot of the module, `cast` after its active, `step` every tick. Names / texts: i18n evo.<id>.n / .t ----
export interface EvoCtx { m: Owned; ms: ModStats; id: ModuleId; t?: Enemy; arc?: ArcId; n: number; dmg: number }
export interface EvoDef {
  color: number;
  apply?: (ms: ModStats) => void;
  fire?: (c: EvoCtx) => void;
  cast?: (c: EvoCtx) => void;
  step?: (dt: number, c: EvoCtx) => void;
}
const D = Math.PI / 180;
const mul = (o: Record<string, number>, k: string, f: number): void => { o[k] = +(o[k] * f).toFixed(3); };
const add = (o: Record<string, number>, k: string, v: number): void => { o[k] = +((o[k] ?? 0) + v).toFixed(3); };
const sx = (): number => G.player.x, sz = (): number => G.player.z;
const timers: Record<string, number> = {};
export const resetEvoTimers = (): void => { for (const k of Object.keys(timers)) delete timers[k]; };
/** Per-evolution countdown; true when it elapsed (and restarts at `every`). */
const tick = (key: string, dt: number, every: number): boolean => {
  const v = (timers[key] ?? every * 0.5) - dt;
  if (v > 0) { timers[key] = v; return false; }
  timers[key] = every; return true;
};
const mark = (e: Enemy, secs: number): void => { e.hexT = Math.max(e.hexT, secs); fx(e.x, 3.2, e.z, 0xff5a5a, 0.6, 1.4, 0.5, 0.9, false, undefined, 'glow'); };
const ahead = (d: number): [number, number] => [sx() + Math.sin(G.player.heading) * d, sz() + Math.cos(G.player.heading) * d];

export const EVO: Record<ModuleId, EvoDef> = {
  broadside: { color: 0x6fd8ff,
    apply: ms => { add(ms.auto, 'count', 1); add(ms.ability, 'count', 2); },
    fire: c => { if (c.t) chainLightning(sx(), sz(), c.t, 4, 9, c.dmg * 1.3, 0.2); },
    cast: c => { const hit = new Set<Enemy>(); for (let i = 0; i < 6; i++) after(i * 0.12, () => { const e = nearest(sx(), sz(), 24, hit) ?? nearest(sx(), sz(), 24); if (e) { hit.add(e); skyStrike(e, c.ms.ability.dmg * 1.5, 0.4); } }); } },
  chaser: { color: 0xffb070,
    apply: ms => { ms.auto.pierce = 99; mul(ms.auto, 'dmg', 1.6); mul(ms.auto, 'range', 1.4); mul(ms.auto, 'speed', 1.3); },
    fire: c => {
      if (!c.t) return;
      const a = Math.atan2(c.t.x - sx(), c.t.z - sz()), r = c.ms.auto.range * G.st.rangeMul, x1 = sx() + Math.sin(a) * r, z1 = sz() + Math.cos(a) * r;
      rope(sx(), sz(), x1, z1, 0xffe0b0, 0.18);
      hitLine(sx(), sz(), x1, z1, 1.1, c.dmg * 1.4);
      addTrauma(0.1);
    } },
  mortar: { color: 0xffe9a0,
    apply: ms => { mul(ms.auto, 'radius', 1.3); add(ms.ability, 'count', 4); },
    fire: c => {
      if (!c.t) return;
      const tx = c.t.x, tz = c.t.z, d = Math.hypot(tx - sx(), tz - sz());
      for (let i = 0; i < 5; i++) after(Math.max(0.5, d / c.ms.auto.speed) + 0.1 + i * 0.09, () => {
        const a = (i / 5) * 6.283 + rnd(0, 1), r = rnd(2.2, 4.5);
        blast(tx + Math.cos(a) * r, tz + Math.sin(a) * r, 2.2, c.dmg * 0.7);
      });
    } },
  kegs: { color: 0xff7a2a,
    apply: ms => { mul(ms.auto, 'radius', 1.2); mul(ms.auto, 'dmg', 1.3); },
    fire: c => {
      const bk = L.geo.kegBack, r = c.ms.auto.radius * 0.85;
      after(0.5, () => burnPatch(sx() - Math.sin(G.player.heading) * bk, sz() - Math.cos(G.player.heading) * bk, r, 6));
      if (c.t) burnPatch(c.t.x, c.t.z, r * 0.8, 5, 0.6);
    } },
  ram: { color: 0x59d98a,
    apply: ms => { add(ms.auto, 'ramMul', 0.5); mul(ms.auto, 'contactMul', 0.8); },
    step: (dt, c) => { if (tick('ram', dt, 5)) tentacles(c.ms.ability.dmg * 0.5, 10, 3); },
    cast: c => tentacles(c.ms.ability.dmg, 14, 6) },
  boarding: { color: 0xbfe6a8,
    apply: ms => { add(ms.auto, 'count', 1); mul(ms.auto, 'life', 1.3); },
    fire: c => {
      const list = inRange(sx(), sz(), 22).slice(0, 4);
      for (const e of list) { rope(sx(), sz(), e.x, e.z, 0xfff0c0, 0.15); damageEnemy(e, c.dmg * 0.9, true, 'auto'); fx(e.x, 1.4, e.z, 0xffe080, 0.3, 0.9, 0.2, 1, false, undefined, 'glow'); }
      if (list.length) play('hit');
    },
    cast: c => EVO.boarding.fire?.({ ...c, dmg: c.dmg * 2 }) },
  witch: { color: 0x9a6aff,
    apply: ms => { add(ms.auto, 'jumps', 2); },
    step: (dt, c) => {
      const p = G.player;
      if (tick('stormfx', dt, 0.15)) fx(p.x + rnd(-3, 3), 7 + rnd(-0.4, 0.4), p.z + rnd(-3, 3), 0x5a4a8a, 4, 5.5, 0.6, 0.45, false, { vx: rnd(-1, 1), vy: 0, vz: rnd(-1, 1) });
      if (tick('stormhit', dt, 0.8)) { const e = nearest(p.x, p.z, 22); if (e) skyStrike(e, c.dmg, 0.3); }
    } },
  siphon: { color: 0xff9a40,
    apply: ms => { mul(ms.auto, 'half', 1.5); mul(ms.auto, 'range', 1.4); mul(ms.auto, 'dmg', 1.3); },
    fire: c => {
      if (c.n % 3) return;
      const p = G.player;
      ring(p.x, p.z, 0xff8a30, 2, 12, 0.7);
      for (const e of inRange(p.x, p.z, 11)) { const d = Math.hypot(e.x - p.x, e.z - p.z) || 1; shove(e, ((e.x - p.x) / d) * 3, ((e.z - p.z) / d) * 3); ignite(e); slow(e, 1.5, 0.7); }
      flame(p.x, 1.5, p.z, 3); addTrauma(0.15); play('horn');
    },
    cast: () => { const p = G.player; for (let i = 0; i < 6; i++) burnPatch(p.x + Math.cos(i * 1.047) * 6, p.z + Math.sin(i * 1.047) * 6, 2.5, 5); } },
  ward: { color: 0xa0e8ff,
    apply: ms => { add(ms.auto, 'count', 2); mul(ms.ability, 'radius', 1.2); },
    step: (dt, c) => {
      if (!tick('mirror', dt, 3.5)) return;
      const p = G.player;
      let n = 0;
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const q = projectiles[i];
        if ((q.kind !== 'eball' && q.kind !== 'eshell' && q.kind !== 'skull') || Math.hypot(q.x - p.x, q.z - p.z) > c.ms.auto.range * 1.5) continue;
        const e = nearest(q.x, q.z, 40), a = e ? Math.atan2(e.x - q.x, e.z - q.z) : Math.atan2(-q.vx, -q.vz);
        fx(q.x, 1, q.z, 0xcfeeff, 0.5, 2, 0.3, 1, false, undefined, 'glow');
        fireBall(q.x, q.z, a, 28, Math.max(18, q.dmg * 1.5), 40, true, 1);
        release(q); projectiles[i] = projectiles[projectiles.length - 1]; projectiles.pop(); n++;
      }
      wardMend(n);
    } },
  lantern: { color: 0xe6f6ff,
    apply: ms => { add(ms.auto, 'chance', 0.25); add(ms.ability, 'mult', 1); },
    step: (dt) => {
      if (!tick('phantom', dt, 5)) return;
      const p = G.player;
      for (const e of inRange(p.x, p.z, 16)) e.lostT = Math.max(e.lostT, 2.5);
      ring(p.x, p.z, 0xd9eaff, 2, 16, 0.9);
    },
    cast: () => { const p = G.player; for (const e of inRange(p.x, p.z, 12)) { e.lostT = 3; slow(e, 2, 0.6); } ring(p.x, p.z, 0xffffff, 1, 12, 0.8); } },
  harpoon: { color: 0x7fb8d8,
    apply: ms => { add(ms.auto, 'count', 2); add(ms.auto, 'pierce', 2); ms.auto.slow = Math.min(0.7, ms.auto.slow + 0.2); },
    fire: c => {
      if (!c.t) return;
      rope(sx(), sz(), c.t.x, c.t.z, 0xe8d8a0, 0.35);
      const d = Math.hypot(c.t.x - sx(), c.t.z - sz()) || 1;
      shove(c.t, ((sx() - c.t.x) / d) * Math.min(5, d - 3), ((sz() - c.t.z) / d) * Math.min(5, d - 3));
      stun(c.t, 0.4);
    } },
  carronade: { color: 0xffa040,
    apply: ms => { mul(ms.auto, 'dmg', 1.3); mul(ms.auto, 'knock', 1.5); add(ms.auto, 'count', 1); },
    fire: c => { if (!c.t) return; const x = c.t.x, z = c.t.z; after(0.25, () => { blast(x, z, 3.2, c.dmg); for (const e of inRange(x, z, 3.2)) ignite(e); flame(x, 1, z, 2); }); } },
  rockets: { color: 0xff8a50,
    apply: ms => { add(ms.auto, 'count', 2); mul(ms.auto, 'radius', 1.5); },
    fire: c => {
      for (let i = 0; i < 4; i++) after(0.12 + i * 0.1, () => {
        const a = G.player.heading + rnd(-1.4, 1.4) + (i % 2 ? Math.PI : 0);
        launchRocket(sx(), sz(), a, c.ms.auto.speed, c.dmg * 0.8, 3.4, c.ms.auto.turn * 1.3);
      });
      play('launch');
    } },
  net: { color: 0x5ac8ff,
    apply: ms => { mul(ms.auto, 'radius', 1.3); add(ms.auto, 'count', 1); },
    fire: c => { if (!c.t) return; const x = c.t.x, z = c.t.z; after(0.9, () => vortex(x, z, 6, 3, 5, baseDmg('net') + 14)); },
    cast: () => vortex(sx(), sz(), 10, 3.5, 6, 20) },
  crowsnest: { color: 0xff6a6a,
    apply: ms => { add(ms.auto, 'count', 1); mul(ms.auto, 'range', 1.25); },
    fire: c => {
      const p = G.player;
      const foes = inRange(p.x, p.z, 34).sort((a, b) => b.hp - a.hp).slice(0, 3);
      for (const e of foes) { mark(e, 5); rope(p.x, p.z, e.x, e.z, 0xff9a9a, 0.12); }
      void c;
    } },
  pump: { color: 0x7fe8d8,
    apply: ms => { mul(ms.auto, 'hps', 2); ms.auto.threshold = 0.8; },
    step: (dt) => { if (tick('tide', dt, 8)) surge(); },
    cast: () => surge() },
  swivel: { color: 0xffe080,
    apply: ms => { add(ms.auto, 'count', 1); },
    fire: c => {
      if (c.n % 5) return;
      const [bx, bz] = ahead(L.geo.chaserAt), a = c.t ? Math.atan2(c.t.x - sx(), c.t.z - sz()) : G.player.heading;
      for (let i = 0; i < 9; i++) bullet(bx, bz, a + (i - 4) * 5.5 * D, 30, c.dmg * 1.2, 14, 1);
      addTrauma(0.1); play('boom');
    } },
  chain: { color: 0xc0c8d8,
    apply: ms => { add(ms.auto, 'pierce', 2); ms.auto.slow = Math.min(0.65, ms.auto.slow + 0.15); },
    fire: c => {
      if (!c.t) return;
      const x = c.t.x, z = c.t.z;
      stun(c.t, 0.7);
      after(0.45, () => { for (const e of inRange(x, z, 5.5)) { slow(e, 2.5, 0.5); damageEnemy(e, c.dmg * 0.7, true, 'auto'); } ring(x, z, 0xc0c8d8, 1, 5.5, 0.4); });
    } },
  firearrows: { color: 0xffb040,
    apply: ms => { add(ms.auto, 'count', 2); },
    fire: c => { if (c.t) burnPatch(c.t.x, c.t.z, 2.4, 4, 0.5); } },
  bombketch: { color: 0xff5a40,
    apply: ms => { mul(ms.auto, 'radius', 1.25); mul(ms.auto, 'fire', 1.5); },
    fire: c => {
      if (!c.t) return;
      const x = c.t.x, z = c.t.z, r = c.ms.auto.radius * 1.2;
      after(1.2, () => { explosion(x, 0.8, z, r); blast(x, z, r, c.dmg * 1.5); });
    } },
  tesla: { color: 0x9fe8ff,
    apply: ms => { add(ms.auto, 'jumps', 3); add(ms.ability, 'pulses', 1); },
    fire: c => {
      const list = inRange(sx(), sz(), 15).sort(() => Math.random() - 0.5).slice(0, 3);
      for (const e of list) { chainLightning(sx(), sz(), e, 1, 0, c.dmg * 0.7, 0.4, 3.4); }
    } },
  gatling: { color: 0xffc860,
    apply: ms => { mul(ms.auto, 'cdMin', 0.7); mul(ms.auto, 'spin', 0.75); mul(ms.auto, 'dmg', 1.25); },
    fire: c => {
      if (!c.t || c.n % 6) return;
      blast(c.t.x, c.t.z, 2.2, c.dmg * 3);
    } },
  sharkcage: { color: 0x40d8e8,
    apply: ms => { add(ms.auto, 'count', 1); mul(ms.auto, 'life', 1.3); add(ms.auto, 'max', 2); },
    fire: c => {
      if (c.n % 3) return;
      const a = G.player.heading + Math.PI;
      spawnShark(sx() + Math.sin(a) * 3.5, sz() + Math.cos(a) * 3.5, 16, c.dmg * 4, 0.9, 11, 2.4);
      ring(sx(), sz(), 0x40d8e8, 2, 8, 0.6);
    } },
  spyglass: { color: 0xffe8a0,
    apply: ms => { add(ms.auto, 'crit', 0.2); add(ms.auto, 'bonus', 0.5); add(ms.auto, 'count', 1); },
    fire: c => {
      if (!c.t || c.n % 4) return;
      const e = c.t;
      rope(sx(), sz(), e.x, e.z, 0xffffff, 0.3);
      damageEnemy(e, e.bd ? c.dmg * 4 : Math.max(c.dmg * 5, e.hp * 0.4), true, 'auto');
      fx(e.x, 1.5, e.z, 0xfff0a0, 0.5, 2.6, 0.3, 1, false, undefined, 'glow'); play('snipe'); addTrauma(0.1);
    } },
  magnet: { color: 0xffd84a,
    apply: ms => { mul(ms.auto, 'range', 1.5); mul(ms.auto, 'gold', 2); add(ms.ability, 'mult', 1); } },
};

/** Kraken Prow: tentacles seize the `n` nearest enemies within r: pulled in, stunned, hurt. */
function tentacles(dmg: number, r: number, n: number): void {
  const p = G.player, hit = new Set<Enemy>();
  for (let i = 0; i < n; i++) {
    const e = nearest(p.x, p.z, r, hit);
    if (!e) break;
    hit.add(e);
    const d = Math.hypot(e.x - p.x, e.z - p.z) || 1;
    shove(e, ((p.x - e.x) / d) * Math.min(6, d - 3), ((p.z - e.z) / d) * Math.min(6, d - 3));
    stun(e, 1.5); damageEnemy(e, dmg, true, 'ability');
    rope(p.x, p.z, e.x, e.z, 0x59d98a, 0.5);
    fx(e.x, 0.5, e.z, 0x2a8a5a, 1, 3, 0.5, 0.8, true);
  }
  if (hit.size) { addTrauma(0.15); play('swirl'); }
}
/** Tidal Pump: a healing wave that shoves enemies away. */
function surge(): void {
  const p = G.player;
  healPlayer(G.maxHp * 0.04);
  ring(p.x, p.z, 0x7fe8d8, 1, 13, 0.8);
  for (const e of inRange(p.x, p.z, 12)) { const d = Math.hypot(e.x - p.x, e.z - p.z) || 1; shove(e, ((e.x - p.x) / d) * 4, ((e.z - p.z) / d) * 4); slow(e, 1.5, 0.7); }
  play('heal');
}
