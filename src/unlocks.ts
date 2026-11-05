// Unlock names/requirements shared by the select screens and the end screen, plus the "Unlocks" collection screen:
// every ship, captain, crew, module and relic as round icon buttons on the left, the focused item's details on the right, and the Logbook.
import { SHIPS, CAPTAINS, SHIP_IDS, CAPTAIN_IDS, ShipId, CaptainId } from './loadout';
import { MODS, MOD_IDS, ModuleId, MAX_MOD_LV, SLOT_KEY } from './modules';
import { RELIC_IDS, RelicId, CREW_IDS, CrewId } from './relics';
import { SPELLS } from './spelldata';
import { t } from './i18n';
import { enemyName, unlockName, shipName, shipBlurb, capName, capUp, capDown, spellName, spellText, modName, modInfo, modActiveLine, relicName, relicDesc, crewName, crewText, slotName, slotCount } from './lname';
import { portrait } from './portraits';
import { bossName } from './lname';
import { BOSS_IDS, SEAS, seaEnemies, type BossId } from './seas';
import { BOSSES, ENEMIES, EnemyType } from './content';
import { EVO } from './evodefs';
import { evoName, evoText } from './evoname';
import { SYNERGIES, synName, synText, Syn } from './synergies';
import { foeIcon } from './iconset/foes';
import { seaName } from './seatext';
import { ICON, shipIcon, modIcon, relicIcon, crewIcon, upgradeIcon } from './icons';
import { M, entry, isUnlocked, buyUnlock, toggleMod, toggleUp, UNLOCK_ALL } from './meta';

export const DBL = '&#10687;'; // circled bullet, the doubloon mark
export const LOCK = '&#128274;';

export { unlockName };
const pct = (id: string): { w: number; txt: string } => {
  const [a, b] = entry(id)?.prog() ?? [0, 1];
  return { w: Math.round(Math.min(1, a / b) * 100), txt: `${Math.min(Math.floor(a), b)} / ${b}` };
};
/** Bar + text under a locked card: "300 ⦿ or Reach act 2" with progress. */
export function lockInfo(id: string): string {
  const c = entry(id);
  if (!c) return '';
  const p = pct(id);
  return `<div class="lockreq"><span class="lk">${LOCK}</span> ${c.cost} ${DBL}${c.challenge() ? ' ' + t('un.or') + ' ' + c.challenge() : ''}</div>${c.challenge() ? `<div class="sr"><div class="sb"><i style="width:${p.w}%"></i></div><b>${p.txt}</b></div>` : ''}`;
}

