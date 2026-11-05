import * as THREE from 'three';
import { G, startRun, gainXp, xpNeed, toMainMenu } from './game';
import { NO_EXTRAS } from './loadout';
import { spawnEnemy } from './enemies';
import { addEdible, edibles } from './edibles';
import { M } from './meta';
import { S, saveSettings } from './settings';
import { t, onLang } from './i18n';
import { kb } from './prompts';
import { trackArrow, untrack } from './edgearrows';
import { TUT, STEPS } from './tutorialdata';
import './tutorialcss';

// ---- first-run guided tutorial: 7 steps in Calm Seas act 1 (slowed spawner, invulnerable hull). Esc / B asks "Skip tutorial?" ----
interface Pt { x: number; z: number }
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
let acc = 0, prevH = 0, base = 0, lvSeen = false, prevState = 'playing';
const nearest = (list: Pt[]): Pt | null => {
  let best: Pt | null = null, bd = 1e9;
  for (const e of list) { const d = Math.hypot(e.x - G.player.x, e.z - G.player.z); if (d < bd) { bd = d; best = e; } }
  return best;
};
const live = (type: string) => G.enemies.filter(e => !e.dead && e.type === type);
const ahead = (d: number, side = 0): Pt => {
  const p = G.player, h = p.heading;
  return { x: p.x + Math.sin(h) * d + Math.cos(h) * side, z: p.z + Math.cos(h) * d - Math.sin(h) * side };
};

interface Step { init(): void; tick(dt: number): number; target?(): Pt | null } // tick returns progress 0..1 (1 = done)
const SH: Step[] = [
  { init() { acc = 0; prevH = G.player.heading; },
    tick() { acc += Math.abs(wrap(G.player.heading - prevH)); prevH = G.player.heading; return acc / Math.PI; } },
  { init() { acc = 0; },
    tick(dt) { if (G.player.boost) acc += dt; return acc / 1; } },
  { init() { base = G.kills; for (const s of [16, -16]) { const q = ahead(0, s); spawnEnemy('gunboat', q.x, q.z); } },
    tick() { if (G.kills - base < 2 && live('gunboat').length === 0) { const q = ahead(0, 16); spawnEnemy('gunboat', q.x, q.z); } return (G.kills - base) / 2; },
    target: () => nearest(live('gunboat')) },
  { init() { base = M.stats.boatsEaten; for (const [d, s] of [[14, -2], [20, 2], [26, 0]]) { const q = ahead(d, s); addEdible('boat', q.x, q.z); } },
    tick() { if (M.stats.boatsEaten - base < 3 && edibles.filter(e => !e.dead && e.kind === 'boat').length === 0) { const q = ahead(16); addEdible('boat', q.x, q.z); } return (M.stats.boatsEaten - base) / 3; },
    target: () => nearest(edibles.filter(e => !e.dead && e.kind === 'boat')) },
  { init() { base = M.stats.autoCasts; for (const s of [-12, 12]) { const q = ahead(2, s); spawnEnemy('raft', q.x, q.z); } }, // abeam: the broadside (R) has targets
    tick() { return M.stats.autoCasts > base ? 1 : 0; },
    target: () => nearest(live('raft')) },
  { init() { lvSeen = false; TUT.noLevel = false; G.gold = Math.max(G.gold, 40); G.xp = xpNeed(G.level); gainXp(0); lvSeen = G.state === 'levelup'; },
    tick() { if (G.state === 'levelup') lvSeen = true; return lvSeen && G.state === 'playing' ? 1 : 0; } },
  { init() {
      const q = ahead(34); spawnEnemy('boss', q.x, q.z);
      if (G.boss) { G.boss.hp *= 0.5; G.boss.maxHp *= 0.5; }
    },
    tick() { return G.bossSpawned && !G.boss ? 1 : 0; }, target: () => G.boss },
];

// ---- DOM ----
let panel: HTMLElement, dlg: HTMLElement, mark: HTMLElement, hlEl: Element | null = null, prog = 0, shownStep = -2, doneShown = false;
const v = new THREE.Vector3();
function build(): void {
  if (panel) return;
  panel = document.createElement('div'); panel.id = 'tut';
  dlg = document.createElement('div'); dlg.id = 'tutdlg';
  mark = document.createElement('div'); mark.id = 'tutmark'; mark.innerHTML = '<i></i>';
  document.body.append(panel, dlg, mark);
  dlg.addEventListener('click', e => { const b = (e.target as HTMLElement).closest('button'); if (b) { if (b.id === 'tutyes') finish(true); else closeConfirm(); } });
  panel.addEventListener('click', e => { const id = (e.target as HTMLElement).closest('button')?.id; if (id === 'tutend') finish(false); else if (id === 'tutskip') openConfirm(); });
}
const hints = (): Record<string, string> => ({ k: kb(['A / D', 'Shift', '', '', 'Q', '1 / 2 / 3', ''][TUT.step], ['LS', 'RT', '', '', 'LB', 'A', ''][TUT.step]), a: kb('E', 'RB'), r: kb('R', 'Y') });
function render(): void {
  if (!TUT.active) { panel.style.display = 'none'; dlg.style.display = 'none'; mark.style.display = 'none'; return; }
  const n = STEPS.length, s = STEPS[Math.min(TUT.step, n - 1)];
  panel.style.display = 'block';
  panel.className = TUT.step === 5 ? 'low' : '';
  document.body.classList.toggle('tutlow', TUT.active && !TUT.done && TUT.step === 5);
  panel.innerHTML = TUT.done
    ? `<h3>${t('tut.end.t')}</h3><p>${t('tut.end.b')}</p><button id="tutend" class="tutbtn">${t('tut.end.btn')}</button>`
    : `<small>${t('tut.step', { n: TUT.step + 1, m: n })}</small><h3>${t(`tut.${s.id}.t`)}</h3><p>${t(`tut.${s.id}.b`, hints())}</p><div class="tbar"><i></i></div><button id="tutskip" class="tutlnk">${kb('Esc', 'B')} ${t('tut.skipKey')}</button>`;
  hlEl?.classList.remove('tuthl');
  hlEl = !TUT.done && s.hl ? document.querySelector(s.hl) : null;
  hlEl?.classList.add('tuthl');
  doneShown = TUT.done; shownStep = TUT.step; prog = -1;
}
onLang(() => { if (TUT.active) { build(); render(); renderConfirm(); } });

