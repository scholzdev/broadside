// Ship-module icons. The module's own colour (MODS[id].color) is the main tone via currentColor; materials come from the fixed palette.
import type { ModuleId } from '../modules';
import { P, f, SH, HL, DL, line, ring, blob, flash } from './kit';
import { MOD3 } from './modules3';

const barrel = (y: number): string =>
  `<path d="M22 ${y - 5}L36 ${y - 4}V${y + 4}L22 ${y + 5}Z"/><rect x="35" y="${y - 6.5}" width="6" height="13" rx="2"/><path ${SH} d="M22 ${y + 1.5}L36 ${y + 1.5}V${y + 4}L22 ${y + 5}Z"/><path ${HL} d="M23 ${y - 3}L35 ${y - 2.5}V${y - 1}L23 ${y - 1}Z"/>`;
/** One rolling smoke bank in front of all three muzzles, flashes bursting through it. */
const smoke = blob('#b9b4a8', [[54, 8, 7], [58, 22, 6], [55, 34, 7], [59, 46, 6], [54, 57, 6]])
  + blob(P.smoke, [[50, 12, 7], [53, 25, 7.5], [50, 37, 7], [54, 48, 7], [49, 56, 5.5]]);

const cutlass = `<path ${f(P.steel)} d="M31 4Q45 14 37 38H30Q35 20 31 4Z"/><path ${SH} d="M33 10Q40 20 36 36H34Q37 22 33 10Z"/>`
  + `<rect ${f(P.woodD)} x="30.5" y="40" width="5" height="10" rx="1.5"/><path d="M23 37Q33 42 43 37V41Q33 46 23 41Z"/><circle cx="33" cy="52.5" r="3.5"/>`;

