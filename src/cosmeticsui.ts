// v10 Decorations tab inside the Loadout screen: five rows (sails, hull paint, flag, figurehead, wake), detail card with buy / equip,
// and a live preview on the 3D loadout ship (the focused item is shown even while locked, but never carried into a run).
import { t } from './i18n';
import { M } from './meta';
import { DBL, LOCK } from './unlocks';
import { ICON } from './icons';
import { initShip } from './ship';
import { L } from './loadout';
import { PLAYER_SHIPS } from './fleet';
import { emblemTexture } from './rig';
import { DECO_SLOTS, DecoItem, DecoSlot, decosOf, owns, equippedId, buyDeco, equipDeco, PREVIEW, achDone } from './cosmetics';

let host: HTMLElement | null = null, redraw: () => void = () => {}, fr = 0, fc = 0, uid = 0;

const hex = (c: number): string => '#' + c.toString(16).padStart(6, '0');
export const decoName = (d: DecoItem): string => t('deco.' + d.id);
const own = () => PLAYER_SHIPS[L.ship];

// ---- icons ----
function sailIcon(base: number, alt: number, pat: string): string {
  const id = 'dsc' + uid++;
  const cells: string[] = [];
  const W = 36, H = 40, X = 14, Y = 12;
  if (pat === 'stripes') for (let i = 1; i < 6; i += 2) cells.push(`<rect x="${X + (i * W) / 6}" y="${Y}" width="${W / 6}" height="${H}"/>`);
  else if (pat === 'band') cells.push(`<rect x="${X}" y="${Y + H * 0.25}" width="${W}" height="${H * 0.3}"/>`);
  else if (pat === 'quarter') cells.push(`<rect x="${X + W / 2}" y="${Y}" width="${W / 2}" height="${H / 2}"/><rect x="${X}" y="${Y + H / 2}" width="${W / 2}" height="${H / 2}"/>`);
  else if (pat === 'border') cells.push(`<rect x="${X}" y="${Y}" width="${W * 0.17}" height="${H}"/><rect x="${X + W * 0.83}" y="${Y}" width="${W * 0.17}" height="${H}"/><rect x="${X}" y="${Y + H * 0.75}" width="${W}" height="${H * 0.25}"/>`);
  const shape = 'M14 12 H50 Q56 32 50 52 H14 Q8 32 14 12Z';
  return `<svg class="ico dico" viewBox="0 0 64 64"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs>
    <rect x="30.5" y="4" width="3" height="58" fill="#6b4424"/><rect x="10" y="9" width="44" height="3.5" rx="1.5" fill="#5b3b1f"/>
    <g clip-path="url(#${id})"><rect x="0" y="0" width="64" height="64" fill="${hex(base)}"/><g fill="${hex(alt)}">${cells.join('')}</g>
    <path d="M14 12 Q32 30 14 52" fill="none" stroke="#0002" stroke-width="5"/></g><path d="${shape}" fill="none" stroke="#1a1208" stroke-width="2.2"/></svg>`;
}
function hullIcon(h: { hull: number; trim?: number; accent?: number; bottom?: number }): string {
  const id = 'dhc' + uid++, shape = 'M4 24 L60 20 Q58 40 46 50 L14 50 Q6 42 4 24Z';
  const tr = h.trim ?? 0x2a1a0e, ac = h.accent ?? tr, bo = h.bottom ?? 0x5e2a1f;
  return `<svg class="ico dico" viewBox="0 0 64 64"><defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs><g clip-path="url(#${id})">
    <rect width="64" height="64" fill="${hex(h.hull)}"/><rect y="18" width="64" height="5" fill="${hex(ac)}"/><rect y="30" width="64" height="6" fill="${hex(tr)}"/>
    ${[14, 26, 38, 50].map(x => `<rect x="${x}" y="31.5" width="4" height="3" fill="#0008"/>`).join('')}<rect y="43" width="64" height="12" fill="${hex(bo)}"/></g>
    <path d="${shape}" fill="none" stroke="#1a1208" stroke-width="2.2"/><path d="M2 50 Q10 46 18 50 T34 50 T50 50 T66 50" fill="none" stroke="#9fd6ff" stroke-width="2.5" opacity=".8"/></svg>`;
}
const flagUrls = new Map<string, string>();
function flagIcon(color: number, emblem: Parameters<typeof emblemTexture>[1]): string {
  const k = color + emblem;
  let u = flagUrls.get(k);
  if (!u) { u = (emblemTexture(color, emblem).image as HTMLCanvasElement).toDataURL(); flagUrls.set(k, u); }
  return `<img class="dflag" src="${u}" alt="">`;
}
const FIG_SVG: Record<string, string> = {
  mermaid: '<path d="M30 30 Q22 44 30 54 Q36 58 28 62 L44 60 Q38 54 40 46 Q42 36 36 30Z" fill="#2a8f7e" stroke="#1a1208" stroke-width="2"/><path d="M28 30 Q26 22 33 20 Q40 22 38 30 Z" fill="#e3b48c" stroke="#1a1208" stroke-width="2"/><circle cx="33" cy="14" r="7" fill="#e3b48c" stroke="#1a1208" stroke-width="2"/><path d="M26 14 Q24 4 34 5 Q44 6 40 16 Q46 26 40 32 Q40 20 36 12 Q30 10 26 14Z" fill="#b8402a" stroke="#1a1208" stroke-width="1.8"/><path d="M29 6 l2 -4 l2 3 l2 -4 l2 4" fill="none" stroke="#f2c14e" stroke-width="2"/>',
  eagle: '<path d="M32 26 Q14 16 4 22 Q14 26 18 34 Q24 32 32 36 Q40 32 46 34 Q50 26 60 22 Q50 16 32 26Z" fill="#d9a93a" stroke="#1a1208" stroke-width="2"/><ellipse cx="32" cy="40" rx="8" ry="14" fill="#5a3a22" stroke="#1a1208" stroke-width="2"/><circle cx="32" cy="20" r="8" fill="#f0ece0" stroke="#1a1208" stroke-width="2"/><path d="M36 20 L46 24 L36 26Z" fill="#e8b230" stroke="#1a1208" stroke-width="1.6"/><circle cx="34" cy="18" r="1.6" fill="#111"/>',
  skull: '<path d="M10 54 L54 14 M10 14 L54 54" stroke="#e9e1c9" stroke-width="7" stroke-linecap="round"/><path d="M10 54 L54 14 M10 14 L54 54" stroke="#1a1208" stroke-width="1" opacity=".4"/><path d="M18 30 Q18 12 32 12 Q46 12 46 30 Q46 38 40 40 L40 48 L24 48 L24 40 Q18 38 18 30Z" fill="#e9e1c9" stroke="#1a1208" stroke-width="2"/><circle cx="26" cy="29" r="5" fill="#141210"/><circle cx="38" cy="29" r="5" fill="#141210"/><circle cx="26" cy="29" r="1.8" fill="#4dff7a"/><circle cx="38" cy="29" r="1.8" fill="#4dff7a"/><path d="M30 38 L32 34 L34 38Z" fill="#141210"/>',
  kraken: '<g fill="none" stroke="#6b3a8a" stroke-width="5" stroke-linecap="round"><path d="M24 36 Q12 46 16 58"/><path d="M28 38 Q24 50 30 60"/><path d="M36 38 Q40 50 34 60"/><path d="M40 36 Q52 46 48 58"/></g><ellipse cx="32" cy="24" rx="14" ry="16" fill="#6b3a8a" stroke="#1a1208" stroke-width="2"/><circle cx="26" cy="28" r="4" fill="#ffd23a"/><circle cx="38" cy="28" r="4" fill="#ffd23a"/><rect x="25.2" y="25.5" width="1.6" height="5" fill="#111"/><rect x="37.2" y="25.5" width="1.6" height="5" fill="#111"/>',
  dragon: '<path d="M14 58 Q10 36 22 26 Q26 18 36 16 L54 22 Q56 28 50 30 L40 30 Q34 34 32 44 Q30 52 34 58Z" fill="#2f7a46" stroke="#1a1208" stroke-width="2"/><path d="M30 18 L22 4 L36 15Z" fill="#e8dcc0" stroke="#1a1208" stroke-width="1.6"/><circle cx="38" cy="22" r="2.6" fill="#ff3a1a"/><path d="M42 30 l2 3 l2 -3 l2 3" fill="none" stroke="#e8dcc0" stroke-width="1.6"/><path d="M18 34 l-4 -3 M17 42 l-5 -1 M17 50 l-5 1" stroke="#d9a93a" stroke-width="3" stroke-linecap="round"/>',
};
const figIcon = (k: string): string => `<svg class="ico dico" viewBox="0 0 64 64">${FIG_SVG[k] ?? ''}</svg>`;
function wakeIcon(w: number | 'rainbow'): string {
  const id = 'dwc' + uid++, col = w === 'rainbow' ? `url(#${id})` : hex(w);
  const grad = w === 'rainbow' ? `<defs><linearGradient id="${id}"><stop offset="0" stop-color="#ff5a5a"/><stop offset=".25" stop-color="#ffd34a"/><stop offset=".5" stop-color="#3cf0a0"/><stop offset=".75" stop-color="#5aa0ff"/><stop offset="1" stop-color="#c07aff"/></linearGradient></defs>` : '';
  return `<svg class="ico dico" viewBox="0 0 64 64">${grad}<path d="M32 8 L40 22 L24 22Z" fill="#7a4626" stroke="#1a1208" stroke-width="2"/>
    <g fill="none" stroke="${col}" stroke-linecap="round"><path d="M26 24 Q18 40 8 58" stroke-width="5"/><path d="M38 24 Q46 40 56 58" stroke-width="5"/><path d="M30 28 Q28 42 24 56" stroke-width="3" opacity=".7"/><path d="M34 28 Q36 42 40 56" stroke-width="3" opacity=".7"/></g></svg>`;
}
export function decoIcon(d: DecoItem): string {
  const o = own();
  switch (d.slot) {
    case 'sail': return d.sail ? sailIcon(d.sail.base, d.sail.alt, d.sail.pat) : sailIcon(o.sail, o.sailStripe ?? o.sail, o.sailStripe !== undefined ? 'stripes' : 'plain');
    case 'hull': return hullIcon(d.hull?.hull !== undefined ? (d.hull as { hull: number }) : o);
    case 'flag': return d.flag ? flagIcon(d.flag.color, d.flag.emblem) : flagIcon(o.flag ?? 0x141416, o.emblem ?? 'skull');
    case 'fig': return d.fig ? figIcon(d.fig) : ICON.none;
    default: return wakeIcon(d.wake ?? 0xffffff);
  }
}

