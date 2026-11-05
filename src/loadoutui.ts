// Pre-run Loadout screen (v6 A): five category rows of round icon buttons on the left, a detail panel for the focused item,
// the live 3D ship framed on the right (main.ts reads MENU_CAM), doubloons on top and a big "Set Sail!" button.
import { startRun } from './game';
import { SHIPS, CAPTAINS, SHIP_IDS, CAPTAIN_IDS, ShipId, CaptainId, L, setLoadout, saveLoadout, loadSaved, baseStats, startModules, startModuleOptions } from './loadout';
import { MODS, ModuleId } from './modules';
import { RELIC_IDS, RelicId, CREW, CREW_IDS, CrewId } from './relics';
import { SPELLS } from './spelldata';
import { t } from './i18n';
import { shipName, shipBlurb, capName, capUp, capDown, spellName, spellText, modName, modInfo, modActive, relicName, relicDesc, crewName, crewText, slotName, slotCount } from './lname';
import { portrait } from './portraits';
import { M, entry, isUnlocked, buyUnlock } from './meta';
import { lockInfo, DBL } from './unlocks';
import { seaName } from './seatext';
import { initShip } from './ship';
import { installStage, resetView } from './stagecam';
import { ICON, shipIcon, modIcon, relicIcon, crewIcon } from './icons';
import { decoTabs, decoRows, decoMount, decoEnter, decoLeave, decoTap, decoClick, decoHover } from './cosmeticsui';

/** Menu camera framing read by main.ts: while `on`, the ship sits at NDC x = fx and the view is scaled by `zoom`. */
/** Stage rect in NDC centre (fx, fy) and pixel size (w, h); main.ts and stagecam.ts frame the ship inside it. */
export const MENU_CAM = { on: false, fx: 0.5, fy: 0, w: 400, h: 600 };

interface Sel { ship: ShipId; cap: CaptainId; crew: CrewId | null; mod: ModuleId | null; relic: RelicId | null; sea: number }
interface Item { key: string; lock: string; name: string; icon: string }
const ROWS = [0, 1, 2, 3, 4] as const;
const rowName = (r: number): string => t('lo.row.' + r);
const SAIL = ROWS.length; // focus row of the Set Sail button


let host: HTMLElement;
let sel: Sel = { ship: 'galleon', cap: 'salt', crew: null, mod: null, relic: null, sea: 0 };
let fr = 0, fc = 0;
let deco = false; // v10 Decorations tab open (cosmeticsui.ts drives it)

const modOptions = (s: Sel): ModuleId[] => startModuleOptions(s.ship, s.cap).filter(id => !SHIPS[s.ship].start.includes(id) && id !== CAPTAINS[s.cap].startMod);
function items(r: number): Item[] {
  switch (r) {
    case 0: return SHIP_IDS.map(id => ({ key: id, lock: 'ship:' + id, name: shipName(id), icon: shipIcon(id) }));
    case 1: return CAPTAIN_IDS.map(id => ({ key: id, lock: 'cap:' + id, name: capName(id), icon: portrait(id) }));
    case 2: return [{ key: '', lock: '', name: t('lo.noCrew'), icon: ICON.none }, ...CREW_IDS.map(id => ({ key: id, lock: CREW[id].cost ? 'crew:' + id : '', name: crewName(id), icon: crewIcon(id) }))];
    case 3: return [{ key: '', lock: '', name: t('lo.default'), icon: modIcon(SHIPS[sel.ship].start[0]) }, ...modOptions(sel).map(id => ({ key: id, lock: 'mod:' + id, name: modName(id), icon: modIcon(id) }))];
    default: return [{ key: '', lock: '', name: t('lo.noRelic'), icon: ICON.none }, ...RELIC_IDS.map(id => ({ key: id, lock: 'relic:' + id, name: relicName(id), icon: relicIcon(id) }))];
  }
}
const chosenKey = (r: number): string => [sel.ship, sel.cap, sel.crew ?? '', sel.mod ?? '', sel.relic ?? ''][r];
const locked = (it: Item): boolean => !!it.lock && !isUnlocked(it.lock);
const chosenItems = (): Item[] => ROWS.map((_, r) => items(r).find(it => it.key === chosenKey(r)) ?? items(r)[0]);
const blocker = (): Item | undefined => chosenItems().find(locked);
const extras = () => ({ startModule: sel.mod, relic: sel.relic, crew: sel.crew, sea: sel.sea });

