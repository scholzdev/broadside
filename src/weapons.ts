import * as THREE from 'three';
import { G, scene, hurtPlayer } from './game';
import { ArcId } from './content';
import { arcHalf, inArc } from './arcs';
import { MODS, Owned } from './modules';
import { stepAuto, isCustomAuto } from './autos';
import { ignite, slow } from './status';
import { slowPlayer } from './pstatus';
import { autoShot } from './relicfx';
import { enemyGrid, damageEnemy, targetable, Enemy, DmgSource } from './enemies';
import { wrap, lerp } from './spatial';
import { projGeo, projMat, projShadow, trailStyle, ORIENTED, ProjKind } from './projvis';
import { pushOut } from './world';
import { nearestEnemy } from './summons';
import { throwNet, shootHarpoon, fireCarronade, fireRocket } from './weapons2';
import { fireNew, critMul } from './weapons3';
import { makeTelegraph } from './overlays';
import { fx, muzzle, splinters, splash, explosion } from './particles';
import { addTrauma, addRecoil } from './juice';
import { play } from './audio';
import { L } from './loadout';
import { SP, autoK } from './spelldata';
import { evoFired } from './evolutions';

type Kind = ProjKind;
export interface Proj {
  kind: Kind; x: number; z: number; y: number; vx: number; vz: number; life: number; dmg: number; r: number;
  pierce: number; rad: number; hit: Set<Enemy>; mesh: THREE.Mesh; ring: THREE.Mesh | null; px: number; pz: number; ph: number; py: number; sx: number; sz: number; tx: number; tz: number; t: number; T: number; tr: number;
  /** Harpoon Hal: this shot slows what it hits. Saltbeard's Ghost: 0 not rolled, 1 passes through the ship, 2 hits. */
  slow?: boolean; gh?: number;
  /** Damage source tag for kill credit / quests (default 'auto'); crew shots use 'crew'. */
  src?: DmgSource;
  /** Enemy chain shot: slows the ship (secs) when it hits. Spectral skull: homing turn rate (rad/s). */
  chain?: number; sk?: number;
  /** New module shots: slow on hit (secs, speed factor), knockback distance, rocket homing (rad/s) and its current target. */
  slowT?: number; slowMul?: number; kb?: number; turn?: number; tgt?: Enemy | null;
}
export const projectiles: Proj[] = [];

const pool = Object.fromEntries(Object.keys(projGeo).map(k => [k, [] as THREE.Mesh[]])) as Record<Kind, THREE.Mesh[]>;

export function spawn(kind: Kind, x: number, z: number, dmg: number, life: number): Proj {
  let mesh = pool[kind].pop();
  if (!mesh) { mesh = new THREE.Mesh(projGeo[kind], projMat[kind]); mesh.castShadow = projShadow(kind); }
  scene.add(mesh);
  const p: Proj = { kind, x, z, y: 0.9, vx: 0, vz: 0, life, dmg, r: 0.35, pierce: 0, rad: 3, hit: new Set(), mesh, ring: null, px: x, pz: z, ph: 0, py: 0.9, sx: x, sz: z, tx: x, tz: z, t: 0, T: 1, tr: 0 };
  projectiles.push(p);
  return p;
}
export function release(p: Proj): void {
  scene.remove(p.mesh); pool[p.kind].push(p.mesh);
  if (p.ring) { scene.remove(p.ring); p.ring = null; }
}
/** Enemy mortar: shell lands on (tx,tz) after 1.2 s; a red ring marks the spot. */
export function lobMortar(x: number, z: number, tx: number, tz: number, dmg: number): void {
  const s = spawn('eshell', x, z, dmg, 99);
  s.tx = tx; s.tz = tz; s.T = 1.2;
  s.ring = makeTelegraph();
  s.ring.position.set(tx, 0.4, tz);
  scene.add(s.ring);
}
const isEnemyProj = (p: Proj): boolean => p.kind === 'eball' || p.kind === 'eshell' || p.kind === 'skull';
/** Homing spectral skull (Drowned Admiral): slow, turns toward the ship, dies to Ward-type deletion. */
export function fireSkull(x: number, z: number, ang: number, dmg: number): Proj {
  const p = spawn('skull', x, z, dmg, 8);
  p.vx = Math.sin(ang) * 6; p.vz = Math.cos(ang) * 6; p.r = 0.5; p.sk = 1.3;
  return p;
}
export function clearEnemyProjectiles(): void {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!isEnemyProj(p)) continue;
    release(p);
    projectiles[i] = projectiles[projectiles.length - 1];
    projectiles.pop();
  }
}

