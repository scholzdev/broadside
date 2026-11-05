import { G, startRun, togglePause, restartRun, toMainMenu, retireEndless, QUICK } from './game';
import { END } from './heatdefs';
import { L, setLoadout, loadSaved } from './loadout';
import { initShip } from './ship';
import { audio, setVolume } from './audio';
import { deriveStats } from './content';
import { t, onLang } from './i18n';
import { settingsHtml, settingsAct, settingsFocus, settingsLeave, adjustVolume, setBusVolume } from './settingsui';
import { relicName, relicDesc } from './lname';
import { M } from './meta';
import { openUnlocks, unlocksTap, unlocksClick, unlocksHover, DBL } from './unlocks';
import { openLoadout, closeLoadout, loadoutTap, loadoutClick, loadoutHover, measureStage } from './loadoutui';
import { openMap, mapTap, mapClick, mapHover } from './mapui';
import { applySea } from './seatheme';
import { startTutorial } from './tutorial';
import { S } from './settings';

type Screen = 'title' | 'map' | 'loadout' | 'help' | 'pause' | 'unlocks' | 'settings';
let screen: Screen = 'title', idx = 0, settingsFrom: Screen = 'title';
let root: HTMLElement;

const btn = (i: number, act: string, text: string, v = '', cls = ''): string => `<button class="mbtn${cls}" data-i="${i}" data-act="${act}" data-v="${v}">${text}</button>`;

function html(): string {
  switch (screen) {
    case 'title':
      return `<div class="mbox title"><h1>Broadside</h1><p class="sub">${t('title.sub')}</p><div class="dbal">${DBL} <b>${M.doubloons}</b> ${t('doubloons')}</div><div class="mbtns">${btn(0, 'sail', t('menu.sail'))}${btn(1, 'unlocks', t('menu.unlocks'))}${btn(2, 'help', t('menu.help'))}${btn(3, 'settings', t('menu.settings'))}</div></div>`;
    case 'settings':
      return settingsHtml();
    case 'unlocks':
      return '';
    case 'loadout': case 'map':
      return '';
    case 'help': {
      const FS = deriveStats({});
      const hp = { dur: FS.fullDur, spd: FS.fullSpd, cd: Math.round(FS.fullCd) };
      return `<div class="mbox"><h2>${t('help.title')}</h2><ul class="help">${[1, 2, 3, 4, 5, 6, 7].map(n => `<li>${t('help.' + n, hp)}</li>`).join('')}</ul><div class="mbtns">${btn(0, 'back', t('menu.back'))}</div></div>`;
    }
    case 'pause':
      return `<div class="mbox"><h2>${t('menu.paused')}</h2><p class="ctl hk">${t('controls')}</p><p class="ctl hp">${t('controlsPad')}</p>${L.relic ? `<p class="sub">${t('menu.relic', { name: relicName(L.relic), desc: relicDesc(L.relic) })}</p>` : ''}<div class="mbtns">${btn(0, 'resume', t('menu.resume'))}${btn(1, 'settings', t('menu.settings'))}${END.on ? btn(2, 'retire', t('menu.retire')) : ''}${btn(END.on ? 3 : 2, 'restart', t('menu.restart'))}${btn(END.on ? 4 : 3, 'menu', t('menu.main'))}</div></div>`;
  }
}
const count = (): number => root.querySelectorAll('[data-i]').length;

function render(keep = false): void {
  root.innerHTML = html();
  root.dataset.screen = screen;
  root.style.display = 'flex';
  if (!keep) idx = 0;
  if (screen === 'loadout') openLoadout(root);
  if (screen === 'map') openMap(root);
  if (screen === 'unlocks') openUnlocks(root);
  mark();
}
function mark(): void {
  idx = Math.max(0, Math.min(count() - 1, idx));
  root.querySelectorAll<HTMLElement>('[data-i]').forEach(e => { const on = Number(e.dataset.i) === idx; e.classList.toggle('sel', on); });
}
function go(s: Screen, at = 0): void {
  if (screen === 'loadout' && s !== 'loadout') closeLoadout();
  screen = s; render(); idx = at; mark();
}
function setIdx(i: number): void {
  if (i === idx) return;
  idx = i;
  if (screen === 'settings' && settingsFocus(i)) render(true);
  mark();
}

