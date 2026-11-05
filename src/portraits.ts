// Procedural inline-SVG captain portraits (80x80), parchment/brass palette.
import type { CaptainId } from './roster';

type Hat = 'tricorn' | 'bandana' | 'witch' | 'cap' | 'plume' | 'none' | 'crown' | 'tophat' | 'pith';
interface Look { skin: string; hair: string; beard?: string; hat: Hat; hatC: string; trim?: string; item: string; coat: string; deco?: string }
const brass = '#c9993a';
const LOOKS: Record<CaptainId, Look> = {
  salt: { skin: '#d9a77c', hair: '#e8e4dc', beard: '#e8e4dc', hat: 'cap', hatC: '#27456b', coat: '#3b5f8a', trim: brass,
    item: '<path d="M60 60 q8 -2 10 6 l-4 4 q-6 -2 -6 -10z" fill="#8a5a2b"/><rect x="63" y="52" width="3" height="10" fill="#d8d0bd"/>' },
  rosa: { skin: '#c98a62', hair: '#b3341e', hat: 'bandana', hatC: '#e2c33a', coat: '#2f7d6d',
    item: '<circle cx="63" cy="64" r="8" fill="#e8dcc0" stroke="#7a4e1a" stroke-width="2"/><path d="M63 58v6l4 3" stroke="#7a4e1a" stroke-width="2" fill="none"/>' },
  bess: { skin: '#b9815a', hair: '#2b2118', hat: 'none', hatC: '#6d7681', coat: '#555d66', trim: '#aab2bb',
    item: '<path d="M58 58h14l-2 12h-10z" fill="#7b838c" stroke="#2c3238" stroke-width="2"/><rect x="62" y="52" width="6" height="6" fill="#aab2bb"/>' },
  tom: { skin: '#e0a07a', hair: '#7a4a22', beard: '#7a4a22', hat: 'cap', hatC: '#8a5a2b', coat: '#a0522d', trim: '#d8c28a',
    item: '<rect x="58" y="56" width="12" height="14" rx="2" fill="#c98a2b" stroke="#5a3510" stroke-width="2"/><path d="M70 60h4q3 0 3 4t-3 4h-4" fill="none" stroke="#5a3510" stroke-width="2"/><rect x="58" y="54" width="12" height="4" fill="#f4ecd0"/>' },
  corvo: { skin: '#e9e0d4', hair: '#15121a', beard: '#15121a', hat: 'none', hatC: '#15121a', coat: '#4a1626', trim: '#b02a46',
    item: '<path d="M58 54 q8 -4 14 0 l-2 16 q-5 4 -10 0z" fill="#8c1530" stroke="#3a0b18" stroke-width="2"/><path d="M60 58q6 3 10 0" stroke="#f0d0d8" stroke-width="2" fill="none"/>' },
  hana: { skin: '#d49a70', hair: '#3a2a1c', hat: 'tricorn', hatC: '#2d4a3a', trim: brass, coat: '#3e5e49',
    item: '<rect x="54" y="60" width="22" height="5" rx="2" fill="#8a5a2b" stroke="#3a2410" stroke-width="1.5" transform="rotate(-20 65 62)"/><rect x="72" y="52" width="6" height="8" rx="2" fill="#c9993a" transform="rotate(-20 75 56)"/>' },
  morwen: { skin: '#cbd6c0', hair: '#7a3a9a', hat: 'witch', hatC: '#2a1a40', trim: '#9a5acb', coat: '#3a2a5a',
    item: '<circle cx="64" cy="62" r="8" fill="#9ae0d0" opacity=".85" stroke="#3a6a60" stroke-width="2"/><circle cx="61" cy="59" r="2" fill="#fff"/>' },
  flint: { skin: '#d9a07a', hair: '#d4501c', beard: '#d4501c', hat: 'bandana', hatC: '#a02a14', coat: '#6b2a18', trim: '#f09a2a',
    item: '<rect x="62" y="58" width="4" height="16" fill="#6b4a22"/><path d="M64 44 q-8 8 0 14 q8 -6 0 -14z" fill="#ff9a2a"/><path d="M64 50 q-3 4 0 7 q3 -3 0 -7z" fill="#ffe27a"/>' },
  gwen: { skin: '#e0a98a', hair: '#e8b83a', hat: 'plume', hatC: '#6a3a8a', trim: brass, coat: '#7a4a9a',
    item: '<circle cx="64" cy="64" r="8" fill="#f2c94a" stroke="#8a6414" stroke-width="2"/><text x="64" y="68" text-anchor="middle" font-size="11" font-weight="bold" fill="#8a6414">$</text>' },
  dorian: { skin: '#e2b08e', hair: '#1c1c24', beard: '#1c1c24', hat: 'plume', hatC: '#1f2f5a', trim: '#e0e0e8', coat: '#2a3f7a',
    item: '<path d="M56 74 L74 50" stroke="#dfe6ee" stroke-width="2.5"/><path d="M54 68 l8 8" stroke="#c9993a" stroke-width="3"/><circle cx="56" cy="74" r="3" fill="#c9993a"/>' },
  // v7 captains
  thorne: { skin: '#d8a682', hair: '#9aa0aa', beard: '#9aa0aa', hat: 'tricorn', hatC: '#1c2a4a', trim: '#e0b040', coat: '#1f3355',
    deco: '<rect x="14" y="68" width="10" height="5" fill="#e0b040" stroke="#111"/><rect x="56" y="68" width="10" height="5" fill="#e0b040" stroke="#111"/>',
    item: '<circle cx="63" cy="65" r="7" fill="#e0b040" stroke="#7a5a14" stroke-width="2"/><path d="M63 59l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="#b02a2a"/>' },
  isabeau: { skin: '#efc7a8', hair: '#7a2f1a', hat: 'crown', hatC: '#f2d27a', trim: '#b02a46', coat: '#7a2a9a',
    item: '<path d="M64 72V50" stroke="#c9993a" stroke-width="3"/><circle cx="64" cy="48" r="5" fill="#b02a46" stroke="#7a5a14" stroke-width="2"/><path d="M60 52l4 3 4-3" fill="none" stroke="#f2d27a" stroke-width="2"/>' },
  driftwood: { skin: '#c48a60', hair: '#d8d0b8', beard: '#d8d0b8', hat: 'cap', hatC: '#7a5a30', trim: '#a89060', coat: '#6a5a3a',
    deco: '<path d="M22 66q4 4 6 0M50 70q3 3 6 -1" stroke="#a8b8a8" stroke-width="2" fill="none"/>',
    item: '<rect x="54" y="58" width="22" height="7" rx="2" fill="#a07a48" stroke="#4a3010" stroke-width="2" transform="rotate(-25 65 62)"/><circle cx="60" cy="62" r="2" fill="#d8d0b8"/><circle cx="68" cy="58" r="1.6" fill="#d8d0b8"/>' },
  goldtooth: { skin: '#dfa57e', hair: '#1a1208', beard: '#1a1208', hat: 'tophat', hatC: '#1a1a22', trim: '#f2c94a', coat: '#8a1c2a',
    item: '<path d="M58 70q-4-12 6-14q10 2 6 14z" fill="#8a6a34" stroke="#3a2a10" stroke-width="2"/><path d="M60 57h8" stroke="#3a2a10" stroke-width="2.5"/><text x="64" y="68" text-anchor="middle" font-size="9" font-weight="bold" fill="#f2c94a">$</text>' },
  cass: { skin: '#e6c8a8', hair: '#b0703a', hat: 'cap', hatC: '#8a6a2a', trim: '#f2d27a', coat: '#4a5a68',
    deco: '<rect x="25" y="26" width="30" height="8" rx="4" fill="#3a3a44" stroke="#111" stroke-width="1.5"/><circle cx="32" cy="30" r="3.4" fill="#9fd8ff" stroke="#c9993a" stroke-width="1.5"/><circle cx="48" cy="30" r="3.4" fill="#9fd8ff" stroke="#c9993a" stroke-width="1.5"/>',
    item: '<circle cx="64" cy="64" r="8" fill="#c9993a" stroke="#4a3410" stroke-width="2"/><circle cx="64" cy="64" r="3" fill="#4a5a68"/><path d="M64 54v4M64 70v4M54 64h4M70 64h4M57 57l3 3M71 71l3 3M71 57l-3 3M57 71l3 3" stroke="#4a3410" stroke-width="2.5"/>' },
  brick: { skin: '#b4764c', hair: '#2a1a12', beard: '#4a2a14', hat: 'none', hatC: '#2a1a12', trim: '#c9993a', coat: '#7a4a2a',
    deco: '<circle cx="21" cy="46" r="2.2" fill="#f2c94a" stroke="#7a5a14"/>',
    item: '<path d="M58 54q6 2 2 8l-3 9q8 -3 10 -13q-2-6-9-4z" fill="#d8d0bd" stroke="#7a5a14" stroke-width="2"/><circle cx="58" cy="54" r="2.4" fill="#c9993a"/>' },
  ines: { skin: '#d6a07a', hair: '#3a2a1c', hat: 'pith', hatC: '#d8c28a', trim: '#2f6d4d', coat: '#8a6a3a',
    deco: '<path d="M20 38Q12 56 22 70" stroke="#3a2a1c" stroke-width="5" fill="none"/>',
    item: '<rect x="56" y="54" width="18" height="14" rx="2" fill="#ecd9a8" stroke="#7a4e1a" stroke-width="2"/><path d="M60 62q4-6 8 0" stroke="#b02a2a" stroke-width="2" fill="none" stroke-dasharray="2 2"/><path d="M70 58l2 2" stroke="#b02a2a" stroke-width="2"/>' },
  ghost: { skin: '#bfe8e0', hair: '#e0f8f4', beard: '#e0f8f4', hat: 'tricorn', hatC: '#2a4a50', trim: '#9fe8d8', coat: '#2a5a60',
    deco: '<circle cx="40" cy="42" r="30" fill="#9fe8d8" opacity=".22"/><path d="M14 74q-4-10 2-20M66 74q4-10-2-20" stroke="#bff5e8" stroke-width="3" fill="none" opacity=".6"/>',
    item: '<rect x="59" y="56" width="10" height="13" rx="2" fill="#2a4a50" stroke="#9fe8d8" stroke-width="2"/><ellipse cx="64" cy="63" rx="3" ry="4" fill="#bff5e8"/><path d="M64 56v-4" stroke="#9fe8d8" stroke-width="2"/>' },
  hal: { skin: '#c08a62', hair: '#2a1a10', beard: '#2a1a10', hat: 'bandana', hatC: '#1f4a6a', coat: '#3a5a6a', trim: '#c0d0e0',
    item: '<path d="M54 76L78 48" stroke="#8a5a2b" stroke-width="3"/><path d="M78 48l-9 1 6 7z" fill="#dfe6ee" stroke="#2c3238" stroke-width="1.5"/><path d="M76 50l5-4" stroke="#dfe6ee" stroke-width="2"/>' },
  coral: { skin: '#b8754a', hair: '#e0507a', hat: 'none', hatC: '#e0507a', trim: '#f8d8c0', coat: '#d86a5a',
    deco: '<path d="M26 22q-2-10 4-12q-1 6 4 6q-3-8 4-10q-1 8 4 8q2-8 8-8q-3 6 2 10q4-6 8-4q-4 6 0 10z" fill="#ff8a7a" stroke="#8a2a2a" stroke-width="1.2"/><circle cx="40" cy="14" r="2.4" fill="#f8d8c0"/>',
    item: '<path d="M56 66q2-12 12-12q6 4 2 12q-6 8-14 0z" fill="#f4d8c0" stroke="#8a4a3a" stroke-width="2"/><path d="M60 66q4-6 8-4" stroke="#e0507a" stroke-width="2" fill="none"/>' },
};

