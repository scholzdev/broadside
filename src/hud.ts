import { G, pickCard, reroll, rerollsLeft, xpNeed, restartRun, toMainMenu } from './game';
import { buyCard } from './loot';
import { ACTS } from './content';
import { cardHtml, buyHtml } from './cardview';
import { ICON } from './icons';
import { DAILY } from './daily';
import { dailyTag, dailyBestText } from './dailyui';
import { loadDaily } from './dailyrun';
import { t, onLang } from './i18n';
import { relicName, bossName, unlockName as unlName } from './lname';
import { wind } from './world';
import { initAbar, updateAbar, resetAbar } from './abar';
import { initInv, updateInv } from './invbar';
import { initQuestUi, updateQuestUi } from './questui';
import type { RunResult } from './meta';
import { DBL } from './unlocks';
import { L } from './loadout';
import { SEAS, seaBoss } from './seas';
import { seaName, questText } from './seatext';
import { updateStatusIcons } from './statusui';
import { END, HEAT } from './heatdefs';
import { endlessLabel } from './endlessui';

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
let el: Record<string, HTMLElement> = {};

export function initHud(): void {
  $('hud').innerHTML = `
    <div id="bars"></div>
    <div class="hudel xprail"><div class="lvb"><small id="lvLbl"></small><b id="lvl"></b></div><div class="xpbar"><i id="xpFill"></i><span id="xpTxt"></span></div></div>
    <div class="hudel topc">
      <div class="panel hpbox">
        <div class="hpbar"><i id="hpTrail"></i><i id="hpFill"></i><i class="seg" id="hpSeg"></i><span class="hpl" id="hpLbl"></span><span class="hpv" id="hpTxt"></span></div>
        <div class="fsbar"><i id="fsFill"></i></div>
        <div class="pstat" id="pstat"></div>
      </div>
      <div class="bossrow" id="bossT"></div>
      <div id="bossBarWrap"><div class="bar"><i id="bossFill"></i></div></div>
    </div>
    <div class="panel tr">
      <span class="trv" id="tGold">${ICON.coin}<b id="gold"></b></span><span class="trv" id="tKills">${ICON.skull}<b id="kills"></b></span>
      <span class="trv" id="tWind"><span id="windArrow">↑</span></span>
    </div>
    <div class="panel bc" id="abar"></div>
    <div id="vig"></div>
    <div id="cards"></div><div id="end"></div><div id="menu"></div>`;
  for (const id of ['hpTxt', 'hpFill', 'hpTrail', 'hpSeg', 'vig', 'lvl', 'xpTxt', 'xpFill', 'fsFill', 'bossT', 'bossBarWrap', 'bossFill', 'gold', 'kills', 'windArrow', 'cards', 'end', 'menu']) el[id] = $(id);
  el.cards.addEventListener('click', e => {
    if ((e.target as HTMLElement).closest('#reroll')) { reroll(); return; }
    const b = (e.target as HTMLElement).closest('.btile') as HTMLElement | null;
    if (b) { buyCard(Number(b.dataset.b)); return; }
    const c = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (c) pickCard(Number(c.dataset.i));
  });
  initAbar();
  initInv();
  initQuestUi($('hud'));
  labels();
  onLang(() => { labels(); bossHtml = ''; resetAbar(); });
  el.end.addEventListener('click', e => {
    const id = ((e.target as HTMLElement).closest('button') as HTMLElement | null)?.id;
    if (id === 'again') restartRun();
    else if (id === 'toMenu') toMainMenu();
  });
}

/** (Re)applies the language-dependent static HUD labels. */
function labels(): void {
  $('lvLbl').textContent = t('hud.lv'); $('hpLbl').textContent = t('hud.hull');
  $('tGold').title = t('hud.gold'); $('tKills').title = t('hud.kills'); $('tWind').title = t('hud.wind');
}

