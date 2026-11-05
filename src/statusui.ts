import { PS } from './pstatus';
import { ICON } from './icons';
import { t } from './i18n';

// Small player-status icons under the hull bar (slow, burn) with a draining timer ring.
const FLAME = '<svg class="ico" viewBox="0 0 64 64"><path fill="#ff7a1a" stroke="#2a1208" stroke-width="3" d="M32 4C38 18 52 24 50 42C49 54 41 60 32 60C23 60 14 54 14 42C14 32 22 28 24 18C28 24 30 26 32 4Z"/><path fill="#ffd36a" d="M32 30C36 38 42 42 40 50C38 56 26 56 24 50C22 44 28 40 32 30Z"/></svg>';
let el: HTMLElement | null = null, last = '';
export function updateStatusIcons(): void {
  el ??= document.getElementById('pstat');
  if (!el) return;
  const slow = PS.slowT > 0, burn = PS.burnT > 0, key = `${slow}|${burn}`;
  if (key !== last) {
    last = key;
    el.innerHTML = (slow ? `<span class="psi slow" title="${t('st.slow')}">${ICON.anchor}</span>` : '') + (burn ? `<span class="psi burn" title="${t('st.burn')}">${FLAME}</span>` : '');
  }
}
