import { EN_CARDFMT } from './en-cardfmt';
import { EN_SEAS } from './en-seas';
import { EN_ENEMIES } from './en-enemies';
import { EN_INV } from './en-inv';
import { EN_LOOT } from './en-loot';
import { EN_QUESTS } from './en-quests';
import { EN_BOSSES } from './en-bosses';
import { EN_CREW } from './en-crew';
import { EN_HEAT } from './en-heat';
import { EN_TUT } from './en-tut';
import { EN_MUSIC } from './en-music';
import { EN_COSMETICS } from './en-cosmetics';
import { EN_MODS3 } from './en-mods3';
import { EN_EVO } from './en-evo';
import { EN_SLOTS } from './en-slots';
import { EN_TOUCH } from './en-touch';
// English UI strings (keys are stable ids; {name} placeholders are filled by t()). Content tables keep their English text in their data files.
export const EN: Record<string, string> = {
  // title / pause / help
  'title.sub': 'Sail. Shoot. Survive the fleet.', 'doubloons': 'Doubloons',
  'snd.on': '🔇 Sound on (M)', 'snd.off': '🔊 Mute (M)',
  'menu.sail': 'Set Sail', 'menu.unlocks': 'Unlocks', 'menu.help': 'How to Play', 'menu.back': 'Back', 'menu.paused': 'Paused', 'menu.resume': 'Resume',
  'menu.restart': 'Restart run', 'menu.main': 'Main menu', 'menu.volume': 'Volume', 'menu.sound': 'Sound: {v}', 'on': 'On', 'off': 'Off',
  'menu.gfx': 'Graphics: {v}', 'gfx.auto': 'Auto', 'gfx.high': 'High', 'gfx.medium': 'Medium', 'gfx.low': 'Low', 'menu.lang': 'Language: {v}',
  'lang.en': 'English', 'lang.de': 'Deutsch', 'menu.relic': 'Relic: <b>{name}</b> &mdash; {desc}',
  'controls': '<b>W / S</b> accelerate / brake &middot; <b>A / D</b> steer &middot; <b>Hold Shift</b> boost (nitro) &middot; <b>Q / E / R</b> fire the bow / stern / side ability &middot; your captain spell casts itself',
  'help.title': 'How to Play',
  'help.1': '<b>W / S</b> accelerate / brake &middot; <b>A / D</b> steer',
  'help.2': '<b>Hold Shift</b> boost (nitro meter: {dur} s of {spd}x speed, refills in {cd} s)',
  'help.3': 'Module actives belong to their mount slot: <b>Q</b> fires the bow, <b>E</b> the stern, <b>R</b> the sides (gamepad: <b>LB</b> / <b>RB</b> / <b>Y</b>; every ready module in that slot fires). Deck modules have no active. Your captain&rsquo;s signature spell casts itself when it fits (aimed spells pick the biggest crowd or the boss).',
  'help.4': 'Cannons fire on their own at targets inside their arcs. Aim by turning your hull.',
  'help.5': 'Collect gold and XP from wrecks and floating crates. Pick a free card on each level-up; spend gold on the two cards in the buy row below.',
  'help.6': 'Sink the boss before time runs out. Each boss drops plunder: pick a card (and buy more with gold).',
  'help.7': '<b>Esc / P</b> pause &middot; <b>M</b> mute &middot; mouse wheel zooms',
  // loadout
  'lo.title': 'Loadout', 'lo.row.0': 'Ship', 'lo.row.1': 'Captain', 'lo.row.2': 'Crew', 'lo.row.3': 'Starting module', 'lo.row.4': 'Starting relic',
  'lo.noCrew': 'No crew', 'lo.default': 'Default', 'lo.noRelic': 'No relic',
  'lo.stat.hull': 'Hull', 'lo.stat.speed': 'Speed', 'lo.stat.turn': 'Turning', 'lo.stat.fire': 'Firepower', 'lo.perSide': '{n}/side',
  'slots.bow.one': '{n} bow slot', 'slots.bow.many': '{n} bow slots', 'slots.side.one': '{n} side slot', 'slots.side.many': '{n} side slots',
  'slots.deck.one': '{n} deck slot', 'slots.deck.many': '{n} deck slots', 'slots.stern.one': '{n} stern slot', 'slots.stern.many': '{n} stern slots',
  'slot.bow': 'bow slot', 'slot.side': 'side slot', 'slot.deck': 'deck slot', 'slot.stern': 'stern slot',
  'lo.starts': 'Starts with {list}', 'lo.noRegen': '{name} cannot regenerate.', 'lo.noDrawback': 'No drawback',
  'lo.space': 'Spell (casts itself): {name}', 'lo.crewNone': 'No chosen crew: you sail with 2 Musketeers. Recruit and train more crew with cards.', 'lo.defMods': "Start with the ship's default modules: {list}.",
  'lo.replaces': 'replaces {list}', 'lo.addedFree': 'added to the free slot', 'lo.relicNone': 'Sail without a relic.', 'lo.yours': 'Your loadout',
  'lo.buy': 'Buy &middot; {n} {dbl}', 'lo.chosen': '&#10003; Chosen', 'lo.choose': 'Enter or click to choose', 'lo.back': '&lsaquo; Back',
  'lo.hint': 'Up / Down or Tab: category &middot; Left / Right: pick &middot; Enter: choose / buy / sail &middot; Esc: back',
  'lo.sail': 'Set Sail!', 'lo.enter': 'Enter', 'lo.unlockFirst': 'Unlock {name} first ({cost} {dbl} or its challenge)',
  'lo.drag': 'Drag to rotate &middot; Scroll to zoom &middot; Right-drag to pan', 'lo.reset': '&#8634; Reset view',
  // unlocks
  'un.title': 'Unlocks', 'un.sec.0': 'Ships', 'un.sec.1': 'Captains', 'un.sec.2': 'Crew', 'un.sec.3': 'Modules', 'un.sec.4': 'Relics',
  'un.kind.0': 'Ship', 'un.kind.1': 'Captain', 'un.kind.2': 'Crew', 'un.kind.3': 'Module', 'un.kind.4': 'Relic',
  'un.cnt': '<b>{n} / {t}</b> unlocked', 'un.groupCnt': '{n} / {t} unlocked', 'un.logbook': 'Logbook', 'un.lifetime': 'Lifetime stats', 'un.lifetimeS': 'lifetime stats',
  'un.openLog': 'Open the Logbook', 'un.hint': 'Up / Down or Tab: section &middot; Left / Right: item &middot; Enter: buy / toggle pool &middot; Esc: back',
  'un.locked': 'Locked', 'un.unlocked': '&#10003; Unlocked', 'un.starting': '&#9733; Starting item', 'un.pool': 'In pool: {v}',
  'un.poolHint': 'Off removes it from level-up, loot and shop cards.', 'un.shipInfo': 'Hull {hp} &middot; speed {sp} &middot; starts with {list}', 'un.or': 'or', 'un.none': 'none',
  'log.runs': 'Runs started', 'log.kills': 'Ships sunk', 'log.fullSails': 'Full Sails used', 'log.rerolls': 'Rerolls', 'log.autoCasts': 'Slot abilities fired',
  'log.burned': 'Enemies burned', 'log.rams': 'Enemies rammed', 'log.boats': 'Fishing boats eaten', 'log.crates': 'Crates eaten', 'log.huts': 'Dock huts eaten',
  'log.buys': 'Upgrades bought with gold', 'log.winloss': 'Runs won / lost', 'log.doubloons': 'Doubloons earned (total)', 'log.damage': 'Damage taken',
  'log.bestAct': 'Best act reached', 'log.bosses': 'Bosses defeated (acts 1-4)', 'log.modLv': 'Highest module levels', 'log.lv': '{name} Lv {n}',
  // challenges
  'ch.act': 'Reach act {n}', 'ch.boss': 'Defeat the {name}', 'ch.lv8': 'Get {name} to Lv 8', 'ch.bosses3': 'Defeat 3 bosses',
  'ch.fullSails': 'Use Full Sail {n} times', 'ch.rerolls': 'Reroll {n} times', 'ch.sink': 'Sink {n} ships', 'ch.autoCasts': 'Fire slot abilities (Q / E / R) {n} times',
  'ch.burn': 'Burn {n} enemies', 'ch.crates': 'Eat {n} crates', 'ch.earn': 'Earn {n} doubloons in total', 'ch.win': 'Win a run', 'ch.buys': 'Buy {n} upgrades with gold',
  'ch.huts': 'Eat {n} dock huts', 'ch.die': 'Die {n} times', 'ch.ram': 'Ram {n} enemies', 'ch.boats': 'Eat {n} fishing boats', 'ch.damage': 'Take {n} damage total',
  // HUD
  'hud.lv': 'LV', 'hud.hull': 'HULL', 'hud.gold': 'Gold', 'hud.kills': 'Kills', 'hud.wind': 'Wind', 'hud.act': 'Act {a}/{n}', 'hud.bossDown': 'Boss defeated',
  'ab.fullSail': 'Full Sail', 'ab.fullSailTip': 'Hold Shift: boost (nitro meter)',
  // level-up cards
  'card.level': 'Level {n}!', 'card.rerollNone': 'Reroll (none left)', 'card.rerollFree': 'Reroll (1 free)', 'card.rerollFreeX': 'Reroll (1 free + {n} extra)', 'card.rerollX': 'Reroll ({n} extra)',
  'card.hint': 'Press 1 / 2 / 3 to take a free card &middot; 4 / 5 to buy',
  'card.type.auto': 'AUTO-ATTACK', 'card.type.ability': 'ABILITY', 'card.type.newmod': 'NEW MODULE', 'card.type.ship': 'SHIP',
  'rar.common': 'Common', 'rar.uncommon': 'Uncommon', 'rar.rare': 'Rare', 'rar.epic': 'Epic', 'card.shipUp': 'Ship upgrade', 'card.newMount': 'New mount',
  'card.lv4': '<b>Lv 4 unlocks</b> {x}', 'card.newModule': 'New module: {name}', 'card.autoAttack': 'Auto-attack', 'card.trackText': '{name} Lv {n}: {lines}',
  'card.mount': '{info} <b class="slot">{slot}</b> Active ({k}): {an} ({cd}s) — {at}',
  // ship upgrades (cards)
  'up.cannon.n': 'Extra Cannon', 'up.cannon.t': '+1 ball per broadside side ({a} → {b})',
  'up.rate.n': 'Fire Rate', 'up.rate.t': 'Cooldown −12% ({a}s → {b}s)',
  'up.chain.n': 'Chain Shot', 'up.chain.t': 'Projectiles pierce +1 target ({a} → {b})',
  'up.hull.n': 'Hull Plating', 'up.hull.t': '+25 max HP ({a} → {b}) and heal 25; −6% max speed ({c} → {d})',
  'up.sails.n': 'Bigger Sails', 'up.sails.t': '+10% max speed ({a} → {b}), +10% turn rate ({c}x → {d}x)',
  'up.hooks.n': 'Long Hooks', 'up.hooks.t': 'Pickup radius +30% ({a} → {b})',
  'up.swivel.n': 'Swivel Guns', 'swivel.text': '+15° firing arc half-angle (max 90°): {x}', 'swivel.one': '{name} ±{a}° → ±{b}°',
  'arc.sides': 'sides', 'arc.bow': 'bow', 'arc.stern': 'stern',
  // end screen
  'end.victory': 'Victory!', 'end.sunk': 'Sunk!', 'end.winText': "The Admiral's Flagship is at the bottom of the sea.", 'end.loseText': 'Davy Jones claims another ship.',
  'end.time': 'Time: <b>{t}</b> &middot; Level: <b>{l}</b>', 'end.goldKills': 'Gold: <b>{g}</b> &middot; Kills: <b>{k}</b>', 'end.relic': 'Relic: <b>{name}</b>',
  'end.gold': 'Gold {n} / 2', 'end.bosses': 'Bosses {n} &times; 30', 'end.acts': 'Acts {n} &times; 10', 'end.kills': 'Kills {n} / 10', 'end.earned': 'Earned',
  'end.unlocked': 'Unlocked: {list}!', 'end.again': 'Sail again', 'end.menu': 'Main menu',
  // settings
  'menu.settings': 'Settings', 'set.title': 'Settings', 'set.g.general': 'General', 'set.g.audio': 'Audio', 'set.g.gfx': 'Graphics', 'set.g.controls': 'Controls', 'set.g.data': 'Data',
  'set.shake': 'Screen shake: {v}', 'shake.off': 'Off', 'shake.low': 'Low', 'shake.normal': 'Normal', 'set.nums': 'Damage numbers: {v}', 'set.arcs': 'Firing arcs: {v}',
  'set.reset': 'Reset progress', 'set.resetSure': 'Really reset? Press again', 'set.resetDone': 'Progress reset', 'set.resetNote': 'Deletes doubloons, unlocks, stats and your saved loadout.',
  'set.hint': 'Up / Down: select &middot; Left / Right or Enter: change &middot; Esc: back',
  'ctl.move': 'Accelerate / brake', 'ctl.steer': 'Steer', 'ctl.boost': 'Boost (nitro)', 'ctl.cards': 'Pick card / reroll',
  'ctl.pause': 'Pause', 'ctl.mute': 'Mute', 'ctl.zoom': 'Zoom', 'key.hold': 'Hold Shift', 'key.wheel': 'Mouse wheel',
  // popups
  'pop.pumped': 'Pumped!', 'pop.surgeon': 'Surgeon!', 'pop.secondWind': 'Second Wind!', 'pop.bigBlast': 'BIG BLAST!',
  'pop.gold15': '+15 gold', 'pop.grog': 'Grog! +25 HP', 'pop.bribed': 'Bribed!',
};
Object.assign(EN, EN_CARDFMT, EN_INV, EN_LOOT, EN_QUESTS, EN_SEAS, EN_ENEMIES, EN_BOSSES, EN_CREW, EN_HEAT, EN_MUSIC, EN_TUT, EN_MODS3, EN_COSMETICS, EN_EVO, EN_SLOTS, EN_TOUCH);