interface Item { id: string; name: string; icon: string; por?: boolean; dim?: boolean }
const UP_IDS = ['cannon', 'rate', 'chain', 'hull', 'sails', 'hooks', 'swivel', 'h:sheath'];
const SECTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], LOG = SECTIONS.length;
/** Sections from here on are the read-only compendium (no unlock state, no pool toggle). */
const CODEX = 6;
const isCodex = (id: string): boolean => /^(evo|syn|foe|boss):/.test(id);
const FOES = (Object.keys(ENEMIES) as EnemyType[]).filter(x => x !== 'boss'); // 'boss' is the generic stand-in for the real bosses below
const synHex = (s: Syn): string => '#' + s.color.toString(16).padStart(6, '0');
const evoDone = (id: ModuleId): boolean => (M.stats.maxModLevel[id] ?? 0) >= MAX_MOD_LV;
const bossIcon = (id: BossId): string => foeIcon(BOSSES[id].monster ? (BOSSES[id].monster!.look === 'ash' ? 'ashleviathan' : 'leviathan') : BOSSES[id].fort ? 'fort' : 'boss');
const items = (): Item[][] => [
  SHIP_IDS.map((x: ShipId) => ({ id: 'ship:' + x, name: shipName(x), icon: shipIcon(x) })),
  CAPTAIN_IDS.map((x: CaptainId) => ({ id: 'cap:' + x, name: capName(x), icon: portrait(x), por: true })),
  CREW_IDS.map((x: CrewId) => ({ id: 'crew:' + x, name: crewName(x), icon: crewIcon(x) })),
  MOD_IDS.map((x: ModuleId) => ({ id: 'mod:' + x, name: modName(x), icon: modIcon(x) })),
  RELIC_IDS.map((x: RelicId) => ({ id: 'relic:' + x, name: relicName(x), icon: relicIcon(x) })),
  UP_IDS.map(x => ({ id: 'up:' + x, name: t(x.startsWith('h:') ? `h.${x.slice(2)}.n` : `up.${x}.n`), icon: upgradeIcon(x) })),
  MOD_IDS.filter(x => EVO[x]).map((x: ModuleId) => ({ id: 'evo:' + x, name: evoName(x), icon: modIcon(x), dim: !evoDone(x) })),
  SYNERGIES.map(s => ({ id: 'syn:' + s.id, name: synName(s), icon: `<span class="synic" style="color:${synHex(s)}">${ICON.star}</span>` })),
  FOES.map(x => ({ id: 'foe:' + x, name: enemyName(x), icon: foeIcon(x) })),
  BOSS_IDS.map(x => ({ id: 'boss:' + x, name: bossName(x), icon: bossIcon(x), dim: !(M.stats.bossKills[x] ?? 0) })),
];
let host: HTMLElement, fr = 0, fc = 0;
const all = (): Item[][] => items();
const toggleable = (id: string): boolean => id.startsWith('up:') || (id.startsWith('mod:') && !!entry(id) && isUnlocked(id));
const banned = (id: string): boolean => M.disabled.includes(id.startsWith('up:') ? id : id.slice(4));

