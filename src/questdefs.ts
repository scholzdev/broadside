import { G, xpNeed } from './game';
import { R } from './meta';
import { SEAS } from './seas';
import { ACTS, EnemyType } from './content';
import { islands, reefAt } from './world';
import { t } from './i18n';
import { enemyName } from './lname';
import { ICON } from './icons';

// ---- in-run quests: kinds, parameter rolls, rewards, progress and texts (state and stepping live in quests.ts) ----
export type QKind = 'sink' | 'boats' | 'gold' | 'nodmg' | 'boss' | 'treasure' | 'battery' | 'spell';
export type RKind = 'gold' | 'xp' | 'reroll' | 'dbl' | 'recharge';
export interface Quest {
  kind: QKind; type?: EnemyType; n: number;
  /** Run counter value when the quest started (counter quests count the difference). */
  base: number;
  /** Seconds: left (gold, treasure) or survived (nodmg). */
  t: number; limit: number;
  rk: RKind; ra: number;
  /** Treasure spot and the start distance (progress bar). */
  x: number; z: number; d0: number;
}
export const NODMG_T = 30, GOLD_T = 60, BOSS_T = 60, TREASURE_T = 45, TREASURE_R = 4;
const SINK_N: Partial<Record<EnemyType, number>> = { gunboat: 10, raft: 8, brig: 5, ketch: 4, swarm: 14, serpent: 3, minelayer: 4, ghost: 4, fireship: 5 };
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const scale = (): number => 1 + 0.12 * (G.act - 1);
const ICONS: Record<QKind, keyof typeof ICON> = { sink: 'skull', boats: 'sail', gold: 'coin', nodmg: 'none', boss: 'star', treasure: 'anchor', battery: 'crosshair', spell: 'wheel' };
export const questIcon = (q: Quest): string => ICON[ICONS[q.kind]];

export const poolTypes = (): EnemyType[] => [...new Set(SEAS[G.sea].pools[Math.min(3, G.act - 1)].map(r => r[0]))];
/** The boss quest is offered shortly before the boss arrives, or right after it spawned. */
export const bossNear = (): boolean => G.act < ACTS && ((!G.bossSpawned && G.bossTimer <= 40) || (!!G.boss && G.time - G.bossT0 < 10));

function rollReward(q: Quest): void {
  const kinds: RKind[] = ['gold', 'xp', 'reroll', 'dbl'];
  if (G.modules.length) kinds.push('recharge');
  q.rk = kinds[Math.floor(Math.random() * kinds.length)];
  q.ra = q.rk === 'gold' ? Math.round(rnd(20, 40) * scale()) : q.rk === 'xp' ? Math.max(3, Math.round(xpNeed(G.level) * rnd(0.35, 0.6)))
    : q.rk === 'dbl' ? Math.round(rnd(10, 25) * scale()) : 1;
}
function spot(q: Quest): boolean {
  const p = G.player;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * Math.PI * 2, d = rnd(50, 80), x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
    if (islands.some(o => Math.hypot(o.x - x, o.z - z) < o.r + 7) || reefAt(x, z, 5)) continue;
    q.x = x; q.z = z; q.d0 = d;
    return true;
  }
  return false;
}
/** Rolls a quest of a kind not already active (sink: a type not already hunted); null if nothing fits. */
export function rollQuest(active: Quest[], force?: QKind): Quest | null {
  const has = (k: QKind): boolean => active.some(q => q.kind === k);
  const sc = scale(), types = poolTypes().filter(ty => SINK_N[ty] && !active.some(q => q.type === ty));
  const kinds: QKind[] = ['boats', 'gold', 'nodmg', 'treasure', 'spell'];
  if (types.length) kinds.push('sink', 'sink');
  if (poolTypes().includes('battery')) kinds.push('battery');
  if (bossNear()) kinds.push('boss', 'boss', 'boss');
  const ok = force ? [force] : kinds.filter(k => !has(k));
  const kind = ok[Math.floor(Math.random() * ok.length)];
  if (!kind) return null;
  const q: Quest = { kind, n: 1, base: 0, t: 0, limit: 0, rk: 'gold', ra: 0, x: 0, z: 0, d0: 1 };
  const c = (k: string): number => R.c[k] ?? 0;
  if (kind === 'sink') { q.type = types[Math.floor(Math.random() * types.length)]; q.n = Math.max(2, Math.round(SINK_N[q.type]! * sc * rnd(0.8, 1.2))); q.base = c('kill:' + q.type); }
  else if (kind === 'boats') { q.n = Math.round(rnd(4, 7) * sc); q.base = c('boatsEaten'); }
  else if (kind === 'gold') { q.n = Math.round(rnd(30, 45) * sc); q.base = R.gold; q.limit = q.t = GOLD_T; }
  else if (kind === 'nodmg') { q.limit = NODMG_T; q.base = c('damageTaken'); }
  else if (kind === 'boss') q.base = c('boss');
  else if (kind === 'treasure') { if (!spot(q)) return null; q.limit = q.t = TREASURE_T; }
  else if (kind === 'battery') q.base = c('kill:battery');
  else q.n = Math.round(rnd(10, 16) * sc), q.base = c('spellHit');
  rollReward(q);
  return q;
}

