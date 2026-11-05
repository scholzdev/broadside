import type { ShipOpts } from './models';
import type { BossId, MonsterBossId } from './seas';

// ---- ship looks. Player ships keep the 6.4 x 2.4 galleon footprint unless their gameplay constants change too. ----

export type PlayerShipId = 'sloop' | 'brigantine' | 'galleon' | 'xebec' | 'frigate';
export const PLAYER_SHIPS: Record<PlayerShipId, ShipOpts> = {
  /** Small and quick: two masts (square fore, gaff main), white hull with blue trim. */
  sloop: {
    scale: 1, length: 5.2, beam: 2.0, hull: 0xe9e2cf, deck: 0xb08a58, sail: 0xf6f0e0, trim: 0x2f6db5, accent: 0x1f4f8a,
    bottom: 0x2b4f7a, inner: 0x2f6db5, masts: [0.9, -0.8], rigs: ['square', 'gaff'], tiers: [2, 1], guns: 2, castle: 0.3, forecastle: 0,
    flag: 0x1d2a3a, emblem: 'skull',
  },
  /** Fast striker: two masts (square fore, gaff main), teal hull with a cream band, sharp low castle. */
  brigantine: {
    scale: 1, length: 6.0, beam: 2.2, hull: 0x2f5a5c, deck: 0xa88a5a, sail: 0xf2ead2, trim: 0xe3d3a0, accent: 0xd8b24a,
    bottom: 0x1f3a3c, inner: 0x3f7a78, masts: [1.1, -0.8], rigs: ['square', 'gaff'], tiers: [2, 1], guns: 3, castle: 0.35, forecastle: 0.12,
    flag: 0xe3d3a0, emblem: 'cross', lanterns: 0xffb04a,
  },
  /** The starting ship: warm brown hull, gold carvings, tall stern castle, red skull flag. */
  galleon: {
    scale: 1, hull: 0x7a4626, deck: 0xa47a48, sail: 0xf6ecd4, trim: 0x2a1a0e, accent: 0xc99a3c, bottom: 0x6a2c1f,
    masts: [1.5, -0.2, -1.7], rigs: ['square', 'square', 'lateen'], tiers: [2, 3, 1], guns: 3, castle: 0.75, forecastle: 0.3,
    flag: 0xc0392b, emblem: 'skull', lanterns: 0xffb04a,
  },
  /** Mediterranean corsair: three lateen sails on a long, low hull, ochre with a crimson band and striped sails. */
  xebec: {
    scale: 1, length: 7.0, beam: 2.3, hull: 0xb98a4a, deck: 0x9c7a4c, sail: 0xf0e4c4, sailStripe: 0xb8452e, trim: 0x8a2e24, accent: 0xd8a24a,
    bottom: 0x5a3a22, inner: 0x8a2e24, masts: [2.0, 0.1, -1.9], rigs: ['lateen', 'lateen', 'lateen'], tiers: 1, mastH: [4.3, 5.0, 3.8], guns: 4, castle: 0.3, forecastle: 0.05,
    flag: 0x8a2e24, emblem: 'crown', lanterns: 0xffb04a,
  },
  /** Larger and long: three square-rigged masts, dark hull with a red gun band. */
  frigate: {
    scale: 1, length: 7.6, beam: 2.5, hull: 0x24262c, deck: 0x8f7450, sail: 0xede6d4, trim: 0xa8262b, accent: 0xa8262b,
    bottom: 0x3a1a16, inner: 0xa8262b, masts: [2.1, 0.1, -2.0], tiers: [3, 3, 2], guns: 5, castle: 0.4, forecastle: 0.22,
    flag: 0x111114, emblem: 'skull', lanterns: 0xffb04a,
  },
};