export function showCards(): void {
  const n = rerollsLeft(), extra = n - (G.baseRoll ? 1 : 0), txt = n <= 0 ? t('card.rerollNone') : G.baseRoll ? (extra > 0 ? t('card.rerollFreeX', { n: extra }) : t('card.rerollFree')) : t('card.rerollX', { n: extra });
  const title = G.state === 'loot' ? t('loot.title', { a: G.act }) : t('card.level', { n: G.level });
  el.cards.innerHTML = `<h2>${title}</h2><div class="crow">${G.cards.map(cardHtml).join('')}</div><div id="buyrow"></div><div class="btnrow">${HEAT.level >= 5 ? `<span class="ironman">${ICON.skull} ${t('heat.ironman')}</span>` : `<button id="reroll" ${n > 0 ? '' : 'disabled'}>${txt} <small data-p="Y">R</small></button>`}</div><div class="hint"><span class="hk">${t('card.hint')}</span><span class="hp">${t('card.hintPad')}</span></div>`;
  showBuy();
  el.cards.classList.add('anim');
  el.cards.style.display = 'flex';
}
/** (Re)draws the buy row under the free cards (after a purchase too, without replaying the card animation). */
export function showBuy(): void {
  const row = document.getElementById('buyrow');
  if (row) row.innerHTML = G.buy.length ? `<div class="bhead">${t('buy.title')}<span>${ICON.coin}<b>${G.gold}</b></span></div><div class="btiles">${G.buy.map(buyHtml).join('')}</div>` : '';
}
export function hideCards(): void { el.cards.style.display = 'none'; }

const dailyBestLine = (): string => { const b = loadDaily().best; return b ? t('daily.endBest', { best: dailyBestText(b) }) : ''; };
export function showEnd(won: boolean, r: RunResult | null): void {
  const tt = Math.floor(G.time), mm = Math.floor(tt / 60), ss = String(tt % 60).padStart(2, '0');
  el.end.innerHTML = `<div class="box"><h1>${t(won ? 'end.victory' : 'end.sunk')}</h1>
    <p>${t(won ? 'end.winText' : 'end.loseText')}</p>
    <p>${t('end.time', { t: `${mm}:${ss}`, l: G.level })}</p>
    <p>${t('end.goldKills', { g: G.gold, k: G.kills })}</p>
    <p>${t('end.sea', { name: seaName(G.sea), m: SEAS[G.sea].dblMul })}${r && r.heat ? ` &middot; ${ICON.skull}&times;${r.heat} ${t('heat.title')} (&times;${r.mul})` : ''}</p>
    ${r && r.endN ? `<p class="endn">&infin; ${t('end.endless', { n: r.endN, d: r.endD })}</p>` : ''}
    ${L.relic ? `<p>${t('end.relic', { name: relicName(L.relic) })}</p>` : ''}
    ${r ? `<div class="dbreak"><div><span>${t('end.gold', { n: r.gold })}</span><b>${r.goldD}</b></div><div><span>${t('end.bosses', { n: r.bosses })}</span><b>${r.bossD}</b></div>
      <div><span>${t('end.acts', { n: r.acts })}</span><b>${r.actD}</b></div><div><span>${t('end.kills', { n: r.kills })}</span><b>${r.killD}</b></div>${r.chestD ? `<div><span>${t('end.chests')}</span><b>${r.chestD}</b></div>` : ''}${r.questN ? `<div><span>${t('end.quests', { n: r.questN })}</span><b>${r.questD}</b></div>` : ''}
      <div class="tot"><span>${t('end.earned')}</span><b>+${r.total} ${DBL}</b></div><div><span>${t('doubloons')}</span><b>${r.balance} ${DBL}</b></div></div>
      ${r.quests.map(q => `<div class="sqd"><span>${t('end.quest', { name: questText(SEAS[G.sea].quests.find(x => x.id === q.id) ?? SEAS[G.sea].quests[0]) })}</span><b>+${q.reward} ${DBL}</b></div>`).join('')}
      ${r.unlocked.length ? `<p class="unl">${t('end.unlocked', { list: r.unlocked.map(unlName).join(', ') })}</p>` : ''}` : ''}
    ${DAILY ? `<p class="dbestl">${dailyBestLine()}</p>` : ''}
    <div class="btns"><button id="again">${t('end.again')}</button><button id="toMenu">${t('end.menu')}</button></div></div>`;
  el.end.style.display = 'flex';
}

