// Slot abilities: Q fires the bow, E the stern, R the sides (gamepad LB / RB / Y); deck modules have no active; the captain spell casts itself.
export const EN_SLOTS: Record<string, string> = {
  'ctl.abil': 'Fire the bow / stern / side ability',
  'abs.bow': 'Bow', 'abs.stern': 'Stern', 'abs.side': 'Sides',
  'ab.spellAuto': 'casts itself', 'ab.slotTip': '{k}: fire the ability of the {s}',
  'mod.noActive': 'Deck module: auto weapon only, no active ability.',
  'card.mountDeck': '{info} <b class="slot">{slot}</b> No active ability.',
};