function hat(l: Look): string {
  const c = l.hatC, t = l.trim ?? brass;
  switch (l.hat) {
    case 'tricorn': return `<path d="M10 30 Q40 6 70 30 Q40 22 10 30z" fill="${c}" stroke="#111" stroke-width="1.5"/><path d="M26 24 Q40 8 54 24z" fill="${c}"/><path d="M10 30 Q40 22 70 30" stroke="${t}" stroke-width="2" fill="none"/>`;
    case 'cap': return `<path d="M18 30 Q40 8 62 30z" fill="${c}" stroke="#111" stroke-width="1.5"/><rect x="16" y="28" width="48" height="5" rx="2" fill="${c}" stroke="#111" stroke-width="1.5"/><circle cx="40" cy="22" r="3" fill="${t}"/>`;
    case 'bandana': return `<path d="M18 30 Q40 12 62 30 Q40 25 18 30z" fill="${c}" stroke="#111" stroke-width="1.5"/><path d="M60 28 l10 6 -4 4z" fill="${c}"/><circle cx="32" cy="24" r="1.5" fill="#fff"/><circle cx="44" cy="22" r="1.5" fill="#fff"/>`;
    case 'witch': return `<path d="M8 32 Q40 24 72 32 Q40 38 8 32z" fill="${c}" stroke="#111" stroke-width="1.5"/><path d="M24 30 L44 -2 Q46 14 56 30z" fill="${c}" stroke="#111" stroke-width="1.5"/><rect x="25" y="25" width="30" height="4" fill="${t}"/>`;
    case 'crown': return `<path d="M24 28L26 12L33 20L40 8L47 20L54 12L56 28Z" fill="${c}" stroke="#111" stroke-width="1.5"/><circle cx="40" cy="14" r="2.2" fill="${t}"/><circle cx="28" cy="18" r="1.6" fill="${t}"/><circle cx="52" cy="18" r="1.6" fill="${t}"/><rect x="24" y="26" width="32" height="4" fill="${c}" stroke="#111" stroke-width="1.5"/>`;
    case 'tophat': return `<rect x="26" y="-2" width="28" height="30" rx="2" fill="${c}" stroke="#111" stroke-width="1.5"/><rect x="26" y="20" width="28" height="5" fill="${t}"/><rect x="14" y="27" width="52" height="5" rx="2" fill="${c}" stroke="#111" stroke-width="1.5"/>`;
    case 'pith': return `<path d="M20 30Q22 8 40 8Q58 8 60 30Z" fill="${c}" stroke="#111" stroke-width="1.5"/><path d="M10 31Q40 24 70 31Q40 36 10 31Z" fill="${c}" stroke="#111" stroke-width="1.5"/><rect x="21" y="23" width="38" height="4" fill="${t}"/>`;
    case 'plume': return `<path d="M12 31 Q40 10 68 31 Q40 25 12 31z" fill="${c}" stroke="#111" stroke-width="1.5"/><path d="M60 24 Q76 6 74 -2 Q66 10 56 24z" fill="${t}" stroke="#111" stroke-width="1"/><path d="M12 31 Q40 25 68 31" stroke="${t}" stroke-width="2" fill="none"/>`;
    default: return '';
  }
}

