// Painted SVG emblems for the four seas (Sea Chart medallions), 100 x 100, ink outlines like the icon set.
const INK = 'stroke="#2a1d0c" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
const wrap = (id: string, bg: [string, string], body: string): string =>
  `<svg class="emb" viewBox="0 0 100 100"><defs><radialGradient id="eg-${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
  <clipPath id="ec-${id}"><circle cx="50" cy="50" r="46"/></clipPath></defs><circle cx="50" cy="50" r="46" fill="url(#eg-${id})"/><g clip-path="url(#ec-${id})">${body}</g>
  <circle cx="50" cy="50" r="46" fill="none" ${INK}/></svg>`;
const waves = (y: number, c: string, c2: string): string =>
  `<path fill="${c}" ${INK} d="M0 ${y}Q12 ${y - 6} 25 ${y}T50 ${y}T75 ${y}T100 ${y}V100H0Z"/><path fill="none" stroke="${c2}" stroke-width="2.2" stroke-linecap="round" d="M10 ${y + 10}Q17 ${y + 6} 24 ${y + 10}M52 ${y + 14}Q60 ${y + 10} 68 ${y + 14}"/>`;

export const SEA_EMBLEM: string[] = [
  // Calm Seas: sun over a palm islet
  wrap('calm', ['#bfe9ff', '#3fa7d6'], `<circle cx="66" cy="32" r="13" fill="#ffd36a" ${INK}/><path stroke="#ffe9a8" stroke-width="2.4" stroke-linecap="round" d="M66 12V8M84 32H88M79 19L82 16M53 19L50 16"/>
    <path fill="#ead39a" ${INK} d="M18 68Q34 56 52 68Z"/><path fill="none" stroke="#7a5228" stroke-width="3.4" stroke-linecap="round" d="M35 64Q37 50 32 38"/>
    <path fill="#3f9a45" ${INK} d="M32 38Q20 34 14 42Q24 38 32 40Q26 30 30 24Q34 32 33 39Q42 30 50 34Q40 36 33 40Q44 42 46 50Q38 42 32 40Z"/>${waves(70, '#1d93b6', '#c8f4ff')}`),
  // Coral Reefs: branching coral and a reef fish
  wrap('reef', ['#9ff6ea', '#14b3c4'], `<path fill="none" stroke="#2a1d0c" stroke-width="8" stroke-linecap="round" d="M30 92V66L20 52M30 70L42 54M42 54L40 44M20 52L18 42"/>
    <path fill="none" stroke="#ff6f8e" stroke-width="4.6" stroke-linecap="round" d="M30 92V66L20 52M30 70L42 54M42 54L40 44M20 52L18 42"/>
    <path fill="#ffb07a" ${INK} d="M64 92Q60 76 70 70Q80 76 76 92Z"/><circle cx="70" cy="80" r="2" fill="#2a1d0c"/>
    <path fill="#ffb43a" ${INK} d="M50 34Q62 24 74 34Q62 44 50 34ZM74 34L84 26V42Z"/><circle cx="57" cy="32" r="2.2" fill="#2a1d0c"/>
    <path fill="#c86ad8" ${INK} d="M80 92Q82 80 90 78Q94 86 90 92Z"/>
    <path fill="none" stroke="#e6fffb" stroke-width="2" stroke-linecap="round" d="M14 24Q22 20 30 24M70 12Q76 9 82 12" opacity=".8"/>`),
  // Fog Coast: striped lighthouse with a beam through fog bands
  wrap('fog', ['#c8d6cf', '#55706a'], `<path fill="#fff6c8" opacity=".55" d="M50 26L100 10V44Z"/><path fill="#fff6c8" opacity=".35" d="M50 26L0 14V40Z"/>
    <path fill="#6c706e" ${INK} d="M28 92Q32 74 50 70Q68 74 72 92Z"/>
    <path fill="#f2eee4" ${INK} d="M43 72L46 32H54L57 72Z"/><path fill="#c0392b" d="M44.3 56H55.7L56.4 66H43.6ZM45.4 40H54.6L55.1 48H44.9Z"/>
    <path fill="#ffd27a" ${INK} d="M44 24H56V32H44Z"/><path fill="#2b2b30" ${INK} d="M42 24L50 16L58 24Z"/>
    <path fill="none" stroke="#e8efea" stroke-width="5" stroke-linecap="round" opacity=".75" d="M4 62Q24 56 40 62M60 54Q80 48 98 54M10 82Q34 76 60 82"/>`),
  // Volcanic Isles: erupting black cone over dark water
  wrap('volcano', ['#ff9a5a', '#4a1a10'], `<path fill="#ffb040" opacity=".9" d="M44 30Q40 16 48 8Q50 18 54 10Q60 20 56 30Z"/>
    <circle cx="40" cy="14" r="2.4" fill="#ffd36a"/><circle cx="62" cy="18" r="2" fill="#ffd36a"/><circle cx="34" cy="24" r="1.6" fill="#ff7a20"/>
    <path fill="#262220" ${INK} d="M12 80L40 32H60L88 80Z"/><path fill="#ff6a1a" d="M42 34H58L54 44L50 40L46 48Z"/>
    <path fill="none" stroke="#ff7a20" stroke-width="2.2" stroke-linecap="round" d="M50 46V62M56 50L62 66"/>${waves(78, '#1e2a2e', '#ff9a5a')}`),
];
/** One skull glyph (filled or empty) for the difficulty row. */
export const skullIcon = (on: boolean, svg: string): string => `<span class="skl${on ? ' on' : ''}">${svg}</span>`;