function renderConfirm(): void {
  dlg.style.display = TUT.confirm ? 'flex' : 'none';
  dlg.innerHTML = `<div class="box"><h3>${t('tut.skip.t')}</h3><p>${t('tut.skip.b')}</p><div class="row"><button id="tutyes" class="tutbtn">${kb('Enter', 'A')} ${t('tut.skip.yes')}</button><button id="tutno" class="tutbtn">${kb('Esc', 'B')} ${t('tut.skip.no')}</button></div></div>`;
}
function openConfirm(): void {
  if (TUT.confirm) return;
  TUT.confirm = true; prevState = G.state;
  if (G.state === 'playing') G.state = 'paused'; // freezes the sim without opening the pause menu; the dialog restores the state
  renderConfirm();
}
function closeConfirm(): void {
  TUT.confirm = false;
  if (G.state === 'paused' && prevState === 'playing') G.state = 'playing';
  renderConfirm();
}
function finish(skipped: boolean): void {
  S.tutDone = true; saveSettings();
  TUT.active = false; TUT.confirm = false; G.god = false;
  untrack('tut');
  toMainMenu();
}

/** Begins the tutorial run (Calm Seas, Galleon + Old Salt). The run does not count: first-run detection stays true until the tutorial is finished or skipped. */
export function startTutorial(): void {
  build();
  const runs = M.stats.runs;
  startRun('galleon', 'salt', NO_EXTRAS);
  M.stats.runs = runs;
  TUT.active = true; TUT.done = false; TUT.step = 0; TUT.confirm = false; TUT.spawnMul = 0.25; TUT.noLevel = true;
  G.god = true; G.bossTimer = 150;
  trackArrow('tut', () => (TUT.active && !TUT.done ? SH[TUT.step].target?.() ?? null : null), 'quest');
  SH[0].init(); render();
}
/** Debug: jump to step n (1-based) and run its setup. */
export function jumpTutorial(n: number): void {
  if (!TUT.active || n < 1 || n > SH.length) return;
  TUT.step = n - 1; TUT.done = false; TUT.noLevel = TUT.step !== 5;
  SH[TUT.step].init(); render();
}
/** Leaves tutorial mode without finishing (another run was started). */
export function stopTutorial(): void { document.body.classList.remove('tutlow'); if (TUT.active) G.god = false; TUT.active = false; TUT.confirm = false; TUT.noLevel = false; TUT.spawnMul = 1; untrack('tut'); if (panel) render(); }

/** Taps are offered here before the normal handling; true = consumed. Esc asks to skip, Enter / Space / Y confirm, Esc / N cancel. */
export function tutTap(c: string): boolean {
  if (!TUT.active) return false;
  if (TUT.confirm) {
    if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyY') finish(true);
    else if (c === 'Escape' || c === 'KeyN') closeConfirm();
    return true;
  }
  if (TUT.done && (c === 'Enter' || c === 'NumpadEnter')) { finish(false); return true; }
  if (c === 'Escape' && (G.state === 'playing' || G.state === 'levelup' || G.state === 'loot')) { openConfirm(); return true; }
  return false;
}

/** Per sim step (also while a card screen is open). */
export function stepTutorial(dt: number): void {
  if (!TUT.active || TUT.confirm || G.state === 'paused' || G.state === 'menu') return;
  if (G.state === 'dead' || G.state === 'won') return;
  if (!G.bossSpawned) G.bossTimer = 150; // frozen at a normal-looking 2:30 until step 7 sends the boss
  if (TUT.done) { G.lootT = 0; return; }
  const p = SH[TUT.step].tick(dt);
  if (p < 1) { prog = p; return; }
  TUT.step++;
  TUT.noLevel = TUT.step !== 5 ? true : false;
  if (TUT.step >= SH.length) { TUT.done = true; G.lootT = 0; TUT.noLevel = true; render(); return; }
  SH[TUT.step].init(); render();
}

/** Per render frame: progress bar, marker above the current target. */
export function updateTutMark(cam: THREE.Camera, w: number, h: number): void {
  if (!panel) return;
  if (TUT.active && (shownStep !== TUT.step || doneShown !== TUT.done)) render();
  if (!TUT.active) return;
  const bar = panel.querySelector<HTMLElement>('.tbar i');
  if (bar) bar.style.width = Math.round(Math.max(0, Math.min(1, prog)) * 100) + '%';
  const tg = TUT.done || TUT.confirm || G.state !== 'playing' ? null : SH[TUT.step].target?.() ?? null;
  if (!tg) { mark.style.display = 'none'; return; }
  v.set(tg.x, 3, tg.z).project(cam);
  const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
  const on = x > 20 && x < w - 20 && y > 40 && y < h - 20;
  mark.style.display = on ? 'block' : 'none';
  mark.style.transform = `translate(${x - 14}px, ${y - 46}px)`;
}