const stat = (label: string, v: string | number): string => `<li><span>${label}</span><b>${v}</b></li>`;
const partRow = (p: Syn['a']): string => {
  const [ic, nm, kind] = 'mod' in p ? [modIcon(p.mod), modName(p.mod), 3] : 'crew' in p ? [crewIcon(p.crew), crewName(p.crew), 2] : [portrait(p.cap), capName(p.cap), 1];
  return `<li class="cxp"><span class="cxi${kind === 1 ? ' por' : ''}">${ic}</span><b>${nm}</b> <small>${t('un.kind.' + kind)}</small></li>`;
};
function describeCodex(id: string): string {
  const [k, v] = id.split(':');
  if (k === 'evo') {
    const m = MODS[v as ModuleId], both = !!SLOT_KEY[m.slot];
    return `<p>${evoText(v)}</p><div class="lsub">${t('cx.evoOf', { name: modName(m.id) })}</div><div class="lsub">${t(both ? 'cx.evoReqBoth' : 'cx.evoReqAuto', { name: modName(m.id), n: MAX_MOD_LV })}</div><div class="ustat">${evoDone(m.id) ? t('cx.evoDone') : t('cx.evoNot')}</div>`;
  }
  if (k === 'syn') {
    const s = SYNERGIES.find(x => x.id === v)!;
    return `<p>${synText(s)}</p><div class="lsub">${t('cx.synNeeds')}</div><ul class="cxl">${partRow(s.a)}${partRow(s.b)}</ul><div class="lsub">${t('cx.synActive')}</div>`;
  }
  if (k === 'foe') {
    const e = ENEMIES[v as EnemyType], seas = SEAS.map((_, i) => i).filter(i => seaEnemies(i).includes(v as EnemyType)).map(seaName);
    return `<ul class="cxl">${stat(t('cx.hp'), e.hp)}${stat(t('cx.speed'), e.speed || t('cx.static'))}${stat(t('cx.contact'), e.contact)}${stat(t('cx.xp'), e.xp)}</ul><div class="lsub">${seas.length ? t('cx.seas', { list: seas.join(', ') }) : t('cx.noSea')}</div><div class="lsub">${t('cx.scale')}</div>`;
  }
  const b = BOSSES[v as BossId], si = SEAS.findIndex(x => x.bosses.includes(v as BossId)), n = M.stats.bossKills[v] ?? 0;
  const kind = b.monster ? t('cx.monster') : b.fort ? t('cx.fort') : '';
  return `${kind ? `<p>${kind}</p>` : ''}<ul class="cxl">${si >= 0 ? stat(t('un.kind.9'), t('cx.bossAt', { sea: seaName(si), n: SEAS[si].bosses.indexOf(v as BossId) + 1 })) : ''}${stat(t('cx.hp'), b.hp)}${stat(t('cx.sunk'), n)}</ul><div class="lsub">${n ? '' : t('cx.never') + '. '}${t('cx.scale')}</div>`;
}
function describe(id: string): string {
  if (isCodex(id)) return describeCodex(id);
  const [k, v] = id.split(':');
  if (k === 'ship') {
    const s = SHIPS[v as ShipId], sl = s.slots;
    return `<p>${shipBlurb(s.id)}</p><ul class="lslots">${(['bow', 'side', 'deck', 'stern'] as const).map(x => `<li${sl[x] ? '' : ' class="no"'}>${slotCount(x, sl[x])}</li>`).join('')}</ul>
      <div class="lsub">${t('un.shipInfo', { hp: s.hp, sp: s.speed, list: s.start.map(modName).join(', ') })}</div>`;
  }
  if (k === 'cap') {
    const c = CAPTAINS[v as CaptainId], sp = SPELLS[v as CaptainId];
    return `<div class="up">&#9650; ${capUp(c.id)}</div><div class="dn2">${c.down ? '&#9660; ' + capDown(c.id) : t('lo.noDrawback')}</div><div class="spl"><b>${t('lo.space', { name: spellName(c.id) })}</b> <small>${sp.cd}s</small> &middot; ${spellText(c.id)}</div>`;
  }
  if (k === 'up') return `<p>${t('un.upBlurb')}</p>`;
  if (k === 'relic') return `<p>${relicDesc(v as RelicId)}</p>`;
  if (k === 'crew') return `<p>${crewText(v as CrewId)}</p>`;
  const m = MODS[v as ModuleId];
  return `<p>${modInfo(m.id)}</p><div class="lsub">${slotName(m.slot)}</div>${modActiveLine(m.id)}`;
}
function logbook(): string {
  const s = M.stats, lv = Object.entries(s.maxModLevel).map(([k, v]) => t('log.lv', { name: MODS[k as ModuleId] ? modName(k as ModuleId) : k, n: v })).join(', ') || t('un.none');
  const rows: [string, string | number][] = [['runs', s.runs], ['kills', s.kills], ['fullSails', s.fullSails], ['rerolls', s.rerolls], ['autoCasts', s.autoCasts],
    ['burned', s.burned], ['rams', s.rams], ['boats', s.boatsEaten], ['crates', s.cratesEaten], ['huts', s.hutsEaten], ['buys', s.shopBuys], ['winloss', `${s.wins} / ${s.deaths}`], ['doubloons', s.doubloonsEarned], ['damage', Math.round(s.damageTaken)], ['bestAct', s.bestAct], ['quests', s.questsDone],
    ['heat', SEAS.map((_, i) => `${seaName(i)} ${Math.max(0, (s.bestHeat[i] ?? 0) - 1)}`).join(', ')], ['endless', SEAS.map((_, i) => `${seaName(i)} ${s.endBest[i] ?? 0}`).join(', ')],
    ['bosses', BOSS_IDS.map(id => `${bossName(id)} ${s.bossKills[id] ?? 0}`).join(', ')], ['modLv', lv]];
  return `<div class="lkind">${t('un.lifetime')}</div><h3>${t('un.logbook')}</h3><div class="ulog">${rows.map(([n, v]) => `<div class="lrow"><span>${t('log.' + n)}</span><b>${v}</b></div>`).join('')}</div>`;
}
function detailHtml(): string {
  if (fr === LOG) return logbook();
  const it = all()[fr][fc];
  if (fr >= CODEX) return `<div class="lbig${it.dim ? ' dim' : ''}">${it.icon}</div><div class="lkind">${t('un.kind.' + fr)}</div><h3>${it.name}</h3><div class="ltext">${describe(it.id)}</div>`;
  const c = entry(it.id), open = isUnlocked(it.id);
  let state: string;
  if (!open && c) state = `<div class="ustat lk">${ICON.lock} ${t('un.locked')}</div><div class="lbuy"><button class="ubtn" tabindex="-1" data-act="ubuy" ${M.doubloons >= c.cost ? '' : 'disabled'}>${t('lo.buy', { n: c.cost, dbl: DBL })}</button>${lockInfo(it.id)}</div>`;
  else if (it.id.startsWith('up:')) state = '';
  else state = `<div class="ustat">${c ? t('un.unlocked') : t('un.starting')}</div>`;
  const tog = toggleable(it.id) ? `<div class="lbuy"><button class="ubtn" tabindex="-1" data-act="utoggle">${t('un.pool', { v: t(banned(it.id) ? 'off' : 'on') })}</button><div class="lsub">${t('un.poolHint')}</div></div>` : '';
  return `<div class="lbig${it.por ? ' por' : ''}">${it.icon}</div><div class="lkind">${t('un.kind.' + fr)}</div><h3>${it.name}</h3><div class="ltext">${describe(it.id)}</div>${state}${tog}`;
}