const cnt = (q: Quest): number => {
  const c = (k: string): number => R.c[k] ?? 0;
  switch (q.kind) {
    case 'sink': return c('kill:' + q.type) - q.base;
    case 'boats': return c('boatsEaten') - q.base;
    case 'gold': return R.gold - q.base;
    case 'battery': return c('kill:battery') - q.base;
    case 'spell': return c('spellHit') - q.base;
    case 'boss': return c('boss') - q.base;
    default: return 0;
  }
};
/** 0..1 */
export function progress(q: Quest): number {
  if (q.kind === 'nodmg') return Math.min(1, q.t / q.limit);
  if (q.kind === 'treasure') return Math.max(0, Math.min(1, 1 - Math.hypot(G.player.x - q.x, G.player.z - q.z) / q.d0));
  if (q.kind === 'boss') return G.boss ? Math.max(0, 1 - G.boss.hp / G.boss.maxHp) : cnt(q) > 0 ? 1 : 0;
  return Math.min(1, cnt(q) / q.n);
}
export function isDone(q: Quest): boolean {
  switch (q.kind) {
    case 'nodmg': return q.t >= q.limit;
    case 'treasure': return Math.hypot(G.player.x - q.x, G.player.z - q.z) < TREASURE_R;
    case 'boss': return cnt(q) > 0 && G.time - G.bossT0 <= BOSS_T;
    default: return cnt(q) >= q.n;
  }
}
export const isFailed = (q: Quest): boolean =>
  ((q.kind === 'gold' || q.kind === 'treasure') && q.t <= 0) || (q.kind === 'boss' && G.bossSpawned && G.time - G.bossT0 > BOSS_T);

const mmss = (s: number): string => `${Math.floor(Math.ceil(s) / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;
export const questText = (q: Quest): string => t('q.' + q.kind, { n: q.n, name: q.type ? enemyName(q.type) : '', s: q.kind === 'gold' ? GOLD_T : q.kind === 'nodmg' ? NODMG_T : q.kind === 'boss' ? BOSS_T : TREASURE_T });
export const rewardText = (q: Quest): string => t('qr.' + q.rk, { n: q.ra });
/** Short status next to the bar: count and/or time. */
export function statusText(q: Quest): string {
  if (q.kind === 'nodmg') return `${Math.floor(q.t)} / ${q.limit} s`;
  if (q.kind === 'treasure') return mmss(q.t);
  if (q.kind === 'boss') return G.boss ? mmss(Math.max(0, BOSS_T - (G.time - G.bossT0))) : G.bossSpawned ? '' : t('q.soon');
  if (q.kind === 'battery') return '';
  return `${Math.min(cnt(q), q.n)} / ${q.n}` + (q.kind === 'gold' ? ` &middot; ${mmss(q.t)}` : '');
}
