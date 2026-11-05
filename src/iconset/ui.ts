// UI glyphs (tinted by the surrounding CSS colour via currentColor) and the six generic ship-upgrade medals.
import { INK, P, f, SH, HL, DL, line, ring, burst } from './kit';

const spokes = (n: number, r1: number, r2: number): string =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n, s = Math.sin(a), c = Math.cos(a);
    return `M${(32 + s * r1).toFixed(1)} ${(32 + c * r1).toFixed(1)}L${(32 + s * r2).toFixed(1)} ${(32 + c * r2).toFixed(1)}`;
  }).join('');

export const GLYPH = {
  none: ring(32, 32, 22, 'currentColor', 6) + line('M16.5 47.5L47.5 16.5', 'currentColor', 6),
  anchor: ring(32, 10, 5, 'currentColor', 4.5) + line('M32 15V57M19 23H45M9 38Q13 57 32 57Q51 57 55 38', 'currentColor', 5)
    + `<path d="M3 43L9 31L15 43Z"/><path d="M49 43L55 31L61 43Z"/>`,
  crosshair: ring(32, 32, 18, 'currentColor', 5) + line('M32 4V18M32 46V60M4 32H18M46 32H60', 'currentColor', 5) + `<circle cx="32" cy="32" r="5"/>`,
  star: `<path d="M32 2Q36 28 62 32Q36 36 32 62Q28 36 2 32Q28 28 32 2Z"/><path ${HL} d="M32 10Q34 28 50 31Q34 30 32 32Q30 30 31 28Z"/><circle fill="#fff" stroke="none" cx="32" cy="32" r="3"/>`,
  plus: `<path d="M25 6H39V25H58V39H39V58H25V39H6V25H25Z"/><path ${HL} d="M27 8H33V27H8V25H27Z"/>`,
  wheel: line(spokes(8, 6, 27), 'currentColor', 4) + `<g>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
    const a = (i * Math.PI) / 4;
    return `<circle cx="${(32 + Math.sin(a) * 27).toFixed(1)}" cy="${(32 + Math.cos(a) * 27).toFixed(1)}" r="4"/>`;
  }).join('')}</g>` + ring(32, 32, 17, 'currentColor', 5) + `<circle cx="32" cy="32" r="7"/><circle fill="${INK}" stroke="none" cx="32" cy="32" r="2.5"/>`,
  skull: `<path d="M32 5Q55 5 55 28Q55 39 46 43V52H18V43Q9 39 9 28Q9 5 32 5Z"/><path ${SH} d="M18 43H46V52H18Z"/><path ${HL} d="M16 22Q18 10 30 9Q20 13 19 24Z"/>`
    + `<ellipse fill="${INK}" cx="22.5" cy="28" rx="6" ry="6.5"/><ellipse fill="${INK}" cx="41.5" cy="28" rx="6" ry="6.5"/><path fill="${INK}" d="M32 35L28.5 41H35.5Z"/>`
    + `<path ${DL(2.5)} d="M25 44V52M32 44V52M39 44V52"/>`,
  sail: line('M36 4V60', P.mast, 3.5) + line('M12 10H58', P.mast, 3.5) + line('M2 22H10M4 32H12M2 42H10', 'currentColor', 3)
    + `<path d="M15 12H56Q63 34 52 56H20Q26 34 15 12Z"/><path ${SH} d="M44 12H56Q63 34 52 56H44Q52 34 44 12Z"/><path ${HL} d="M19 15H27Q32 34 26 52H23Q28 34 19 15Z"/>`,
  lock: line('M20 30V21Q20 8 32 8Q44 8 44 21V30', 'currentColor', 6) + `<rect x="10" y="28" width="44" height="31" rx="6"/><rect ${SH} x="10" y="48" width="44" height="11" rx="5"/>`
    + `<path ${HL} d="M14 31H50V35H14Z"/><circle fill="${INK}" cx="32" cy="40" r="5"/><path fill="${INK}" d="M29.5 42H34.5L36 52H28Z"/>`,
  coin: `<circle cx="32" cy="32" r="27"/><path ${SH} d="M32 59A27 27 0 0 0 59 32H51A19 19 0 0 1 32 51Z"/><circle ${DL(3)} stroke="#000" stroke-opacity=".35" cx="32" cy="32" r="19"/>`
    + `<path ${HL} d="M11 30A21 21 0 0 1 30 11V16A16 16 0 0 0 16 30Z"/>${burst(32, 33, 11, 4.5, 5, '#000').replace('<polygon', '<polygon fill-opacity=".3" stroke="none"')}`,
};

const smallCannon = `<path ${f(P.wood)} d="M14 44H42L38 52H18Z"/><circle ${f(P.woodD)} cx="20" cy="55" r="6"/><circle ${f(P.woodD)} cx="36" cy="55" r="6"/>`
  + `<circle ${f(P.iron)} cx="8" cy="36" r="4"/><path ${f(P.iron)} d="M10 28L50 31V41L10 44Z"/><rect ${f(P.iron)} x="48" y="29" width="7" height="14" rx="2"/><rect ${f(P.iron)} x="20" y="27" width="5" height="18" rx="1.5"/>`
  + `<path ${HL} d="M12 31L48 33V35L12 34Z"/>`;