const MAXV = { hp: 180, speed: 11, turn: 1.3, fire: 3.9 };
function bars(s: ShipId, c?: CaptainId): string {
  const b = baseStats(s, c);
  const rows: [string, number, string][] = [
    [t('lo.stat.hull'), b.hp / MAXV.hp, String(Math.round(b.hp))], [t('lo.stat.speed'), b.speed / MAXV.speed, b.speed.toFixed(1)],
    [t('lo.stat.turn'), b.turn / MAXV.turn, b.turn.toFixed(1) + 'x'], [t('lo.stat.fire'), b.balls / b.cd / MAXV.fire, t('lo.perSide', { n: b.balls })],
  ];
  return rows.map(([n, f, v]) => `<div class="sr"><span>${n}</span><div class="sb"><i style="width:${Math.round(Math.max(0.06, Math.min(1, f)) * 100)}%"></i></div><b>${v}</b></div>`).join('');
}
const modNames = (ids: ModuleId[]): string => ids.map(modName).join(', ');

function detailBody(r: number, it: Item): string {
  switch (r) {
    case 0: {
      const s = SHIPS[it.key as ShipId], sl = s.slots;
      return `<p>${shipBlurb(s.id)}</p><ul class="lslots">${(['bow', 'side', 'deck', 'stern'] as const).map(k => `<li${sl[k] ? '' : ' class="no"'}>${slotCount(k, sl[k])}</li>`).join('')}</ul>
        <div class="lsub">${t('lo.starts', { list: modNames(s.start) })}</div>${bars(s.id, sel.cap)}`;
    }
    case 1: {
      const c = CAPTAINS[it.key as CaptainId], sp = SPELLS[c.id];
      const note = c.startMod && SHIPS[sel.ship].slots.deck === 0 ? `<div class="cnote">${t('lo.noDeck', { ship: shipName(sel.ship) })}</div>` : '';
      return `<div class="up">&#9650; ${capUp(c.id)}</div><div class="dn2">${c.down ? '&#9660; ' + capDown(c.id) : t('lo.noDrawback')}</div>
        <div class="spl"><b>${t('lo.space', { name: spellName(c.id) })}</b> <small>${sp.cd}s</small> &middot; ${spellText(c.id)}</div>${note}${bars(sel.ship, c.id)}`;
    }
    case 2: return `<p>${it.key ? crewText(it.key as CrewId) + ' ' + t('lo.crewStart') : t('lo.crewNone')}</p>${it.key === 'carp' && CAPTAINS[sel.cap].regen === 0 ? `<div class="cnote">${t('lo.noRegen', { name: capName(sel.cap) })}</div>` : ''}`;
    case 3: {
      const def = startModules(sel.ship, sel.cap, null);
      if (!it.key) return `<p>${t('lo.defMods', { list: modNames(def) })}</p>`;
      const m = MODS[it.key as ModuleId], got = startModules(sel.ship, sel.cap, m.id), gone = def.filter(x => !got.includes(x));
      return `<p>${modInfo(m.id)}</p><div class="lsub">${slotName(m.slot)} &middot; ${gone.length ? t('lo.replaces', { list: modNames(gone) }) : t('lo.addedFree')}</div>
        <div class="spl"><b>${modActive(m.id).name}</b> <small>${t('auto')} &middot; ${m.active.cd}s</small> &middot; ${modActive(m.id).text}</div>`;
    }
    default: return `<p>${it.key ? relicDesc(it.key as RelicId) : t('lo.relicNone')}</p>`;
  }
}
function detailHtml(): string {
  if (fr === SAIL) {
    const ch = chosenItems();
    return `<div class="lbig">${ch[0].icon}</div><h3>${t('lo.yours')}</h3><ul class="lsum">${ROWS.map((_, r) => `<li><span>${rowName(r)}</span><b>${locked(ch[r]) ? ICON.lock : ''}${ch[r].name}</b></li>`).join('')}</ul>`;
  }
  const it = items(fr)[fc], lk = locked(it), c = lk ? entry(it.lock) : undefined, on = it.key === chosenKey(fr);
  const state = lk && c ? `<div class="lbuy"><button class="ubtn" tabindex="-1" data-act="lbuy" ${M.doubloons >= c.cost ? '' : 'disabled'}>${t('lo.buy', { n: c.cost, dbl: DBL })}</button>${lockInfo(it.lock)}</div>`
    : `<div class="lstate${on ? ' on' : ''}">${on ? t('lo.chosen') : t('lo.choose')}</div>`;
  return `<div class="lbig${fr === 1 ? ' por' : ''}">${it.icon}</div><div class="lkind">${rowName(fr)}</div><h3>${it.name}</h3><div class="ltext">${detailBody(fr, it)}</div>${state}`;
}