// ---- screen ----
const rowItems = (r: number): DecoItem[] => decosOf(DECO_SLOTS[r]);
const slotName = (s: DecoSlot): string => t('deco.slot.' + s);
const chosenIdx = (r: number): number => Math.max(0, rowItems(r).findIndex(d => d.id === equippedId(DECO_SLOTS[r])));

/** Loadout / Decorations tab switch for the loadout header. */
export const decoTabs = (on: boolean): string =>
  `<div class="ltabs"><button class="ltab${on ? '' : ' on'}" tabindex="-1" data-act="ltab" data-v="lo">${t('deco.tab.lo')}</button><button class="ltab${on ? ' on' : ''}" tabindex="-1" data-act="ltab" data-v="deco">${t('deco.tab')}</button></div>`;

function btn(r: number, c: number, d: DecoItem): string {
  const lk = !owns(d.id);
  return `<div class="lbtn dbtn d-${d.slot}${d.id === equippedId(d.slot) ? ' on' : ''}${lk ? ' lk' : ''}" data-act="dpick" data-r="${r}" data-c="${c}" title="${decoName(d)}">
    <span class="lic">${decoIcon(d)}</span>${lk ? `<span class="llock">${ICON.lock}</span><span class="lprice">${d.cost}${DBL}</span>` : ''}</div>`;
}
/** The five rows that replace the loadout rows while the tab is open. */
export function decoRows(): string {
  return DECO_SLOTS.map((s, r) => {
    const eq = rowItems(r).find(d => d.id === equippedId(s));
    return `<div class="lgrp"><div class="lcat">${slotName(s)}<span>${eq ? decoName(eq) : ''}</span></div><div class="lbtns">${rowItems(r).map((d, c) => btn(r, c, d)).join('')}</div></div>`;
  }).join('');
}