/** `heated` is the player's red-hot ball: it ignites what it hits. */
export function fireBall(x: number, z: number, ang: number, speed: number, dmg: number, range: number, friendly: boolean, pierce = 0, heated = false): Proj {
  const p = spawn(!friendly ? 'eball' : heated ? 'hball' : 'fball', x, z, dmg, range / speed);
  p.vx = Math.sin(ang) * speed; p.vz = Math.cos(ang) * speed; p.pierce = pierce;
  if (!friendly) p.r = 0.45; else if (heated) p.r = 0.55;
  return p;
}
/** Friendly mortar shell that lands on (tx,tz) after `T` seconds (splash radius `radius`). */
export function lobShell(x: number, z: number, tx: number, tz: number, dmg: number, T: number, radius: number): void {
  const s = spawn('shell', x, z, dmg, 99);
  s.tx = tx; s.tz = tz; s.T = Math.max(0.3, T); s.rad = radius;
}
/** Removes enemy projectiles within r of (x,z); returns how many (at most `max`). */
export function deleteEnemyProjectiles(x: number, z: number, r: number, max = Infinity): number {
  let n = 0;
  for (let i = projectiles.length - 1; i >= 0 && n < max; i--) {
    const p = projectiles[i];
    if (!isEnemyProj(p) || Math.hypot(p.x - x, p.z - z) > r) continue;
    fx(p.x, p.y, p.z, 0x9fe0ff, 0.2, 0.9, 0.3, 0.9, false, undefined, 'glow');
    release(p);
    projectiles[i] = projectiles[projectiles.length - 1];
    projectiles.pop();
    n++;
  }
  return n;
}

export interface Volley { x: number; z: number; heading: number; side: number; n: number; aim: number; len: number; speed: number; dmg: number; range: number; friendly: boolean; pierce?: number; chain?: number }
/** n balls spread along the hull, fired from the port (+1) or starboard (-1) flank. */
export function fireVolley(v: Volley): void {
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
  for (let i = 0; i < v.n; i++) {
    const off = v.n === 1 ? 0 : (i / (v.n - 1) - 0.5) * v.len;
    const lat = v.friendly ? v.side * L.geo.flank : v.side;
    const x = v.x + fx * off + fz * lat, z = v.z + fz * off - fx * lat;
    fireBall(x, z, v.aim + (Math.random() - 0.5) * 0.06, v.speed, v.dmg, v.range, v.friendly, v.pierce ?? 0).chain = v.chain;
    muzzle(x + Math.sin(v.aim) * 0.6, 0.9, z + Math.cos(v.aim) * 0.6, v.aim);
  }
  if (v.friendly) { addTrauma(0.1); addRecoil(v.side); play('boom'); }
  else if (Math.hypot(v.x - G.player.x, v.z - G.player.z) < 30) play('boom');
}
export function explode(x: number, z: number, r: number, dmg: number, friendly: boolean): void {
  if (friendly) r *= G.st.blastMul; // Demolitionists
  if (Math.hypot(G.player.x - x, G.player.z - z) < 20) { addTrauma(0.2); play('explode'); }
  explosion(x, 0.5, z, r);
  if (friendly) {
    enemyGrid.query(x, z, r + 6, e => {
      if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.r * 0.5) damageEnemy(e, dmg, true, 'auto');
    });
  } else if (Math.hypot(G.player.x - x, G.player.z - z) < r + 1) hurtPlayer(dmg);
}

// ---- auto-fire, restricted to each mount's arc ----
/** Nearest live enemy in an arc (all-round for the deck arc). `half` overrides the arc's half-width. */
export function findTarget(arc: ArcId, range: number, half?: number): Enemy | null {
  const res: { e: Enemy | null; d: number } = { e: null, d: 1e9 };
  const p = G.player;
  enemyGrid.query(p.x, p.z, range + 6, e => {
    if (e.dead) return;
    const d = arcDist(e, arc, range, half);
    if (d >= 0 && d < res.d) { res.d = d; res.e = e; }
  });
  return res.e;
}
/** Distance to `e` if it is within range and inside the arc (current width, small radius slack), else -1. */
function arcDist(e: Enemy, arc: ArcId, range: number, half?: number): number {
  const p = G.player, dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
  if (d - e.r > range) return -1;
  const slack = Math.asin(Math.min(1, (e.r * 0.5) / Math.max(d, 0.1)));
  return inArc(Math.atan2(dx, dz) - p.heading, arc, arcHalf(arc, half), slack) ? d : -1;
}
/** Edge grace: a module keeps firing at its last in-arc target for this long after it crosses the arc edge. */
const EDGE_GRACE = 0.35;
const lastT: Record<string, { e: Enemy; t: number }> = {};

