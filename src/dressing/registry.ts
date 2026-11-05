import type { Attach } from './types';
import { chaser, ram, ward, harpoon, broadside, siphon, boarding, carronade } from './bowside';
import { mortar, witch, crowsnest, rockets, kegs, lantern, net, pump } from './deckstern';
import { swivel, chain, firearrows, bombketch, tesla, gatling, sharkcage, spyglass, magnet } from './mods3';

/**
 * Module id -> 3D attachment. Keyed by string so ids the module table does not know yet still build;
 * the slot and colour here are fallbacks (MODS wins when it has the id). Adding a module = one entry.
 */
export const ATTACH: Record<string, Attach> = {
  // bow
  chaser: { slot: 'bow', build: chaser, color: 0xff8a5a, lane: { x: 0.17, half: 0.3 } },
  ram: { slot: 'bow', build: ram, color: 0xb9c0c8 },
  ward: { slot: 'bow', build: ward, color: 0x7fd0ff },
  harpoon: { slot: 'bow', build: harpoon, color: 0xd9b26a, lane: { x: -0.2, half: 0.3 } },
  // side
  broadside: { slot: 'side', build: broadside, color: 0xffd36a, usesBalls: true },
  siphon: { slot: 'side', build: siphon, color: 0xff7a2a },
  boarding: { slot: 'side', build: boarding, color: 0x9fd18b },
  carronade: { slot: 'side', build: carronade, color: 0xd8a24a },
  // deck
  mortar: { slot: 'deck', build: mortar, color: 0xffffff, lane: { x: 0, half: 0.5 } },
  witch: { slot: 'deck', build: witch, color: 0xb58cff },
  rockets: { slot: 'deck', build: rockets, color: 0xff5a3a, lane: { x: 0, half: 0.5 } },
  crowsnest: { slot: 'deck', build: crowsnest, color: 0x6ab0e0 },
  // stern
  kegs: { slot: 'stern', build: kegs, color: 0xc9743a, lane: { x: 0, half: 0.4 } },
  lantern: { slot: 'stern', build: lantern, color: 0xd9e4ea, lane: { x: 0, half: 0.4 } },
  net: { slot: 'stern', build: net, color: 0xd0a050, lane: { x: 0, half: 0.4 } },
  pump: { slot: 'stern', build: pump, color: 0x7fc8ff, lane: { x: -0.38, half: 0.4, pin: -1 } },
  // v10
  swivel: { slot: 'bow', build: swivel, color: 0xe0c070 },
  spyglass: { slot: 'bow', build: spyglass, color: 0xd9c98a },
  chain: { slot: 'side', build: chain, color: 0x9aa4b0 },
  gatling: { slot: 'side', build: gatling, color: 0xc9b27a },
  firearrows: { slot: 'deck', build: firearrows, color: 0xff9a3a },
  tesla: { slot: 'deck', build: tesla, color: 0x6fd8ff },
  magnet: { slot: 'deck', build: magnet, color: 0xe8c040 },
  bombketch: { slot: 'stern', build: bombketch, color: 0x5a5a66 },
  sharkcage: { slot: 'stern', build: sharkcage, color: 0x4aa0c0 },
};