export const MOD: Record<ModuleId, string> = {
  // Three guns run out of the ship's side, each firing into a smoke puff.
  broadside: `<path ${f(P.wood)} d="M4 2Q20 32 4 62H20Q32 32 20 2Z"/><path ${DL()} d="M10 3Q25 32 10 61"/>`
    + smoke + [14, 32, 50].map(y => flash(45, y, 8, 7) + barrel(y)).join(''),
  // One long gun on a wheeled carriage, aimed forward, with a big muzzle flash.
  chaser: `<path ${f(P.wood)} d="M8 44H38L34 53H12Z"/><circle ${f(P.iron)} cx="15" cy="55" r="5"/><circle ${f(P.iron)} cx="31" cy="55" r="5"/>`
    + `<g transform="rotate(-30 24 40)">${flash(60, 32, 10, 9)}<circle cx="7" cy="32" r="4"/><path d="M10 24L48 27V37L10 40Z"/><rect x="46" y="24" width="7" height="16" rx="2"/>`
    + `<rect x="17" y="23" width="5" height="18" rx="1.5"/><path ${SH} d="M10 34L48 33V37L10 40Z"/><path ${HL} d="M12 27L46 28.5V30.5L12 30Z"/></g>`,
  // Squat mortar on a block, a fused shell arcing out of its mouth.
  mortar: `<path ${f(P.wood)} d="M4 48H46L50 59H0Z"/><path ${f(P.woodL)} d="M14 36H36L40 48H10Z"/><path ${DL()} d="M3 53.5H47"/>`
    + `<g transform="rotate(38 25 38)"><path ${f(P.iron)} d="M10 18H40L37 28Q42 46 25 50Q8 46 13 28Z"/><path ${SH} d="M31 18H40L37 28Q42 46 25 50Q35 40 31 18Z"/><path ${HL} d="M14 22H18L16 30Q13 38 17 44Q11 38 14 30Z"/>`
    + `<rect x="11" y="26" width="28" height="5" rx="2"/><rect x="15" y="38" width="20" height="4" rx="2"/><ellipse cx="25" cy="18" rx="15" ry="3.5"/><ellipse fill="#1a1208" cx="25" cy="18" rx="10" ry="1.6"/></g><circle ${f(P.brass)} cx="25" cy="40" r="4"/>`
    + line('M41 16Q44 8 47 7', 'currentColor', 2.5)
    + `<circle ${f(P.iron)} cx="53" cy="10" r="6.5"/><path ${HL} d="M49 8a4 4 0 0 1 4-3v2a2 2 0 0 0-2 2z"/>${flash(58, 4, 5, 6)}`,
  // Banded powder barrel with a burning fuse.
  kegs: line('M30 13Q33 4 44 7', P.woodD, 2.5) + `<path d="M16 13Q9 34 16 57H44Q51 34 44 13Z"/><path ${SH} d="M36 13H44Q51 34 44 57H36Q40 34 36 13Z"/>`
    + `<path ${DL(2)} d="M24 15Q22 35 24 55M30 15V55"/><path ${HL} d="M18 16Q14 34 18 54H21Q18 34 21 16Z"/>`
    + `<rect ${f(P.iron)} x="12" y="19" width="36" height="6" rx="2"/><rect ${f(P.iron)} x="12" y="45" width="36" height="6" rx="2"/>`
    + `<ellipse ${f(P.woodD)} cx="30" cy="13" rx="14" ry="3.5"/>${flash(46, 7, 8)}`,
  // An armoured, finned battering beak bolted onto the bow.
  ram: `<path ${f(P.wood)} d="M2 12Q14 17 24 20V44Q14 47 2 52Z"/><path ${DL(2)} d="M3 24Q14 27 23 29M3 40Q14 37 23 35"/>`
    + `<path d="M18 20H38L62 32L38 44H18Z"/><path ${SH} d="M18 32H62L38 44H18Z"/><path ${HL} d="M20 23H37L54 30H20Z"/>`
    + `<path ${DL(2.5)} d="M30 32H58"/><rect ${SH} x="19" y="20" width="6" height="24"/>`
    + [[29, 25], [29, 39], [36, 25], [36, 39]].map(([x, y]) => `<circle fill="#1a1208" stroke="none" cx="${x}" cy="${y}" r="1.8"/>`).join(''),
  // Crossed cutlasses over a longboat.
  boarding: `<path ${f(P.wood)} d="M4 46H60Q54 61 32 61Q10 61 4 46Z"/><path ${f(P.woodL)} d="M4 46H60L58 50H6Z"/>`
    + `<g transform="rotate(-38 33 32)">${cutlass}</g><g transform="rotate(38 33 32) translate(66 0) scale(-1 1)">${cutlass}</g>`,
  // Crooked witch hat with a buckle, struck by lightning.
  witch: `<ellipse cx="30" cy="49" rx="27" ry="7"/><path ${SH} d="M30 56A27 7 0 0 1 3 49Q16 54 30 54Z"/>`
    + `<path d="M17 48L21 23Q21 12 10 6Q30 3 33 16Q39 30 44 48Z"/><path ${HL} d="M21 24Q21 15 14 8Q22 9 24 16Q22 30 20 44Z"/>`
    + `<path fill="#3a2450" d="M18 40Q31 44 43 40L44 48Q31 52 17 48Z"/><rect ${f(P.brass)} x="26" y="40" width="9" height="9" rx="1.5"/>`
    + `<path ${f(P.flame)} d="M54 2L44 22H51L42 40L61 15H53L59 2Z"/>`,
  // Brass siphon nozzle spewing a cone of fire.
  siphon: `<path d="M30 32Q36 16 52 12Q47 19 52 22Q57 12 63 13Q56 22 60 30Q63 37 58 40Q63 49 55 55Q53 47 47 46Q49 54 43 57Q37 45 30 32Z"/>`
    + `<path ${f(P.flame)} d="M31 32Q40 22 49 23Q46 29 53 31Q46 35 51 42Q41 41 31 32Z"/><path ${f(P.core)} d="M32 32Q38 28 43 29Q41 32 45 35Q38 36 32 32Z"/>`
    + `<path ${f(P.brass)} d="M2 25H18L28 21V43L18 39H2Z"/><path ${HL} d="M3 27H18L27 23.5V27L18 30H3Z"/><rect ${f(P.brassD)} x="8" y="24" width="5" height="16" rx="1"/><rect ${f(P.brass)} x="25" y="19" width="6" height="26" rx="2"/>`,
  // Glowing protective amulet with a rune, hung on a brass chain.
  ward: line('M18 3L32 20L46 3', P.brass, 2.5)
    + [0, 45, 90, 135, 180, 225, 270, 315].filter(a => a !== 0 && a !== 315 && a !== 45).map(a => {
      const r = (a * Math.PI) / 180, s = Math.sin(r), c = -Math.cos(r);
      return line(`M${(32 + s * 20).toFixed(1)} ${(39 + c * 20).toFixed(1)}L${(32 + s * 24).toFixed(1)} ${(39 + c * 24).toFixed(1)}`, 'currentColor', 3);
    }).join('')
    + `<circle ${f(P.brass)} cx="32" cy="22" r="3.5"/><circle ${f(P.brass)} cx="32" cy="39" r="16"/><circle cx="32" cy="39" r="11"/>`
    + `<path fill="none" stroke="#fff" stroke-width="3" d="M32 33V47M32 40L26.5 34.5M32 40L37.5 34.5"/><path ${HL} d="M24 35a9 9 0 0 1 6-5v3a6 6 0 0 0-4 3.5z"/>`,
  // Brass lantern glowing through rolling fog.
  lantern: ring(32, 7, 4, P.brass, 2.5) + `<path ${f(P.brass)} d="M21 17H43L38 10H26Z"/><rect ${f(P.flame)} x="21" y="17" width="22" height="25"/>`
    + `<path ${f(P.core)} d="M32 22Q39 31 32 38Q25 31 32 22Z"/><path ${DL(2.5)} d="M27 17V42M37 17V42"/><path ${f(P.brass)} d="M17 42H47L43 48H21Z"/>`
    + line('M2 50Q12 44 22 50T42 50T62 47', 'currentColor', 6) + line('M10 59Q21 54 32 59T55 57', 'currentColor', 4.5)
    + line('M3 30Q9 26 15 30', 'currentColor', 3.5) + line('M50 26Q56 22 62 25', 'currentColor', 3.5),

  // Long harpoon with a barbed head, a coil of rope trailing from it.
  harpoon: line('M4 52Q6 40 14 42T26 36', '#b39a6a', 3.5) + `<path ${f(P.wood)} d="M12 46L44 22L47 26L15 50Z"/><path ${HL} d="M16 45L42 25.5L43.5 27.5L18 47Z"/>`
    + `<path ${f(P.steel)} d="M42 19L62 6L54 26L48 25Z"/><path ${f(P.steel)} d="M44 22L36 12L50 18Z"/><path ${f(P.steel)} d="M46 25L56 36L48 29Z"/><path ${SH} d="M48 17L62 6L54 26Z"/>`
    + `<rect ${f(P.brass)} x="26" y="32" width="6" height="6" rx="1" transform="rotate(-37 29 35)"/>`,
  // Stubby fat gun with a big ball bursting out and a shove burst.
  carronade: `<path ${f(P.wood)} d="M4 46H34L30 56H8Z"/><circle ${f(P.iron)} cx="12" cy="56" r="5"/><circle ${f(P.iron)} cx="28" cy="56" r="5"/>`
    + `<g transform="rotate(-18 22 36)"><path ${f(P.iron)} d="M5 26H36L40 30V42L36 46H5Z"/><rect x="34" y="23" width="9" height="26" rx="3"/><path ${SH} d="M5 38H36L40 42L36 46H5Z"/><path ${HL} d="M8 29H34V32H8Z"/><circle ${f(P.brass)} cx="9" cy="36" r="3.5"/></g>`
    + flash(50, 24, 9, 8) + `<circle ${f(P.iron)} cx="56" cy="40" r="6.5"/><path ${HL} d="M52 38a4 4 0 0 1 4-3v2a2 2 0 0 0-2 2z"/>`,
  // A fat red rocket in a wooden rack, flame and smoke out the back.
  rockets: `<path ${f(P.wood)} d="M3 44H61V54H3Z"/><path ${DL(2)} d="M16 44V54M32 44V54M48 44V54"/>`
    + [[10, 4], [28, 4], [46, 4]].map(([x]) => `<g transform="rotate(32 ${x + 6} 30)"><rect ${f(P.sail)} x="${x}" y="18" width="12" height="26" rx="3"/><path ${f(P.red)} d="M${x} 18Q${x + 6} 4 ${x + 12} 18Z"/><path ${f(P.red)} d="M${x} 38H${x + 12}V42H${x}Z"/></g>`).join('')
    + flash(14, 56, 6, 7) + blob('#b9b4a8', [[6, 58, 4]]),
  // Hanging fishing net with cork floats on a drum.
  net: `<rect ${f(P.woodD)} x="3" y="6" width="58" height="9" rx="4"/>`
    + `<path fill="${P.parch}" fill-opacity=".3" d="M7 15H57L50 58H14Z"/>` + `<path ${DL(2.2)} d="M7 15L50 58M21 15L40 58M35 15L30 58M49 15L22 58M57 15L14 58M10 30H54M13 44H51"/>`
    + [[12, 8], [24, 8], [36, 8], [48, 8]].map(([x, y]) => `<circle ${f(P.red)} cx="${x}" cy="${y}" r="4"/>`).join('')
    + `<path ${f(P.iron)} d="M12 58H52V61H12Z"/>`,
  // Crow's-nest barrel on a mast with a spyglass poking out.
  crowsnest: `<rect ${f(P.mast)} x="28" y="30" width="8" height="32"/><path ${f(P.wood)} d="M12 24L16 46H48L52 24Z"/><path ${SH} d="M34 24H52L48 46H34Z"/>`
    + `<path ${DL(2.5)} d="M22 26L24 46M42 26L40 46"/><ellipse ${f(P.woodL)} cx="32" cy="24" rx="20" ry="4.5"/><path ${f(P.red)} d="M32 4V20L44 11Z"/><rect ${f(P.mast)} x="30.5" y="2" width="3" height="22"/>`
    + `<g transform="rotate(-24 32 36)"><rect ${f(P.brass)} x="30" y="32" width="26" height="6" rx="2"/><rect ${f(P.brassD)} x="52" y="30" width="8" height="10" rx="2"/></g>`,
  // Brass hand pump with a lever, water gushing from the spout.
  pump: `<path ${f(P.iron)} d="M12 20H34V56H12Z"/><path ${SH} d="M26 20H34V56H26Z"/><path ${HL} d="M15 22H18V54H15Z"/>`
    + `<rect ${f(P.brass)} x="9" y="16" width="28" height="7" rx="2"/><rect ${f(P.brass)} x="9" y="52" width="28" height="7" rx="2"/>`
    + line('M23 17L12 4', P.woodL, 4) + `<circle ${f(P.brassL)} cx="10" cy="3.5" r="3.5"/>`
    + `<path ${f(P.brass)} d="M34 30H46L50 36H34Z"/>` + `<path fill="#6cc4f2" d="M48 34Q58 36 56 52Q54 60 50 56Q56 48 48 40Z"/>` + blob('#9fdcff', [[56, 44, 4], [54, 56, 3.5], [48, 54, 3]]),
  ...MOD3,
};
