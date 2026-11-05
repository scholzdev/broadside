import { DE_CONTENT } from './de-content';
import { DE_MODS } from './de-mods';
import { DE_CARDFMT } from './de-cardfmt';
import { DE_INV } from './de-inv';
import { DE_LOOT } from './de-loot';
import { DE_QUESTS } from './de-quests';
import { DE_SEAS } from './de-seas';
import { DE_HEAT } from './de-heat';
import { DE_ENEMIES } from './de-enemies';
import { DE_BOSSES } from './de-bosses';
import { DE_CREW } from './de-crew';
import { DE_TUT } from './de-tut';
import { DE_MUSIC } from './de-music';
import { DE_COSMETICS } from './de-cosmetics';
import { DE_MODS3 } from './de-mods3';
import { DE_EVO } from './de-evo';
import { DE_SLOTS } from './de-slots';

// German UI strings; content (ships, captains, spells, modules, relics, crew) is split into de-content.ts and de-mods.ts.
const UI: Record<string, string> = {
  'title.sub': 'Segeln. Schießen. Die Flotte überleben.', 'doubloons': 'Dublonen',
  'menu.sail': 'Leinen los', 'menu.unlocks': 'Freischaltungen', 'menu.help': 'Spielanleitung', 'menu.back': 'Zurück', 'menu.paused': 'Pausiert', 'menu.resume': 'Weiter',
  'menu.restart': 'Fahrt neu starten', 'menu.main': 'Hauptmenü', 'menu.volume': 'Lautstärke', 'menu.sound': 'Ton: {v}', 'on': 'An', 'off': 'Aus',
  'menu.gfx': 'Grafik: {v}', 'gfx.auto': 'Auto', 'gfx.high': 'Hoch', 'gfx.medium': 'Mittel', 'gfx.low': 'Niedrig', 'menu.lang': 'Sprache: {v}',
  'lang.en': 'English', 'lang.de': 'Deutsch', 'menu.relic': 'Relikt: <b>{name}</b> &mdash; {desc}',
  'controls': '<b>W / S</b> beschleunigen / bremsen &middot; <b>A / D</b> steuern &middot; <b>Shift halten</b> Turbo (Nitro) &middot; <b>Q / E / R</b> Bug- / Heck- / Seiten-Fähigkeit &middot; dein Kapitänszauber wirkt von selbst',
  'help.title': 'Spielanleitung',
  'help.1': '<b>W / S</b> beschleunigen / bremsen &middot; <b>A / D</b> steuern',
  'help.2': '<b>Shift halten</b> für Turbo (Nitro-Anzeige: {dur} s mit {spd}x Tempo, lädt in {cd} s wieder auf)',
  'help.3': 'Modul-Fähigkeiten gehören zu ihrem Montageplatz: <b>Q</b> feuert den Bug, <b>E</b> das Heck, <b>R</b> die Seiten (Gamepad: <b>LB</b> / <b>RB</b> / <b>Y</b>; jedes bereite Modul an diesem Platz feuert). Deck-Module haben keine Fähigkeit. Der Signaturzauber deines Kapitäns wirkt von selbst, wenn es passt (gezielte Zauber treffen die größte Gruppe oder den Boss).',
  'help.4': 'Kanonen feuern von selbst auf Ziele in ihrem Feuerbereich. Gezielt wird, indem du den Rumpf drehst.',
  'help.5': 'Sammle Gold und EP von Wracks und treibenden Kisten. Wähle bei jedem Levelaufstieg eine freie Karte; gib Gold für die zwei Karten in der Kaufreihe darunter aus.',
  'help.6': 'Versenke den Boss, bevor die Zeit abläuft. Jeder Boss lässt Beute fallen: Wähle eine Karte (und kaufe mit Gold weitere).',
  'help.7': '<b>Esc / P</b> Pause &middot; <b>M</b> Ton aus &middot; Mausrad zoomt',
  'lo.title': 'Ausrüstung', 'lo.row.0': 'Schiff', 'lo.row.1': 'Kapitän', 'lo.row.2': 'Crew', 'lo.row.3': 'Startmodul', 'lo.row.4': 'Startrelikt',
  'lo.noCrew': 'Keine Crew', 'lo.default': 'Standard', 'lo.noRelic': 'Kein Relikt',
  'lo.stat.hull': 'Rumpf', 'lo.stat.speed': 'Tempo', 'lo.stat.turn': 'Wendigkeit', 'lo.stat.fire': 'Feuerkraft', 'lo.perSide': '{n}/Seite',
  'slots.bow.one': '{n} Bug-Platz', 'slots.bow.many': '{n} Bug-Plätze', 'slots.side.one': '{n} Seiten-Platz', 'slots.side.many': '{n} Seiten-Plätze',
  'slots.deck.one': '{n} Deck-Platz', 'slots.deck.many': '{n} Deck-Plätze', 'slots.stern.one': '{n} Heck-Platz', 'slots.stern.many': '{n} Heck-Plätze',
  'slot.bow': 'Bug-Platz', 'slot.side': 'Seiten-Platz', 'slot.deck': 'Deck-Platz', 'slot.stern': 'Heck-Platz',
  'lo.starts': 'Startet mit {list}', 'lo.noDeck': '{ship}: kein Deck-Platz, also keine Seehexe.', 'lo.noRegen': '{name} kann sich nicht regenerieren.', 'lo.noDrawback': 'Kein Nachteil',
  'lo.space': 'Zauber (wirkt von selbst): {name}', 'lo.crewNone': 'Ohne gewählte Crew segelst du mit 2 Musketieren. Heuere weitere Crew per Karten an und trainiere sie.', 'lo.defMods': 'Start mit den Standardmodulen des Schiffs: {list}.',
  'lo.replaces': 'ersetzt {list}', 'lo.addedFree': 'kommt auf den freien Platz', 'lo.relicNone': 'Ohne Relikt lossegeln.', 'lo.yours': 'Deine Ausrüstung',
  'lo.buy': 'Kaufen &middot; {n} {dbl}', 'lo.chosen': '&#10003; Gewählt', 'lo.choose': 'Enter oder Klick zum Wählen', 'lo.back': '&lsaquo; Zurück',
  'lo.hint': 'Hoch / Runter oder Tab: Kategorie &middot; Links / Rechts: wählen &middot; Enter: wählen / kaufen / segeln &middot; Esc: zurück',
  'lo.sail': 'Leinen los!', 'lo.enter': 'Enter', 'lo.unlockFirst': 'Schalte zuerst {name} frei ({cost} {dbl} oder seine Herausforderung)',
  'lo.drag': 'Ziehen: drehen &middot; Scrollen: zoomen &middot; Rechts ziehen: verschieben', 'lo.reset': '&#8634; Ansicht zurücksetzen',
  'un.title': 'Freischaltungen', 'un.sec.0': 'Schiffe', 'un.sec.1': 'Kapitäne', 'un.sec.2': 'Crew', 'un.sec.3': 'Module', 'un.sec.4': 'Relikte',
  'un.kind.0': 'Schiff', 'un.kind.1': 'Kapitän', 'un.kind.2': 'Crew', 'un.kind.3': 'Modul', 'un.kind.4': 'Relikt',
  'un.cnt': '<b>{n} / {t}</b> freigeschaltet', 'un.groupCnt': '{n} / {t} freigeschaltet', 'un.logbook': 'Logbuch', 'un.lifetime': 'Gesamtstatistik', 'un.lifetimeS': 'Gesamtstatistik',
  'un.openLog': 'Logbuch öffnen', 'un.hint': 'Hoch / Runter oder Tab: Bereich &middot; Links / Rechts: Eintrag &middot; Enter: kaufen / Pool umschalten &middot; Esc: zurück',
  'un.locked': 'Gesperrt', 'un.unlocked': '&#10003; Freigeschaltet', 'un.starting': '&#9733; Startgegenstand', 'un.pool': 'Im Pool: {v}',
  'un.poolHint': 'Aus entfernt es aus Level-, Beute- und Shop-Karten.', 'un.shipInfo': 'Rumpf {hp} &middot; Tempo {sp} &middot; startet mit {list}', 'un.or': 'oder', 'un.none': 'keine',
  'log.runs': 'Fahrten gestartet', 'log.kills': 'Schiffe versenkt', 'log.fullSails': 'Volle Segel genutzt', 'log.rerolls': 'Neuwürfe', 'log.autoCasts': 'Slot-Fähigkeiten gefeuert',
  'log.burned': 'Feinde verbrannt', 'log.rams': 'Feinde gerammt', 'log.boats': 'Fischerboote gefressen', 'log.crates': 'Kisten gefressen', 'log.huts': 'Hafenhütten gefressen',
  'log.buys': 'Mit Gold gekaufte Verbesserungen', 'log.winloss': 'Fahrten gewonnen / verloren', 'log.doubloons': 'Dublonen verdient (gesamt)', 'log.damage': 'Erlittener Schaden',
  'log.bestAct': 'Bester erreichter Akt', 'log.bosses': 'Bosse besiegt (Akte 1-4)', 'log.modLv': 'Höchste Modulstufen', 'log.lv': '{name} Lv {n}',
  'ch.act': 'Erreiche Akt {n}', 'ch.boss': 'Besiege: {name}', 'ch.lv8': 'Bringe {name} auf Lv 8', 'ch.bosses3': 'Besiege 3 Bosse',
  'ch.fullSails': 'Nutze Volle Segel {n}-mal', 'ch.rerolls': 'Würfle {n}-mal neu', 'ch.sink': 'Versenke {n} Schiffe', 'ch.autoCasts': 'Feuere Slot-Fähigkeiten (Q / E / R) {n}-mal',
  'ch.burn': 'Verbrenne {n} Feinde', 'ch.crates': 'Friss {n} Kisten', 'ch.earn': 'Verdiene insgesamt {n} Dublonen', 'ch.win': 'Gewinne eine Fahrt', 'ch.buys': 'Kaufe {n} Verbesserungen mit Gold',
  'ch.huts': 'Friss {n} Hafenhütten', 'ch.die': 'Stirb {n}-mal', 'ch.ram': 'Ramme {n} Feinde', 'ch.boats': 'Friss {n} Fischerboote', 'ch.damage': 'Erleide insgesamt {n} Schaden',
  'hud.lv': 'LV', 'hud.hull': 'RUMPF', 'hud.gold': 'Gold', 'hud.kills': 'Abschüsse', 'hud.wind': 'Wind', 'hud.act': 'Akt {a}/{n}', 'hud.bossDown': 'Boss besiegt',
  'ab.fullSail': 'Volle Segel', 'ab.fullSailTip': 'Shift halten: Turbo (Nitro-Anzeige)',
  'card.level': 'Level {n}!', 'card.rerollNone': 'Neu würfeln (keine übrig)', 'card.rerollFree': 'Neu würfeln (1 gratis)', 'card.rerollFreeX': 'Neu würfeln (1 gratis + {n} extra)', 'card.rerollX': 'Neu würfeln ({n} extra)',
  'card.hint': '1 / 2 / 3 für eine freie Karte &middot; 4 / 5 zum Kaufen',
  'card.type.auto': 'AUTO-ANGRIFF', 'card.type.ability': 'FÄHIGKEIT', 'card.type.newmod': 'NEUES MODUL', 'card.type.ship': 'SCHIFF',
  'rar.common': 'GEWÖHNLICH', 'rar.uncommon': 'UNGEWÖHNLICH', 'rar.rare': 'SELTEN', 'rar.epic': 'EPISCH', 'card.shipUp': 'Schiffsverbesserung', 'card.newMount': 'Neue Halterung',
  'card.lv4': '<b>Lv 4 schaltet frei:</b> {x}', 'card.newModule': 'Neues Modul: {name}', 'card.autoAttack': 'Auto-Angriff', 'card.trackText': '{name} Lv {n}: {lines}',
  'card.mount': '{info} <b class="slot">{slot}</b> Fähigkeit ({k}): {an} ({cd}s) — {at}',
  'up.cannon.n': 'Zusatzkanone', 'up.cannon.t': '+1 Kugel pro Breitseite ({a} → {b})',
  'up.rate.n': 'Feuerrate', 'up.rate.t': 'Abklingzeit −12% ({a}s → {b}s)',
  'up.chain.n': 'Kettenkugel', 'up.chain.t': 'Geschosse durchschlagen +1 Ziel ({a} → {b})',
  'up.hull.n': 'Rumpfpanzerung', 'up.hull.t': '+25 max. HP ({a} → {b}) und 25 heilen; −6% Höchsttempo ({c} → {d})',
  'up.sails.n': 'Größere Segel', 'up.sails.t': '+10% Höchsttempo ({a} → {b}), +10% Wendigkeit ({c}x → {d}x)',
  'up.hooks.n': 'Lange Haken', 'up.hooks.t': 'Aufsammelradius +30% ({a} → {b})',
  'up.swivel.n': 'Drehbassen', 'swivel.text': '+15° halber Feuerwinkel (max. 90°): {x}', 'swivel.one': '{name} ±{a}° → ±{b}°',
  'arc.sides': 'Seiten', 'arc.bow': 'Bug', 'arc.stern': 'Heck',
  'end.victory': 'Sieg!', 'end.sunk': 'Versenkt!', 'end.winText': 'Das Flaggschiff des Admirals liegt auf dem Meeresgrund.', 'end.loseText': 'Davy Jones holt sich ein weiteres Schiff.',
  'end.time': 'Zeit: <b>{t}</b> &middot; Level: <b>{l}</b>', 'end.goldKills': 'Gold: <b>{g}</b> &middot; Abschüsse: <b>{k}</b>', 'end.relic': 'Relikt: <b>{name}</b>',
  'end.gold': 'Gold {n} / 2', 'end.bosses': 'Bosse {n} &times; 30', 'end.acts': 'Akte {n} &times; 10', 'end.kills': 'Abschüsse {n} / 10', 'end.earned': 'Verdient',
  'end.unlocked': 'Freigeschaltet: {list}!', 'end.again': 'Nochmal segeln', 'end.menu': 'Hauptmenü',
  'menu.settings': 'Einstellungen', 'set.title': 'Einstellungen', 'set.g.general': 'Allgemein', 'set.g.audio': 'Audio', 'set.g.gfx': 'Grafik', 'set.g.controls': 'Steuerung', 'set.g.data': 'Daten',
  'set.shake': 'Bildschirmwackeln: {v}', 'shake.off': 'Aus', 'shake.low': 'Schwach', 'shake.normal': 'Normal', 'set.nums': 'Schadenszahlen: {v}', 'set.arcs': 'Feuerbereiche: {v}',
  'set.reset': 'Fortschritt zurücksetzen', 'set.resetSure': 'Wirklich zurücksetzen? Nochmal drücken', 'set.resetDone': 'Fortschritt zurückgesetzt', 'set.resetNote': 'Löscht Dublonen, Freischaltungen, Statistik und die gespeicherte Ausrüstung.',
  'set.hint': 'Hoch / Runter: wählen &middot; Links / Rechts oder Enter: ändern &middot; Esc: zurück',
  'ctl.move': 'Beschleunigen / bremsen', 'ctl.steer': 'Steuern', 'ctl.boost': 'Turbo (Nitro)', 'ctl.cards': 'Karte wählen / neu würfeln',
  'ctl.pause': 'Pause', 'ctl.mute': 'Ton aus/an', 'ctl.zoom': 'Zoomen', 'key.hold': 'Shift halten', 'key.wheel': 'Mausrad',
  'pop.headshot': 'Kopfschuss!', 'pop.pumped': 'Gepumpt!', 'pop.surgeon': 'Feldscher!', 'pop.secondWind': 'Zweiter Atem!', 'pop.bigBlast': 'GROSSER KNALL!',
  'pop.gold15': '+15 Gold', 'pop.grog': 'Grog! +25 HP', 'pop.bribed': 'Bestochen!',
};
export const DE: Record<string, string> = { ...UI, ...DE_CONTENT, ...DE_MODS, ...DE_CARDFMT, ...DE_INV, ...DE_LOOT, ...DE_QUESTS, ...DE_SEAS, ...DE_ENEMIES, ...DE_BOSSES, ...DE_CREW, ...DE_HEAT, ...DE_MUSIC, ...DE_TUT, ...DE_MODS3, ...DE_COSMETICS, ...DE_EVO, ...DE_SLOTS };