export function portrait(id: CaptainId): string {
  const l = LOOKS[id];
  const hair = l.hat === 'none' ? `<path d="M22 40 Q22 14 40 14 Q58 14 58 40 Q54 26 40 26 Q26 26 22 40z" fill="${l.hair}"/>` : `<path d="M22 44 L22 32 Q40 28 58 32 L58 44 Q56 36 40 34 Q24 36 22 44z" fill="${l.hair}"/>`;
  const beard = l.beard ? `<path d="M24 44 Q26 66 40 70 Q54 66 56 44 Q50 54 40 54 Q30 54 24 44z" fill="${l.beard}"/>` : '';
  const longHair = id === 'morwen' || id === 'gwen' || id === 'hana' || id === 'isabeau' || id === 'coral' || id === 'ines' ? `<path d="M20 36 Q16 66 26 72 L28 44z M60 36 Q64 66 54 72 L52 44z" fill="${l.hair}"/>` : '';
  const scar = id === 'bess' ? '<path d="M48 34 l6 12" stroke="#7a3a2a" stroke-width="1.6"/>' : id === 'dorian' ? '<path d="M44 52 q4 -2 8 0" stroke="#1c1c24" stroke-width="1.5" fill="none"/>' : '';
  const eyes = id === 'morwen' || id === 'ghost' ? '<ellipse cx="33" cy="42" rx="2.6" ry="1.8" fill="#9ae0d0"/><ellipse cx="47" cy="42" rx="2.6" ry="1.8" fill="#9ae0d0"/>'
    : '<circle cx="33" cy="42" r="2" fill="#1a1208"/><circle cx="47" cy="42" r="2" fill="#1a1208"/>';
  const eyepatch = id === 'bess' ? '<path d="M28 38 L52 46" stroke="#111" stroke-width="1.2"/><ellipse cx="47" cy="43" rx="4.5" ry="3.5" fill="#111"/>' : '';
  const mouth = id === 'goldtooth' ? '<path d="M34 55 q6 4 12 0" stroke="#5a2a1a" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="38" y="55.5" width="3.6" height="3.6" fill="#f2c94a" stroke="#8a6414" stroke-width=".8"/>' : id === 'corvo' ? '<path d="M35 55 l5 3 5 -3" stroke="#fff" stroke-width="1.4" fill="none"/>' : '<path d="M34 55 q6 4 12 0" stroke="#5a2a1a" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
  return `<svg class="port" viewBox="0 0 80 80" role="img" aria-label="${id}"><defs><clipPath id="pc${id}"><rect width="80" height="80" rx="10"/></clipPath></defs>
    <g clip-path="url(#pc${id})"><rect width="80" height="80" fill="#2a4a6b"/><rect y="62" width="80" height="18" fill="#1d3552"/><path d="M0 64 q10 -4 20 0 t20 0 t20 0 t20 0" stroke="#4d7aa6" stroke-width="2" fill="none"/>
    <path d="M10 80 Q12 62 40 60 Q68 62 70 80z" fill="${l.coat}" stroke="#111" stroke-width="1.5"/><path d="M34 60 L40 70 46 60" fill="none" stroke="${l.trim ?? '#e8dcc0'}" stroke-width="2.5"/>
    ${l.deco && id === 'ghost' ? l.deco : ''}${longHair}<ellipse cx="40" cy="42" rx="18" ry="20" fill="${l.skin}" stroke="#111" stroke-width="1.5"/>${beard}${hair}${eyes}${eyepatch}${scar}
    <path d="M40 44 l-2 7 h4z" fill="#00000022"/>${mouth}${hat(l)}${l.deco && id !== 'ghost' ? l.deco : ''}${l.item}</g>
    <rect x="1" y="1" width="78" height="78" rx="10" fill="none" stroke="${brass}" stroke-width="2.5"/></svg>`;
}
