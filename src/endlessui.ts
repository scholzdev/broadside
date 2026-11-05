import { t } from './i18n';
import { END, ENDLESS_T } from './heatdefs';
import { G } from './game';

// ---- Endless mode UI: the "Retire / Sail On" overlay after the act-4 boss, and the HUD step label ----
let box: HTMLElement | null = null;

export function showChoice(onPick: (sail: boolean) => void): void {
  if (!box) {
    box = document.createElement('div');
    box.id = 'choice';
    box.addEventListener('click', e => {
      const id = ((e.target as HTMLElement).closest('button') as HTMLElement | null)?.id;
      if (id === 'chRetire') onPick(false); else if (id === 'chSail') onPick(true);
    });
    (document.getElementById('hud') ?? document.body).appendChild(box);
  }
  box.innerHTML = `<div class="box"><h1>${t('endless.title')}</h1><p>${t('endless.text')}</p>
    <div class="chopts"><button id="chRetire"><b>${t('endless.retire')}</b><small>${t('endless.retireText')}</small><kbd>1</kbd></button>
    <button id="chSail" class="primary"><b>${t('endless.sail')}</b><small>${t('endless.sailText')}</small><kbd>2</kbd></button></div></div>`;
  box.style.display = 'flex';
}
export function hideChoice(): void { if (box) box.style.display = 'none'; }

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;
/** HUD fragment for the endless step counter, live doubloons and the time to the next step ('' outside endless). */
export function endlessLabel(): string {
  if (!END.on) return '';
  const next = G.boss ? '' : ` &middot; ${t('endless.next', { t: mmss(Math.max(0, ENDLESS_T - END.t)) })}`;
  return `<span class="endl">&infin; ${t('endless.hud', { n: END.step })} &middot; +${Math.floor(END.dbl)} &#10687;${next}</span>`;
}
