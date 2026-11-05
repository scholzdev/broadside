import { G } from './game';
import { pad, onInputSource } from './input';
import { t, onLang } from './i18n';

// ---- button prompts: keyboard keys <-> controller glyphs. Elements carry data-p="<glyph>"; while the last input came from a gamepad
// (body.pad) CSS swaps the key text for a small round badge, so no markup has to be redrawn. ----
/** A key hint with its controller counterpart, e.g. kb('Shift', 'RT'). `touch` is the on-screen label (body.touch); without one the badge is hidden there. */
export const kb = (key: string, glyph: string, touch?: string): string => `<span class="kb" data-p="${glyph}"${touch ? ` data-t="${touch}"` : ''}>${key}</span>`;
/** A controller badge on its own. */
export const pb = (glyph: string): string => `<span class="pb" data-pb="${glyph}">${glyph}</span>`;
export const padActive = (): boolean => pad.lastInput === 'gamepad';

const CSS = `
.kb { display:inline-block; padding:0 6px; border-radius:5px; background:#000a; border:1px solid #d9b45c88; color:#f4e6bf; font-weight:bold; font-size:.9em; line-height:1.35; }
body.pad [data-p] { font-size:0 !important; padding:0 !important; border:0 !important; background:none !important; }
body.pad [data-p]::before, .pb { content:attr(data-p); display:inline-block; min-width:20px; height:20px; padding:0 6px; box-sizing:border-box; border-radius:10px; background:#3b3f4a; color:#fff; border:1px solid #fff8; font:bold 11px/18px system-ui,sans-serif; text-align:center; vertical-align:middle; }
.pb::before { content:none; }
body.pad [data-p="A"]::before, .pb[data-pb="A"] { background:#3fa34d; } body.pad [data-p="B"]::before, .pb[data-pb="B"] { background:#d0463b; }
body.pad [data-p="X"]::before, .pb[data-pb="X"] { background:#3b78d8; } body.pad [data-p="Y"]::before, .pb[data-pb="Y"] { background:#e0b53a; color:#111; }
body.pad .card .k, body.pad .btile .bk { display:none; }
.hp, .ht { display:none; } body.touch .ht { display:block; } body.touch li.ht { display:list-item; } body.touch .hint .ht, body.touch .lwhy .ht { display:inline; }
body.touch .kb:not([data-t]), body.touch .hk, body.touch .hp, body.touch .nt, body.touch #abar .ak, body.touch #abar .abh .sk, body.touch .card .k, body.touch .btile .bk { display:none !important; }
body.touch .kb[data-t] { font-size:0; padding:0 7px; } body.touch .kb[data-t]::before { content:attr(data-t); font-size:13px; } body.pad .hp { display:block; } body.pad .hk { display:none; }
.card.padsel, .btile.padsel { outline:3px solid #7fe3ff; outline-offset:3px; transform:translateY(-8px); box-shadow:0 0 22px #7fe3ffaa; }
.card.padsel::before, .btile.padsel::before { content:'A'; position:absolute; right:-8px; top:-8px; z-index:5; width:24px; height:24px; border-radius:12px; background:#3fa34d; color:#fff; font:bold 13px/24px system-ui,sans-serif; text-align:center; border:1px solid #fff8; }
#padbar { position:fixed; left:50%; bottom:6px; transform:translateX(-50%); z-index:60; display:none; gap:16px; padding:5px 14px; border-radius:16px; background:#000b; color:#f4e6bf; font:13px system-ui,sans-serif; pointer-events:none; white-space:nowrap; }
body.pad #padbar.on { display:flex; } #padbar span { display:inline-flex; align-items:center; gap:6px; }
`;

const style = document.createElement('style');
style.textContent = CSS;
document.head.appendChild(style);

// ---- context footer: what A / B / Y do right now (menus, card screens) and a controls reminder on the sea ----
const bar = document.createElement('div');
bar.id = 'padbar';
document.body.appendChild(bar);
let barKey = '', seaUntil = 0;
const item = (g: string, k: string): string => `<span>${pb(g)}${t(k)}</span>`;
function refreshBar(): void {
  const s = G.state, menu = document.getElementById('menu')?.dataset.screen ?? '';
  let key = '', html = '';
  if (s === 'levelup' || s === 'loot') { key = 'pick'; html = item('D-pad', 'pad.nav') + item('A', 'pad.pick') + item('Y', 'pad.reroll'); }
  else if (s === 'menu' || s === 'paused') {
    key = 'menu' + menu;
    html = item('D-pad', 'pad.nav') + item('A', 'pad.select') + item('B', 'pad.back') + (menu === 'loadout' || menu === 'unlocks' ? item('LB/RB', 'pad.tabs') : '');
  } else if (s === 'playing' && performance.now() < seaUntil) {
    key = 'sea'; html = item('LS', 'pad.sail') + item('RT', 'pad.boost') + item('LB/RB/Y', 'pad.cast') + item('Start', 'pad.pause');
  } else if (s === 'dead' || s === 'won') { key = 'end'; html = item('A', 'pad.again') + item('B', 'pad.menu'); }
  const full = key + document.documentElement.lang;
  bar.classList.toggle('on', !!key);
  if (full !== barKey) { barKey = full; bar.innerHTML = html; }
}
onInputSource(() => { if (pad.lastInput === 'gamepad') seaUntil = performance.now() + 9000; refreshBar(); });
onLang(() => { barKey = ''; refreshBar(); });
setInterval(refreshBar, 250);
