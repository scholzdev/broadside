import { G } from './game';
import { L } from './loadout';
import { MODS, MAX_MOD_LV, Owned } from './modules';
import { modLevel } from './modstats';
import { activeCdMax, slotDeny, sortedMods, SLOT_KEYS, CastSlot } from './abilities';
import { spellCd } from './spells';
import { SPELLS } from './spelldata';
import { portrait } from './portraits';
import { ICON, modIcon } from './icons';
import { t } from './i18n';
import { spellName, spellText, modName, modActive } from './lname';
import { isEvolved, evoBadge, evoClass } from './evolutions';

// ---- bottom-center ability bar: Full Sail (SHIFT), the captain spell (casts itself, no key), then the Q / E / R slot groups (bow / stern / sides)
// with one icon per mounted module: cooldown sweep, ready glow, level. Deck modules have no active and no cell. ----
let host: HTMLElement | null = null, sig = '';
interface Cell { el: HTMLElement; sweep: HTMLElement; lv: HTMLElement; chg: HTMLElement; last: string }
let cells: { m: Owned; c: Cell }[] = [], spellCell: Cell | null = null, sailCell: Cell | null = null;
const groups = new Map<CastSlot, HTMLElement>();
const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');

export function initAbar(): void { host = document.getElementById('abar'); }
const style = document.createElement('style');
style.textContent = `@keyframes abno { 0%,100% { transform:translateX(0) } 25% { transform:translateX(-3px) } 75% { transform:translateX(3px) } }
#abar .abg { display:flex; flex-direction:column; align-items:center; gap:2px; padding:2px 3px 1px; border-radius:10px; background:#0004; box-shadow:inset 0 0 0 1px #d9b45c55; }
#abar .abg.no { animation:abno .25s; box-shadow:inset 0 0 0 2px #ff5a4a, 0 0 8px #ff5a4a; }
#abar .abg .abc { display:flex; gap:3px; }
#abar .abg .abh { display:flex; align-items:center; gap:4px; font-size:9px; font-weight:bold; line-height:13px; color:var(--parch2); white-space:nowrap; }
#abar .abg .abh .sk { display:inline-block; min-width:13px; padding:0 3px; border-radius:4px; background:#f4e6bf; color:#000; font-size:10px; line-height:13px; text-align:center; }
body.pad #abar .abg .abh .sk::before { min-width:16px; height:14px; padding:0 4px; font-size:9px; line-height:12px; }
#abar .abg.empty { opacity:.45; filter:grayscale(1); }
#abar .ab.none { background:#0f2037; box-shadow:inset 0 0 0 1px #6b5a3a88; }`;
document.head.appendChild(style);
slotDeny.f = (slot: CastSlot): void => {
  const g = groups.get(slot);
  if (!g) return;
  g.classList.remove('no'); void g.offsetWidth; g.classList.add('no');
  setTimeout(() => g.classList.remove('no'), 300);
};
/** Forces the next updateAbar to rebuild the markup (after a language change). */
export const resetAbar = (): void => { sig = ''; };

const cell = (el: Element): Cell => ({ el: el as HTMLElement, sweep: el.querySelector('.sw') as HTMLElement, lv: el.querySelector('.al') as HTMLElement, chg: el.querySelector('.ac') as HTMLElement, last: '' });
const modCell = (m: Owned): string => `<div class="ab${evoClass(m.id)}" style="--c:${hex(MODS[m.id].color)}" title="${modName(m.id)}: ${modActive(m.id).name}">${evoBadge(m.id)}<i class="sw"></i><span class="ag">${modIcon(m.id)}</span><span class="al"></span><span class="ac"></span></div>`;

export function updateAbar(): void {
  if (!host) return;
  const mods = sortedMods();
  const s = L.captain + '|' + mods.map(m => m.id + m.slot + m.idx + (isEvolved(m.id) ? '*' : '')).join();
  if (s !== sig) {
    sig = s;
    const sp = SPELLS[L.captain];
    host.innerHTML = `<div class="ab big fs" style="--c:#f6d06a" title="${t('ab.fullSailTip')}"><span class="ag">${ICON.sail}</span><i class="sw"></i><b class="ak" data-p="RT">SHIFT</b><span class="ac"></span><span class="sn">${t('ab.fullSail')}</span></div>`
      + `<div class="ab big sp" style="--c:${hex(sp.color)}" title="${spellName(L.captain)}: ${spellText(L.captain)} (${t('ab.spellAuto')})">${portrait(L.captain)}<i class="sw"></i><span class="ac"></span><span class="sn">${spellName(L.captain)}</span></div>`
      + SLOT_KEYS.map(k => {
        const own = mods.filter(m => m.slot === k.slot);
        return `<div class="abg${own.length ? '' : ' empty'}" data-s="${k.slot}" title="${t('ab.slotTip', { k: k.key, s: t('slot.' + k.slot) })}"><div class="abc">${own.length ? own.map(modCell).join('') : '<div class="ab none"></div>'}</div><span class="abh"><b class="sk" data-p="${k.pad}">${k.key}</b>${t('abs.' + k.slot)}</span></div>`;
      }).join('');
    sailCell = cell(host.children[0]);
    spellCell = cell(host.children[1]);
    groups.clear(); cells = [];
    for (const g of host.querySelectorAll<HTMLElement>('.abg')) {
      const slot = g.dataset.s as CastSlot, own = mods.filter(m => m.slot === slot);
      groups.set(slot, g);
      [...g.querySelectorAll('.abc > .ab:not(.none)')].forEach((el, i) => cells.push({ m: own[i], c: cell(el) }));
    }
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
  for (const { m, c } of cells) {
    const lv = modLevel(G.modStats[m.id]), ready = m.charges > 0;
    const frac = m.charges >= m.maxCharges ? 0 : Math.min(1, Math.max(0, m.cd / activeCdMax(m)));
    const key = `${Math.round(frac * 100)}|${ready}|${lv}|${m.charges}|${m.maxCharges}`;
    if (key === c.last) continue;
    c.last = key;
    c.sweep.style.setProperty('--p', Math.round(frac * 100) + '%');
    c.el.classList.toggle('rdy', ready);
    c.el.classList.toggle('max', lv >= MAX_MOD_LV);
    c.el.classList.toggle('cd', frac > 0 && !ready);
    c.lv.textContent = 'Lv' + lv;
    c.chg.textContent = m.maxCharges > 1 ? String(m.charges) : (frac > 0 && !ready ? (m.cd).toFixed(m.cd < 10 ? 1 : 0) : '');
  }
}