/** Navy and privateer enemies. Sizes follow the original scales so silhouettes match their hit radius. */
export const ENEMY_LOOKS = {
  /** One square-rigged mast, slate hull with a white band, navy ensign. */
  gunboat: {
    scale: 0.55, length: 6.2, beam: 2.4, hull: 0x4a5566, deck: 0x6e6a62, sail: 0xd4d7dc, trim: 0xe8e6de, accent: 0x2b3442,
    bottom: 0x2b3442, inner: 0x3b4658, masts: [0.5], tiers: 2, mastH: [4.6], guns: 2, castle: 0, forecastle: 0,
    flag: 0x1f3f75, emblem: 'cross', merge: true,
  },
  /** Two square-rigged masts, black hull with an ochre gun band (navy chequer). */
  brig: {
    scale: 0.9, hull: 0x2a2a2f, deck: 0x75604a, sail: 0xe2d6b6, trim: 0xd2a645, accent: 0x1a1a1e, bottom: 0x5a2a20,
    inner: 0x8a2e24, masts: [1.3, -0.9], tiers: 2, guns: 3, castle: 0.35, forecastle: 0.2, flag: 0x1f3f75, emblem: 'cross', merge: true,
  },
  /** Stubby and beamy, main and mizzen aft, a big mortar on the foredeck. */
  ketch: {
    scale: 0.8, length: 5.8, beam: 2.8, hull: 0x7a5a32, deck: 0x7d6444, sail: 0xc2b08a, trim: 0xa83226, accent: 0x4a2e18,
    bottom: 0x4a2a1a, masts: [-0.4, -2.0], rigs: ['square', 'lateen'], tiers: [2, 1], mastH: [4.0, 2.8], guns: 1, castle: 0.35,
    forecastle: 0, jib: true, mortar: true, flag: 0x7a1c1c, emblem: 'plain', merge: true,
  },
  /** Tiny sleek cutter: one raked lateen, white and teal. */
  swarm: {
    scale: 0.4, length: 5.0, beam: 1.5, hull: 0xe8ece6, deck: 0x8a7a5a, sail: 0xf4f0e0, trim: 0x1c8a8a, accent: 0x146666,
    bottom: 0x146666, inner: 0x1c8a8a, masts: [0.4], rigs: ['lateen'], mastH: [3.6], guns: 0, castle: 0, forecastle: 0, jib: true,
    flag: 0x1c8a8a, emblem: 'plain', merge: true,
  },
  /** Squat and beamy workhorse, tarred hull, rusty trim; the mine rack is added in enemymodels. */
  minelayer: {
    scale: 0.8, length: 5.0, beam: 3.0, hull: 0x3a3d3a, deck: 0x5c5648, sail: 0x9a9484, trim: 0xb8651e, accent: 0x2a2c2a,
    bottom: 0x2a2220, inner: 0x4a4438, masts: [0.4], rigs: ['gaff'], mastH: [3.0], guns: 0, castle: 0.3, forecastle: 0,
    flag: 0x7a1c1c, emblem: 'plain', merge: true,
  },
  /** Pale spectral galleon: green-white hull, ragged grey sails, cold glowing lanterns. */
  ghost: {
    scale: 0.85, length: 6.2, beam: 2.4, hull: 0x6f9a8a, deck: 0x587a6c, sail: 0x93b8a8, trim: 0x4fb890, accent: 0x3f8a72,
    bottom: 0x4a7a68, inner: 0x6a9a88, masts: [1.2, -0.9], tiers: 2, guns: 3, castle: 0.5, forecastle: 0.2,
    glow: 0x2fd8a0, lanterns: 0x7fffd0, flag: 0x5fe0b0, emblem: 'skull', merge: true,
  },
} satisfies Record<string, ShipOpts>;

/**
 * One look per act boss, all built at the Man-o'-War reference size (scale 2.3); spawnEnemy scales the
 * root by bossDef.scale / 1.8 on top.
 */
