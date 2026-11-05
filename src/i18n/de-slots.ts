// Slot-Fähigkeiten: Q feuert den Bug, E das Heck, R die Seiten (Gamepad LB / RB / Y); Deck-Module haben keine Fähigkeit; der Kapitänszauber wirkt von selbst.
export const DE_SLOTS: Record<string, string> = {
  'ctl.abil': 'Bug- / Heck- / Seiten-Fähigkeit auslösen',
  'abs.bow': 'Bug', 'abs.stern': 'Heck', 'abs.side': 'Seiten',
  'ab.spellAuto': 'wirkt von selbst', 'ab.slotTip': '{k}: Fähigkeit am {s} auslösen',
  'mod.noActive': 'Deck-Modul: nur Auto-Waffe, keine aktive Fähigkeit.',
  'card.mountDeck': '{info} <b class="slot">{slot}</b> Keine aktive Fähigkeit.',
};
