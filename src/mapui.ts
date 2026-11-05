// Sea Chart (v8): a parchment chart with the four seas on a dotted route. Title -> Set Sail -> Sea Chart -> Loadout -> run.
// Choosing a sea saves it in the loadout and re-themes the live world behind the menus.
import { SEAS, SEA_COUNT, seaEnemies } from './seas';
import { M, seaOpen, heatUnlocked, heatCleared } from './meta';
import { HEAT_MAX, HEAT_DBL } from './heatdefs';
import { heatName, heatText } from './heattext';
import { loadSaved, saveLoadout } from './loadout';
import { t } from './i18n';
import { pad } from './input';
import { bossName, enemyName } from './lname';
import { seaName, seaFlavor, hazardName, hazardText, questText, seaLock } from './seatext';
import { SEA_EMBLEM, skullIcon } from './seaicons';
import { ICON } from './icons';
import { DBL } from './unlocks';
import { applySea } from './seatheme';
import { worldSea } from './world';

/** Emblem centres on the chart (percent of the chart box), joined by the dotted route in this order. */
const POS: [number, number][] = [[14, 56], [38, 20], [62, 56], [86, 20]];
const HZ_ICON: Record<string, string> = { none: '&#9728;', reef: '&#10040;', fog: '&#9729;', eruption: '&#9650;' };
let host: HTMLElement, foc = 0, heat = 0;

const best = (i: number): number => M.stats.seaBest[i] ?? 0;
const cleared = (i: number): boolean => (M.stats.seaWins[i] ?? 0) > 0;
const mult = (i: number, h = 0): string => '&times;' + +(SEAS[i].dblMul * HEAT_DBL[h]).toFixed(3);
const skulls = (i: number): string => Array.from({ length: 5 }, (_, k) => skullIcon(k < SEAS[i].difficulty, ICON.skull)).join('');

