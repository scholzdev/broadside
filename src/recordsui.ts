// v11 "Logbook & Achievements" menu screen: lifetime stats on top, achievement cards with progress bars below. Menu.ts owns navigation (scroll + back).
import { M } from './meta';
import { SEAS, BOSS_IDS } from './seas';
import { SHIP_IDS, CAPTAIN_IDS } from './loadout';
import { seaName } from './seatext';
import { shipName, capName } from './lname';
import { t } from './i18n';
import { ACHIEVEMENTS, isDone } from './achievements';

const fmtTime = (s: number): string => {
  const n = Math.round(s);
  return n >= 3600 ? t('rec.h', { h: Math.floor(n / 3600), m: Math.floor((n % 3600) / 60) }) : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};
const row = (label: string, v: string | number, cls = ''): string => `<div class="lrow${cls}"><span>${label}</span><b>${v}</b></div>`;

function general(): string {
  const s = M.stats;
  return [
    row(t('log.runs'), s.runs), row(t('log.winloss'), `${s.wins} / ${s.deaths}`), row(t('log.kills'), s.kills), row(t('rec.bossTotal'), BOSS_IDS.reduce((n, id) => n + (s.bossKills[id] ?? 0), 0)),
    row(t('log.doubloons'), s.doubloonsEarned), row(t('rec.playTime'), fmtTime(s.playTime)), row(t('log.bestAct'), s.bestAct), row(t('rec.maxLevel'), s.maxLevel), row(t('rec.evolutions'), s.evolutions),
    row(t('log.fullSails'), s.fullSails), row(t('log.rerolls'), s.rerolls), row(t('log.autoCasts'), s.autoCasts), row(t('log.burned'), s.burned), row(t('log.rams'), s.rams),
    row(t('log.boats'), s.boatsEaten), row(t('log.crates'), s.cratesEaten), row(t('log.huts'), s.hutsEaten), row(t('log.buys'), s.shopBuys), row(t('log.quests'), s.questsDone), row(t('log.damage'), Math.round(s.damageTaken)),
  ].join('');
}
const seas = (): string => SEAS.map((_, i) => {
  const s = M.stats, ft = s.fastestWin[i] ?? 0;
  return row(seaName(i), t('rec.seaRow', { w: s.seaWins[i] ?? 0, h: Math.max(0, (s.bestHeat[i] ?? 0) - 1), e: s.endBest[i] ?? 0, time: ft ? fmtTime(ft) : t('rec.noTime') }), ' stk');
}).join('');
const byId = (ids: readonly string[], runs: Record<string, number>, wins: Record<string, number>, name: (id: string) => string): string =>
  ids.filter(id => (runs[id] ?? 0) > 0).map(id => row(name(id), t('rec.runRow', { r: runs[id], w: wins[id] ?? 0 }))).join('');

function achCard(a: (typeof ACHIEVEMENTS)[number]): string {
  const [c, g] = a.prog(), done = c >= g, p = Math.round(Math.min(1, c / g) * 100);
  const num = g > 1 ? `${Math.min(c, g).toLocaleString()} / ${g.toLocaleString()}` : done ? t('rec.done') : '';
  return `<div class="ach${done ? ' done' : ''}"><div class="an">${done ? '&#10003; ' : ''}${a.name()}</div><div class="ad">${a.desc()}</div><div class="abar"><i style="width:${p}%"></i></div><div class="anum">${num}</div></div>`;
}
export function recordsHtml(): string {
  const n = ACHIEVEMENTS.filter(isDone).length, sh = byId(SHIP_IDS, M.stats.shipRuns, M.stats.shipWins, id => shipName(id as never)), cp = byId(CAPTAIN_IDS, M.stats.capRuns, M.stats.capWins, id => capName(id as never));
  return `<div class="mbox rec"><h2>${t('rec.title')}</h2><div class="rscroll" tabindex="-1">`
    + `<div class="rcols"><div class="rcol"><div class="lcat">${t('rec.s.general')}</div><div class="ulog">${general()}</div></div>`
    + `<div class="rcol"><div class="lcat">${t('rec.s.seas')}</div><div class="ulog">${seas()}</div>`
    + (sh ? `<div class="lcat">${t('rec.s.ships')}</div><div class="ulog">${sh}</div>` : '') + (cp ? `<div class="lcat">${t('rec.s.captains')}</div><div class="ulog">${cp}</div>` : '') + `</div></div>`
    + `<div class="lcat">${t('rec.s.ach')}<span>${t('rec.achCnt', { n, t: ACHIEVEMENTS.length })}</span></div><div class="agrid">${ACHIEVEMENTS.map(achCard).join('')}</div></div>`
    + `<div class="mfoot"><button class="mbtn sel" data-i="0" data-act="back">${t('menu.back')}</button><span class="hint nt">${t('rec.hint')}</span></div></div>`;
}
/** Scrolls the list from Up/Down/PageUp/PageDown/Home/End. Returns true when the key was consumed. */
export function recordsScroll(root: HTMLElement, code: string): boolean {
  const el = root.querySelector<HTMLElement>('.rscroll');
  if (!el) return false;
  const step = code === 'ArrowUp' || code === 'KeyW' ? -70 : code === 'ArrowDown' || code === 'KeyS' ? 70 : code === 'PageUp' ? -el.clientHeight * 0.9 : code === 'PageDown' ? el.clientHeight * 0.9 : 0;
  if (code === 'Home') el.scrollTop = 0; else if (code === 'End') el.scrollTop = el.scrollHeight; else if (step) el.scrollBy({ top: step });
  else return false;
  return true;
}