const ball = (x: number, y: number): string => `<circle ${f(P.iron)} cx="${x}" cy="${y}" r="10"/><path ${HL} d="M${x - 6} ${y - 1}a6 6 0 0 1 5-5v3a3 3 0 0 0-2 2z"/>`;
const link = (x: number, y: number, ry: number): string =>
  `<ellipse cx="${x}" cy="${y}" rx="7" ry="${ry}" fill="none" stroke-width="8" transform="rotate(-42 ${x} ${y})"/><ellipse cx="${x}" cy="${y}" rx="7" ry="${ry}" fill="none" stroke="${P.ironL}" stroke-width="3.5" transform="rotate(-42 ${x} ${y})"/>`;

/** Ship-upgrade medals keyed by card ref (cards.ts `up(...)`). */
export const UPG: Record<string, string> = {
  // Extra Cannon: a cannon with a plus.
  cannon: smallCannon + `<path d="M11 2H18V9H25V16H18V23H11V16H4V9H11Z"/>`,
  // Fire Rate: hourglass with speed lines.
  rate: line('M2 22H10M0 32H9M2 42H10', 'currentColor', 3) + `<path ${f(P.glass)} d="M18 10H46Q46 26 35 32Q46 38 46 54H18Q18 38 29 32Q18 26 18 10Z"/>`
    + `<path d="M22 16H42Q40 25 32 29Q24 25 22 16Z"/><path d="M20 52Q23 42 32 40Q41 42 44 52Z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M32 30V40"/>`
    + `<rect ${f(P.brass)} x="13" y="4" width="38" height="7" rx="2"/><rect ${f(P.brass)} x="13" y="53" width="38" height="7" rx="2"/><path ${HL} d="M21 13H25Q24 24 30 30H27Q21 24 21 13Z"/>`,
  // Chain Shot: two balls joined by chain.
  chain: line('M2 40L8 34M12 62L18 56', 'currentColor', 2.5) + link(24.4, 38.8, 4) + link(32, 32, 1.2) + link(39.6, 25.2, 4) + ball(13, 49) + ball(51, 15),
  // Hull Plating: a ship's hull clad in riveted iron plates, riding the waterline.
  hull: `<path ${f(P.wood)} d="M2 12H62L55 42Q34 52 12 44Q4 34 2 12Z"/><path ${f(P.woodL)} d="M2 12H62L61 16H2Z"/>`
    + `<path ${f(P.ironL)} d="M7 20H22V32H8Z"/><path ${f(P.ironL)} d="M24 20H40V32H24Z"/><path ${f(P.ironL)} d="M42 20H58L56 32H42Z"/><path ${f(P.ironL)} d="M11 35H32V45Q20 46 13 42Z"/><path ${f(P.ironL)} d="M34 35H54L53 41Q44 46 34 46Z"/>`
    + `<path ${SH} d="M7 28H58L56 32H8Z"/>`
    + [[10, 23], [19, 23], [27, 23], [37, 23], [45, 23], [55, 23], [15, 38], [29, 38], [37, 38], [51, 38]].map(([x, y]) => `<circle fill="${INK}" stroke="none" cx="${x}" cy="${y}" r="1.7"/>`).join('')
    + line('M0 55Q8 50 16 55T32 55T48 55T64 55', 'currentColor', 3.5),
  // Bigger Sails: course and topsail on their yards, with expand arrows.
  sails: line('M32 3V62', P.mast, 3.5) + line('M3 13V3H13M51 3H61V13M4 4L13 13M60 4L51 13', 'currentColor', 3.5)
    + `<path ${f(P.sail)} d="M17 13H47L45 27Q32 31 19 27Z"/><path ${f(P.sail)} d="M9 33H55L52 54Q32 60 12 54Z"/>`
    + `<path ${SH} d="M41 33H55L52 54Q46 56 41 57Q45 45 41 33Z"/><path ${SH} d="M40 13H47L45 27Q42 28 40 29Q42 21 40 13Z"/>`
    + line('M13 13H51M4 33H60', P.mast, 3),
  // Long Hooks: a boathook reaching out to snag loot.
  hooks: line('M30 6A26 26 0 0 1 58 34', 'currentColor', 3) + line('M26 0A34 34 0 0 1 64 38', 'currentColor', 2.5)
    + line('M5 60L38 27', P.woodL, 5) + line('M38 27L47 13M42 20Q52 21 53 31Q53 39 46 40', P.ironL, 4)
    + `<circle ${f(P.brassL)} cx="52" cy="52" r="7.5"/><circle ${DL(2)} cx="52" cy="52" r="4"/>` + line('M40 50L44 51M42 58L45 56', 'currentColor', 2),
  // Swivel Guns: a cannon on a pivot post, sweeping a wider arc.
  swivel: line('M6 28A28 28 0 0 1 20 8M58 28A28 28 0 0 0 44 8', 'currentColor', 3) + `<path d="M15 3L26 8L17 15Z"/><path d="M49 3L38 8L47 15Z"/>`
    + `<path ${f(P.wood)} d="M22 60H42L38 49H26Z"/>` + line('M32 50V38', P.woodL, 6)
    + `<g transform="rotate(-16 32 37)"><circle ${f(P.iron)} cx="12" cy="36" r="4"/><path ${f(P.iron)} d="M14 29L54 31V42L14 43Z"/><rect ${f(P.iron)} x="51" y="28" width="7" height="15" rx="2"/><path ${HL} d="M17 32L50 33V35L17 34Z"/></g>`
    + `<circle ${f(P.brass)} cx="32" cy="38" r="8"/><circle ${DL(2)} cx="32" cy="38" r="4.5"/><circle fill="${INK}" stroke="none" cx="32" cy="38" r="2"/>`,
};
