// Relic and crew icons in the fixed palette (no semantic tint).
import type { RelicId, CrewId } from '../relics';
import { INK, P, f, SH, HL, DL, line, blob, burst, flash } from './kit';

const GOLD = '#e8b23a';
const coin = (x: number, y: number, r: number): string =>
  `<circle ${f(GOLD)} cx="${x}" cy="${y}" r="${r}"/><circle ${DL(1.8)} stroke="${P.brassD}" cx="${x}" cy="${y}" r="${r * 0.62}"/><path ${HL} d="M${x - r * 0.7} ${y}a${r * 0.7} ${r * 0.7} 0 0 1 ${r * 0.7}-${r * 0.7}v${r * 0.3}a${r * 0.4} ${r * 0.4} 0 0 0-${r * 0.4} ${r * 0.4}z"/>`;
const cone = (x: number, y: number, w: number, h: number): string =>
  `<path ${f('#d8cdb4')} d="M${x - w} ${y}L${x - w * 0.4} ${y - h}H${x + w * 0.4}L${x + w} ${y}Z"/><path ${SH} d="M${x + w * 0.1} ${y - h}H${x + w * 0.4}L${x + w} ${y}H${x + w * 0.3}Z"/>`
  + `<ellipse fill="${INK}" stroke="none" cx="${x}" cy="${y - h}" rx="${w * 0.4}" ry="${Math.max(1.6, w * 0.16)}"/>`;
const sawTeeth = Array.from({ length: 8 }, (_, i) => { const y = 37 - i * 4.5; return `L${(23 + ((40 - y) * 4) / 38 - (i % 2 ? 0 : 3.5)).toFixed(1)} ${y}`; }).join('');

