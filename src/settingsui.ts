import { t, lang, setLang, nextLang } from './i18n';
import { audio, setMuted, setVolume, setMusicVol, setSfxVol } from './audio';
import { S, QUALITIES, SHAKES, saveSettings, setQualityPref } from './settings';
import { resetMeta } from './meta';
import { resetCosmetics } from './cosmetics';
import { setLoadout, saveLoadout, NO_EXTRAS } from './loadout';
import { initShip } from './ship';
import { pad } from './input';
import { testRumble } from './gamepad';

// Settings screen markup + actions. menu.ts owns focus/navigation; every focusable row has data-i and data-act.
let sure = false, done = false;
const onoff = (b: boolean): string => t(b ? 'on' : 'off');
const row = (i: number, act: string, text: string): string => `<button class="mbtn srow" data-i="${i}" data-act="${act}">${text}</button>`;
const slider = (i: number, act: string, key: string, v: number): string => `<div class="mbtn vol srow" data-i="${i}" data-act="${act}"><span>${t(key)}</span><input type="range" min="0" max="100" value="${Math.round(v * 100)}" data-act="${act}"></div>`;
const KEYS: [string, string][] = [['W / S', 'ctl.move'], ['A / D', 'ctl.steer'], ['key.hold', 'ctl.boost'], ['key.click', 'ctl.spell'], ['key.mouse', 'ctl.aim'], ['1 / 2 / 3, R', 'ctl.cards'], ['Esc / P', 'ctl.pause'], ['M', 'ctl.mute'], ['key.wheel', 'ctl.zoom']];

let resetI = -1;
/** Rows are numbered in document order (sections may be added or removed freely); remembers the Reset row. */
function renumber(h: string): string {
  let n = 0; resetI = -1;
  return h.replace(/data-i="\d+" data-act="(\w+)"/g, (_m, a: string) => { if (a === 'reset') resetI = n; return `data-i="${n++}" data-act="${a}"`; });
}
export const settingsHtml = (): string => renumber(buildHtml());
const padHtml = (g: string): string => `${g}<div class="hint padname">${pad.connected ? t('set.padName', { v: pad.id.slice(0, 48) }) : t('set.padNone')}</div>${slider(0, 'paddz', 'set.padDz', S.padDz)}${row(0, 'padvib', t('set.padVib', { v: onoff(S.vib) }))}${row(0, 'tutorial', t('set.tut'))}`;
function buildHtml(): string {
  const g = (k: string): string => `<h3 class="sgrp">${t('set.g.' + k)}</h3>`;
  const keys = (S.manual ? [...KEYS.slice(0, 4), ['Q / E / R', 'ctl.abil'], ...KEYS.slice(4)] : KEYS).map(([k, d]) => `<div class="krow"><kbd>${k.includes('.') ? t(k) : k}</kbd><span>${t(d)}</span></div>`).join('');
  return `<div class="mbox sset"><h2>${t('set.title')}</h2><div class="sscroll">
    ${g('general')}${row(0, 'lang', t('menu.lang', { v: t('lang.' + lang) }))}
    ${g('audio')}${row(1, 'sound', t('menu.sound', { v: onoff(!audio.muted) }))}
    ${slider(2, 'vol', 'menu.volume', audio.volume)}${slider(3, 'music', 'menu.music', audio.music)}${slider(4, 'sfx', 'menu.sfx', audio.sfx)}
    ${g('gfx')}${row(5, 'gfx', t('menu.gfx', { v: t('gfx.' + (S.quality ?? 'auto')) }))}${row(6, 'shake', t('set.shake', { v: t('shake.' + S.shake) }))}
    ${row(7, 'nums', t('set.nums', { v: onoff(S.nums) }))}${row(8, 'arcs', t('set.arcs', { v: onoff(S.arcs) }))}${row(0, 'abil', t('set.abil', { v: t(S.manual ? 'abil.manual' : 'abil.auto') }))}
    ${g('controls')}<div class="keys">${keys}</div>
    ${padHtml(g('pad'))}
    ${g('data')}${row(9, 'reset', sure ? t('set.resetSure') : done ? t('set.resetDone') : t('set.reset'))}<div class="hint">${t('set.resetNote')}</div></div>
    <div class="mbtns">${row(10, 'back', t('menu.back'))}</div><div class="hint"><span class="hk">${t('set.hint')}</span><span class="hp">${t('set.hintPad')}</span></div></div>`;
}
/** Selection moved: cancels a pending reset confirmation. Returns true when markup must be redrawn. */
export function settingsFocus(i: number): boolean {
  if (i !== resetI && (sure || done)) { sure = done = false; return true; }
  return false;
}
const cyc = <T,>(a: T[], v: T, d: number): T => a[(a.indexOf(v) + d + a.length) % a.length];
/** Runs a settings action (d = direction for cyclers). Returns true when the screen should be redrawn. */
export function settingsAct(a: string, d = 1): boolean {
  switch (a) {
    case 'lang': setLang(nextLang()); return false; // setLang re-renders via onLang
    case 'sound': setMuted(!audio.muted); return true;
    case 'gfx': { const all: (typeof S.quality)[] = [null, ...QUALITIES]; setQualityPref(cyc(all, S.quality, d)); return true; }
    case 'shake': S.shake = cyc(SHAKES, S.shake, d); saveSettings(); return true;
    case 'nums': S.nums = !S.nums; saveSettings(); return true;
    case 'arcs': S.arcs = !S.arcs; saveSettings(); return true;
    case 'abil': S.manual = !S.manual; saveSettings(); return true;
    case 'padvib': S.vib = !S.vib; saveSettings(); if (S.vib) testRumble(); return true;
    case 'reset':
      if (!sure) { sure = true; done = false; return true; }
      sure = false; done = true;
      resetMeta(); resetCosmetics();
      setLoadout('galleon', 'salt', NO_EXTRAS); saveLoadout('galleon', 'salt', NO_EXTRAS); initShip();
      return true;
  }
  return false;
}
export const settingsLeave = (): void => { sure = done = false; };
/** Sets the bus a volume slider (data-act vol / music / sfx) controls. */
export const setBusVolume = (act: string, v: number): void => { if (act === 'paddz') { S.padDz = Math.max(0.05, Math.min(0.6, v)); saveSettings(); return; } (act === 'music' ? setMusicVol : act === 'sfx' ? setSfxVol : setVolume)(v); };
export const adjustVolume = (el: HTMLInputElement, d: number): void => { el.value = String(Math.max(0, Math.min(100, Number(el.value) + d * 5))); setBusVolume(el.dataset.act ?? 'vol', Number(el.value) / 100); };