function btn(r: number, c: number, it: Item): string {
  if (r >= CODEX) return `<div class="lbtn${it.dim ? ' dim' : ''}" data-act="upick" data-r="${r}" data-c="${c}" title="${it.name}"><span class="lic">${it.icon}</span></div>`;
  const e = entry(it.id), lk = !isUnlocked(it.id);
  const [a, b] = lk && e?.challenge ? e.prog() : [0, 1], p = Math.round(Math.min(1, a / b) * 100);
  const ring = lk && e?.challenge ? `<svg class="uring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" pathLength="100"/><circle class="v" cx="50" cy="50" r="47" pathLength="100" stroke-dasharray="${p} 100"/></svg>` : '';
  const mark = lk ? `<span class="ulk">${ICON.lock}</span><span class="lprice">${e?.cost}${DBL}</span>` : `<span class="umk${e || it.id.startsWith('up:') ? '' : ' st'}">${it.id.startsWith('up:') ? (banned(it.id) ? '&#10005;' : '&#10003;') : e ? '&#10003;' : '&#9733;'}</span>`;
  return `<div class="lbtn${it.por ? ' por' : ''}${lk ? ' lk' : ''}" data-act="upick" data-r="${r}" data-c="${c}" title="${it.name}"><span class="lic">${it.icon}</span>${ring}${mark}</div>`;
}
export function unlocksHtml(): string {
  const sec = all();
  const lockable = sec.slice(0, 5).flat(), n = lockable.filter(i => isUnlocked(i.id)).length, tot = lockable.length; // ship upgrades aren't unlockables
  const rows = sec.map((list, r) => `<div class="lgrp"><div class="lcat">${t('un.sec.' + r)}<span>${r < 5 ? t('un.groupCnt', { n: list.filter(i => isUnlocked(i.id)).length, t: list.length }) : ''}</span></div><div class="lbtns">${list.map((it, c) => btn(r, c, it)).join('')}</div></div>`).join('')
    + `<div class="lgrp"><div class="lcat">${t('un.logbook')}<span>${t('un.lifetimeS')}</span></div><div class="lbtns"><div class="ubtn ulogb" data-act="upick" data-r="${LOG}" data-c="0">${t('un.openLog')}</div></div></div>`;
  return `<div class="lo unl"><div class="lcol"><div class="ltop"><button class="mbtn lback" tabindex="-1" data-act="back">${t('lo.back')}</button><h2>${t('un.title')}</h2><span class="ucnt">${t('un.cnt', { n, t: tot })}</span>
      <div class="dbal">${DBL} <b>${M.doubloons}</b>${UNLOCK_ALL ? ' (?unlockall)' : ''}</div></div><div class="lrows">${rows}</div>
      <div class="hint"><span class="nt">${t('un.hint')}</span><span class="ht">${t('un.hintTouch')}</span></div></div>
    <div class="lmid"><div class="card ldet" id="ldet"></div></div></div>`;
}