function region(i: number): string {
  const s = SEAS[i], open = seaOpen(i), [x, y] = POS[i];
  const hc = heatCleared(i), hk = hc > 0 ? ` <span class="shc" title="${t('heat.cleared', { n: hc })}">${ICON.skull}${hc}</span>` : '';
  const stat = !open ? `<span class="slk">${ICON.lock} ${t('map.locked')}</span>` : cleared(i) ? `<span class="sok">&#10003; ${t('map.cleared')}</span>${hk}` : best(i) ? t('map.best', { n: best(i) }) : t('map.bestNone');
  return `<div class="sreg${open ? '' : ' lk'}${i === foc ? ' foc' : ''}" data-act="mpick" data-s="${i}" style="left:${x}%;top:${y}%">
    <div class="semb">${SEA_EMBLEM[i]}${cleared(i) ? '<span class="schk">&#10003;</span>' : ''}${open ? '' : `<span class="slock">${ICON.lock}</span>`}</div>
    <div class="sname">${seaName(i)}</div><div class="smul">${DBL} ${mult(i)}</div><div class="sstat">${stat}</div>
    <div class="shz">${HZ_ICON[s.hazard]} ${hazardName(s.hazard)}</div><div class="sen">${seaEnemies(i).map(enemyName).join(', ')}</div></div>`;
}
/** Heat selector: level 0 plus 5 skulls (locked ones greyed), the active mechanics and the doubloon multiplier. */
function heatBox(i: number): string {
  const unl = heatUnlocked(i), mech = Array.from({ length: heat }, (_, k) => `<li><b>${ICON.skull}${k + 1} ${heatName(k + 1)}</b> ${heatText(k + 1)}</li>`).join('');
  const sk = Array.from({ length: HEAT_MAX }, (_, k) => `<span class="skl hs${k + 1 <= heat ? ' on' : ''}${k + 1 > unl ? ' lk' : ''}" data-act="mheat" data-h="${k + 1}" title="${k + 1 > unl ? t('heat.lock', { n: k }) : t('heat.skull', { n: k + 1 })}">${ICON.skull}</span>`).join('');
  return `<div class="sheat"><div class="shh"><b>${t('heat.sel')}</b><span class="shm">${DBL} ${mult(i, heat)}</span></div>
    <div class="shsk"><span class="hs0${heat === 0 ? ' on' : ''}" data-act="mheat" data-h="0" title="${t('heat.base')}">0</span>${sk}<small>${t('heat.hint')}</small></div>
    <ul class="shl">${mech || `<li>${t('heat.base')}</li>`}</ul></div>`;
}
function detail(): string {
  const i = foc, s = SEAS[i], open = seaOpen(i);
  const quests = s.quests.map(q => { const done = M.seaQuests.includes(q.id); return `<li class="${done ? 'done' : ''}"><span class="qk">${done ? '&#10003;' : '&#9675;'}</span><span>${questText(q)}</span><b>+${q.reward} ${DBL}</b></li>`; }).join('');
  return `<div class="sban">${seaName(i)}</div>
    <div class="srow2"><div><small>${t('map.diff')}</small><div class="skls">${skulls(i)}</div></div><div class="sdbl"><small>${t('doubloons')}</small><b>${DBL} ${mult(i, open ? heat : 0)}</b></div></div>
    <p class="sflav">${seaFlavor(i)}</p>
    ${open ? heatBox(i) : ''}
    <div class="sline"><b>${t('map.hazard')}:</b> ${hazardName(s.hazard)} &middot; ${hazardText(s.hazard)}</div>
    <div class="sline"><b>${t('map.enemies')}:</b> ${seaEnemies(i).map(enemyName).join(', ')}</div>
    <div class="sline"><b>${t('map.bosses')}:</b> ${s.bosses.map(b => bossName(b)).join(' &rarr; ')}</div>
    <div class="sline small">${t('map.scale', { h: s.hpMul, d: s.dmgMul })} &middot; ${best(i) ? t('map.best', { n: best(i) }) : t('map.bestNone')}${M.stats.endBest[i] ? ' &middot; ' + t('map.endBest', { n: M.stats.endBest[i] }) : ''}</div>
    <div class="sqh">${t('map.quests')} <small>${t('map.qhint')}</small></div><ul class="sqs">${quests}</ul>
    ${open ? '' : `<div class="sreq">${ICON.lock} ${seaLock(i)}</div>`}
    <button class="lsail sgo${open ? '' : ''}" tabindex="-1" data-act="mgo" ${open ? '' : 'disabled'}>${t('map.go')}</button>`;
}
function route(): string {
  const pts = POS.map(([x, y]) => `${x * 10},${y * 6}`).join(' ');
  return `<svg class="sroute" viewBox="0 0 1000 600" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#7a4a1c" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/></svg>
    <svg class="scomp" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="#7a4a1c" stroke-width="2"/><path fill="#7a4a1c" d="M50 6L56 50L50 94L44 50Z"/><path fill="#b98a3e" d="M6 50L50 44L94 50L50 56Z"/><text x="50" y="5" font-size="11" text-anchor="middle" fill="#5a3a10">N</text></svg>`;
}
export function mapHtml(): string {
  return `<div class="smap"><div class="ltop"><button class="mbtn lback" tabindex="-1" data-act="back">${t('map.back')}</button><h2>${t('map.title')}</h2><div class="dbal">${DBL} <b>${M.doubloons}</b> ${t('doubloons')}</div></div>
    <div class="sbody"><div class="chart">${route()}${SEAS.map((_, i) => region(i)).join('')}</div><div class="card sdet" id="sdet">${detail()}</div></div>
    <div class="hint"><span class="nt">${t('map.hint')}</span><span class="ht">${t('map.hintTouch')}</span></div></div>`;
}
function draw(): void { host.innerHTML = mapHtml(); }
function focus(i: number): void {
  foc = (i + SEA_COUNT) % SEA_COUNT;
  heat = Math.min(heat, heatUnlocked(foc));
  host.querySelectorAll<HTMLElement>('.sreg').forEach(e => e.classList.toggle('foc', Number(e.dataset.s) === foc));
  const d = host.querySelector('#sdet');
  if (d) d.innerHTML = detail();
}
function setHeat(h: number): void {
  if (h < 0 || h > heatUnlocked(foc)) { host.querySelector('.sheat')?.animate([{ marginLeft: '-5px' }, { marginLeft: '5px' }, { marginLeft: '0' }], { duration: 200 }); return; }
  heat = h;
  focus(foc);
}
/** Picks the focused sea: saved into the loadout, world re-themed. Returns false when it is locked. */
function pick(): boolean {
  if (!seaOpen(foc)) { host.querySelector('.sreg.foc')?.animate([{ marginLeft: '-6px' }, { marginLeft: '6px' }, { marginLeft: '0' }], { duration: 220 }); return false; }
  const s = loadSaved();
  saveLoadout(s.ship, s.captain, { startModule: s.startModule, relic: s.relic, crew: s.crew, sea: foc, heat });
  if (worldSea() !== foc) applySea(foc);
  return true;
}

export function openMap(root: HTMLElement): void {
  host = root;
  const sv = loadSaved();
  foc = sv.sea; heat = sv.heat;
  draw();
}
/** Keyboard on the chart: 'back' = leave to the title, 'go' = continue to the loadout. */
export function mapTap(code: string): 'back' | 'go' | void {
  if (code === 'Escape') return 'back';
  if (code === 'KeyQ' || code === 'KeyE') { setHeat(heat + (code === 'KeyE' ? 1 : -1)); return; }
  if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') focus(foc - 1);
  else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS' || code === 'Tab') focus(foc + 1);
  else if ((code === 'Enter' || code === 'NumpadEnter' || code === 'Space') && pick()) return 'go';
}
export function mapClick(el: HTMLElement): 'back' | 'go' | void {
  const a = el.closest<HTMLElement>('[data-act]');
  if (!a) return;
  if (a.dataset.act === 'back') return 'back';
  if (a.dataset.act === 'mgo') return pick() ? 'go' : undefined;
  if (a.dataset.act === 'mheat') { setHeat(Number(a.dataset.h)); return; }
  if (a.dataset.act === 'mpick') { const i = Number(a.dataset.s); if (i === foc) return pick() ? 'go' : undefined; focus(i); }
}
export function mapHover(el: HTMLElement): void {
  if (pad.lastInput === 'touch') return; // compat mouseover fires before the tap's click: first tap focuses, second sails
  const r = el.closest<HTMLElement>('.sreg');
  if (r && Number(r.dataset.s) !== foc) focus(Number(r.dataset.s));
}
