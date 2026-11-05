import { G } from './game';
import { L } from './loadout';
import { relicIcon, crewIcon, upgradeIcon } from './icons';
import { t, onLang } from './i18n';
import { relicName, relicDesc, crewName, crewText, statLabel } from './lname';
import { deriveStats } from './content';
import { shipView } from './cardfmt';
import { crewState, CREW_ORDER, CREW_STAT, crewHash, isAdv } from './crewdefs';
import { crewAdvName, crewAdvText } from './lname';
import { evoSig, evoEntries } from './evolutions';
import { synEntries } from './synergies';

// ---- bottom-right inventory strip: starting relic + crew, ship upgrades (level-ups and shop) with levels (modules live in the ability bar) ----
interface Entry { key: string; icon: string; name: string; kind: string; body: string; lv: number; count?: number }
const UPGRADES = ['cannon', 'rate', 'chain', 'hull', 'sails', 'hooks', 'swivel', 'h:sheath'];

let host: HTMLElement | null = null, sig = '';
let seen = new Map<string, number>(), lastTotal = 0;

export function initInv(): void {
  host = document.createElement('div');
  host.id = 'inv';
  host.className = 'hudel';
  document.getElementById('hud')?.appendChild(host);
  host.addEventListener('click', e => {
    const it = (e.target as HTMLElement).closest('.iv') as HTMLElement | null;
    host?.querySelectorAll('.iv.tip').forEach(n => n !== it && n.classList.remove('tip'));
    it?.classList.toggle('tip');
  });
  onLang(() => { sig = ''; });
}

const fmt = (l: { from: number; dec: number; pre?: string; suf?: string }): string => `${l.pre ?? ''}${l.from.toFixed(l.dec)}${l.suf ?? ''}`;

function entries(): Entry[] {
  const out: Entry[] = [];
  const stats = deriveStats(G.lv, G.modStats);
  const lines = (ls: { label: string; from: number; dec: number; pre?: string; suf?: string }[]): string => ls.map(l => `<div>${statLabel(l.label)}: <b>${fmt(l)}</b></div>`).join('');
  if (L.relic) out.push({ key: 'r' + L.relic, icon: relicIcon(L.relic), name: relicName(L.relic), kind: t('inv.relic'), body: relicDesc(L.relic), lv: 0 });
  for (const id of CREW_ORDER) {
    const e = crewState[id];
    if (!e || e.count <= 0) continue;
    const s = CREW_STAT[id], adv = `<div class="${isAdv(e) ? 'on' : 'off'}">${t(isAdv(e) ? 'inv.advOn' : 'inv.adv', { x: `<b>${crewAdvName(id)}</b>: ${crewAdvText(id)}` })}</div>`;
    out.push({ key: 'c' + id, icon: crewIcon(id), name: crewName(id), kind: t('inv.crew'), count: e.count, lv: e.level,
      body: `${crewText(id)}<div>${t('inv.figures', { n: e.count })} &middot; ${statLabel(s.label)}: <b>${fmt({ from: s.val(e), dec: s.dec, pre: s.pre, suf: s.suf })}</b></div>${adv}` });
  }
  for (const id of UPGRADES) {
    const lv = G.lv[id] ?? 0;
    if (lv > 0) out.push({ key: id, icon: upgradeIcon(id), name: t(id.startsWith('h:') ? `h.${id.slice(2)}.n` : `up.${id}.n`), kind: t('inv.up'), body: lines(shipView(id, stats, stats).lines), lv });
  }
  out.push(...evoEntries(), ...synEntries()); // v10: evolved modules and active synergies
  return out;
}

export function updateInv(): void {
  if (!host) return;
  const s = L.relic + '|' + crewHash() + '|' + G.state + '|' + UPGRADES.map(k => G.lv[k] ?? 0).join() + '|' + evoSig();
  if (s === sig) return;
  sig = s;
  const list = entries(), total = list.reduce((a, e) => a + e.lv + (e.count ?? 0) + 1, 0), prev = total < lastTotal ? new Map<string, number>() : seen; // fewer items than before = a new run: no pop
  lastTotal = total;
  seen = new Map(list.map(e => [e.key, e.lv + (e.count ?? 0) * 10]));
  host.innerHTML = list.map(e => {
    const was = prev.get(e.key), pop = prev.size > 0 && (was === undefined || e.lv + (e.count ?? 0) * 10 > was);
    return `<div class="iv${pop ? ' pop' : ''}${e.lv >= 3 ? ' hi' : ''}"><span class="ig">${e.icon}</span>${e.lv > 0 ? `<b class="il">${e.lv}</b>` : ''}${e.count ? `<b class="ic">${e.count}&times;</b>` : ''}`
      + `<div class="itip"><b>${e.name}</b><small>${e.kind}${e.lv > 0 ? ' · ' + t('inv.lv', { n: e.lv }) : ''}${e.count ? ' · ' + t('inv.figures', { n: e.count }) : ''}</small><div class="ib">${e.body}</div></div></div>`;
  }).join('');
}