/** Damage of one auto shot: the module's auto damage, captain auto multiplier, and Vanish's one-shot multiplier (consumed here). */
export function shotDmg(m: Owned): number {
  const k = (G.buffs.vanish ? G.modStats.lantern?.ability.mult ?? 1 : 1) * (SP.dead > 0 ? 2 : 1); // Vanish and Dead Eye
  G.buffs.vanish = false;
  return (G.modStats[m.id]?.auto.dmg ?? 0) * G.st.autoDmgMul * k * (m.slot === 'side' ? L.cap.sideDmg : 1) * critMul(m); // Harpoon Hal: side modules weaker; Spyglass Battery: crit for the others
}

function fireWeapon(m: Owned, arc: ArcId, t: Enemy): void {
  const p = G.player, a = G.modStats[m.id]?.auto, dmg = shotDmg(m);
  if (!a) return;
  const rng = a.range * G.st.rangeMul * (m.slot === 'bow' ? L.cap.bowRange : 1), pierce = G.st.pierce + (a.pierce ?? 0) + (SP.dead > 0 ? 2 : 0);
  const fx0 = Math.sin(p.heading), fz0 = Math.cos(p.heading);
  const aim = Math.atan2(t.x - p.x, t.z - p.z);
  if (fireNew(m, arc, t, a, dmg, rng, pierce)) return;
  if (m.id === 'broadside') {
    fireVolley({ x: p.x, z: p.z, heading: p.heading, side: arc === 'port' ? 1 : -1, n: G.st.balls + a.count, aim, len: L.geo.volley, speed: a.speed, dmg, range: rng, friendly: true, pierce });
  } else if (m.id === 'chaser') {
    const n = 1 + a.count;
    for (let i = 0; i < n; i++) fireBall(p.x + fx0 * L.geo.chaserAt, p.z + fz0 * L.geo.chaserAt, aim + (i - (n - 1) / 2) * 2 * a.fan * Math.PI / 180, a.speed, dmg, rng, true, pierce).slow = L.cap.bowSlow;
    muzzle(p.x + fx0 * L.geo.chaserMuzzle, 0.9, p.z + fz0 * L.geo.chaserMuzzle, aim);
    play('boom');
  } else if (m.id === 'mortar') {
    const d = Math.hypot(t.x - p.x, t.z - p.z);
    for (let i = 0; i <= a.count; i++) {
      const sa = Math.random() * Math.PI * 2, sd = i ? Math.sqrt(Math.random()) * a.scatter : 0;
      lobShell(p.x, p.z, t.x + Math.cos(sa) * sd, t.z + Math.sin(sa) * sd, dmg, Math.max(a.minFlight, d / a.speed), a.radius);
    }
  } else if (m.id === 'harpoon') shootHarpoon(a, aim, dmg, rng, pierce);
  else if (m.id === 'carronade') fireCarronade(a, arc === 'port' ? 1 : -1, aim, dmg, rng, pierce);
  else if (m.id === 'rockets') fireRocket(a, aim, dmg, rng, t);
  else if (m.id === 'net') throwNet(a, t, rng);
  else {
    for (let i = 0; i <= a.count; i++) {
      const k = spawn('keg', p.x - fx0 * L.geo.kegBack + fz0 * i * 1.6 * (i % 2 ? 1 : -1), p.z - fz0 * L.geo.kegBack - fx0 * i * 1.6 * (i % 2 ? 1 : -1), dmg, a.life);
      k.y = 0.3; k.py = 0.3; k.r = a.trigger; k.rad = a.radius;
    }
  }
}

