// v9 active crew: Lv 5 advanced forms, crew cards, inventory and buy-row strings. Per-figure texts live on the CREW table (relics.ts, keys crew.<id>.name/.text).
const ADV: [string, string, string][] = [
  ['musket', 'Sharpshooters', 'Range 22 u, shots pierce 1 enemy and deal double damage.'],
  ['boarder', 'Raiders', 'Also leap onto enemies within 6 u every 4 s.'],
  ['carp', 'Shipwrights', 'Also take 8% less damage.'],
  ['gunner', 'Master Gunners', 'Every 8th auto shot deals double damage.'],
  ['look', 'Eagle Eye', '+6 u vision in fog and ash; marks the nearest elite, which takes +15% damage.'],
  ['surgeon', 'Field Surgeons', 'Heals also cleanse burn and slow.'],
  ['cook', 'Feast', 'Every 20 s grog gives +10% damage for 6 s.'],
  ['quart', 'Treasurer', 'Gold and XP orbs are pulled in from twice the range.'],
  ['navigator', 'Pathfinder', 'Nitro recharges 30% faster.'],
  ['monkey', 'Demolitionists', 'Explosions have +25% radius.'],
  ['mate', 'Quartermaster-General', 'Captain spell cooldown a further 15% shorter.'],
];
export const EN_CREW: Record<string, string> = {
  'card.type.crew': 'CREW', 'card.advUnlock': '<b>Lv 5 unlocks</b> {x}',
  'crew.recruit': '+{n} {name}', 'crew.train': '{name} Lv {a} → {b}',
  'stat.Crew figures': 'Crew figures', 'stat.Crew level': 'Crew level', 'stat.Volley damage': 'Volley damage', 'stat.Boarding damage': 'Boarding damage',
  'stat.Repair': 'Repair', 'stat.Auto cooldown': 'Auto cooldown', 'stat.Heal per 12 s': 'Heal per 12 s', 'stat.Ability cooldown': 'Ability cooldown',
  'stat.Spell cooldown': 'Spell cooldown', 'stat.Speed and turn': 'Speed and turn',
  'lo.crewStart': 'Starts with 2 figures at Lv 1.',
  'inv.figures': '{n} figures', 'inv.adv': 'Lv 5: {x}', 'inv.advOn': 'Advanced form: {x}', 'pop.feast': 'Feast! +10% damage',
  'buy.title': 'Buy with gold', 'buy.sold': 'Sold', 'buy.poor': 'Not enough gold', 'buy.full': 'Deck is full',
  ...Object.fromEntries(ADV.flatMap(([id, n, x]) => [[`crew.${id}.adv`, n], [`crew.${id}.advt`, x]])),
};
