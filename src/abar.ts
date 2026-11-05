import { G } from './game';
import { L } from './loadout';
import { MODS, MAX_MOD_LV, SLOT_ORDER } from './modules';
import { modLevel } from './modstats';
import { activeCdMax, manualDeny } from './abilities';
import { S } from './settings';
import { spellCd } from './spells';
import { SPELLS } from './spelldata';
import { portrait } from './portraits';
import { ICON, modIcon } from './icons';
import { t } from './i18n';
import { spellName, spellText, modName, modActive } from './lname';
import { isEvolved, evoBadge, evoClass } from './evolutions';

// ---- bottom-center ability bar: Full Sail (SHIFT), the captain spell (SPACE), then one AUTO icon per module with cooldown sweep, ready glow and level ----
let host: HTMLElement | null = null, sig = '';
interface Cell { el: HTMLElement; sweep: HTMLElement; lv: HTMLElement; chg: HTMLElement; last: string }
let cells: Cell[] = [], spellCell: Cell | null = null, sailCell: Cell | null = null;
const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');

export function initAbar(): void { host = document.getElementById('abar'); }
// manual mode: the first three module cells carry the Q / E / R (LB / Y / B) badge; a refused cast shakes the cell
const MKEYS: [string, string][] = [['Q', 'LB'], ['E', 'Y'], ['R', 'B']];
const style = document.createElement('style');
style.textContent = '@keyframes abno { 0%,100% { transform:translateX(0) } 25% { transform:translateX(-3px) } 75% { transform:translateX(3px) } } .ab.no { animation:abno .25s; box-shadow:inset 0 0 0 2px #ff5a4a, 0 0 8px #ff5a4a; } .ab .ak.mk { background:#f4e6bf; color:#000; font-weight:bold; z-index:2; }';
document.head.appendChild(style);
manualDeny.f = (i: number): void => {
  const c = cells[i];
  if (!c) return;
  c.el.classList.remove('no'); void c.el.offsetWidth; c.el.classList.add('no');
  setTimeout(() => c.el.classList.remove('no'), 300);
};
/** Forces the next updateAbar to rebuild the markup (after a language change). */
export const resetAbar = (): void => { sig = ''; };

const cell = (el: Element): Cell => ({ el: el as HTMLElement, sweep: el.querySelector('.sw') as HTMLElement, lv: el.querySelector('.al') as HTMLElement, chg: el.querySelector('.ac') as HTMLElement, last: '' });

export function updateAbar(): void {
  if (!host) return;
  const mods = [...G.modules].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.idx - b.idx);
  const s = L.captain + '|' + S.manual + '|' + mods.map(m => m.id + m.slot + m.idx + (isEvolved(m.id) ? '*' : '')).join();
  if (s !== sig) {
    sig = s;
    const sp = SPELLS[L.captain];
    host.innerHTML = `<div class="ab big fs" style="--c:#f6d06a" title="${t('ab.fullSailTip')}"><span class="ag">${ICON.sail}</span><i class="sw"></i><b class="ak" data-p="RT">SHIFT</b><span class="ac"></span><span class="sn">${t('ab.fullSail')}</span></div>`
      + `<div class="ab big sp" style="--c:${hex(sp.color)}" title="${spellName(L.captain)}: ${spellText(L.captain)}">${portrait(L.captain)}<i class="sw"></i><b class="ak" data-p="RB">SPACE</b><span class="ac"></span><span class="sn">${spellName(L.captain)}</span></div>` + mods.map((m, i) => {
      const d = MODS[m.id], mk = S.manual && i < 3 ? MKEYS[i] : null;
      return `<div class="ab${evoClass(m.id)}" style="--c:${hex(d.color)}" title="${modName(m.id)}: ${modActive(m.id).name}">${evoBadge(m.id)}<i class="sw"></i>${mk ? `<b class="ak mk" data-p="${mk[1]}">${mk[0]}</b>` : '<b class="ak">AUTO</b>'}<span class="ag">${modIcon(m.id)}</span><span class="al"></span><span class="ac"></span></div>`;
    }).join('');
    cells = [...host.children].slice(2).map(cell); // (evoBadge adds an <i> inside the cell; the cell is still the child)
    sailCell = cell(host.children[0]);
    spellCell = cell(host.children[1]);
  }
  if (sailCell) {
    const p = G.player, on = p.boost, frac = 1 - p.nitro, key = `${Math.round(frac * 100)}|${on}`;
    if (key !== sailCell.last) {
      sailCell.last = key;
      sailCell.sweep.style.setProperty('--p', Math.round(frac * 100) + '%');
      sailCell.el.classList.toggle('rdy', !on && frac <= 0.001);
      sailCell.el.classList.toggle('on', on);
      sailCell.el.classList.toggle('cd', !on && frac > 0.001);
      sailCell.chg.textContent = frac > 0 ? Math.round(p.nitro * 100) + '%' : '';
    }
  }
  if (spellCell) {
    const { cd, cdMax } = spellCd(), frac = cdMax > 0 ? Math.min(1, cd / cdMax) : 0, key = `${Math.round(frac * 100)}|${cd > 0}|${cd.toFixed(0)}`;
    if (key !== spellCell.last) {
      spellCell.last = key;
      spellCell.sweep.style.setProperty('--p', Math.round(frac * 100) + '%');
      spellCell.el.classList.toggle('rdy', cd <= 0);
      spellCell.el.classList.toggle('cd', cd > 0);
      spellCell.chg.textContent = cd > 0 ? cd.toFixed(cd < 10 ? 1 : 0) : '';
    }
  }
  mods.forEach((m, i) => {
    const c = cells[i], lv = modLevel(G.modStats[m.id]), ready = m.charges > 0;
    const frac = m.charges >= m.maxCharges ? 0 : Math.min(1, Math.max(0, m.cd / activeCdMax(m)));
    const key = `${Math.round(frac * 100)}|${ready}|${lv}|${m.charges}|${m.maxCharges}`;
    if (key === c.last) return;
    c.last = key;
    c.sweep.style.setProperty('--p', Math.round(frac * 100) + '%');
    c.el.classList.toggle('rdy', ready);
    c.el.classList.toggle('max', lv >= MAX_MOD_LV);
    c.el.classList.toggle('cd', frac > 0 && !ready);
    c.lv.textContent = 'Lv' + lv;
    c.chg.textContent = m.maxCharges > 1 ? String(m.charges) : (frac > 0 && !ready ? (m.cd).toFixed(m.cd < 10 ? 1 : 0) : '');
  });
}