function lockHtml(d: DecoItem): string {
  const can = M.doubloons >= d.cost;
  let req = `<div class="lockreq"><span class="lk">${LOCK}</span> ${d.cost} ${DBL}`;
  if (d.ach) {
    const [a, b] = d.ach.prog(), p = Math.round(Math.min(1, a / b) * 100);
    req += ` ${t('un.or')} ${d.ach.text()}</div><div class="sr"><div class="sb"><i style="width:${p}%"></i></div><b>${Math.min(Math.floor(a), b)} / ${b}</b></div>`;
  } else req += '</div>';
  return `<div class="lbuy"><button class="ubtn" tabindex="-1" data-act="dbuy" ${can ? '' : 'disabled'}>${t('lo.buy', { n: d.cost, dbl: DBL })}</button>${req}</div>`;
}
function detailHtml(): string {
  const d = rowItems(fr)[fc], on = d.id === equippedId(d.slot);
  const how = d.cost === 0 ? t('deco.free') : d.ach && achDone(d) ? t('deco.earned') : '';
  const state = owns(d.id) ? `<div class="lstate${on ? ' on' : ''}">${on ? t('deco.equipped') : t('deco.equip')}</div>` : lockHtml(d);
  return `<div class="lbig dbig d-${d.slot}">${decoIcon(d)}</div><div class="lkind">${slotName(d.slot)}</div><h3>${decoName(d)}</h3>
    <div class="ltext"><p>${t('deco.desc.' + d.slot)}</p>${how ? `<div class="lsub">${how}</div>` : ''}<div class="lsub">${t('deco.preview')}</div></div>${state}`;
}

