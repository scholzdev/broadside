// Ship silhouettes (side view, bow to the right) in the fixed wood / canvas palette.
import type { ShipId } from '../loadout';
import { INK, P, f, SH, HL, line } from './kit';

const square = (x: number, y0: number, y1: number, w: number): string =>
  `<path ${f(P.sail)} d="M${x - w} ${y0}H${x + w}Q${x + w + 2.5} ${(y0 + y1) / 2} ${x + w} ${y1}H${x - w}Q${x - w - 2.5} ${(y0 + y1) / 2} ${x - w} ${y0}Z"/>`
  + `<path ${SH} d="M${x + w * 0.35} ${y0}H${x + w}Q${x + w + 2.5} ${(y0 + y1) / 2} ${x + w} ${y1}H${x + w * 0.35}Z"/>`;
const flag = (x: number, y: number): string => `<path ${f(P.red)} d="M${x} ${y}L${x + 10} ${y + 3}L${x} ${y + 6}Z"/>`;

export const SHIP: Record<ShipId, string> = {
  // Single mast, a gaff mainsail aft and a jib forward.
  sloop: line('M28 5V44', P.mast, 3) + line('M50 42L61 35', P.mast, 2.5) + flag(28, 3)
    + `<path ${f(P.sail)} d="M26 9Q20 27 7 40H26Z"/><path ${SH} d="M26 9V40H19Q24 26 26 9Z"/><path ${f(P.sail)} d="M31 11L54 38H31Z"/>`
    + `<path ${f(P.wood)} d="M3 40H59L52 52Q32 57 13 52Z"/><path ${f(P.woodL)} d="M4 40H59L57.5 43H5Z"/><path ${SH} d="M9 48H54L52 52Q32 57 13 52Z"/>`,
  // Two masts: square sails forward, a big gaff mainsail aft, sharp bow.
  brigantine: line('M22 6V40M43 9V40', P.mast, 3) + line('M54 39L63 33', P.mast, 2.5) + flag(22, 4)
    + square(43, 10, 19, 6.5) + square(43, 21, 34, 7.5) + square(22, 8, 20, 7)
    + `<path ${f(P.sail)} d="M20 14Q13 30 3 38H20Z"/><path ${SH} d="M20 14V38H12Q18 28 20 14Z"/>`
    + `<path ${f(P.wood)} d="M2 38H60L54 51Q32 56 11 51Q4 46 2 38Z"/><path ${f(P.brassL)} d="M3 41H59L58 44H4Z" stroke-width="2"/><path ${SH} d="M8 47H55L54 51Q32 56 11 51Z"/>`,
  // Three masts of square sails over a bulky hull with a tall stern castle.
  galleon: line('M17 8V38M32 3V40M47 7V40', P.mast, 3) + line('M56 38L63 31', P.mast, 2.5) + flag(32, 1)
    + `<path ${f(P.sail)} d="M17 11L27 32H8Z"/>` + square(47, 11, 20, 7) + square(47, 22, 35, 8) + square(32, 6, 16, 8) + square(32, 18, 34, 10)
    + `<path ${f(P.wood)} d="M1 17H19V36H58L62 33L55 52Q34 58 13 52Q3 44 1 17Z"/><path ${f(P.woodD)} d="M0 15H20V20H0Z"/>`
    + [[4, 23], [11, 23], [4, 30], [11, 30]].map(([x, y]) => `<rect ${f(P.brassL)} x="${x}" y="${y}" width="4" height="4" stroke-width="2"/>`).join('')
    + `<path fill="none" stroke="${P.brass}" stroke-width="2.5" d="M5 41H57"/><path ${SH} d="M8 46H56L55 52Q34 58 13 52Z"/>`,
  // Three raked lateen sails on a long, low hull with a high stem.
  xebec: line('M14 8V38M32 4V38M49 9V38', P.mast, 3) + line('M57 38L63 30', P.mast, 2.5) + flag(32, 2)
    + [14, 32, 49].map((x, i) => `<path ${f(P.sail)} d="M${x} ${[10, 6, 11][i]}L${x + 14} 36H${x - 12}Z"/><path ${SH} d="M${x} ${[10, 6, 11][i]}L${x + 14} 36H${x + 4}Z"/>`).join('')
    + `<path ${f(P.wood)} d="M1 38H61L63 31L56 51Q32 56 8 51Q3 46 1 38Z"/><path ${f(P.red)} d="M3 41H59L58 45H4Z" stroke-width="2"/>`
    + Array.from({ length: 6 }, (_, i) => `<rect fill="${INK}" stroke="none" x="${10 + i * 7.5}" y="41.8" width="3" height="2.4"/>`).join('')
    + `<path ${SH} d="M8 47H56L56 51Q32 56 8 51Z"/>`,
  // Long, low hull with a row of gun ports and three tall masts.
  frigate: line('M16 8V38M32 4V38M48 8V38', P.mast, 3) + line('M57 38L63 31', P.mast, 2.5) + flag(32, 2)
    + square(16, 10, 19, 6) + square(16, 21, 34, 7.5) + square(48, 10, 19, 6) + square(48, 21, 34, 7.5) + square(32, 7, 17, 6.5) + square(32, 19, 34, 8)
    + `<path ${f(P.wood)} d="M1 37H63L56 51Q32 55 8 51Z"/><path ${f(P.brass)} d="M2 40H62L60.5 45H4Z" stroke-width="2"/>`
    + Array.from({ length: 8 }, (_, i) => `<rect fill="${INK}" stroke="none" x="${8 + i * 6.5}" y="41.2" width="3" height="2.8"/>`).join('')
    + `<path ${HL} d="M3 37.5H62L61.6 38.6H3.5Z"/>`,
};
