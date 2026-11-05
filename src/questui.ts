import { quests } from './quests';
import { questIcon, questText, rewardText, statusText, progress } from './questdefs';
import { t, onLang } from './i18n';

// ---- compact "Quests" panel under the gold/kills/wind readout ----
let host: HTMLElement | null = null, html = '';

export function initQuestUi(parent: HTMLElement): void {
  host = document.createElement('div');
  host.id = 'quests';
  host.className = 'panel';
  parent.appendChild(host);
  onLang(() => { html = ''; });
}
export function updateQuestUi(): void {
  if (!host) return;
  const h = quests.length ? `<div class="qh">${t('q.title')}</div>` + quests.map(q =>
    `<div class="qrow"><span class="qi">${questIcon(q)}</span><div class="qb"><div class="qt">${questText(q)}</div>`
    + `<div class="qbar"><i style="width:${Math.round(progress(q) * 100)}%"></i><em>${statusText(q)}</em></div><div class="qrw">${rewardText(q)}</div></div></div>`).join('') : '';
  if (h === html) return;
  html = h; host.innerHTML = h; host.style.display = h ? 'block' : 'none';
}
