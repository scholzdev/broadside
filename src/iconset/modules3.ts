import { P, f, SH, HL, DL, ring, flash, burst } from './kit';

// Icons of the v10 modules (64x64 viewBox, same palette and ink outline as modules.ts).
export const MOD3 = {
  // Small swivel gun on a forked post, a stream of tiny shots.
  swivel: `<path ${f(P.wood)} d="M26 40H38L42 60H22Z"/><path ${f(P.iron)} d="M20 36Q32 46 44 36L40 32Q32 40 24 32Z"/>`
    + `<g transform="rotate(-14 30 30)"><rect ${f(P.iron)} x="12" y="24" width="34" height="10" rx="3"/><rect ${f(P.brass)} x="40" y="22" width="7" height="14" rx="2"/><path ${HL} d="M14 26H38V28H14Z"/></g>`
    + [[52, 16], [57, 22], [53, 28]].map(([x, y]) => `<circle ${f(P.flame)} cx="${x}" cy="${y}" r="2.6"/>`).join('') + flash(48, 24, 6, 6),
  // Two iron balls joined by a chain, spinning, with a torn sail below.
  chain: `<path ${f(P.sail)} d="M8 44L30 42L52 46L50 60L10 60Z"/><path ${f(P.parch)} d="M30 42L52 46L44 52Z"/><path ${DL(2)} d="M12 50L26 48M32 54L46 56"/>`
    + `<path ${DL(3)} d="M18 18Q32 4 46 18"/><circle ${f(P.iron)} cx="14" cy="22" r="9"/><circle ${f(P.iron)} cx="50" cy="22" r="9"/>`
    + `<path ${HL} d="M9 18Q12 14 16 15L14 18Z"/><path ${HL} d="M45 18Q48 14 52 15L50 18Z"/>` + ring(32, 11, 3, P.ironL, 2),
  // Archer's bow with a burning arrow nocked.
  firearrows: `<path d="M16 6Q4 32 16 58" fill="none" stroke-width="9"/><path d="M16 6Q4 32 16 58" fill="none" stroke="${P.woodL}" stroke-width="5"/>`
    + `<path d="M16 6L16 58" fill="none" stroke-width="1.6" stroke="${P.sail}"/>`
    + `<rect ${f(P.wood)} x="14" y="29" width="40" height="4" rx="1.5"/><path ${f(P.steel)} d="M52 25L63 31L52 37Z"/>`
    + `<path ${f(P.fire)} d="M40 8Q50 14 42 22Q48 22 46 29Q36 28 34 20Q38 18 40 8Z"/><path ${f(P.flame)} d="M40 15Q45 19 41 24Q38 22 40 15Z"/><path ${f(P.red)} d="M14 28L22 24V38L14 34Z"/>`,
  // Squat bomb with a lit fuse and a stern-facing arrow of burning water.
  bombketch: `<circle ${f('#2a2b30')} cx="30" cy="38" r="20"/><path ${HL} d="M18 30Q22 22 30 20L28 26Q22 28 20 34Z"/><path ${SH} d="M38 26Q54 40 38 56Q26 60 18 52Q38 54 38 26Z"/>`
    + `<rect ${f(P.brass)} x="26" y="14" width="10" height="7" rx="2"/><path d="M31 14Q36 6 44 8" fill="none" stroke-width="6"/><path d="M31 14Q36 6 44 8" fill="none" stroke="#b39a6a" stroke-width="2.6"/>`
    + burst(46, 8, 7, 3, 8, P.flame) + burst(46, 8, 3.6, 1.5, 8, P.core) + `<path ${f(P.fire)} d="M4 58Q10 46 16 56Q22 48 24 60Z"/>`,
  // Coil on a pole with a lightning bolt.
  tesla: `<rect ${f(P.iron)} x="22" y="50" width="20" height="10" rx="2"/><rect ${f(P.brass)} x="28" y="14" width="8" height="38"/>`
    + [[20, 40], [24, 32], [28, 24]].map(([w, y]) => `<ellipse ${f(P.brassL)} cx="32" cy="${y + 4}" rx="${w / 2 + 6}" ry="4"/>`).join('')
    + `<circle ${f('#bfeaff')} cx="32" cy="12" r="8"/><path d="M36 0L26 12H33L28 24L40 9H33Z" fill="#fff" stroke-width="1.5"/>`
    + `<path d="M6 20L16 24L12 30L22 34M58 16L48 22L52 28L44 34" fill="none" stroke-width="5"/><path d="M6 20L16 24L12 30L22 34M58 16L48 22L52 28L44 34" fill="none" stroke="#6fd8ff" stroke-width="2.4"/>`,
  // Revolving cluster of barrels with a stream of bullets.
  gatling: `<path ${f(P.wood)} d="M4 40H20L24 56H8Z"/><circle ${f(P.iron)} cx="22" cy="34" r="12"/>`
    + [[-6, 8], [6, 6], [-4, 18]].map(([dy]) => `<rect ${f(P.iron)} x="22" y="${28 + dy / 2}" width="30" height="7" rx="3"/>`).join('')
    + `<rect ${f(P.brass)} x="46" y="24" width="8" height="22" rx="3"/><circle ${f(P.brassL)} cx="22" cy="34" r="5"/><path ${HL} d="M24 29H48V31H24Z"/>`
    + [[58, 28], [60, 36], [57, 43]].map(([x, y]) => `<circle ${f(P.flame)} cx="${x}" cy="${y}" r="2.4"/>`).join('') + flash(56, 35, 6, 6),
  // Shark fin cutting the water over a barred cage.
  sharkcage: `<path ${f('#3a7ca0')} d="M0 36Q10 30 20 36T40 36T64 36V64H0Z"/><path ${f('#8fc8e0')} d="M0 36Q10 30 20 36T40 36T64 36V40Q50 34 40 40T20 40T0 40Z"/>`
    + `<path ${f('#7d8f9c')} d="M14 38Q18 12 34 6Q30 22 40 38Z"/><path ${SH} d="M30 12Q28 26 38 38H40Q30 24 34 6Z"/>`
    + `<rect ${f(P.iron)} x="38" y="40" width="22" height="22" rx="2"/>` + [44, 50, 56].map(x => `<path d="M${x} 40V62" fill="none" stroke="${P.ironL}" stroke-width="2.4"/>`).join('')
    + `<path ${DL(2)} d="M38 51H60"/><path ${f('#fff')} d="M16 38L20 44L24 38L28 44L32 38Z"/>`,
  // Brass spyglass on a tripod, a crosshair on the lens.
  spyglass: `<path d="M30 40L16 62M34 40L46 62M32 40V62" fill="none" stroke-width="6"/><path d="M30 40L16 62M34 40L46 62M32 40V62" fill="none" stroke="${P.wood}" stroke-width="3"/>`
    + `<g transform="rotate(-28 30 30)"><rect ${f(P.brassD)} x="6" y="25" width="14" height="10" rx="2"/><rect ${f(P.brass)} x="18" y="22" width="20" height="16" rx="2"/><rect ${f(P.brassL)} x="36" y="19" width="14" height="22" rx="3"/>`
    + `<ellipse ${f('#a9d4e6')} cx="50" cy="30" rx="3" ry="9"/><path ${HL} d="M20 24H36V26H20Z"/></g>` + ring(50, 14, 8, P.red, 2.4) + `<path d="M50 3V25M39 14H61" fill="none" stroke-width="2"/>`,
  // Horseshoe magnet pulling in coins.
  magnet: `<path d="M10 32Q10 6 32 6Q54 6 54 32V40H42V32Q42 18 32 18Q22 18 22 32V40H10Z" ${f(P.red)}/><path ${f('#e8eef4')} d="M10 40H22V50H10Z"/><path ${f('#e8eef4')} d="M42 40H54V50H42Z"/>`
    + `<path ${HL} d="M14 30Q14 12 30 10L30 14Q18 16 18 30Z"/>`
    + [[16, 58], [32, 54], [48, 58], [26, 62], [40, 61]].map(([x, y]) => `<ellipse ${f(P.brassL)} cx="${x}" cy="${y}" rx="6" ry="3.4"/><ellipse fill="${P.brassD}" stroke="none" cx="${x}" cy="${y}" rx="2.4" ry="1.2"/>`).join('')
    + `<path d="M6 26L2 22M58 26L62 22M32 2V-1" fill="none" stroke="#ffd84a" stroke-width="2.4"/>`,
};
