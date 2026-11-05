import { G, gainXp } from './game';
import { R, bump } from './meta';
import { play } from './audio';
import { popText } from './juice';
import { fx } from './particles';
import { t } from './i18n';
import { trackArrow } from './edgearrows';
import { toast } from './seaquests';
import { Quest, rollQuest, isDone, isFailed, progress, questText, rewardText, bossNear, NODMG_T } from './questdefs';
import { showMark, hideMark, animateMark } from './questmark';

// ---- in-run quests (v8 pass 4): up to two short live objectives; a finished one pays out and a fresh one rolls 5 s later ----
const MAX = 2, REFILL = 5;
export const quests: Quest[] = [];
const waits: number[] = [];
let lastDmg = 0, bossOffered = false;

trackArrow('quest:treasure', () => { const q = quests.find(x => x.kind === 'treasure'); return q ? q : null; }, 'treasure');
trackArrow('quest:battery', () => {
  if (!quests.some(x => x.kind === 'battery')) return null;
  let best: { x: number; z: number } | null = null, bd = Infinity;
  for (const e of G.enemies) if (e.type === 'battery' && !e.dead) { const d = Math.hypot(e.x - G.player.x, e.z - G.player.z); if (d < bd) { bd = d; best = e; } }
  return best;
}, 'quest');

function syncMark(): void {
  const q = quests.find(x => x.kind === 'treasure');
  if (q) showMark(q.x, q.z); else hideMark();
}
function add(q: Quest): void {
  quests.push(q);
  if (q.kind === 'boss') bossOffered = true;
  if (q.kind === 'nodmg') lastDmg = R.c.damageTaken ?? 0;
  syncMark();
}
/** Empties the panel and rolls `n` fresh quests (new run, new act). */
export function resetQuests(n = MAX): void {
  quests.length = 0; waits.length = 0; bossOffered = false;
  lastDmg = R.c.damageTaken ?? 0;
  for (let i = 0; i < n; i++) { const q = rollQuest(quests); if (q) add(q); else waits.push(REFILL); }
  syncMark();
}
function remove(q: Quest): void {
  quests.splice(quests.indexOf(q), 1);
  waits.push(REFILL);
  syncMark();
}

function burst(): void {
  const p = G.player;
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
    fx(p.x, 2, p.z, i % 3 ? 0xffd84a : 0xfff2a6, 0.35, 0.05, 0.9 + Math.random() * 0.4, 1, false, { vx: Math.sin(a) * s, vy: 4 + Math.random() * 5, vz: Math.cos(a) * s, g: -11 });
  }
}
function pay(q: Quest): void {
  switch (q.rk) {
    case 'gold': G.gold += q.ra; break;
    case 'xp': gainXp(q.ra / G.st.xpMul); break; // gainXp applies the XP multiplier: this adds exactly the shown amount
    case 'reroll': G.freeRolls++; break;
    case 'dbl': R.qd += q.ra; break;
    case 'recharge': for (const m of G.modules) { m.charges = m.maxCharges; m.cd = 0; } break;
  }
}
/** Finishes a quest: reward, toast, sound, coin burst, stats. */
export function completeQuest(q: Quest): void {
  if (!quests.includes(q)) return;
  pay(q);
  R.qn++; bump('questsDone');
  remove(q);
  toast(`<small>${t('q.done')}</small><b>${questText(q)}</b><span>${rewardText(q)}</span>`);
  popText(G.player.x, 5, G.player.z, rewardText(q), 'gold');
  play('coin'); play('levelup');
  burst();
}

/** Per sim step while playing (paused states never get here). */
export function stepQuests(dt: number): void {
  animateMark(G.time);
  const dmg = R.c.damageTaken ?? 0;
  const hit = dmg > lastDmg;
  lastDmg = dmg;
  for (const q of [...quests]) {
    if (q.kind === 'nodmg') q.t = hit ? 0 : Math.min(NODMG_T, q.t + dt);
    else if (q.kind === 'gold' || q.kind === 'treasure') q.t -= dt;
    if (isDone(q)) completeQuest(q);
    else if (isFailed(q)) { remove(q); popText(G.player.x, 4, G.player.z, t('q.failed'), 'hurt'); }
  }
  // the boss just arrived: offer its quest right away, bumping the least advanced quest if the panel is full
  if (!bossOffered && G.boss && bossNear()) {
    const q = quests.some(x => x.kind === 'boss') ? null : rollQuest(quests, 'boss');
    if (q) {
      if (quests.length >= MAX) { const w = quests.reduce((a, b) => (progress(b) < progress(a) ? b : a)); quests.splice(quests.indexOf(w), 1); }
      add(q);
    }
  }
  for (let i = waits.length - 1; i >= 0; i--) {
    if ((waits[i] -= dt) > 0) continue;
    const q = quests.length < MAX ? rollQuest(quests) : null;
    if (q) { add(q); waits.splice(i, 1); } else if (quests.length >= MAX) waits.splice(i, 1); else waits[i] = 1;
  }
}

/** Debug view: deep copy with progress. */
export const questView = () => quests.map(q => ({ ...q, progress: progress(q), text: questText(q), reward: rewardText(q) }));