function btn(r: number, c: number, it: Item): string {
  const lk = locked(it), cost = lk ? entry(it.lock)?.cost : 0;
  return `<div class="lbtn${r === 1 ? ' por' : ''}${it.key === chosenKey(r) ? ' on' : ''}${lk ? ' lk' : ''}" data-act="lpick" data-r="${r}" data-c="${c}" title="${it.name}">
    <span class="lic">${it.icon}</span>${lk ? `<span class="llock">${ICON.lock}</span><span class="lprice">${cost}${DBL}</span>` : ''}</div>`;
}
export function loadoutHtml(): string {
  const rows = ROWS.map((_, r) => `<div class="lgrp"><div class="lcat">${rowName(r)}<span>${chosenItems()[r].name}</span></div><div class="lbtns">${items(r).map((it, c) => btn(r, c, it)).join('')}</div></div>`).join('');
  const b = blocker(), cost = b ? entry(b.lock)?.cost : 0;
  return `<div class="lo"><div class="lcol"><div class="ltop"><button class="mbtn lback" tabindex="-1" data-act="back">${t('lo.back')}</button><h2>${t('lo.title')}</h2>${decoTabs(deco)}<span class="lsea">${t('lo.sea', { name: seaName(sel.sea) })}</span></div><div class="lrows">${deco ? decoRows() : rows}</div>
      <div class="hint">${t(deco ? 'deco.hint' : 'lo.hint')}</div></div>
    <div class="lmid"><div class="dbal">${DBL} <b>${M.doubloons}</b> ${t('doubloons')}</div><div class="card ldet" id="ldet"></div>
      <button class="lsail" tabindex="-1" data-act="lsail" ${b ? 'disabled' : ''}>${t('lo.sail')}</button><div class="lwhy">${b ? `${ICON.lock} ${t('lo.unlockFirst', { name: b.name, cost: cost ?? 0, dbl: DBL })}` : t('lo.enter')}</div></div>
    <div class="lstage" id="lstage"><div class="shint">${t('lo.drag')}</div><button class="sreset" tabindex="-1" data-act="lview">${t('lo.reset')}</button></div></div>`;
}

function preview(): void {
  const s = fr === 0 ? SHIP_IDS[fc] : sel.ship;
  if (s !== L.ship) { setLoadout(s, sel.cap); initShip(); }
}
/** Keeps the ship centred in the empty stage area to the right of the panels. */
export function measureStage(): void {
  const st = host?.querySelector<HTMLElement>('#lstage');
  if (!st) return;
  const r = st.getBoundingClientRect(), ok = st.offsetWidth >= 140;
  const cx = ok ? r.left + r.width / 2 : innerWidth * 0.82, cy = ok ? r.top + r.height / 2 : innerHeight * 0.5;
  MENU_CAM.fx = (cx / innerWidth) * 2 - 1; MENU_CAM.fy = 1 - (cy / innerHeight) * 2;
  MENU_CAM.w = ok ? r.width : innerWidth * 0.3; MENU_CAM.h = ok ? r.height : innerHeight * 0.8;
}
function focus(r: number, c: number): void {
  fr = Math.max(0, Math.min(SAIL, r));
  fc = fr === SAIL ? 0 : Math.max(0, Math.min(items(fr).length - 1, c));
  host.querySelectorAll<HTMLElement>('.lbtn').forEach(e => e.classList.toggle('foc', Number(e.dataset.r) === fr && Number(e.dataset.c) === fc));
  host.querySelector('.lsail')?.classList.toggle('foc', fr === SAIL);
  host.querySelectorAll<HTMLElement>('.lgrp').forEach((e, i) => e.classList.toggle('cur', i === fr));
  const d = host.querySelector('#ldet');
  if (d) d.innerHTML = detailHtml();
  host.querySelector('.lbtn.foc')?.scrollIntoView({ block: 'nearest' });
  preview();
}
function draw(): void {
  host.innerHTML = loadoutHtml();
  if (deco) { decoMount(host, draw); measureStage(); return; }
  focus(fr, fc);
  measureStage();
}
const rowIndexOfChosen = (r: number): number => r === SAIL ? 0 : Math.max(0, items(r).findIndex(it => it.key === chosenKey(r)));

