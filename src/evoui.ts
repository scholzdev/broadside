import { Card } from './cards';
import { MODS } from './modules';
import { t, tr } from './i18n';
import { modIcon, ICON } from './icons';
import { thumb, img } from './thumbs';
import { cardSynergyHtml, setToast } from './synergies';
import { evoName, evoText } from './evoname';

const evoFromName = (id: keyof typeof MODS): string => tr(`mod.${id}.name`, MODS[id].name);

// ---- v10 UI: the gold+teal Evolution card, synergy lines, the "Synergy" / "Evolved" toast and the ability-bar badge styles (CSS injected here) ----
const CSS = `
#cards .r-evo { --m1:#fff0a8; --m2:#e0a820; --m3:#12645f; --frame:linear-gradient(160deg,#fff7c0,#e8b020 30%,#3fe0cc 52%,#e8b020 74%,#0e4f4c); }
#cards .r-evo::before { content:''; position:absolute; inset:-9px; border-radius:24px 24px 14px 14px; pointer-events:none; z-index:-1; animation:evoGlow 1.4s ease-in-out infinite;
  box-shadow:0 0 18px 5px #ffd24acc, 0 0 40px 12px #3fe0cc80; }
@keyframes evoGlow { 50% { box-shadow:0 0 28px 10px #ffe27aee, 0 0 56px 20px #3fe0ccaa; } }
#cards .r-evo .medal { box-shadow:0 0 0 2px #000b, 0 4px 8px #0009, 0 0 16px 4px #ffd24acc; }
#cards .r-evo .rar { color:#7a4a00; text-shadow:0 0 6px #fff6; letter-spacing:.14em; }
#cards .r-evo .tlabel { color:#0b5a55; font-weight:800; letter-spacing:.2em; }
#cards .evoinfo { font-size:12.5px; margin:2px 0 6px; } #cards .evoinfo b { color:#0b5a55; }
#cards .evoinfo .evx { display:block; font-size:11px; opacity:.75; }
#cards .synl { margin-top:6px; width:100%; } #cards .syn { font-size:10.5px; line-height:1.25; padding:2px 5px; margin-top:2px; border-radius:5px; background:#0002; color:#4a3a1a; text-align:left; opacity:.7; }
#cards .syn.on { opacity:1; background:linear-gradient(90deg,#ffe58a99,#8af0e099); color:#2a1a00; box-shadow:0 0 0 1px #c89a28; }
#cards .syn i { display:inline-block; width:12px; height:12px; vertical-align:-2px; margin-right:3px; } #cards .ucard .syn i .ico { width:12px; height:12px; }
#evotoast { position:fixed; left:50%; top:17%; transform:translateX(-50%); z-index:60; display:flex; flex-direction:column; gap:6px; align-items:center; pointer-events:none; }
#evotoast .evt { padding:7px 16px 8px; border-radius:10px; background:linear-gradient(#10243a,#07131f); border:2px solid var(--c,#ffd24a); color:#f4ead0; font-size:14px; text-align:center; box-shadow:0 0 18px var(--c,#ffd24a), 0 6px 16px #000a; animation:evt 3.6s ease-out forwards; }
#evotoast .evt small { display:block; letter-spacing:.22em; font-size:10px; color:var(--c,#ffd24a); text-transform:uppercase; }
@keyframes evt { 0% { opacity:0; transform:translateY(-14px) scale(.9); } 8% { opacity:1; transform:none; } 80% { opacity:1; } 100% { opacity:0; transform:translateY(-10px); } }
#abar .ab.evo { box-shadow:0 0 0 2px #ffd24a, 0 0 10px 2px #3fe0ccaa; } #abar .ab .evb { position:absolute; left:-3px; top:-5px; width:16px; height:16px; z-index:3; filter:drop-shadow(0 0 3px #ffd24a); } #abar .ab .evb .ico { width:16px; height:16px; color:#ffd24a; }
#inv .iv .synic { display:block; color:var(--c,#ffd24a); } #inv .iv .synic .ico { width:22px; height:22px; }
`;
export function initEvoUi(): void {
  if (document.getElementById('evocss')) return;
  const s = document.createElement('style');
  s.id = 'evocss'; s.textContent = CSS;
  document.head.appendChild(s);
  setToast((title, text, color) => toast(title, text, color));
}
initEvoUi(); // styles are needed as soon as an Evolution card is rolled (the card screen can open before the first run tick)
export function toast(title: string, text: string, color: number): void {
  let host = document.getElementById('evotoast');
  if (!host) { host = document.createElement('div'); host.id = 'evotoast'; document.body.appendChild(host); }
  const d = document.createElement('div');
  d.className = 'evt'; d.style.setProperty('--c', '#' + color.toString(16).padStart(6, '0'));
  d.innerHTML = `<small>${title}</small>${text}`;
  host.appendChild(d);
  while (host.children.length > 3) host.firstElementChild?.remove();
  setTimeout(() => d.remove(), 3700);
}

/** The Evolution card: gold+teal frame, new name on the ribbon, "Old -> New" line and the big mechanical change. */
export function evoCardHtml(c: Card, i: number): string {
  const id = c.ref as keyof typeof MODS, mod = MODS[id], tk = 'mod:' + id, ready = thumb(tk) !== null;
  return `<div class="card ucard r-evo k-evo" style="--i:${i};--mc:#${mod.color.toString(16).padStart(6, '0')}" data-i="${i}">
    <div class="ribbon"><span>${evoName(id)}</span></div>
    <i class="stud tl"></i><i class="stud tr"></i><i class="stud bl"></i><i class="stud br"></i>
    <div class="medal"><div class="mi"${ready ? '' : ` data-thumb="${tk}"`}>${ready ? img(tk) : modIcon(id)}</div></div>
    <div class="trow"><span class="mini">${modIcon(id)}</span><span class="tbadge">${ICON.star}</span><span class="tlv">8</span></div>
    <div class="tlabel">${t('evo.label')}</div>
    <div class="cbody"><p class="cinfo evoinfo">${evoFromName(id)} &rarr; <b>${evoName(id)}</b></p><div class="cact">${evoText(id)}</div>${cardSynergyHtml(c)}</div>
    <div class="rar">${t('evo.rar')}</div><span class="k">${i + 1}</span></div>`;
}