function act(a: string, v: string): void {
  switch (a) {
    case 'sail': go('map'); break;
    case 'help': go('help'); break;
    case 'unlocks': go('unlocks'); break;
    case 'settings': openSettings(); break;
    case 'back': back(); break;
    case 'resume': togglePause(); break;
    case 'tutorial': startTutorial(); break;
    case 'lang': case 'padvib': case 'sound': case 'gfx': case 'shake': case 'nums': case 'arcs': case 'abil': case 'reset': setAct(a); break;
    case 'retire': retireEndless(); break;
    case 'restart': restartRun(); break;
    case 'menu': toMainMenu(); break;
  }
}
function back(): void {
  if (screen === 'settings') { settingsLeave(); screen = settingsFrom; render(); idx = G.state === 'menu' ? 3 : 1; mark(); return; }
  if (screen === 'loadout') go('map');
  else if (screen === 'map' || screen === 'help' || screen === 'unlocks') go('title');
}
function openSettings(): void { settingsFrom = screen; go('settings'); }
/** Esc / P while paused on the settings screen goes back instead of resuming. Returns true when consumed. */
export function menuBack(): boolean { if (screen !== 'settings') return false; back(); return true; }
const SETTING_ACTS = ['lang', 'gfx', 'shake', 'nums', 'arcs', 'abil', 'sound', 'padvib'];
function adjustVol(d: number): void {
  const r = root.querySelector<HTMLInputElement>('.sel input[type=range]');
  if (r) adjustVolume(r, d);
}
/** Applies a settings action and redraws the screen keeping the selection. */
function setAct(a: string, d = 1): void { if (settingsAct(a, d)) render(true); }

/** Keyboard input while the state is 'menu' or 'paused' (fed from stepGame's tap queue). */
export function menuTap(code: string): void {
  if (screen === 'loadout') { if (loadoutTap(code) === 'back' && G.state === 'menu') back(); return; }
  if (screen === 'unlocks') { if (unlocksTap(code) === 'back' && G.state === 'menu') back(); return; }
  if (screen === 'map') { const r = mapTap(code); if (r === 'back') back(); else if (r === 'go') go('loadout'); return; }
  const vertical = screen === 'title' || screen === 'pause' || screen === 'help' || screen === 'settings';
  const prev = code === 'ArrowLeft' || code === 'ArrowUp' || code === 'KeyA' || code === 'KeyW';
  const next = code === 'ArrowRight' || code === 'ArrowDown' || code === 'KeyD' || code === 'KeyS';
  const cur = root.querySelector<HTMLElement>('.sel');
  if (screen === 'settings' && (code === 'ArrowLeft' || code === 'ArrowRight')) {
    const d = code === 'ArrowLeft' ? -1 : 1, a = cur?.dataset.act ?? '';
    if (a === 'vol' || a === 'music' || a === 'sfx' || a === 'paddz') adjustVol(d);
    else if (SETTING_ACTS.includes(a)) setAct(a, d);
    return;
  }
  if (vertical && (code === 'ArrowLeft' || code === 'ArrowRight')) return;
  if (prev) setIdx(Math.max(0, idx - 1));
  else if (next) setIdx(Math.min(count() - 1, idx + 1));
  else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') { if (cur) act(cur.dataset.act ?? '', cur.dataset.v ?? ''); }
  else if (code === 'Escape' && G.state === 'menu') back();
}

export function showPause(): void { screen = 'pause'; render(); }
export function hideMenu(): void { root.style.display = 'none'; }

export function initMenu(): void {
  root = document.getElementById('menu') as HTMLElement;
  const s = loadSaved();
  root.addEventListener('click', e => {
    if (screen === 'loadout') { if (loadoutClick(e.target as HTMLElement) === 'back') back(); return; }
    if (screen === 'unlocks') { if (unlocksClick(e.target as HTMLElement) === 'back') back(); return; }
    if (screen === 'map') { const r = mapClick(e.target as HTMLElement); if (r === 'back') back(); else if (r === 'go') go('loadout'); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (t && t.tagName !== 'INPUT') { if (t.dataset.i !== undefined) setIdx(Number(t.dataset.i)); act(t.dataset.act ?? '', t.dataset.v ?? ''); }
  });
  root.addEventListener('mouseover', e => {
    if (screen === 'loadout') { loadoutHover(e.target as HTMLElement); return; }
    if (screen === 'unlocks') { unlocksHover(e.target as HTMLElement); return; }
    if (screen === 'map') { mapHover(e.target as HTMLElement); return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (t) setIdx(Number(t.dataset.i));
  });
  root.addEventListener('input', e => { const t = e.target as HTMLInputElement; if (t.type === 'range') setBusVolume(t.dataset.act ?? 'vol', Number(t.value) / 100); });
  onLang(() => { if (root.style.display !== 'none') render(true); });
  addEventListener('resize', () => { if (screen === 'loadout') measureStage(); });
  setLoadout(s.ship, s.captain, s);
  initShip();
  if (QUICK) startRun(s.ship, s.captain, s);
  else if (M.stats.runs === 0 && !S.tutDone && !new URLSearchParams(location.search).has('notut')) startTutorial(); // first run: guided tutorial
  else { if (s.sea) applySea(s.sea); go('title'); } // the title and menus float over the chosen sea
}