function focus(r: number, c: number): void {
  const sec = all();
  fr = Math.max(0, Math.min(LOG, r));
  fc = fr === LOG ? 0 : Math.max(0, Math.min(sec[fr].length - 1, c));
  host.querySelectorAll<HTMLElement>('[data-act=upick]').forEach(e => e.classList.toggle('foc', Number(e.dataset.r) === fr && Number(e.dataset.c) === fc));
  host.querySelectorAll<HTMLElement>('.lgrp').forEach((e, i) => e.classList.toggle('cur', i === fr));
  const d = host.querySelector('#ldet');
  if (d) d.innerHTML = detailHtml();
  host.querySelector('[data-act=upick].foc')?.scrollIntoView({ block: 'nearest' });
}
/** Re-renders the whole screen (after a buy / toggle), keeping focus and scroll. */
function redraw(): void {
  const top = host.querySelector('.lrows')?.scrollTop ?? 0;
  host.innerHTML = unlocksHtml();
  const rows = host.querySelector('.lrows');
  if (rows) rows.scrollTop = top;
  focus(fr, fc);
}
export function openUnlocks(root: HTMLElement): void { host = root; fr = 0; fc = 0; redraw(); }

function activate(): void {
  if (fr === LOG || fr >= CODEX) return;
  const id = all()[fr][fc].id;
  if (!isUnlocked(id) && entry(id)) { if (buyUnlock(id)) redraw(); } else if (toggleable(id)) { if (id.startsWith('up:')) toggleUp(id.slice(3)); else toggleMod(id.slice(4)); redraw(); }
}
/** Keyboard on the Unlocks screen. Returns 'back' when the menu should leave it. */
export function unlocksTap(code: string): 'back' | void {
  const n = fr === LOG ? 1 : all()[fr].length;
  if (code === 'Escape') return 'back';
  if (code === 'Tab' || code === 'ArrowDown' || code === 'KeyS') focus(code === 'Tab' ? (fr + 1) % (LOG + 1) : fr + 1, fc);
  else if (code === 'ArrowUp' || code === 'KeyW') focus(fr - 1, fc);
  else if (code === 'ArrowLeft' || code === 'KeyA') focus(fr, (fc - 1 + n) % n);
  else if (code === 'ArrowRight' || code === 'KeyD') focus(fr, (fc + 1) % n);
  else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') activate();
}
/** Mouse click on the Unlocks screen. Returns 'back' for the Back button. */
export function unlocksClick(t: HTMLElement): 'back' | void {
  const a = t.closest<HTMLElement>('[data-act]');
  if (!a) return;
  if (a.dataset.act === 'back') return 'back';
  if (a.dataset.act === 'upick') focus(Number(a.dataset.r), Number(a.dataset.c));
  else if (a.dataset.act === 'ubuy' || a.dataset.act === 'utoggle') activate();
}
export function unlocksHover(t: HTMLElement): void {
  const b = t.closest<HTMLElement>('[data-act=upick]');
  if (b) { const r = Number(b.dataset.r), c = Number(b.dataset.c); if (r !== fr || c !== fc) focus(r, c); }
}