/** Shows the focused item on the 3D ship (rebuilds only when the shown look changes). */
function preview(): void {
  const d = rowItems(fr)[fc], want = d.id === equippedId(d.slot) ? null : d.slot;
  if (want === PREVIEW.slot && (!want || PREVIEW.id === d.id)) return;
  PREVIEW.slot = want; PREVIEW.id = want ? d.id : '';
  initShip();
}
function focus(r: number, c: number): void {
  if (!host) return;
  fr = Math.max(0, Math.min(DECO_SLOTS.length - 1, r));
  fc = Math.max(0, Math.min(rowItems(fr).length - 1, c));
  host.querySelectorAll<HTMLElement>('.dbtn').forEach(e => e.classList.toggle('foc', Number(e.dataset.r) === fr && Number(e.dataset.c) === fc));
  host.querySelectorAll<HTMLElement>('.lgrp').forEach((e, i) => e.classList.toggle('cur', i === fr));
  const det = host.querySelector('#ldet');
  if (det) det.innerHTML = detailHtml();
  host.querySelector('.dbtn.foc')?.scrollIntoView({ block: 'nearest' });
  preview();
}
/** After the loadout screen rendered the tab: wire focus and the detail card. `rd` re-renders the whole screen. */
export function decoMount(h: HTMLElement, rd: () => void): void { host = h; redraw = rd; focus(fr, fc); }
/** Entering the tab focuses the equipped sail. */
export function decoEnter(): void { fr = 0; fc = chosenIdx(0); }
/** Drop the locked-item preview (leaving the tab, the screen, or setting sail) and rebuild the ship if it was showing one. */
export function decoLeave(): void {
  host = null;
  if (!PREVIEW.slot) return;
  PREVIEW.slot = null; PREVIEW.id = '';
  initShip();
}

function activate(): void {
  const d = rowItems(fr)[fc];
  if (!owns(d.id) && !buyDeco(d.id)) return;
  equipDeco(d.id);
  redraw();
}
export function decoTap(code: string): void {
  const n = rowItems(fr).length, rows = DECO_SLOTS.length;
  if (code === 'Tab') focus((fr + 1) % rows, chosenIdx((fr + 1) % rows));
  else if (code === 'ArrowUp' || code === 'KeyW') focus(fr - 1, chosenIdx(Math.max(0, fr - 1)));
  else if (code === 'ArrowDown' || code === 'KeyS') focus(fr + 1, chosenIdx(Math.min(rows - 1, fr + 1)));
  else if (code === 'ArrowLeft' || code === 'KeyA') focus(fr, (fc - 1 + n) % n);
  else if (code === 'ArrowRight' || code === 'KeyD') focus(fr, (fc + 1) % n);
  else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') activate();
}
/** Returns true when the click was a Decorations control. */
export function decoClick(el: HTMLElement): boolean {
  const a = el.closest<HTMLElement>('[data-act]');
  if (!a) return false;
  if (a.dataset.act === 'dpick') {
    const r = Number(a.dataset.r), c = Number(a.dataset.c);
    focus(r, c);
    if (owns(rowItems(r)[c].id) && rowItems(r)[c].id !== equippedId(DECO_SLOTS[r])) activate();
    return true;
  }
  if (a.dataset.act === 'dbuy') { activate(); return true; }
  return false;
}
export function decoHover(el: HTMLElement): void {
  const b = el.closest<HTMLElement>('.dbtn');
  if (b) { const r = Number(b.dataset.r), c = Number(b.dataset.c); if (r !== fr || c !== fc) focus(r, c); }
}
