// Deutsch: aktive Besatzung (v9). Schlüssel siehe en-crew.ts.
const ADV: [string, string, string][] = [
  ['musket', 'Scharfschützen', 'Reichweite 22 E, Schüsse durchschlagen 1 Gegner und richten doppelten Schaden an.'],
  ['boarder', 'Plünderer', 'Springen zusätzlich alle 4 s auf Gegner im Umkreis von 6 E.'],
  ['carp', 'Schiffbauer', 'Erleiden zusätzlich 8% weniger Schaden.'],
  ['gunner', 'Meisterkanoniere', 'Jeder 8. Auto-Schuss richtet doppelten Schaden an.'],
  ['look', 'Adlerauge', '+6 E Sicht in Nebel und Asche; markiert den nächsten Elitegegner, der +15% Schaden erleidet.'],
  ['surgeon', 'Feldchirurgen', 'Heilung löscht zusätzlich Brand und Verlangsamung.'],
  ['cook', 'Festmahl', 'Alle 20 s gibt Grog 6 s lang +10% Schaden.'],
  ['quart', 'Schatzmeister', 'Gold und EP-Kugeln werden aus doppelter Reichweite angezogen.'],
  ['navigator', 'Pfadfinder', 'Nitro lädt 30% schneller auf.'],
  ['monkey', 'Sprengmeister', 'Explosionen haben +25% Radius.'],
  ['mate', 'Generalquartiermeister', 'Abklingzeit des Kapitänszaubers zusätzlich 15% kürzer.'],
];
const PER: [string, string, string][] = [
  ['musket', 'Musketiere', 'Jeder feuert alle 2,2 s einen Musketenschuss auf den nächsten Gegner im Umkreis von 14 E: 4 Schaden, +1 pro Stufe.'],
  ['boarder', 'Enterer', 'Ein Gegner, der dich rammt oder berührt, erleidet 12 Schaden pro Enterer.'],
  ['carp', 'Zimmerleute', 'Jeder repariert 0,3 HP/s, solange das Schiff 3 s nicht getroffen wurde.'],
  ['quart', 'Quartiermeister', 'Jeder gibt +6% Gold aus allen Quellen.'],
  ['look', 'Ausguck', 'Jeder gibt +4% Waffenreichweite (höchstens +50%).'],
  ['gunner', 'Kanoniere', 'Jeder verkürzt die Abklingzeiten der Auto-Angriffe um 3% (höchstens -30%).'],
  ['surgeon', 'Feldscher', 'Jeder heilt alle 12 s 5% der max. HP.'],
  ['navigator', 'Navigator', 'Jeder gibt +3% Höchsttempo und Wendigkeit.'],
  ['monkey', 'Pulveraffen', 'Jeder verkürzt die Abklingzeiten der Modul-Fähigkeiten um 3% (höchstens -30%).'],
  ['cook', 'Smutje', 'Jeder gibt +8 max. HP.'],
  ['mate', 'Erster Maat', 'Jeder verkürzt die Abklingzeit des Kapitänszaubers um 4% (höchstens -30%).'],
];
export const DE_CREW: Record<string, string> = {
  'card.type.crew': 'BESATZUNG', 'card.advUnlock': '<b>Lv 5 schaltet frei:</b> {x}',
  'crew.recruit': '+{n} {name}', 'crew.train': '{name} Lv {a} → {b}',
  'stat.Crew figures': 'Besatzung', 'stat.Crew level': 'Besatzungsstufe', 'stat.Volley damage': 'Salvenschaden', 'stat.Boarding damage': 'Enterschaden',
  'stat.Repair': 'Reparatur', 'stat.Auto cooldown': 'Auto-Abklingzeit', 'stat.Heal per 12 s': 'Heilung pro 12 s', 'stat.Ability cooldown': 'Fähigkeits-Abklingzeit',
  'stat.Spell cooldown': 'Zauber-Abklingzeit', 'stat.Speed and turn': 'Tempo und Wendigkeit',
  'lo.crewStart': 'Startet mit 2 Figuren auf Stufe 1.',
  'inv.figures': '{n} Figuren', 'inv.adv': 'Lv 5: {x}', 'inv.advOn': 'Fortgeschrittene Form: {x}', 'pop.feast': 'Festmahl! +10% Schaden',
  'buy.title': 'Mit Gold kaufen', 'buy.sold': 'Verkauft', 'buy.poor': 'Nicht genug Gold', 'buy.full': 'Deck ist voll',
  ...Object.fromEntries(ADV.flatMap(([id, n, x]) => [[`crew.${id}.adv`, n], [`crew.${id}.advt`, x]])),
  ...Object.fromEntries(PER.flatMap(([id, n, x]) => [[`crew.${id}.name`, n], [`crew.${id}.text`, x]])),
};
