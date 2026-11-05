// Daily Voyage screen (menu.ts): today's fixed setup, the local best and the sail button.
import { t } from './i18n';
import { shipName, capName, modName } from './lname';
import { seaName } from './seatext';
import { dailyCfg, loadDaily, DailyBest } from './dailyrun';
import { DAILY_DATE } from './daily';

const parts = (): { y: string; m: string; d: string } => { const [y, m, d] = DAILY_DATE.split('-'); return { y, m, d }; };
export const dailyDateText = (): string => t('daily.date', parts());
export const dailyTag = (): string => { const { m, d } = parts(); return t('daily.tag', { m, d }); };
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const dailyBestText = (b: DailyBest): string =>
  t(b.won ? 'daily.bestWon' : 'daily.bestLost', { t: mmss(b.time), a: b.act, k: b.kills, d: b.doubloons });

export function dailyHtml(): string {
  const c = dailyCfg(), x = c.extras, s = loadDaily();
  const row = (k: string, v: string): string => `<div><span>${k}</span><b>${v}</b></div>`;
  return `<div class="mbox daily"><h2>${t('daily.title')}</h2><p class="sub">${t('daily.dateLine', { date: dailyDateText() })}</p>
    <div class="dbreak">${row(t('daily.ship'), shipName(c.ship))}${row(t('daily.captain'), capName(c.captain))}${row(t('daily.sea'), seaName(x.sea))}${row(t('heat.title'), x.heat ? `${x.heat}` : '-')}${x.startModule ? row(t('daily.module'), modName(x.startModule)) : ''}</div>
    <div class="dbreak"><div><span>${t('daily.best')}</span></div><div class="dbest">${s.best ? dailyBestText(s.best) : t('daily.none')}</div><div><span>${t('daily.attempts', { n: s.attempts })}</span></div></div>
    <p class="ctl">${t('daily.note')}</p>
    <div class="mbtns"><button class="mbtn" data-i="0" data-act="dailygo" data-v="">${t('daily.sail')}</button><button class="mbtn" data-i="1" data-act="back" data-v="">${t('menu.back')}</button></div></div>`;
}