const BASE_LOOKS = {
  // Revenue Cutter: long and sleek, tall square fore and big gaff main, white hull with a navy band
  cutter: {
    scale: 2.3, length: 7.4, beam: 2.0, hull: 0xeeebe2, deck: 0xa88a5c, sail: 0xfbf8ef, trim: 0x1f3f75, accent: 0x1f3f75,
    bottom: 0x9a2f24, inner: 0x1f3f75, masts: [1.1, -1.1], rigs: ['square', 'gaff'], tiers: [3, 1], mastH: [5.8, 5.4], guns: 4, castle: 0.25, forecastle: 0,
    flag: 0x1f3f75, emblem: 'cross', pennants: 0xd23a2a, lanterns: 0xffc46b, merge: true,
  },
  // Man-o'-War: two gun decks, black and ochre, three square-rigged masts
  manowar: {
    scale: 2.3, length: 6.8, beam: 2.5, hull: 0x1d1d22, deck: 0x8f6a42, sail: 0xf0e8d4, trim: 0xd9a83a, accent: 0xd9a83a,
    bottom: 0x5e2a1f, inner: 0x8a2e24, masts: [1.8, 0, -1.8], tiers: 3, gunDecks: 2, guns: 5, castle: 0.7, forecastle: 0.3,
    flag: 0xa8262b, emblem: 'cross', pennants: 0xa8262b, lanterns: 0xffc46b, merge: true,
  },
  // Fire Galleon: charred hull with glowing ember seams, blood-red striped sails
  firegalleon: {
    scale: 2.3, length: 6.6, beam: 2.6, hull: 0x231816, deck: 0x4a3426, sail: 0x8a2a1a, sailStripe: 0x2a1410, trim: 0xff6a1a,
    accent: 0x3a1a10, bottom: 0x140c0a, inner: 0x5a1a10, wood: 0x2a1c14, masts: [1.6, -0.1, -1.7], rigs: ['square', 'square', 'lateen'],
    tiers: [2, 3, 1], guns: 4, castle: 0.85, forecastle: 0.35, glow: 0xff5a14, lanterns: 0xff6a1a,
    flag: 0x111111, emblem: 'skull', pennants: 0xff7a20, merge: true,
  },
  // Admiral's Flagship: four masts, three gun decks, royal blue and gold, gilded stern
  flagship: {
    scale: 2.3, length: 7.2, beam: 2.8, hull: 0x2d56a8, deck: 0x9c7a4c, sail: 0xfbf6ea, sailStripe: 0xe6c565, trim: 0xe3b546,
    accent: 0xe3b546, bottom: 0x5e2a1f, inner: 0xa8262b, masts: [2.3, 0.7, -0.9, -2.3], rigs: ['square', 'square', 'square', 'lateen'],
    tiers: [3, 3, 2, 1], gunDecks: 3, guns: 5, castle: 1.0, forecastle: 0.4, flag: 0xa8262b, emblem: 'crown',
    pennants: 0xe3b546, lanterns: 0xffd27a, merge: true,
  },
} satisfies Record<'cutter' | 'manowar' | 'firegalleon' | 'flagship', ShipOpts>;

