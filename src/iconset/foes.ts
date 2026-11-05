// Enemy / boss silhouettes for the Unlocks compendium (64x64 painted-SVG style, same palette as the ship icons).
import { INK, P, f, SH, HL, line, svg } from './kit';

const hull = (c: string, y = 40, w = 0): string => `<path ${f(c)} d="M${4 - w} ${y}H${60 + w}L${52 + w / 2} ${y + 12}Q32 ${y + 17} ${12 - w / 2} ${y + 12}Z"/><path ${SH} d="M10 ${y + 8}H54L${52} ${y + 12}Q32 ${y + 17} 12 ${y + 12}Z"/>`;
const sail = (x: number, y0: number, y1: number, w: number, c = P.sail): string => `<path ${f(c)} d="M${x - w} ${y0}H${x + w}L${x + w + 2} ${y1}H${x - w - 2}Z"/>`;
const flame = (x: number, y: number, s = 1): string => `<path ${f(P.fire)} d="M${x} ${y}Q${x - 9 * s} ${y - 8 * s} ${x - 3 * s} ${y - 20 * s}Q${x + 1 * s} ${y - 12 * s} ${x + 5 * s} ${y - 22 * s}Q${x + 12 * s} ${y - 8 * s} ${x} ${y}Z"/><path ${f(P.flame)} d="M${x} ${y}Q${x - 4 * s} ${y - 5 * s} ${x - 1 * s} ${y - 11 * s}Q${x + 5 * s} ${y - 6 * s} ${x} ${y}Z" stroke="none"/>`;
const serpent = (c: string, big = false): string =>
  `<path d="M6 50Q18 28 28 46T50 40" fill="none" stroke-width="${big ? 17 : 14}"/><path d="M6 50Q18 28 28 46T50 40" fill="none" stroke="${c}" stroke-width="${big ? 13 : 10}"/>`
  + `<path ${f(c)} d="M44 38Q52 22 60 30Q62 38 54 44Z"/><circle cx="54" cy="32" r="2.2" fill="#ffe27a" stroke="none"/><path d="M58 36l5 2" stroke="${P.red}" stroke-width="2" fill="none"/>`;

const FOE: Record<string, string> = {
  gunboat: line('M32 10V40', P.mast, 3) + sail(32, 12, 34, 9) + hull(P.wood) + `<circle cx="48" cy="42" r="2.4" fill="${INK}" stroke="none"/>`,
  raft: `<path ${f(P.woodD)} d="M6 44H58L54 54H10Z"/><path d="M16 44V54M28 44V54M40 44V54" stroke="${INK}" stroke-width="2" fill="none"/>` + flame(32, 44, 1.25),
  brig: line('M20 8V40M44 8V40', P.mast, 3) + sail(20, 10, 32, 10) + sail(44, 10, 32, 10) + hull(P.woodD, 40, 2) + `<path ${f(P.brass)} d="M5 43H59V46H5Z" stroke-width="2"/>`,
  ketch: line('M22 12V40', P.mast, 3) + sail(22, 14, 34, 8) + hull(P.wood) + `<path ${f(P.iron)} d="M36 40L40 28H52L56 40Z"/><circle cx="46" cy="24" r="5" ${f(P.ironL)}/>`,
  swarm: line('M32 22V44', P.mast, 3) + sail(32, 24, 40, 6) + `<path ${f(P.wood)} d="M14 44H50L45 52Q32 55 19 52Z"/>`,
  serpent: serpent(P.green),
  minelayer: line('M22 12V40', P.mast, 3) + sail(22, 14, 34, 8, P.smoke) + hull(P.woodD) + `<circle cx="46" cy="30" r="8" ${f(P.iron)}/><path d="M46 18V22M46 38V42M34 30H38M54 30H58M37 21l3 3M52 36l3 3M55 21l-3 3M40 36l-3 3" stroke="${P.ironL}" stroke-width="3" fill="none"/>`,
  ghost: `<g opacity=".78">` + line('M32 8V40', '#cfe6ea', 3) + sail(32, 10, 32, 11, '#dff3f2') + hull('#a9d4e6') + `</g><circle cx="26" cy="22" r="2.4" fill="${INK}" stroke="none"/><circle cx="38" cy="22" r="2.4" fill="${INK}" stroke="none"/>`,
  battery: `<path ${f('#7d7a70')} d="M4 56L14 30H50L60 56Z"/><path ${SH} d="M32 30H50L60 56H32Z"/><path ${f(P.iron)} d="M20 32L44 20L48 27L24 38Z"/><circle cx="21" cy="36" r="5" ${f(P.ironL)}/><path ${HL} d="M16 32H46L45 34H15Z"/>`,
  fireship: line('M28 12V40', P.mast, 3) + `<path ${f(P.fire)} d="M16 14Q28 4 40 14L36 34H20Z"/>` + hull(P.red) + flame(28, 14, 1),
  boss: line('M16 8V40M32 4V40M48 8V40', P.mast, 3) + sail(16, 10, 30, 8, '#4a4a55') + sail(32, 6, 28, 10, '#4a4a55') + sail(48, 10, 30, 8, '#4a4a55')
    + `<path ${f(P.red)} d="M32 0L44 4L32 8Z" stroke-width="2"/>` + hull('#3a2a22', 38, 2) + `<path ${f(P.brass)} d="M4 42H60V45H4Z" stroke-width="2"/>`,
  leviathan: serpent('#d8657a', true),
  ashleviathan: serpent('#7a6f6a', true),
  fort: `<path ${f('#cfc6b4')} d="M24 56L28 14H40L44 56Z"/><path d="M26 28H42M25 42H43" stroke="${P.red}" stroke-width="6" fill="none"/><path ${SH} d="M36 14H40L44 56H36Z"/><path ${f(P.iron)} d="M24 14H44V8H24Z"/><path ${f(P.flame)} d="M30 8L34 0L38 8Z"/><path ${f('#7d7a70')} d="M6 56H58L52 48H12Z"/>`,
};
export const foeIcon = (k: string): string => svg(FOE[k] ?? FOE.boss);