export const RELIC: Record<RelicId, string> = {
  coin: `<circle ${f(GOLD)} cx="32" cy="32" r="27"/><path ${SH} d="M32 59A27 27 0 0 0 59 32H52A20 20 0 0 1 32 52Z"/><circle ${DL(2.5)} stroke="${P.brassD}" cx="32" cy="32" r="20"/>`
    + `<path ${HL} d="M10 30A22 22 0 0 1 30 10V15A17 17 0 0 0 15 30Z"/>` + line('M32 34Q34 42 40 46', P.green, 2.5)
    + blob(P.green, [[26, 26, 6], [38, 26, 6], [26, 38, 6], [38, 38, 6], [32, 32, 4]]),
  biscuit: `<g transform="rotate(-8 32 32)"><rect ${f('#d9b77a')} x="8" y="10" width="48" height="44" rx="8"/><path ${SH} d="M8 44H56V46Q56 54 48 54H16Q8 54 8 46Z"/>`
    + `<path ${HL} d="M14 14H50V17H14Z"/>` + [20, 32, 44].flatMap(x => [21, 32, 43].map(y => `<circle fill="${INK}" stroke="none" cx="${x}" cy="${y}" r="2.6"/>`)).join('')
    + `<path ${DL(2)} d="M56 26L48 30L50 36"/></g>`,
  wind: [1, -1].map(m => `<g transform="translate(${m < 0 ? 64 : 0} 0) scale(${m} 1)"><path ${f(P.sail)} d="M24 34Q8 38 2 28Q6 28 8 26Q2 24 1 16Q6 18 9 17Q4 12 5 5Q16 12 26 20Z"/>`
    + `<path ${SH} d="M24 34Q8 38 2 28Q12 30 22 26Z"/><path ${DL(1.8)} d="M8 26Q16 28 22 27M9 17Q16 22 23 23"/></g>`).join('')
    + `<path ${f(P.red)} d="M32 58Q9 42 10 27Q11 15 21 15Q29 15 32 22Q35 15 43 15Q53 15 54 27Q55 42 32 58Z"/><path ${HL} d="M15 26Q16 19 22 19Q18 22 18 28Z"/>`,
  opal: `<path ${f('#e8603a')} d="M19 9H45L57 24L32 59L7 24Z"/><path ${f('#f08a5a')} d="M19 9L26 24H38L45 9Z"/><path ${SH} d="M38 24H57L32 59Z"/>`
    + `<path ${DL(2)} d="M7 24H57M26 24L32 59L38 24"/><path ${f(P.flame)} d="M32 27Q40 35 37 45Q35 50 32 53Q26 46 28 38Q29 35 32 27Z"/><path ${f(P.core)} d="M32 38Q35 42 32 49Q30 44 32 38Z"/>`
    + `<path ${HL} d="M21 11L26 22H12Z"/>`,
  quickmatch: line('M8 58L38 28', '#e0c080', 6) + `<ellipse ${f(P.red)} cx="41" cy="25" rx="7" ry="5.5" transform="rotate(-45 41 25)"/>`
    + `<path ${f(P.fire)} d="M44 22Q38 10 47 2Q47 10 55 8Q62 18 50 26Z"/><path ${f(P.flame)} d="M46 21Q44 14 48 9Q50 14 55 13Q57 20 49 23Z"/>`
    + burst(58, 28, 4, 1.5, 4, P.flame) + burst(36, 9, 3.5, 1.3, 4, P.flame) + line('M22 54L30 46M30 58L36 52', P.flame, 2.5),
  log: `<rect ${f(P.sail)} x="15" y="12" width="36" height="44" rx="3"/><path ${DL(1.5)} d="M44 15V53M47 15V53"/><rect ${f(P.leather)} x="8" y="9" width="36" height="46" rx="3"/>`
    + `<rect ${SH} x="8" y="9" width="7" height="46" rx="2"/><path ${f(P.brass)} d="M36 9H44V17ZM36 55H44V47Z" stroke-width="2"/><path fill="none" stroke="${P.brass}" stroke-width="2.5" d="M20 20H36M20 26H32"/>`
    + `<path ${f(P.sail)} d="M60 3Q63 20 49 34L41 44Q40 28 60 3Z"/><path ${SH} d="M60 3Q63 20 49 34L44 40Q54 22 60 3Z"/>` + line('M36 60L56 10', P.woodD, 2),
  kraken: `<path ${f('#f1e7cc')} d="M14 6Q34 2 48 7Q42 13 40 24Q34 46 20 61Q25 40 23 24Q21 13 14 6Z"/><path ${SH} d="M33 9Q42 9 48 7Q42 13 40 24Q34 46 20 61Q32 40 33 24Z"/><path ${f('#c9b48a')} d="M14 6Q34 2 48 7Q46 10 44 12Q30 9 18 11Z"/>`
    + line('M62 50Q46 58 37 47Q30 38 40 33Q49 30 48 39', '#9a4a8a', 7)
    + [[56, 52.5], [47, 52.5], [39, 45], [40, 36.5]].map(([x, y]) => `<circle fill="#f0c8e0" stroke="none" cx="${x}" cy="${y}" r="1.7"/>`).join(''),
  mermaid: `<path ${f('#2a8a8a')} d="M34 40Q46 42 61 55Q47 54 36 50Q30 58 12 61Q21 48 27 42Z"/><path ${f('#3fb8a8')} d="M17 3Q31 1 46 3Q46 24 37 43H27Q20 24 17 3Z"/>`
    + `<path ${DL(1.8)} d="M20 10q3.25 4 6.5 0q3.25 4 6.5 0q3.25 4 6.5 0q3.25 4 6.5 0M22 18q3 4 6 0q3 4 6 0q3 4 6 0M24 26q2.75 4 5.5 0q2.75 4 5.5 0q2.75 4 5.5 0M27 34q2.5 4 5 0q2.5 4 5 0"/>`
    + `<path ${HL} d="M21 5H26Q26 24 31 40H29Q22 24 21 5Z"/><path ${DL(1.8)} d="M36 50L52 55M33 49L22 57"/>`,
  storm: `<rect ${f(P.woodL)} x="24" y="2" width="16" height="8" rx="2"/><path ${f(P.glass)} d="M26 10H38V18Q52 24 52 38V52Q52 61 44 61H20Q12 61 12 52V38Q12 24 26 18Z"/>`
    + blob('#5a6470', [[24, 36, 6], [33, 32, 7.5], [42, 36, 5.5], [32, 39, 5]]) + `<path ${f(P.flame)} d="M35 38L26 50H33L29 59L43 45H36L40 38Z"/>`
    + `<path ${HL} d="M16 38Q16 28 24 23V27Q19 31 19 38V53H16Z"/>`,
  map: `<path ${f(P.parch)} d="M5 12L22 6L42 12L59 6V52L42 58L22 52L5 58Z"/><path ${SH} d="M22 6L42 12V58L22 52Z"/>`
    + `<path fill="none" stroke="${P.leather}" stroke-width="2.5" stroke-dasharray="3.5 3.5" d="M11 47Q18 34 28 38T42 27"/>`
    + line('M40 15L52 27M52 15L40 27', P.red, 4) + `<path ${DL(2)} d="M10 24Q14 20 18 23"/>`,
  barnacle: `<rect ${f(P.iron)} x="3" y="42" width="58" height="18" rx="3"/><path ${HL} d="M5 44H59V46H5Z"/>`
    + [9, 55].flatMap(x => [48, 55].map(y => `<circle fill="${P.ironL}" cx="${x}" cy="${y}" r="2"/>`)).join('')
    + cone(46, 44, 8, 12) + cone(18, 45, 7, 10) + cone(31, 44, 12, 26) + cone(53, 50, 4, 6),
  compass: `<circle ${f(P.brass)} cx="32" cy="32" r="28"/><circle ${f(P.sail)} cx="32" cy="32" r="21"/>`
    + `<g transform="rotate(45 32 32)"><path ${f(P.brassD)} d="M32 15L35 32H29ZM32 49L29 32H35ZM15 32L32 29V35ZM49 32L32 35V29Z" stroke-width="2"/></g>`
    + `<path ${f(P.navy)} d="M32 56L28 32H36ZM56 32L32 28V36ZM8 32L32 36V28Z" stroke-width="2.5"/><path ${f(P.red)} d="M32 6L36 32H28Z" stroke-width="2.5"/>`
    + `<circle ${f(P.brassL)} cx="32" cy="32" r="3.5" stroke-width="2"/><path ${HL} d="M9 26A24 24 0 0 1 26 9V12A21 21 0 0 0 12 26Z"/>`,
  cursed: `<circle ${f('#a8782a')} cx="32" cy="32" r="27"/><path ${SH} d="M32 59A27 27 0 0 0 59 32H52A20 20 0 0 1 32 52Z"/><circle ${DL(2.5)} stroke="#4a1a6a" cx="32" cy="32" r="21"/>`
    + `<path ${f('#efe8d8')} d="M32 15Q45 15 45 28Q45 34 40 37V42H24V37Q19 34 19 28Q19 15 32 15Z"/><path ${SH} d="M38 18Q45 21 44 30Q43 35 40 37V42H35Z"/>`
    + `<ellipse fill="#6a2a9a" stroke="none" cx="26.5" cy="28" rx="3.6" ry="4.4"/><ellipse fill="#6a2a9a" stroke="none" cx="37.5" cy="28" rx="3.6" ry="4.4"/><path fill="${INK}" stroke="none" d="M32 33L29.5 38H34.5Z"/>`
    + `<path ${DL(1.6)} d="M28 42V47M32 42V47M36 42V47"/><path ${HL} d="M9 30A22 22 0 0 1 30 9V14A17 17 0 0 0 14 30Z"/>` + burst(52, 12, 4, 1.6, 4, '#b070e0'),
  siren: `<path ${f('#f3b9c6')} d="M8 42Q4 18 28 10Q52 6 58 30Q60 52 38 58Q16 62 8 42Z"/><path ${SH} d="M58 30Q60 52 38 58Q50 46 48 30Q46 18 36 12Q56 12 58 30Z"/>`
    + `<path ${DL(2)} d="M12 38Q16 24 30 18M18 48Q22 30 36 24M26 55Q30 38 44 32"/><path ${f('#e88aa0')} d="M20 44Q24 34 34 32Q42 34 42 42Q40 52 30 52Q22 52 20 44Z"/>`
    + `<path ${DL(2)} d="M26 44Q30 38 36 42"/><path ${HL} d="M10 36Q12 22 26 14Q16 24 14 38Z"/>` + burst(52, 10, 4, 1.5, 4, '#9fe0f0') + burst(10, 12, 3, 1.2, 4, '#9fe0f0'),
  pearl: `<path ${f('#4a8a9a')} d="M3 40Q6 18 32 14Q58 18 61 40Q56 50 32 52Q8 50 3 40Z"/><path ${SH} d="M32 14Q58 18 61 40Q56 50 32 52Q48 40 32 14Z"/>`
    + `<path ${DL(2)} d="M32 16V50M18 20L24 50M46 20L40 50"/><path ${f('#6fb0c0')} d="M5 42Q10 56 32 58Q54 56 59 42Q50 50 32 50Q14 50 5 42Z"/>`
    + `<circle ${f('#f8f4ee')} cx="32" cy="36" r="12"/><path ${SH} d="M40 28A12 12 0 0 1 32 48A12 12 0 0 0 40 28Z"/><path ${HL} d="M26 30Q28 26 33 26Q29 28 28 33Z"/>`,
  rum: `<rect ${f('#7a4a22')} x="25" y="3" width="14" height="9" rx="2"/><path ${f('#8a5a2b')} d="M26 12H38V20Q52 26 52 38V53Q52 61 44 61H20Q12 61 12 53V38Q12 26 26 20Z"/><path ${SH} d="M38 20Q52 26 52 38V53Q52 61 44 61H40Q46 56 46 44Q46 28 38 20Z"/>`
    + `<rect ${f('#ecd9a8')} x="16" y="33" width="32" height="18" rx="2"/><path ${DL(2)} stroke="${P.red}" d="M23 38L28 46M28 38L23 46M34 38L39 46M39 38L34 46"/><path ${HL} d="M16 40Q16 30 24 24V28Q19 32 19 40V50H16Z"/>`,
  anchor: `<circle ${DL(5)} stroke="${INK}" cx="32" cy="11" r="6"/><circle fill="none" stroke="${P.ironL}" stroke-width="3" cx="32" cy="11" r="6"/>`
    + line('M32 17V55', P.iron, 6) + line('M20 26H44', P.iron, 5)
    + line('M8 38Q10 56 32 58Q54 56 56 38', P.iron, 5) + `<path ${f(P.ironL)} d="M3 36L14 32L12 46ZM61 36L50 32L52 46Z"/>` + `<path ${HL} d="M30 20H32V50H30Z"/>`,
  ghostlamp: `<path ${f(P.iron)} d="M24 4H40V10H24Z"/><path ${f(P.iron)} d="M30 0H34V5H30Z"/><path ${f('#cfeee8')} fill-opacity=".85" d="M22 12H42L46 24V46L42 52H22L18 46V24Z"/>`
    + `<path ${f('#4fd6b8')} d="M32 20Q42 30 38 40Q36 46 32 48Q26 42 27 34Q28 28 32 20Z"/><path ${f('#d8fff4')} d="M32 31Q36 36 32 44Q29 38 32 31Z"/>`
    + `<path ${f(P.iron)} d="M16 52H48V58H16Z"/><path ${DL(2)} d="M22 12V52M42 12V52"/><path ${HL} d="M24 15L26 26V42L24 46Z"/>`
    + blob('#bff5e8', [[54, 18, 5], [58, 26, 3.5]]) + blob('#bff5e8', [[8, 22, 4], [11, 30, 3]]),
  medal: `<path ${f(P.red)} d="M12 2H30L36 28H24Z"/><path ${f(P.navy)} d="M52 2H34L28 28H40Z"/><path ${SH} d="M30 2L36 28H28Z"/>`
    + `<circle ${f(P.brass)} cx="32" cy="42" r="19"/><path ${SH} d="M32 61A19 19 0 0 0 51 42H46A14 14 0 0 1 32 56Z"/><circle ${DL(2)} stroke="${P.brassD}" cx="32" cy="42" r="14"/>`
    + burst(32, 42, 11, 5, 5, P.brassL) + `<path ${HL} d="M16 38A17 17 0 0 1 30 25V29A13 13 0 0 0 20 40Z"/>`,
  vane: line('M32 62V22', P.iron, 4) + line('M18 40H46', P.iron, 3) + `<circle ${f(P.brassL)} cx="32" cy="40" r="3"/>`
    + `<path ${f(P.brass)} d="M6 14L22 8L32 3L48 8L58 14L48 20L32 24L22 20Z"/><path ${SH} d="M32 3L48 8L58 14L48 20L32 24Z"/>`
    + `<path ${f(P.red)} d="M6 14L2 6L14 10ZM6 14L2 22L14 18Z"/><circle fill="${INK}" stroke="none" cx="50" cy="12.5" r="1.8"/><path ${HL} d="M24 9L32 6L40 9L32 11Z"/>`
    + `<path ${f(P.sail)} d="M12 50H18L15 56ZM46 50H52L49 56Z" stroke-width="2"/>`,
};