export const BOSS_LOOKS: Record<Exclude<BossId, MonsterBossId>, ShipOpts> = {
  ...BASE_LOOKS,
  // Reef Corsair: a low, raked brig in turquoise and coral with torn red lateen-style sails
  corsair: {
    scale: 2.3, length: 6.8, beam: 2.1, hull: 0x167a7a, deck: 0xb59468, sail: 0xd8553f, sailStripe: 0xf3e3b8, trim: 0xff7a5c, accent: 0xf2d27a,
    bottom: 0x7a2a22, inner: 0xd8553f, masts: [1.3, -0.9], rigs: ['square', 'gaff'], tiers: [2, 1], mastH: [5.2, 4.8], guns: 4, castle: 0.3, forecastle: 0.1,
    flag: 0x111111, emblem: 'skull', pennants: 0xff7a5c, lanterns: 0xffc46b, jib: true, merge: true,
  },
  // Man-o'-War (reef remix): the black ship in coral red with a white gun band
  manowar_r: { ...BASE_LOOKS.manowar, hull: 0x6a1d22, trim: 0xf2ecde, accent: 0xff8a6a, sail: 0xf6e4d0, sailStripe: 0xd86a52, flag: 0x111111, emblem: 'skull', pennants: 0xff8a6a, gunDecks: 3, castle: 0.85 },
  // Pirate King's Galleon: huge black-and-gold four-master, red sails with the Jolly Roger, crowned
  pirateking: {
    scale: 2.3, length: 7.6, beam: 2.9, hull: 0x121214, deck: 0x7a5a38, sail: 0x9a1f24, sailStripe: 0x1a1a1c, trim: 0xe8c14a, accent: 0xe8c14a,
    bottom: 0x3a1a14, inner: 0x6a1a1a, masts: [2.4, 0.8, -0.9, -2.4], rigs: ['square', 'square', 'square', 'lateen'], tiers: [3, 3, 2, 1],
    gunDecks: 3, guns: 5, castle: 1.0, forecastle: 0.4, flag: 0x111111, emblem: 'skull', pennants: 0xe8c14a, lanterns: 0xffd27a, glow: 0xb81c1c, merge: true,
  },
  // Ghost Galleon: pale green-white, ragged grey sails, cold glowing lanterns
  ghostgalleon: {
    scale: 2.3, length: 7.0, beam: 2.5, hull: 0x7ba898, deck: 0x587a6c, sail: 0xa9cbbd, sailStripe: 0x6f9a8a, trim: 0x5fe0b0, accent: 0x3f8a72,
    bottom: 0x4a7a68, inner: 0x6a9a88, masts: [1.6, -0.1, -1.7], rigs: ['square', 'square', 'lateen'], tiers: [2, 3, 1], guns: 4, castle: 0.85, forecastle: 0.3,
    glow: 0x2fd8a0, lanterns: 0x7fffd0, flag: 0x7fffd0, emblem: 'skull', pennants: 0x7fffd0, merge: true,
  },
  // Revenue Cutter (fog remix): slate grey with a yellow band, dark sails
  cutter_r: { ...BASE_LOOKS.cutter, hull: 0x59636e, trim: 0xe8c14a, accent: 0xe8c14a, sail: 0xc9ccd0, bottom: 0x2b3442, flag: 0xe8c14a, pennants: 0xe8c14a, tiers: [3, 2], guns: 5 },
  // Drowned Admiral: waterlogged blue-green hull, seaweed-dark tattered sails, ghost-green glow, gilded crown
  drownedadmiral: {
    scale: 2.3, length: 7.2, beam: 2.7, hull: 0x2d5a60, deck: 0x4a5a4a, sail: 0x5f7a72, sailStripe: 0x2a3e3c, trim: 0xc9b25a, accent: 0xc9b25a,
    bottom: 0x1c3a3c, inner: 0x2a6a60, masts: [2.0, 0.4, -1.2], rigs: ['square', 'square', 'lateen'], tiers: [3, 3, 1], gunDecks: 2, guns: 5, castle: 0.95, forecastle: 0.35,
    glow: 0x38e8b0, lanterns: 0x6fffc8, flag: 0x38e8b0, emblem: 'crown', pennants: 0x38e8b0, merge: true,
  },
  // Fire Galleon (volcanic remix): the charred ship with molten orange sails and bright lava seams
  firegalleon_r: { ...BASE_LOOKS.firegalleon, sail: 0xd2561a, sailStripe: 0x3a1a10, glow: 0xff8a1a, trim: 0xffa020, hull: 0x2e1c14, pennants: 0xffc040 },
  // Magma Dreadnought: huge basalt-black armoured hull with glowing lava cracks, low rig, no frills
  magma: {
    scale: 2.3, length: 7.4, beam: 3.2, hull: 0x2a2624, deck: 0x3a3430, sail: 0x4a2a1c, sailStripe: 0xff6a1a, trim: 0xff5a14, accent: 0x6a2410,
    bottom: 0x1a1210, inner: 0x5a1c10, wood: 0x2a2220, masts: [1.5, -0.6], rigs: ['square', 'square'], tiers: [2, 2], mastH: [4.6, 4.2], gunDecks: 3, guns: 4,
    castle: 0.7, forecastle: 0.5, glow: 0xff6a14, lanterns: 0xff7a20, flag: 0x111111, emblem: 'skull', pennants: 0xff5a14, merge: true,
  },
  // Admiral's Flagship (volcanic remix): scarlet and brass with an ember glow
  flagship_r: { ...BASE_LOOKS.flagship, hull: 0x8a1c22, sailStripe: 0xff9a40, trim: 0xf2b640, accent: 0xf2b640, glow: 0xff7a20, flag: 0x111111, pennants: 0xff9a40 },
};