export function stepWeapons(dt: number): void {
  for (const m of G.modules) {
    if (isCustomAuto(m.id)) { stepAuto(m, dt); continue; }
    const a = G.modStats[m.id]?.auto;
    if (!a) continue;
    const range = a.range * G.st.rangeMul * (m.slot === 'bow' ? L.cap.bowRange : 1);
    for (const arc of MODS[m.id].arcs) {
      const key = m.id + arc;
      const cd = (G.cd[key] ?? 0) - dt * autoK(), last = lastT[key];
      if (last && targetable(last.e) && arcDist(last.e, arc, range) >= 0) last.t = G.time; // stays fresh while the target is inside the arc
      if (cd > 0) { G.cd[key] = cd; continue; }
      let t = findTarget(arc, range);
      if (t) lastT[key] = { e: t, t: G.time };
      else if (last && targetable(last.e) && G.time - last.t >= 0 && G.time - last.t <= EDGE_GRACE && Math.hypot(last.e.x - G.player.x, last.e.z - G.player.z) - last.e.r <= range) t = last.e;
      if (!t) { G.cd[key] = 0; continue; }
      fireWeapon(m, arc, t);
      autoShot();
      evoFired(m, t, arc);
      G.cd[key] = a.cd * G.st.cooldownMul * G.st.autoRateMul;
    }
  }
}

export function stepProjectiles(dt: number): void {
  const pl = G.player;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (SP.stop > 0 && (p.kind === 'eball' || p.kind === 'eshell')) continue; // Time Stop
    let remove = false;
    if (p.kind === 'shell' || p.kind === 'eshell' || p.kind === 'net') {
      p.t += dt;
      const k = Math.min(1, p.t / p.T);
      p.x = p.sx + (p.tx - p.sx) * k; p.z = p.sz + (p.tz - p.sz) * k;
      p.y = 0.9 + Math.sin(k * Math.PI) * (p.kind === 'net' ? 4 : 7);
      if (k >= 1 && p.kind === 'net') { netLand(p); remove = true; }
      else if (k >= 1) { explode(p.tx, p.tz, p.kind === 'shell' ? p.rad : 3, p.dmg, p.kind === 'shell'); remove = true; }
    } else if (p.kind === 'keg') {
      p.life -= dt;
      p.y = 0.15 + Math.sin(G.time * 3 + i) * 0.08;
      let trig = p.life <= 0;
      if (!trig) enemyGrid.query(p.x, p.z, 8, e => { if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < p.r + e.r * 0.5) trig = true; });
      if (trig) { explode(p.x, p.z, p.rad, p.dmg, true); remove = true; }
    } else {
      if (p.kind === 'rocket') homing(p, dt);
      else if (p.sk) skullHome(p, dt);
      p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
      if (p.life <= 0) {
        remove = true;
        splash(p.x, p.z);
        if (Math.hypot(pl.x - p.x, pl.z - p.z) < 35) play('splash');
      }
      else if (p.kind === 'fball' || p.kind === 'hball' || p.kind === 'harp' || p.kind === 'cball' || p.kind === 'rocket' || p.kind === 'musket' || p.kind === 'chain' || p.kind === 'arrow') {
        enemyGrid.query(p.x, p.z, p.r + 6, e => {
          if (remove || e.dead || p.hit.has(e)) return;
          if (Math.hypot(e.x - p.x, e.z - p.z) < e.r + p.r) {
            p.hit.add(e);
            damageEnemy(e, p.dmg, true, p.src ?? 'auto');
            if (p.kind === 'hball' || p.kind === 'arrow') ignite(e);
            if (p.slow) slow(e, 1, 0.7);
            if (p.slowT) slow(e, p.slowT, p.slowMul ?? 0.7);
            if (p.kb) knock(e, p);
            if (p.kind === 'rocket') explosion(p.x, 0.9, p.z, 1.6);
            fx(p.x, 0.9, p.z, 0xffa030, 0.2, 0.9, 0.25, 0.9);
            splinters(p.x, 0.9, p.z, 5);
            play('hit');
            if (p.pierce > 0) p.pierce--; else remove = true;
          }
        });
      } else if (Math.hypot(pl.x - p.x, pl.z - p.z) < L.geo.hit + p.r && !ghostly(p)) {
        if (SP.rip > 0) { // Riposte: sent back along the incoming direction as a friendly shot
          const sp = Math.hypot(p.vx, p.vz) || 14;
          fireBall(p.x, p.z, Math.atan2(-p.vx, -p.vz), sp * 1.2, Math.max(12, p.dmg * 2), 40, true, 1);
          fx(p.x, 0.9, p.z, 0xffd060, 0.3, 1.4, 0.25, 1, false, undefined, 'glow');
          addTrauma(0.12); play('clang');
          remove = true;
        } else { hurtPlayer(p.dmg); if (p.chain) slowPlayer(p.chain, 0.55); }
        if (!remove) { fx(p.x, 0.9, p.z, 0xff6a4a, 0.2, 1.0, 0.3, 0.9); remove = true; }
      }
    }
    if (remove) {
      release(p);
      projectiles[i] = projectiles[projectiles.length - 1];
      projectiles.pop();
    }
  }
}

