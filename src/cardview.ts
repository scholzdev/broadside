// Level-up card markup (v7): ribbon banner, round medallion with a rendered 3D thumbnail (thumbs.ts), type badge between module glyph and track level, stat lines, rarity frame.
import { G } from './game';
import { Card, StatLine, fmtVal } from './cards';
import { MODS } from './modules';
import { L } from './loadout';
import { t } from './i18n';
import { modName, modInfo, modActive, slotName, statLabel } from './lname';
import { ICON, modIcon, upgradeIcon, shipIcon, crewIcon } from './icons';
import { crewName } from './lname';
import { shopPrice, buyBlock } from './loot';
import type { CrewId } from './relics';
import { thumb, img } from './thumbs';
import { MAX_CREW_LV } from './crewdefs';
import { evoCardHtml } from './evoui';
import { cardSynergyHtml } from './synergies';

const TYPE = {
  auto: { icon: ICON.crosshair }, ability: { icon: ICON.star }, newmod: { icon: ICON.plus }, ship: { icon: ICON.wheel }, crew: { icon: ICON.skull }, evo: { icon: ICON.star },
} as const;

export const line = (l: StatLine): string =>
  `<div class="ln${l.special ? ' sp' : ''}${l.worse ? ' wo' : ''}"><span class="fr">${fmtVal(l, l.from)}</span><span class="ar">&rarr;</span><b class="to">${fmtVal(l, l.to)}</b><i class="dir">${l.worse ? '&#9660;' : ''}</i><span class="lb">${statLabel(l.label)}</span></div>`;
/** Side effects that are not a stat change (e.g. "Heal 25 HP"), styled like the special lines. */
export const noteLine = (n: string): string => `<div class="ln nt">${n}</div>`;

function body(c: Card): string {
  if (c.kind === 'newmod' && c.mod) {
    const m = MODS[c.mod];
    return `<p class="cinfo">${modInfo(m.id)}</p><div class="cact"><b>${modActive(m.id).name}</b> <small>${m.active.cd}s</small><br>${modActive(m.id).text}</div><div class="cslot">${slotName(m.slot)}</div>`;
  }
  if (!c.lines.length) return `<p class="cinfo">${c.text}</p>`;
  return `<div class="lines">${c.lines.map(line).join('')}${(c.notes ?? []).map(noteLine).join('')}</div>${c.unlock ? `<div class="cunl">${t(c.kind === 'crew' ? 'card.advUnlock' : 'card.lv4', { x: c.unlock })}</div>` : ''}`;
}

export function cardHtml(c: Card, i: number): string {
  if (c.kind === 'evo') return evoCardHtml(c, i);
  const ty = TYPE[c.kind], mod = c.mod ? MODS[c.mod] : null;
  const title = mod ? modName(mod.id) : c.kind === 'crew' && c.crew?.op === 'train' ? crewName(c.ref as CrewId) : c.title.replace(/\s*\(\d+\/\d+\)$/, '');
  const level = c.trackLevel ?? (c.kind === 'ship' ? (G.lv[c.ref] ?? 0) + 1 : 1);
  const frame = c.rarity ? 'r-' + c.rarity : 'r-brass';
  const color = mod ? '#' + mod.color.toString(16).padStart(6, '0') : '#f6d06a';
  const tk = mod ? 'mod:' + mod.id : c.kind === 'crew' ? crewThumb(c) : 'up:' + c.ref.replace('h:', ''), ready = thumb(tk) !== null;
  // 3D thumbnail when rendered, else the flat icon until thumbs.ts swaps the thumbnail in
  const medal = ready ? img(tk) : cardIcon(c);
  const rar = c.rarity ? t('rar.' + c.rarity) : c.kind === 'ship' ? t('card.shipUp') : t('card.newMount');
  return `<div class="card ucard ${frame} k-${c.kind}" style="--i:${i};--mc:${color}" data-i="${i}">
    <div class="ribbon"><span>${title}</span></div>
    <i class="stud tl"></i><i class="stud tr"></i><i class="stud bl"></i><i class="stud br"></i>
    <div class="medal"><div class="mi"${ready ? '' : ` data-thumb="${tk}"`}>${medal}</div></div>
    <div class="trow"><span class="mini">${mod ? modIcon(mod.id) : shipIcon(L.ship)}</span><span class="tbadge">${ty.icon}</span><span class="tlv">${level}</span></div>
    <div class="tlabel">${t('card.type.' + c.kind)}</div>
    <div class="cbody">${body(c)}${cardSynergyHtml(c)}</div>
    <div class="rar">${rar}</div><span class="k">${i + 1}</span></div>`;
}

/** Crew card thumbnail key: three figures of the type; a train card reaching Lv 5 shows the advanced form's accent. */
const crewThumb = (c: Card): string => 'crew:' + c.ref + (c.crew?.op === 'train' && c.crew.to >= MAX_CREW_LV ? ':5' : '');
const cardIcon = (c: Card): string => (c.mod ? modIcon(c.mod) : c.kind === 'crew' ? crewIcon(c.ref as CrewId) : upgradeIcon(c.ref));

/** Compact buy-row tile: icon, title, first two stat lines, gold price plate and the key (4 / 5). */
export function buyHtml(c: Card | null, i: number): string {
  const block = buyBlock(c), key = i + 4;
  if (!c) return `<div class="btile sold" data-b="${i}"><span class="bk">${key}</span><div class="bt"><b>${t('buy.sold')}</b></div></div>`;
  const title = c.mod ? modName(c.mod) : c.kind === 'crew' ? c.title : c.title.replace(/\s*\(\d+\/\d+\)$/, '');
  const bk = c.mod ? 'mod:' + c.mod : c.kind === 'crew' ? crewThumb(c) : 'up:' + c.ref.replace('h:', ''), bReady = thumb(bk) !== null; // 3D thumbnail like the main cards, flat icon until it is rendered
  const sub = c.lines.length ? c.lines.slice(0, 1).map(line).join('') : `<div class="ln nt">${c.mod ? slotName(MODS[c.mod].slot) : ''}</div>`;
  return `<div class="btile r-${c.rarity ?? 'brass'}${block ? ' ' + block : ''}" data-b="${i}" title="${block ? t('buy.' + block) : ''}"><span class="bk">${key}</span><span class="bi"${bReady ? '' : ` data-thumb="${bk}"`}>${bReady ? img(bk) : cardIcon(c)}</span>`
    + `<div class="bt"><b>${title}</b><div class="bl">${sub}</div></div><span class="bp">${ICON.coin}${shopPrice()}</span></div>`;
}