function choose(r: number, c: number): void {
  const it = items(r)[c];
  if (!it) return;
  if (r === 0) sel.ship = it.key as ShipId;
  else if (r === 1) sel.cap = it.key as CaptainId;
  else if (r === 2) sel.crew = (it.key || null) as CrewId | null;
  else if (r === 3) sel.mod = (it.key || null) as ModuleId | null;
  else sel.relic = (it.key || null) as RelicId | null;
  if (sel.mod && !modOptions(sel).includes(sel.mod)) sel.mod = null; // a ship/captain change can invalidate the start module
  const shown = L.ship;
  setLoadout(sel.ship, sel.cap, extras());
  if (L.ship !== shown) initShip(); // the preview model follows the chosen hull even without a prior hover
  if (!blocker()) saveLoadout(sel.ship, sel.cap, extras());
  fc = r === 3 ? rowIndexOfChosen(3) : c;
  draw();
}
function buy(r: number, c: number): void {
  const it = items(r)[c];
  if (it && locked(it) && buyUnlock(it.lock)) choose(r, c);
}
function sail(): void { if (!blocker()) { decoLeave(); startRun(sel.ship, sel.cap, extras()); } }
function setTab(on: boolean): void { if (on === deco) return; deco = on; if (on) decoEnter(); else decoLeave(); draw(); }

/** Enter the screen: restore the saved picks and focus the chosen ship. */
export function openLoadout(root: HTMLElement): void {
  host = root;
  installStage(root);
  const s = loadSaved();
  sel = { ship: s.ship, cap: s.captain, crew: s.crew, mod: s.startModule, relic: s.relic, sea: s.sea };
  fr = 0; fc = rowIndexOfChosen(0); deco = false;
  MENU_CAM.on = true;
  draw();
}
export function closeLoadout(): void {
  MENU_CAM.on = false;
  if (deco) { deco = false; decoLeave(); }
  const rebuild = L.ship !== sel.ship;
  setLoadout(sel.ship, sel.cap, extras());
  if (rebuild) initShip();
}

/** Keyboard on the loadout screen. Returns 'back' when the menu should leave it. */
export function loadoutTap(code: string): 'back' | void {
  const n = fr === SAIL ? 1 : items(fr).length;
  if (code === 'KeyQ' || code === 'KeyE') { setTab(!deco); return; }
  if (deco) { if (code === 'Escape') setTab(false); else decoTap(code); return; }
  if (code === 'Escape') return 'back';
  if (code === 'Tab') { const r = (fr + 1) % (SAIL + 1); focus(r, rowIndexOfChosen(r)); }
  else if (code === 'ArrowUp' || code === 'KeyW') { const r = Math.max(0, fr - 1); focus(r, rowIndexOfChosen(r)); }
  else if (code === 'ArrowDown' || code === 'KeyS') { const r = Math.min(SAIL, fr + 1); focus(r, rowIndexOfChosen(r)); }
  else if (code === 'ArrowLeft' || code === 'KeyA') focus(fr, (fc - 1 + n) % n);
  else if (code === 'ArrowRight' || code === 'KeyD') focus(fr, (fc + 1) % n);
  else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
    if (fr === SAIL) { sail(); return; }
    const it = items(fr)[fc];
    if (locked(it) && M.doubloons >= (entry(it.lock)?.cost ?? Infinity)) buy(fr, fc);
    else if (it.key === chosenKey(fr)) sail();
    else choose(fr, fc);
  }
}
/** Mouse click on the loadout screen. Returns 'back' for the Back button. */
export function loadoutClick(t: HTMLElement): 'back' | void {
  const a = t.closest<HTMLElement>('[data-act]');
  if (!a) return;
  const act = a.dataset.act;
  if (act === 'back') return 'back';
  if (act === 'ltab') { setTab(a.dataset.v === 'deco'); return; }
  if (deco && decoClick(t)) return;
  if (act === 'lview') { resetView(); return; }
  if (act === 'lsail') sail();
  else if (act === 'lbuy') buy(fr, fc);
  else if (act === 'lpick') choose(Number(a.dataset.r), Number(a.dataset.c)); // locked picks can be chosen for viewing; Set Sail then stays disabled
}
export function loadoutHover(t: HTMLElement): void {
  if (deco) { decoHover(t); return; }
  const b = t.closest<HTMLElement>('.lbtn');
  if (b) { const r = Number(b.dataset.r), c = Number(b.dataset.c); if (r !== fr || c !== fc) focus(r, c); }
  else if (t.closest('.lsail') && fr !== SAIL) focus(SAIL, 0);
}