export const CREW: Record<CrewId, string> = {
  // Musketeers: a long flintlock musket with a muzzle flash.
  musket: `<g transform="rotate(-35 32 34)"><rect ${f(P.wood)} x="4" y="29" width="22" height="9" rx="3"/><rect ${f(P.iron)} x="20" y="30.5" width="40" height="5.5" rx="2"/><rect ${f(P.brass)} x="30" y="29" width="3" height="9"/><rect ${f(P.brass)} x="44" y="29" width="3" height="9"/><path ${HL} d="M6 31H22V33H6Z"/></g>` + flash(54, 11, 8, 5) + burst(54, 11, 4, 1.8, 6, P.core),
  // Boarders: crossed cutlasses.
  boarder: `<g transform="rotate(40 32 32)"><path ${f(P.steel)} d="M29 2H36L36 42H29Z"/><path ${SH} d="M33 2H36V42H33Z"/><rect ${f(P.brass)} x="22" y="42" width="20" height="5" rx="2"/><rect ${f(P.leather)} x="29" y="47" width="6" height="13" rx="2"/></g>`
    + `<g transform="rotate(-40 32 32)"><path ${f(P.steel)} d="M29 2H36L36 42H29Z"/><path ${SH} d="M33 2H36V42H33Z"/><rect ${f(P.brass)} x="22" y="42" width="20" height="5" rx="2"/><rect ${f(P.leather)} x="29" y="47" width="6" height="13" rx="2"/></g>`,
  // Carpenters: crossed saw and claw hammer.
  carp: `<g transform="rotate(-40 32 32) translate(3.8 3.8) scale(.88)"><path ${f(P.steel)} d="M27 2H36L40 40H23${sawTeeth}Z"/><path ${SH} d="M32 2H36L40 40H33Z"/><path ${f(P.woodL)} d="M18 39H45Q46 50 42 61H21Q17 50 18 39Z"/><ellipse fill="${INK}" cx="31.5" cy="50" rx="6" ry="4"/></g>`
    + `<g transform="rotate(40 32 32) translate(3.8 3.8) scale(.88)"><rect ${f(P.wood)} x="28.5" y="18" width="7" height="44" rx="2.5"/><path ${f(P.iron)} d="M12 6H38V20H12Z"/><path ${f(P.iron)} d="M38 9Q48 8 53 2Q53 15 38 18Z"/><path ${HL} d="M14 8H36V11H14Z"/></g>`,
  // Quartermaster: purse of coin in front of the ledger.
  quart: `<g transform="rotate(10 42 26)"><rect ${f('#2f6d4d')} x="26" y="4" width="32" height="40" rx="3"/><rect ${SH} x="26" y="4" width="6" height="40"/><path fill="none" stroke="${P.brass}" stroke-width="2.5" d="M36 14H52M36 20H48M36 26H52"/></g>`
    + `<path ${f('#9a6a3a')} d="M20 28Q9 34 8 46Q8 60 26 60Q44 60 44 46Q43 34 32 28Z"/><path ${SH} d="M33 30Q43 36 44 46Q44 58 30 60Q40 52 33 30Z"/>`
    + `<path ${f('#9a6a3a')} d="M14 18L21 28H31L38 18Q26 23 14 18Z"/>` + line('M18 28Q26 31 34 28', P.brassL, 2.5)
    + coin(26, 45, 6) + coin(52, 55, 7) + coin(54, 44, 6),
  // Lookout: an extended brass spyglass.
  look: `<g transform="rotate(-30 32 34)"><rect ${f(P.brassD)} x="2" y="28" width="12" height="10" rx="2"/><rect ${f(P.brass)} x="13" y="26" width="15" height="14" rx="2"/>`
    + `<rect ${f(P.leather)} x="27" y="23" width="19" height="20" rx="2"/><rect ${f(P.brass)} x="45" y="20" width="12" height="26" rx="2"/><rect ${f(P.brassL)} x="54" y="18" width="6" height="30" rx="2"/>`
    + `<path ${HL} d="M15 28H26V30H15ZM47 22H55V25H47Z"/><rect ${SH} x="27" y="35" width="19" height="8"/></g>` + flash(57, 9, 6, 4),
  // Gunner: cannonball pyramid with a lit fuse.
  gunner: `<circle ${f(P.iron)} cx="18" cy="46" r="13"/><circle ${f(P.iron)} cx="46" cy="46" r="13"/><circle ${f(P.iron)} cx="32" cy="32" r="13"/>`
    + `<path ${HL} d="M12 40Q14 34 20 33Q16 37 16 42ZM40 40Q42 34 48 33Q44 37 44 42ZM26 26Q28 20 34 19Q30 23 30 28Z"/>`
    + line('M32 20Q33 12 40 8', '#d8c8a0', 3) + burst(42, 7, 6, 2.5, 6, P.fire) + burst(42, 7, 3, 1.2, 6, P.core),
  // Surgeon: leather bag with a red cross.
  surgeon: `<path ${f(P.leather)} d="M14 24H50L56 54Q56 60 50 60H14Q8 60 8 54Z"/><path ${SH} d="M38 24H50L56 54Q56 60 50 60H34Z"/><path ${DL(4)} stroke="${P.leather}" d="M22 24Q22 8 32 8Q42 8 42 24"/>`
    + `<path ${DL(2.5)} stroke="${P.brassL}" d="M22 24Q22 11 32 11Q42 11 42 24"/><circle ${f(P.sail)} cx="32" cy="40" r="12"/><path ${f(P.red)} d="M29 31H35V37H41V43H35V49H29V43H23V37H29Z" stroke-width="2"/>`
    + `<rect ${f(P.brass)} x="29" y="22" width="6" height="6" rx="1" stroke-width="2"/>`,
  // Navigator: chart and brass dividers.
  navigator: `<path ${f(P.parch)} d="M4 16L20 11L40 17L60 11V50L40 56L20 50L4 56Z"/><path ${SH} d="M40 17L60 11V50L40 56Z"/><path fill="none" stroke="${P.leather}" stroke-width="2.5" stroke-dasharray="3 3" d="M9 44Q18 32 28 38T44 26"/>`
    + line('M30 3L14 56', P.brass, 4) + line('M30 3L48 56', P.brassL, 4) + `<circle ${f(P.brassD)} cx="30" cy="8" r="5"/><path ${DL(2)} d="M19 36H43"/>`,
  // Powder Monkey: monkey face.
  monkey: `<circle ${f('#7a4a2a')} cx="9" cy="30" r="8"/><circle ${f('#7a4a2a')} cx="55" cy="30" r="8"/><circle fill="#e8b890" stroke="none" cx="9" cy="30" r="4"/><circle fill="#e8b890" stroke="none" cx="55" cy="30" r="4"/>`
    + `<path ${f('#8a5a30')} d="M32 6Q54 6 54 30Q54 56 32 58Q10 56 10 30Q10 6 32 6Z"/><path ${f('#e8b890')} d="M32 24Q44 22 46 34Q46 52 32 52Q18 52 18 34Q20 22 32 24Z"/>`
    + `<circle fill="${INK}" stroke="none" cx="25" cy="34" r="2.6"/><circle fill="${INK}" stroke="none" cx="39" cy="34" r="2.6"/><path ${DL(2)} d="M26 45Q32 49 38 45"/><path ${f(P.red)} d="M16 12Q32 2 48 12Q32 8 16 12Z" stroke-width="2"/>`
    + `<path ${HL} d="M16 16Q20 10 28 9Q22 14 20 22Z"/>`,
  // Cook: pot with ladle and steam.
  cook: `<path ${f(P.iron)} d="M8 28H56V44Q56 58 42 58H22Q8 58 8 44Z"/><path ${SH} d="M40 28H56V44Q56 58 42 58H36Q46 50 40 28Z"/><rect ${f(P.ironL)} x="5" y="24" width="54" height="7" rx="3"/>`
    + line('M14 36H8', P.iron, 3) + line('M50 36H56', P.iron, 3) + line('M48 24L58 6', P.woodL, 4) + `<ellipse ${f(P.woodD)} cx="58" cy="5" rx="5" ry="3.5"/>`
    + blob('#f0f0ea', [[20, 14, 5], [28, 9, 4.5], [34, 15, 4]]) + `<path ${HL} d="M11 33H24V36H11Z"/>`,
  // First Mate: brass hourglass (cooldowns).
  mate: `<rect ${f(P.woodD)} x="10" y="3" width="44" height="7" rx="2"/><rect ${f(P.woodD)} x="10" y="54" width="44" height="7" rx="2"/>`
    + `<path ${f(P.glass)} fill-opacity=".8" d="M16 10H48Q48 26 36 32Q48 38 48 54H16Q16 38 28 32Q16 26 16 10Z"/><path ${f(P.flame)} d="M20 14H44Q43 22 34 28H30Q21 22 20 14Z"/>`
    + `<path ${f(P.flame)} d="M24 54Q24 44 32 40Q40 44 40 54Z"/><path ${DL(2)} d="M32 30V40"/><path ${HL} d="M19 12Q19 24 27 31Q22 24 22 12Z"/>` + burst(54, 22, 4, 1.6, 4, P.brassL),
};