export function hideEnd(): void { el.end.style.display = 'none'; }

const SQ = Math.SQRT1_2;
let shownState = '', bossHtml = '', segMax = 0;
const mmss = (t: number): string => { const s = Math.ceil(t); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export function updateHud(): void {
  if (shownState !== G.state) { shownState = G.state; document.body.dataset.state = G.state; }
  const need = xpNeed(G.level), p = G.player;
  el.hpTxt.textContent = `${Math.ceil(G.hp)} / ${G.maxHp}`;
  el.hpFill.style.width = el.hpTrail.style.width = (G.hp / G.maxHp) * 100 + '%';
  if (segMax !== G.maxHp) { segMax = G.maxHp; el.hpSeg.style.setProperty('--seg', (2500 / G.maxHp).toFixed(3) + '%'); } // one segment per 25 HP
  el.vig.style.opacity = String(Math.min(1, G.hitFlash / 0.25));
  el.lvl.textContent = String(G.level);
  el.xpTxt.textContent = `${G.xp} / ${need}`;
  el.xpFill.style.height = (G.xp / need) * 100 + '%';
  el.gold.textContent = String(G.gold);
  el.kills.textContent = String(G.kills);
  const bn = bossName(G.boss?.bd?.id ?? seaBoss(G.sea, G.act)), act = `<small>${t('hud.act', { a: G.act, n: ACTS })}${HEAT.level ? ` &middot; ${ICON.skull}${HEAT.level}` : ''}</small>`;
  let bh: string;
  const shut = G.boss?.hidden ? `<small class="bst">${t(G.boss.bd?.fort ? 'boss.shielded' : 'boss.submerged')}</small>` : ''; // untargetable right now
  if (G.boss) bh = `${ICON.skull}<b>${bn}</b>${shut}${act}`;
  else if (END.on) bh = act;
  else if (G.bossSpawned) bh = `<b>${t('hud.bossDown')}</b>${act}`;
  else bh = `${ICON.skull}<b class="tm${G.bossTimer <= 30 ? ' soon' : ''}">${mmss(G.bossTimer)}</b><small>${t('hud.act', { a: G.act, n: ACTS })} &middot; ${bn}</small>`;
  bh += endlessLabel() + (DAILY ? `<small class="dtag">${dailyTag()}</small>` : '');
  if (bh !== bossHtml) { bossHtml = bh; el.bossT.innerHTML = bh; }
  el.bossBarWrap.style.display = G.boss ? 'block' : 'none';
  el.bossBarWrap.classList.toggle('sub', !!G.boss?.hidden);
  if (G.boss) el.bossFill.style.width = (G.boss.hp / G.boss.maxHp) * 100 + '%';
  el.fsFill.style.width = p.nitro * 100 + '%';
  el.fsFill.classList.toggle('on', p.boost);
  el.fsFill.classList.toggle('cd', !p.boost && p.nitro < 1);
  // camera yaw 45 deg: screen-right = (1,-1)/sqrt2, screen-up = (-1,-1)/sqrt2 in world (x,z)
  const dx = Math.sin(wind.angle), dz = Math.cos(wind.angle);
  const deg = (Math.atan2((dx - dz) * SQ, (-dx - dz) * SQ) * 180) / Math.PI;
  el.windArrow.style.transform = `rotate(${deg}deg)`;
  el.hpFill.style.filter = G.hitFlash > 0 ? 'brightness(1.8)' : '';
  updateAbar();
  updateStatusIcons();
  updateInv();
  updateQuestUi();
}
