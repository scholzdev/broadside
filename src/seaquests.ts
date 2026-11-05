import { G } from './game';
import { SEAS, SeaQuest } from './seas';
import { M, R } from './meta';
import { play } from './audio';
import { popText } from './juice';
import { questText } from './seatext';
import { t } from './i18n';

// ---- sea quests: one-time challenges per sea, finished within a single run; paid once ever in settleRun ----

export const questVal = (q: SeaQuest): number => (q.stat === 'act' ? R.act : R.c[q.stat] ?? 0);
const met = (q: SeaQuest): boolean => questVal(q) >= q.n && !(q.unless && (R.c[q.unless] ?? 0) > 0) && !(q.maxTime && G.time > q.maxTime);

let toastEl: HTMLElement | null = null, toastT = 0;
export function toast(html: string): void {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'toast'; document.getElementById('hud')?.appendChild(toastEl); }
  toastEl.innerHTML = html;
  toastEl.classList.remove('on'); void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = window.setTimeout(() => toastEl?.classList.remove('on'), 3800);
}

/** Marks newly met quests of the current sea (cheap: three checks). Called every sim step and before the run settles. */
export function checkSeaQuests(): void {
  for (const q of SEAS[G.sea].quests) {
    if (R.quests.includes(q.id) || M.seaQuests.includes(q.id) || !met(q)) continue;
    R.quests.push(q.id);
    toast(`<small>${t('sq.done')}</small><b>${questText(q)}</b><span>+${q.reward} &#10687;</span>`);
    popText(G.player.x, 5, G.player.z, t('sq.pop'), 'gold');
    play('levelup');
  }
}
/** Debug view of the current sea's quests. */
export const seaQuestView = () => SEAS[G.sea].quests.map(q => ({ id: q.id, stat: q.stat, value: questVal(q), n: q.n, reward: q.reward, thisRun: R.quests.includes(q.id), paid: M.seaQuests.includes(q.id) }));