/** Carronade recoil: shoves an enemy along the shot's direction (bosses move half as far). */
function knock(e: Enemy, p: Proj): void {
  const sp = Math.hypot(p.vx, p.vz) || 1, d = (p.kb ?? 0) * (e.bd ? 0.5 : 1);
  e.x += (p.vx / sp) * d; e.z += (p.vz / sp) * d;
  pushOut(e, e.r);
}
/** Spectral skull: turns toward the ship at a limited rate. */
function skullHome(p: Proj, dt: number): void {
  const sp = Math.hypot(p.vx, p.vz), cur = Math.atan2(p.vx, p.vz), k = (p.sk ?? 1) * dt;
  const a = cur + Math.max(-k, Math.min(k, wrap(Math.atan2(G.player.x - p.x, G.player.z - p.z) - cur)));
  p.vx = Math.sin(a) * sp; p.vz = Math.cos(a) * sp;
}
/** Rocket Rack: steers toward the nearest enemy at a limited turn rate, keeping its speed. */
function homing(p: Proj, dt: number): void {
  if (!p.tgt || !targetable(p.tgt)) p.tgt = nearestEnemy(p.x, p.z, 30);
  if (!p.tgt) return;
  const sp = Math.hypot(p.vx, p.vz), cur = Math.atan2(p.vx, p.vz);
  const diff = wrap(Math.atan2(p.tgt.x - p.x, p.tgt.z - p.z) - cur), a = cur + Math.max(-(p.turn ?? 3) * dt, Math.min((p.turn ?? 3) * dt, diff));
  p.vx = Math.sin(a) * sp; p.vz = Math.cos(a) * sp;
}
/** A thrown net lands: everything inside the radius is slowed, a rope-coloured ring marks the patch. */
function netLand(p: Proj): void {
  slowArea(p.tx, p.tz, p.rad, p.slowT ?? 2, p.slowMul ?? 0.6);
  fx(p.tx, 0.12, p.tz, 0xd0a050, p.rad * 0.4, p.rad * 1.1, 0.5, 0.7, true);
  splash(p.tx, p.tz);
  play('whoosh');
}
export function slowArea(x: number, z: number, r: number, secs: number, mul: number): number {
  let n = 0;
  enemyGrid.query(x, z, r + 6, e => { if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.r * 0.5) { slow(e, secs, mul); n++; } });
  return n;
}

/** Saltbeard's Ghost: each enemy ball rolls once when it first reaches the ship; a lucky one passes through harmlessly. */
function ghostly(p: Proj): boolean {
  if (!p.gh) p.gh = Math.random() < L.cap.ghost ? 1 : 2;
  return p.gh === 1;
}

export function renderProjectiles(alpha: number, dt: number): void {
  for (const p of projectiles) {
    const x = lerp(p.px, p.x, alpha), y = lerp(p.py, p.y, alpha), z = lerp(p.pz, p.z, alpha);
    p.mesh.position.set(x, y, z);
    if (ORIENTED(p.kind)) { p.mesh.rotation.set(0, Math.atan2(p.vx, p.vz), 0); }
    else if (p.kind === 'keg') { p.mesh.rotation.y += dt * 0.6; p.mesh.rotation.z = Math.sin(G.time * 2 + p.sx) * 0.15; continue; }
    else if (p.kind !== 'fball' && p.kind !== 'hball' && p.kind !== 'eball' && p.kind !== 'cball' && p.kind !== 'musket' && p.kind !== 'arrow') p.mesh.rotation.x += dt * 4;
    if (p.ring) {
      const k = Math.min(1, p.t / p.T);
      (p.ring.getObjectByName('fill') as THREE.Object3D).scale.setScalar(0.05 + 0.95 * k);
      p.ring.scale.setScalar(1 + 0.06 * Math.sin(G.time * 18));
    }
    const shell = p.kind === 'shell' || p.kind === 'eshell';
    if ((p.tr += dt) > (shell ? 0.035 : 0.05)) {
      p.tr = 0;
      const st = trailStyle(p.kind);
      fx(x, y, z, st.color, shell ? 0.22 : 0.16, 0.04, shell ? 0.35 : 0.2, st.glow ? 0.7 : 0.45, false, undefined, st.glow ? 'glow' : 'soft');
    }
  }
}
