# Galleon MVP spec (working title: "Broadside")

This is a browser game built with three.js, Vite and TypeScript. The player steers a pirate galleon. Its weapons fire on their own, but each weapon can only shoot within its own fixed arc, so the player aims by steering. The ship eats boats and cargo to earn gold and XP and picks upgrades at each level-up. A boss arrives after a countdown. There is no meta progression in the MVP.

## Stack and structure
- Write `package.json` by hand with these pinned versions: `three@0.170.0`, `@types/three@0.170.0`, `vite@6.0.7`, `typescript@5.7.2`. Scripts: `dev` (vite), `build` (tsc --noEmit && vite build), `typecheck`.
- `index.html` contains the canvas and an HTML overlay `#hud` for the HUD, the level-up cards and the end screens. Do not render text with three.js.
- Source files go in `src/`. Split them by concern:
  - `main.ts` (bootstrap and loop)
  - `game.ts` (state and run flow)
  - `ship.ts` (player movement)
  - `weapons.ts`
  - `enemies.ts`
  - `edibles.ts`
  - `world.ts` (sea, islands, wind)
  - `spatial.ts` (spatial hash)
  - `hud.ts`
  - `content.ts` (typed data for weapons, upgrades and enemies)
  - `input.ts`
- Keep each file under about 400 lines.

## Loop and engine rules
- Fixed timestep of 60 Hz with an accumulator. Clamp frame dt to 0.1 s so the game doesn't jump forward after the tab was in the background.
- Angled orthographic camera at about 55° pitch, rotated 45°, following the ship smoothly. It must handle window resize. Wheel zoom is optional.
- Lighting: low-poly flat-shaded meshes built from primitives (box, cone, cylinder). No external assets. Use a hemisphere light plus a directional light, and fog fading to the sea color.
- Sea: a large plane that follows the camera with a gentle vertex-wave shader or animated normals. Keep it cheap. Scatter islands as sand-colored cylinders with a few palm trees. Islands block ships, so do circle collision against them.
- Use a uniform-grid spatial hash for every proximity check: projectiles vs. ships, pickups vs. the player, enemies vs. the player.
- Pool projectile and pickup meshes. Plain meshes are fine.

## Player ship
- Controls: W/S adjust the sail level from 0 to 3 (0 means drifting to a stop), and A/D turn. Arrow keys work the same way. Shift is "Full Sail": a 2.5 s burst that doubles thrust, with an 8 s cooldown.
- Physics:
  - Velocity points along the hull.
  - Drag is applied every step.
  - Sideways drift is damped strongly, so the ship slides only a little.
  - Turn rate scales with speed: about 30% of full turn rate at standstill and full rate at cruise speed. That gives the ship a wide, heavy turn.
  - The hull sways visually, with a roll that follows the turn.
- Wind has a global direction that changes slowly, shown as a HUD arrow. Top speed is multiplied by `1 + 0.2*cos(angle between heading and wind)`, so the effect stays within ±20%.
- Stats: HP 100, max speed about 9 u/s, pickup radius 4. Ramming small edibles eats them. Ramming an enemy deals contact damage to both.

## Mount slots and weapons (all auto-fire, arc-limited)
Each slot has a center angle relative to the bow and a half-arc. A weapon fires only at a target inside its arc and within range, and it picks the nearest such target.

| Slot | Center | Half-arc |
|---|---|---|
| bow | 0° | 25° |
| port | +90° | 45° |
| starboard | −90° | 45° |
| stern | 180° | 40° |
| deck | 0° | 360° (deck only, used by the mortar) |

| Weapon | Slots | Behavior | Starting stats |
|---|---|---|---|
| Broadside Cannons (starting weapon) | port and starboard | A volley of N balls spread along the hull | 2 balls per side, 8 dmg, range 14, cooldown 1.6 s, speed 22 |
| Bow Chaser | bow | A single fast shot | 12 dmg, range 18, cooldown 1.0 s |
| Deck Mortar | deck | Lobs a shell in an arc to the target's position, with splash damage | 15 dmg, radius 3, range 16, cooldown 3 s |
| Powder Kegs | stern | Drops a floating keg that explodes when an enemy comes near or after 8 s | 25 dmg, radius 3.5, cooldown 2.5 s |

At run start the player has only Broadside Cannons. The other three weapons are offered as level-up cards ("New weapon: …").

## Edibles (gold + XP)
- Fishing boats: small and white. They flee from the player once it is within 10 u. 3 XP, 2 gold.
- Floating cargo crates bob in clusters. 1 XP, 1 gold.
- Dock huts sit on island shores. Ramming them at more than 50% speed eats them. 5 XP, 5 gold.
- Dead enemies drop XP orbs that drift toward the player when it is within pickup radius.
- Gold is spent during the run only. In the MVP, show it in the HUD and allow one use: press R to spend 10 gold on a reroll during a level-up.
- Keep the world populated by respawning edibles around the player, about 40 alive at once, off screen. This addresses Wanderburg's "maps feel empty" complaint.

## Enemies
Enemies spawn off screen in waves, and spawn rate ramps up over time.

| Enemy | HP | Behavior |
|---|---|---|
| Gunboat | 20 | Chases the player. Fires a single shot every 2 s within 12 u. Speed 7. |
| Fire Raft | 10 | Rams the player and explodes for 15 dmg. Speed 10. Orange glow. |
| Brig | 70 | Slow (speed 4). Tries to line up alongside the player and fires a 3-ball broadside every 3 s. |

Enemies show a small HP bar (an HTML overlay or a sprite).

## Boss
- A countdown is visible in the HUD: 180 s by default, or 20 s with `?fast` in the URL.
- When it reaches zero, the **Man-o'-War** spawns. It has 800 HP and is large. It circles the player at distance 15 and alternates between port and starboard 6-ball broadsides. Below 50% HP it also fires a ring of 12 balls every 6 s.
- The boss has an HP bar at the top of the screen.
- Defeating it shows the win screen. If the player's HP hits 0, show the death screen. Both screens show run stats (time, level, gold, kills) and a "Sail again" button.

## Level-up
- The XP needed for each level grows: `5 + 4*level`.
- On level-up, pause the game and show 3 cards drawn at random from the pool. Exclude maxed upgrades and weapons the player already owns. Each card shows its exact numbers, for example "Fire rate: cooldown −12% (1.60s → 1.41s)".
- Keys 1/2/3 or a click pick a card. R rerolls for 10 gold.
- The upgrade pool (each upgrade has max level 5):
  - Extra Cannon: +1 ball per broadside side
  - Fire Rate: −12% cooldown for all weapons
  - Chain Shot: projectiles pierce +1 target
  - Hull Plating: +25 max HP and full heal of that amount, −6% max speed (the armor vs. speed trade-off)
  - Bigger Sails: +10% max speed and +10% turn rate
  - Long Hooks: +30% pickup radius
  - The three new-weapon cards (max 1 each)
  - Weapon damage +20% (one card per owned weapon)

## HUD
- HP bar
- XP bar with the level number
- Gold
- Boss timer
- Wind arrow
- Sail level
- Full Sail cooldown
- Kill count

Use a clean, readable pirate palette: parchment and navy.

## Debug hook (required)
- `window.__game` exposes a live object: `{ state: 'playing'|'levelup'|'dead'|'won', hp, maxHp, level, xp, gold, kills, bossTimer, bossAlive, player: {x, z, heading, speed}, counts: {enemies, edibles, projectiles}, weapons: string[] }`.
- `window.__game.debug` provides `spawnEnemy(type, x, z)`, `addXp(n)`, `setHp(n)`, `skipToBoss()` and `godMode(bool)`.
- `?fast` shortens the boss timer to 20 s.

## Done means
- `npm run build` passes: no TypeScript errors and the Vite build succeeds.
- No console errors when the game runs.

## v2: Four acts and a harbor (Hafen)

### Run structure
- A run has **4 acts**. Each act counts down to its own boss: 150 s, or 20 s with `?fast`. The HUD shows `Act N/4 · <Boss name> in m:ss`.
- Killing the act 1–3 boss drops **+30 gold**, then opens the **harbor** after a short beat of about 1.5 s. Killing the act 4 boss **wins** the run.
- On leaving the harbor:
  - Clear all remaining enemies, enemy projectiles and enemy HP bars.
  - Reset the spawn ramp for the new act.
  - Keep the player's position, all upgrades, gold, XP and level.
- **Scaling per act:** enemy HP ×[1, 1.6, 2.4, 3.4] and enemy damage ×[1, 1.25, 1.5, 1.8], both indexed by act.
- **Enemy pool per act:** act 1 gunboat and raft (brig from t>60). Act 2 adds brig from the start. Act 3+ adds a new **Bomb Ketch**.
- Within each act, the spawn ramp starts from that act's own clock, not `G.time`.

### New enemy: Bomb Ketch
- HP 35, speed 5.
- Keeps a distance of 14–18 from the player.
- Every 3.5 s it lobs a mortar shell at the player's position *at fire time*. A red ring telegraph is visible on the water for the 1.2 s flight. The shell explodes with radius 3 for 12 dmg (× act multiplier).
- You dodge it by sailing on.
- xp 5.

### Bosses (one per act; reuse the boss model and AI, parameterized by data)

| Act | Name | HP | Broadside balls | Ring phase | Scale |
|---|---|---|---|---|---|
| 1 | Revenue Cutter | 350 | 4 | none | 1.4 |
| 2 | Man-o'-War | 800 | 6 | below 50% HP | 1.8 |
| 3 | Fire Galleon | 1300 | 6 | below 50%; also drops fire rafts every 8 s | 2.0 |
| 4 | Admiral's Flagship | 2200 | 8 | always, every 5 s | 2.4 |

- The boss model scale must actually apply. Currently `spawnEnemy` forces scale to 1.
- The boss bar shows the boss's name.

### Harbor (shop), state `'harbor'`
- Opens as a full overlay styled like the level-up cards. The game is paused. Title: "Harbor: Act N complete".
- Shows a list of items with **name, effect with exact numbers, cost, and a Buy button**. Buttons are disabled when the player can't afford an item or it is maxed.
- A **"Set sail"** button (Enter or Space) starts the next act.
- Each item's cost rises ×1.5 (rounded) per purchase.
- Prices are deliberately set so you can buy roughly 2–3 items per visit.

| Item | Effect | Base cost | Max |
|---|---|---|---|
| Repair | Heal to full | 15 | unlimited (cost does not scale) |
| Reinforced Hull | +30 max HP (also heals 30), −4% max speed | 25 | 5 |
| Copper Sheathing | +8% max speed, +8% turn | 25 | 5 |
| Extra Gun Deck | +1 broadside ball per side | 35 | 3 |
| Carpenters (crew) | Regenerate 0.5 HP/s (+0.5 per level) | 40 | 3 |
| Quartermaster (crew) | +25% gold from all sources | 30 | 3 |
| Lookout (crew) | +15% range for all weapons | 35 | 3 |
| New mount | Buy one weapon not yet owned (chaser, mortar or kegs). One entry per unowned weapon. | 45 | 1 each |

- Harbor upgrades stack with level-up upgrades. They feed into `deriveStats` through separate keys (for example `h:hull`), so both sources sum.

### Gold changes
- Enemies drop gold on death: gunboat 1, raft 1, brig 3, ketch 2. The Quartermaster bonus applies.

### Debug additions
- `__game.act` returns the current act.
- `state` can also be `'harbor'`.
- `debug.killBoss()` kills the live boss, or spawns the boss and kills it.
- `debug.addGold(n)`.
- `debug.buy(id)` makes a harbor purchase and returns a boolean.
- `debug.setSail()`.

## v3a: Feel (smoothness, controls, impact, animation)

### Smoothness and sharpness
- **Render interpolation.** Before each fixed step, snapshot the previous `x`, `z` and `heading` (plus `y` for projectiles) of the player, enemies, edible boats and crates, orbs and projectiles. Rendering draws `lerp(prev, cur, alpha)` with `alpha = acc/STEP`, using an angle-aware lerp for heading.
- **No mesh transforms in fixed-step code.** Move every mesh transform write into render-side update functions. The camera follows the *interpolated* player position.
- **FX is visual only.** `stepFx` and all particles run per render frame with real dt.
- **Pixel ratio.** Re-apply `setPixelRatio(min(devicePixelRatio, 2))` on resize. Keep antialias on.

### Controls (direct, arcade-y; replaces sail levels 0–3)
- **W / Up (hold):** accelerate toward max speed, reaching about 90% in about 1.2 s.
- **Release:** coast and slow down gently, stopping in about 3 s.
- **S / Down (hold):** brake. Below speed 0.5, slow reverse up to 25% of max speed.
- **A / D:** turn at 1.9 rad/s base × turnMul at cruise, and 55% of that at standstill. Turn input ramps to full in about 0.12 s, so it reacts quickly but still has weight.
- **Lateral drift damping:** `exp(-8*dt)`.
- **Shift:** Full Sail stays as it is.
- Sails scale with smoothed throttle. Remove the sail pips from the HUD and show a speed gauge instead.

### Impact ("juice")
- **Screen shake.** Use a trauma model: offset = trauma² × 0.8 u with noise, and trauma decays 1.6/s. Trauma added per event:
  - Player broadside: +0.10
  - Player hit: +0.3
  - Explosion within 20 u: +0.2
  - Boss death: +1.0
  - Shake applies to the camera at render time.
- **Hit-stop.** Pause the sim for 0.12 s on boss death and 0.04 s when the player takes ≥15 dmg.
- **Enemy hit flash.** On spawn, clone each enemy's materials once. On a hit, the emissive goes white for 0.08 s.
- **Player hit.** Red vignette flash on the HUD plus a red emissive flash on the ship.
- **Damage numbers.**
  - Pooled DOM floating numbers, about 50, projected to the screen. They rise and fade over 0.7 s.
  - Colors: white for normal hits, yellow and larger for boss hits, red for damage the player takes.
  - Hits on the same enemy within 0.15 s merge into one number.
- **Particles.** Extend the fx pool to 300 and add optional velocity and gravity, used for splinters, droplets and debris.
- **Cannonballs.**
  - A small trail behind each ball.
  - Running out of range gives a water splash: a white column plus droplets plus a flat ring.
  - A hit gives brown wood splinters plus an orange flash.
- **Muzzle.** A flash at the gunport plus 2–3 grey smoke puffs that drift up and outward.
- **Ship recoil.** Each broadside adds a roll impulse away from the firing side (about 0.08 rad), which springs back.
- **Enemy death.**
  - No instant removal. Enemies sink over 1.2 s: tilt about 40°, drop to y −3, smoke and debris, then get removed.
  - A dying enemy is excluded from targeting, collision and contact.
  - Rafts that ram the player blow up instantly (no sink).
- **Pickups.** They bob and spin, accelerate toward the player once inside the magnet radius, and pop to scale 1.4 and fade when collected.
- **Sound.** All sounds are synthesized with WebAudio; there are no asset files. One `audio.ts` module covers:
  - Cannon boom: noise burst through a lowpass plus a low sine thump.
  - Hit: wood crack.
  - Splash.
  - Explosion.
  - Pickup blip: pitch rises with a combo for pickups within 0.5 s of each other.
  - Level-up arpeggio.
  - Player hurt thud.
  - Boss horn when the boss spawns.
  - The audio context unlocks on the first key or click.
  - Throttle each sound type to at most 4 per 60 ms, and add slight random pitch variation.
  - Master volume 0.5. M toggles mute, and the setting persists in localStorage.

### Animation
- **Player ship.**
  - Pitch and roll follow a wave function sampled at bow and stern.
  - Bow spray particles when speed > 60%.
  - The wake gets stronger with speed.
  - Sails bulge with speed (scale z) and flutter slightly.
  - The flag waves.
- **Enemy ships** bob and sway in the same way.
- **UI.** Level-up and harbor cards animate in (scale and fade with a stagger). HUD bars move smoothly with a CSS transition, and the HP bar shows a delayed "damage chunk" trail.

## v3b: Menu, ship and captain selection, pause

### Menu
- Initial state is `'menu'`. The title "Broadside" sits over the live animated sea, with the ship idling and the camera orbiting slowly. Buttons: **Set Sail**, **How to Play** (a controls panel), **Sound on/off**.
- Set Sail → **Ship select** → **Captain select** → run starts. A Back button is on each screen.
- Cards show stat bars (Hull, Speed, Turning, Firepower). Use arrows and Enter, or the mouse.
- The last selection persists in localStorage and is preselected next time.

### Ships

| Ship | HP | Max speed | Turn | Broadside balls/side | Extra | Model |
|---|---|---|---|---|---|---|
| Sloop | 70 | 11 | ×1.3 | 1 | Starts with Bow Chaser | scale 0.8, 1–2 masts, blue trim |
| Galleon | 100 | 9 | ×1.0 | 2 | — | current look |
| Frigate | 150 | 7.5 | ×0.8 | 3 | Ram damage +50% | scale 1.2, 3 masts, dark hull, red trim |

### Captains (each has an upside and most have a downside)

| Captain | Effect |
|---|---|
| Old Salt | +20% max HP. No drawback (beginner). |
| Mad Morgan | +30% fire rate, −20% max HP. |
| Greedy Gwen | +40% gold, enemies +15% HP. |
| Iron Bess | Ram damage ×2, −50% contact damage taken, −10% max speed. |

- Ship base stats and captain modifiers feed into `deriveStats`, which needs a ship/captain base. Level-up and harbor bonuses stack on top.

### Pause
- **Esc or P** pauses the game (state `'paused'`, available from playing only).
- The overlay has: **Resume**, a **Sound** toggle and volume slider, **Restart run** (same ship and captain), and **Main menu**.

### End screens
- **Sail again** (same ship and captain) and **Main menu**.
- Restarting can keep using a page reload. Pass the selection via localStorage or the query, and make sure the menu is skipped when restarting.

### Test hooks
- `?fast` still works.
- `?quick` skips the menu with the last or default selection.
- `__game.debug.start(ship, captain)`.
- `__game.ship` and `__game.captain`.

## v4: Modules with active abilities, slots, and a captain roster (Wanderburg-style)

### Research basis (Wanderburg, Early Access 0.9.x)
Sources: wanderburggame.wiki, whisperofthehouse, treyexgaming module table, allthings.how.
- **Every module has an Auto component and an Active component**, each with its own damage and cooldown. For example, Front Cannon's active deals 150 dmg on a 10 s cooldown, and its auto deals 10 dmg every 1 s.
- Modules mount on **Front / Side / Top / Back** slots. A run has about 4 actives.
- Picking the same module again in the level-up draft **levels it up**.
- **Captains** have a passive bonus with a real drawback, for example Racer Ruth, Tankbert, Dieter the Drunk, The Count, Huntress, Pyromaniac, Time Witch and Duelist.
- Captains have **no** actives; actives come from modules.

### Slots
Each ship has mount slots:

| Ship | Bow | Side | Deck | Stern |
|---|---|---|---|---|
| Sloop | 1 | 1 | 0 | 1 |
| Galleon | 1 | 1 | 1 | 1 |
| Frigate | 1 | 2 | 1 | 1 |

- A side module fires from both port and starboard. With 2 side slots, the Frigate can mount two different side modules.
- The level-up draft offers either **a new module for a free slot** or **+1 level for an owned module** (max Lv 8). There is no replacing in the MVP.
- Generic upgrades (fire rate, hull, sails, hooks, chain shot) stay in the pool.
- The starting module depends on the ship: Sloop starts with Bow Chaser, Galleon and Frigate with Broadside Cannons.

### Active keys
- Actives fire automatically when their condition holds (e.g. Full Broadside with an enemy in a side arc). **Superseded by v5:** every module active auto-casts, and **Space** casts the captain's signature spell (see "Captain signature spells" in v5). Tab cycling and click-to-select are removed. While leveling up, R still rerolls.
- A HUD **ability bar** at the bottom center shows one icon per owned module, with a SPACE (gold highlight) or AUTO label, a radial cooldown sweep, a ready glow, and a small level pip.
- When an active comes off cooldown, a ready sound plays.

### Module levels
- Each level gives +12% auto and active damage.
- At **Lv 4** the active gets its upgrade (the "+" effect in the table below).
- At **Lv 8** the module is maxed and gets a gold border.

### Modules (pirate-themed)

| Module | Slot | Auto | Active (cooldown) | Lv4 "+" |
|---|---|---|---|---|
| Broadside Cannons | side | Current volleys | **Full Broadside**: both sides fire 3 rapid volleys at ×2 dmg (12 s) | 5 volleys |
| Bow Chaser | bow | Current single shot | **Heated Shot**: a red-hot ball that pierces everything along a 30 u line, 120 dmg, ignites what it hits (10 s) | +1 extra shot fanned ±8° |
| Deck Mortar | deck | Current lobbed shell | **Barrage**: 8 shells over 1.5 s around the densest enemy cluster within 22 u, each 30 dmg r3 (25 s) | 14 shells |
| Powder Kegs | stern | Current kegs | **Powder Trail**: 4 s of a burning trail behind the ship; enemies crossing it burn (20 s) | trail 7 s, wider |
| Iron Ram *(new)* | bow | Ram damage +60% at Lv1 (+15%/lv), less contact damage taken | **Ramming Speed**: a 0.8 s dash at ×2.2 speed, immune to contact damage, ram dmg ×3, knocks enemies aside (12 s) | dash 1.2 s, ends with a shockwave of 40 dmg r5 |
| Boarding Party *(new, summon)* | side | Every 10 s launches a longboat that chases the nearest enemy and deals 15 dps on contact for 6 s | **Boarders Away**: 5 longboats at once (35 s) | longboats last 10 s |
| Sea Witch *(new, mage)* | deck | Chain lightning every 2.5 s: 12 dmg, jumps to 3 targets | **Storm Call**: 8 lightning strikes on random enemies within 25 u, 60 dmg each (30 s) | 14 strikes, each stuns 1 s |
| Greek Fire Siphon *(new)* | side | Short fire cone (8 u, 35° half-arc) on both sides every 1.2 s that ignites | **Flame Wall**: a 3 s sweep of fire ring around the ship, r 7, burns everything (30 s) | ring r 10 |
| Ward Charm *(new, Force Mage analog)* | bow | Every 6 s deletes 1 enemy projectile within 10 u | **Ward**: deletes all enemy projectiles within 18 u, then 2 s of 80% damage reduction (25 s) | also pushes enemies back and deals 30 dmg |
| Fog Lantern *(new, Teleporter analog)* | stern | Enemies more than 12 u away lose track 15% of the time | **Vanish**: blink 14 u forward (island-safe), leave a fog puff, and the next auto volley deals ×2 (16 s) | 2 charges |

### Status effects
- **Burn:** DoT of 6 dps for 3 s. It refreshes but doesn't stack. A small flame particle shows on the target.
- **Stun:** the target stops moving and firing. Bosses take half the duration.

### Captains (character select, 10 portraits as card art; all unlocked in the MVP)
Each captain has one **passive** and one **drawback**. The selection card shows both, color-coded green and red.

| Captain | Passive | Drawback |
|---|---|---|
| Old Salt | A steady hand: +10% max HP | none (beginner) |
| Racer Rosa | Full Sail is 50% faster and its cooldown is −30% | −15% normal max speed |
| Iron Bess | Ram dmg ×2, contact dmg taken ×0.5 | −10% max speed |
| Tankard Tom | Lucky: 20% chance for double damage on any hit, and one free reroll per level-up | Steering wobbles (a sinusoidal drift on turning) |
| Count Corvo | Heals 2 HP per kill and 1 per edible eaten | No regen; harbor Repair costs ×3 |
| Hawkeye Hana | Auto attacks fire 40% faster | Active cooldowns +40% |
| Morwen the Sea Witch | Active cooldowns −35%, Sea Witch module at the start | Auto damage −25% |
| Firebrand Flint | All hits ignite; burning foes nearby spread burn on touch | −20% max HP |
| Greedy Gwen | +40% gold | Enemies +15% HP |
| Duelist Dorian | +30% damage dealt | +30% damage taken |

Mad Morgan is removed, since Hawkeye Hana and Duelist Dorian cover the same space.

### Debug
- `__game.modules` returns `[{id, slot, level, cd, cdMax}]`.
- `__game.debug.addModule(id)` and `__game.debug.cast(slotKey)`.
- `__game.debug.start(ship, captain)` works with the new captain ids.

## v5: Captain signature spells + meta progression

### Captain signature spells (replaces the module signature)
- **All module actives auto-cast.** Remove the module-signature selection, Tab cycling and click-to-select.
- **Space casts the captain's signature spell.** The ability bar shows it as a larger first icon with a "SPACE" label and the captain's portrait colour, followed by the module icons marked AUTO.
- `activeCdMul` applies to the captain spell too. Hawkeye Hana and Morwen therefore affect it.

| Captain | Spell | Effect | Cooldown |
|---|---|---|---|
| Old Salt | Patch Up | Heal 30% max HP over 3 s | 30 s |
| Racer Rosa | Tailwind | Full Sail resets to ready, then 4 s of +60% speed and immunity to contact damage | 18 s |
| Iron Bess | Iron Hull | 4 s of −70% damage taken. Rammed enemies take ×2 extra | 25 s |
| Tankard Tom | Lucky Barrel | Lob a barrel 12 u ahead with a random outcome: 40% big blast (80 dmg r7), 30% gold shower (+15 gold), 30% grog (heal 25) | 20 s |
| Count Corvo | Blood Tithe | 20 dmg to every enemy within 15 u. Heal 50% of the damage dealt | 22 s |
| Hawkeye Hana | Dead Eye | For 5 s, autos deal ×2 and pierce +2 | 20 s |
| Morwen | Maelstrom | Whirlpool 10 u ahead for 5 s, r 8. Pulls enemies in for 25 dps and stuns 0.5 s on entry. Bosses are only slowed | 28 s |
| Firebrand Flint | Firebomb | Lob 12 u ahead: 60 dmg r6, then a 4 s fire pool that burns | 14 s |
| Greedy Gwen | Plunder | Every edible and orb within 30 u flies to the ship. Gold ×2 for 6 s | 25 s |
| Duelist Dorian | Riposte | For 1.5 s, all damage is negated and enemy projectiles that hit the ship are reflected back as friendly shots | 16 s |

### Meta progression ("Doubloons")
**Currency.** Doubloons are permanent and saved in localStorage.
- **Earning:** at the end of every run, win or lose:
  - +1 per 2 gold collected over the run (total gold earned, not the gold left over)
  - +30 per boss killed
  - +10 per act reached
  - +1 per 10 kills
- **End screen:** shows the breakdown, the new total, and any unlocks that just completed.
- **Rerolls:** you get 1 free reroll per run for every 3 modules unlocked. They are shown in the level-up hint.

**Unlocks.** Unlock either by spending doubloons or by completing a challenge, whichever comes first. Challenges track lifetime stats.
- **Starting set:** Galleon. Old Salt, Iron Bess, Greedy Gwen. Broadside, Bow Chaser, Deck Mortar, Powder Kegs.

| Kind | Item | Cost | or Challenge |
|---|---|---|---|
| Ship | Sloop | 300 | Reach act 2 |
| Ship | Frigate | 600 | Defeat the Man-o'-War (act 2 boss) |
| Captain | Racer Rosa | 200 | Use Full Sail 100 times |
| Captain | Tankard Tom | 200 | Reroll 15 times |
| Captain | Count Corvo | 350 | Sink 500 ships |
| Captain | Hawkeye Hana | 300 | Reach act 3 |
| Captain | Morwen | 400 | Auto-cast actives 300 times |
| Captain | Firebrand Flint | 350 | Burn 300 enemies |
| Captain | Duelist Dorian | 500 | Defeat the Fire Galleon (act 3 boss) |
| Module | Iron Ram | 250 | Ram 100 enemies |
| Module | Boarding Party | 300 | Eat 200 fishing boats |
| Module | Sea Witch | 400 | Get Deck Mortar to Lv 8 |
| Module | Greek Fire Siphon | 350 | Get Powder Kegs to Lv 8 |
| Module | Ward Charm | 300 | Take 2000 damage total |
| Module | Fog Lantern | 300 | Get Bow Chaser to Lv 8 |

- Locked modules never appear in level-up cards or the harbor. Locked ships and captains show greyed out on the select screens, with their cost or challenge and a lock icon.
- **Pool control.** In the Armory, any unlocked module can be **toggled off**, which removes it from the draft and harbor pool. Starting modules can't be toggled off. This fixes Wanderburg's "can't disable unwanted upgrades" complaint.

**Menu.** The title screen gets an **Unlocks** button with tabs:
- **Shipwright:** ships
- **Tavern:** captains
- **Armory:** modules, with the pool toggles
- **Logbook:** lifetime stats and challenge progress

Each entry shows the cost, a Buy button, and a challenge progress bar. The doubloon total is shown on the title screen and in the unlocks screen.

**Debug.** `__game.meta` returns `{doubloons, unlocked: string[], stats}`. Also `debug.addDoubloons(n)`, `debug.unlockAll()` and `debug.resetMeta()`. `?unlockall` unlocks everything for testing.

## v6: Loadout screen, upgrade cards with rarity and tracks, Wanderburg-style HUD layout

The user supplied three Wanderburg screenshots: the pre-run loadout, the upgrade cards and the in-game HUD. We copy the *structure* and keep our own pirate art. That means parchment/navy/brass with our own icons; we do not copy Wanderburg's purple palette, fonts or art.

### A. Pre-run loadout screen (replaces the separate ship and captain screens)
Title → **Set Sail** → one **Loadout** screen.

**Left column: categories.** Each category is a row of round icon buttons. The selected one has a gold ring. Locked ones show a padlock and a small doubloon price badge.
1. **Ship** (Sloop / Galleon / Frigate)
2. **Captain** (10)
3. **Starting module**: any unlocked module that fits a free slot of the chosen ship. The default is the ship's current start module. It *replaces* the ship's default start. The Sloop's second start module, the Chaser, stays.
4. **Starting relic** (new, see C): one relic or none.

**Centre: detail panel** for the hovered or selected icon.
- Big icon or portrait, name, description.
- The relevant stats:
  - Ship: slot list ("1 bow · 1 side · 1 deck · 1 stern"), hull, speed.
  - Captain: passive, drawback and spell.
  - Module: auto and ability description.
- If locked: the price, a **Buy** button and the challenge with its progress bar.

**Right side:** the live 3D scene shows the chosen ship, framed off-centre to the right (move the menu camera target). It updates when the selection changes.

**Top:** doubloon balance. **Bottom:** a big **"Set Sail!"** button (Enter). Esc goes back. Tab moves between categories, arrows move within a row, Enter picks or buys. The Unlocks screen stays for the Armory toggles and the Logbook.

### B. Level-up cards: per-module upgrade tracks + rarity
- Each owned module has **two upgrade tracks**:
  - **AUTO-ATTACK**
  - **ABILITY** (the module's active)
- A card upgrades **one track** of one module by one level, or it offers a **new module** (when a free slot exists) or a **ship upgrade** (the existing generic ones: hull, sails, fire rate, hooks, chain shot).
- **Card layout:**
  - A name banner at the top.
  - A round icon for the module.
  - A central **type badge**: crosshair "AUTO-ATTACK", star "ABILITY", "NEW MODULE" or "SHIP".
  - Left: a small module glyph. Right: the track level number.
  - Body: 1–3 stat lines formatted `old → new STAT`, with new values highlighted. Stats can include damage, cooldown, projectile speed, effect size/radius, charges, duration, pierce and extra shots.
  - A rarity label at the bottom.
- **Rarity tiers and frame colour:**

| Rarity | Frame | Roll weight | Magnitude |
|---|---|---|---|
| Common | copper | 60 | ×1 |
| Uncommon | silver | 28 | ×1.6, may add a second stat |
| Rare | gold | 10 | ×2.4, adds a second or third stat |
| Epic | violet-sea teal | 2 | ×3.5, includes a special effect (e.g. +1 charge, +1 projectile, pierce) |

  Rarity scales the per-level increment. A level still counts as +1 track level, max 8 per track. At ability track Lv 4 the "+" effect from v4 unlocks.
- **Stat model:** each module defines its auto stats and ability stats as numbers. Every track level applies a stat delta chosen from that track's upgradable stats, for example cannon auto damage +X or projectile speed +Y, or ability damage, cooldown −Z% or radius +W. Card text shows exact before → after values.
- Rerolls and free rerolls work as before. A card can be picked with 1/2/3 or a click.

### C. Relics (starting artifact)
- **New relic system.** You can pick one relic in the loadout. Relics are bought or unlocked like everything else, and 2 of them are in the starting set.
- **Relic list** (with cost):
  - **Lucky Coin** (starter): +10% gold
  - **Ship's Biscuit** (starter): +20 max HP
  - **Second Wind** (300): once per run, when you would sink, revive with 30% HP
  - **Fire Opal** (250): burning enemies take +50% burn damage and spread burn on death
  - **Quickmatch** (250): auto cooldowns −10%
  - **Captain's Log** (300): the captain spell cooldown is −20%
  - **Kraken Tooth** (350): ram damage +60%
  - **Mermaid Scale** (300): +15% max speed while above 80% HP
  - **Bottled Storm** (350): every 10th auto shot chains lightning to 2 enemies
  - **Treasure Map** (200): start the run with 40 gold and 1 extra free reroll
  - **Barnacle Plating** (250): take −15% contact damage, and the regen from 0.2 HP/s starts at 0.2
  - **Golden Compass** (400): the next level-up card roll is guaranteed Rare or better, once per act
- **Debug:** `__game.relic`. `debug.start(ship, captain, opts?)` accepts `{startModule, relic}`.

### D. HUD layout (Wanderburg-like structure, our styling)
- **Top centre:** a wide **segmented HP bar** with one segment per 25 HP, labelled "HULL hp/max". Directly under it, a thin **Full Sail** bar. Under that, the **boss countdown** with a skull icon and `mm:ss`. The act label "Act N/4" is small.
- **Left edge:** a **vertical XP bar** with the level number in a round badge at the top.
- **Bottom centre:** the ability bar.
  - First cell: **Shift**, the Full Sail icon with its cooldown.
  - Second cell: **Space**, the captain spell.
  - Then the module cells marked AUTO, with their ability cooldown sweep.
- **Top right:** gold, kills and the wind arrow, kept small. The bottom-left panel is removed and the controls hint moves into the pause/help screen.
- The HUD must not overlap from 700 px wide up.

### v6 clarifications
- **Stat model (B).**
  - On startRun, seed a per-run `G.modStats[id] = {auto:{...}, ability:{...}}` record from `MODS` for each owned module, and for each module added later.
  - All autos and actives read their numbers ONLY from this record: damage, cooldown, radius, count, speed, duration, charges. No literals in the cast functions.
  - The stat delta is decided when cards are rolled. It is stored on the card and applied exactly when the card is picked.
  - The global +12%/level rule is removed. The v4 "+" effect unlocks at ability-track Lv 4.
  - Floors and caps: cooldown ≥ 30% of base, charges ≤ 3, extra projectiles ≤ +4, radius ≤ 2× base.
- **Module level.** Defined as `max(autoLv, abilityLv)`. It is used for:
  - the meta challenges "X to Lv 8"
  - `maxModLevel`
  - the ability bar level pip
  - `__game.modules`
- **Debug.**
  - `__game.modStats`, and `debug.rollCards(n)`, which returns n rolled cards without applying them, for distribution tests.
  - `debug.hurt(n)` goes through the real `hurtPlayer` path.
- **Second Wind.** Intercepts every death path: `hurtPlayer`, the per-tick `hp<=0` check in `stepGame`, and raft/enemy `explode`.
- **Morwen vs. starting module.** Morwen's Sea Witch takes the deck slot first. The starting-module row only offers modules whose slot still has room after the ship's start modules and Morwen's module.
- **Crew row (5th category in the loadout).** Starting crew gives Lv 1 of Carpenters, Quartermaster or Lookout (the harbor `h:carp`/`h:quart`/`h:look`), or none. All three are unlocked from the start.
- **Saved loadout.** Gains `startModule`, `relic` and `crew`, each falling back to the default when locked or invalid. `?quick` uses them. `debug.start(ship, captain, opts?)` stays backward compatible.
- **HUD.** When removing the bottom-left panel, move or delete every `updateHud` reference to `spdTxt`, `spdFill`, `fsTxt` and `fsFill`.

## v7: More captains, crew, relics, modules + visible equipment on the ship

### Captains 11–20
Each one has a portrait, a passive, a drawback and a spell, and goes through a meta unlock (cost and/or challenge).

| # | Captain | Passive | Drawback | Spell (Space) | CD | Unlock |
|---|---|---|---|---|---|---|
| 11 | Admiral Thorne | +1 max HP per 3 kills this run (cap +100) | Regen −50% | **Rally the Guns**: every module's ability cooldown −3 s instantly, autos −50% cooldown for 4 s | 30 | 400 or kill 1000 ships |
| 12 | Queen Isabeau | Summons: +1 longboat each time, +50% summon dps | −10% max speed | **Royal Escort**: 3 friendly escort sloops orbit and fire at enemies for 10 s | 35 | 450 or reach act 4 |
| 13 | Old Driftwood | Eating crates/huts cuts Full Sail cooldown by 1 s | −10% auto damage | **Flotsam Shield**: a debris ring absorbs the next 40 damage (max 8 s) | 20 | 250 or eat 500 crates |
| 14 | Baron Goldtooth | Doubloons earned ×1.5 | Harbor prices +30% | **Bribe**: non-boss enemies within 18 u stop attacking and moving for 4 s (gold coins pop) | 25 | 400 or earn 3000 doubloons total |
| 15 | Clockwork Cass | XP +30%, ship +15% speed and turn | Enemies +10% speed | **Time Stop**: enemies and enemy projectiles freeze for 3 s | 35 | 500 or win a run |
| 16 | Bosun Brick | Harbor crew items count double | −10% max HP | **All Hands**: auto cooldowns −50% for 6 s | 30 | 300 or buy 30 harbor items |
| 17 | Cartographer Ines | +30% damage while within 12 u of an island, +50% pickup radius | −15% max HP | **Treasure Sense**: 6 treasure crates (5 gold each) appear around the ship | 30 | 300 or eat 100 dock huts |
| 18 | Saltbeard's Ghost | 25% of enemy projectiles pass through harmlessly | Healing −50% | **Phantom Ship**: 3 s ethereal; immune, sail through enemies dealing 20 dmg to each | 22 | 450 or die 25 times |
| 19 | Harpoon Hal | Bow modules +30% range; bow hits slow 30% for 1 s | Side modules −15% damage | **Harpoon**: the biggest enemy within 25 u (boss preferred) takes 100 dmg, is pulled 8 u toward you and is stunned 1.5 s | 16 | 350 or defeat 3 bosses |
| 20 | Mama Coral | Heal 1 HP every 5 s per owned module | Enemies +10% damage | **Hex**: enemies within 16 u take +50% damage for 6 s (purple mark) | 24 | 400 or burn 1000 enemies |

### Crew (6 new; 9 total, with Carpenters, Quartermaster and Lookout)

| Crew | Effect | Cost |
|---|---|---|
| Gunner | +10% auto damage | 150 |
| Surgeon | heal 20% max HP at each act start, healing +20% | 200 |
| Navigator | +8% max speed, +10% turn | 150 |
| Powder Monkey | auto cooldowns −8% | 200 |
| Cook | +25 max HP | 150 |
| First Mate | ability cooldowns −10% (modules and spell) | 250 |

### Relics (8 new; 20 total)

| Relic | Effect | Cost |
|---|---|---|
| Cursed Doubloon | doubloons +50%, −10% max HP | 300 |
| Siren's Shell | enemies within 10 u are slowed 15% | 250 |
| Pearl of Plenty | XP orbs +25% XP | 250 |
| Rum Flask | casting your spell heals 10 HP | 200 |
| Iron Anchor | +40 max HP, −10% max speed | 200 |
| Ghost Lantern | sinking enemies explode for 15 dmg, r3 | 300 |
| Admiral's Medal | start at level 2 with one extra card pick at run start | 350 |
| Weathervane | wind always counts as a tailwind (+20% speed) | 250 |

### New modules (6; 16 total)
Each new module has: auto + ability stats in the per-run stat record (`modstats`), upgradeable through cards; an `AUTO_COND`; an icon; a meta unlock; and a 3D attachment.

| Module | Slot | Auto | Ability (CD) | Unlock |
|---|---|---|---|---|
| Harpoon Gun | bow | harpoon 18 dmg every 1.8 s, range 20, slows 30% for 1 s | **Reel In**: harpoons up to 3 enemies, pulls them to the ship, stuns 1 s (16 s) | 300 or rams 200 |
| Carronade | side | short heavy shot 20 dmg, range 9, every 2 s, knockback | **Grapeshot**: cone of 12 pellets × 10 dmg both sides (14 s) | 300 or kills 1500 |
| Rocket Rack | deck | homing rocket 10 dmg every 2 s, range 20 | **Salvo**: 12 homing rockets (22 s) | 400 or reach act 4 |
| Net Thrower | stern | net behind the ship every 3 s slows enemies 40% for 2 s | **Drag Net**: everything within 12 u slowed 60% for 3 s; edibles/orbs pulled in (20 s) | 250 or eat 300 boats |
| Crow's Nest | deck | sniper shot 30 dmg every 3 s at the highest-HP enemy within 28 u | **Headshot**: 300 dmg to the strongest enemy (bosses 150) (25 s) | 350 or defeat Fire Galleon |
| Bilge Pump | stern | +1 HP/s while below 50% HP | **Emergency Pump**: heal 25%, remove burn/slow (30 s) | 250 or take 5000 damage |

### Equipment visible on the ship (loadout preview and in run)
- **Modules:** every equipped module has a 3D attachment at its slot:
  - **Bow:** chaser cannon, ram beak, harpoon gun, ward amulet glow.
  - **Side:** cannons per broadside ball count, siphon nozzles, carronades, longboats hanging for boarding.
  - **Deck:** mortar, witch lightning-rod crystal, rocket rack, crow's nest platform.
  - **Stern:** keg stack, fog lantern, net drum, bilge pump.
- Attachments appear or disappear when modules are added mid-run, and scale with the ship's geometry.
- **Crew** shows as small low-poly figures on deck in their crew colour with a prop (hammer, ledger, spyglass, …).
- **Captain** stands at the helm on the stern castle, in their portrait colours and hat.
- **Relic** appears as a small glowing trinket on the stern lantern or mast, or as an emblem tint on the flag.
- Everything updates live in the loadout preview when a selection changes.

## v8: Seas (biomes) + world map, new enemies & bosses, in-run quests

### Seas (biomes)
There are 4 seas. Each has a palette, hazards, an enemy pool and 4 act bosses. A sea unlocks when you defeat the act-4 boss of the previous sea. Doubloon multiplier rises per sea: ×1, ×1.25, ×1.5, ×1.75.

| # | Sea (EN / DE) | Look | Hazard | Extra enemies | Bosses (acts 1–4) |
|---|---|---|---|---|---|
| 1 | Calm Seas / Ruhige See | current tropical sea | none | gunboat, raft, brig, ketch | Revenue Cutter, Man-o'-War, Fire Galleon, Admiral's Flagship (existing) |
| 2 | Coral Reefs / Korallenriffe | bright turquoise, coral-pink shallows, many small islands | **Reef shallows**: visible coral patches. Sailing over them does 6 dmg/s and slows 30% | swarm cutters, sea serpent, minelayer | Reef Corsair, Coral Leviathan (sea monster), Man-o'-War (remix), Pirate King's Galleon |
| 3 | Fog Coast / Nebelküste | grey-green, dense fog | **Fog**: you only see about 26 u. Off-screen enemies get edge arrows. Occasional lighthouse beams | ghost ship, coastal battery, swarm cutters | Ghost Galleon, Lighthouse Fortress (stationary island fortress with turrets), Revenue Cutter (remix), Drowned Admiral |
| 4 | Volcanic Isles / Vulkaninseln | dark water, orange glow, black rock islands | **Eruptions**: every ~8 s, 3–5 telegraphed fire-rain circles near the player (r4, 25 dmg, ignite after 1.2 s) | fire ship, coastal battery, minelayer | Fire Galleon (remix), Magma Dreadnought, Ash Leviathan (sea monster), Admiral's Flagship (remix, stronger) |

- Sea-specific scaling sits on top of the act scaling: enemy HP ×[1, 1.2, 1.45, 1.75] and damage ×[1, 1.1, 1.25, 1.4], per sea.
- Remix bosses reuse their AI with more HP and an extra pattern.
- Doubloon formula: `× sea multiplier`. The end screen shows the sea name.

### World map ("Seekarte")
**Flow:** Title → **Set Sail** → **World map** → **Loadout** → run. The loadout's Back returns to the map.

**Map screen.** A parchment chart with 4 sea regions connected by a dotted route. Each region has:
- a painted SVG emblem
- its name
- a lock state ("Defeat <boss> in <previous sea>")
- best act reached
- a check mark when cleared
- its doubloon multiplier, hazard and enemy preview

Keyboard and mouse both work.

**Meta save.** `seasUnlocked`, `bestAct` per sea, `seaWins` per sea. `?unlockall` opens all seas.

**Run state.** `G.sea` (0–3). `__game.sea` and `debug.start(ship, captain, {sea})`.

### New enemies (6) and new boss patterns
Each enemy has its own procedural model (a fleet look or a custom mesh) and EN/DE names.

| Enemy | Behaviour | HP / speed |
|---|---|---|
| Swarm Cutter | arrives in packs of 5–7, fast and weak, shoots tiny shots | 8 / 11 |
| Sea Serpent | submerges (untargetable, ripple trail), surfaces next to you, bites for 14 and dives again | 60 / 8 |
| Minelayer | keeps its distance and drops floating mines (20 dmg, r3) | 45 / 5 |
| Ghost Ship | phases: 2 s solid, 2 s ghostly. It can only be hit while solid. Fires 3-ball volleys | 50 / 6 |
| Coastal Battery | stationary, spawns on island shores, lobs mortars with telegraph rings, range 30 | 90 / 0 |
| Fire Ship | larger burning raft. Rams and explodes for 30 at r4, ignites, leaves a fire pool | 30 / 9 |

**New bosses** (patterns can combine):
- **Reef Corsair:** fast brig boss, chain-shot broadsides that slow.
- **Coral Leviathan** (sea monster):
  - submerges and resurfaces under the player with a telegraph
  - tail-slam rings
  - summons serpents
- **Pirate King's Galleon:** broadsides plus swarm cutter waves plus a Jolly Roger rage phase below 30%.
- **Ghost Galleon:** teleports through fog, phases like a ghost ship, fires a spectral ring.
- **Lighthouse Fortress** (stationary):
  - 4 turrets that can be destroyed one by one
  - a rotating beam sweep that hurts
  - the core becomes vulnerable after the turrets fall
- **Drowned Admiral:** summons ghost ships and fires homing spectral skulls.
- **Magma Dreadnought:** lava mortar barrages and a fire trail. Below 50% it stays in a permanent fire aura.
- **Ash Leviathan:**
  - erupts from below with a telegraph
  - spits fireballs
  - an ash cloud reduces vision

The player's ship also gains **slow** and **burn** statuses (needed for reef shallows, chain shot and eruptions). Emergency Pump's cleanse now matters.

### In-run quests
- **Active quests.** Up to 2 at a time, shown in a compact **Quests** panel at the top right under gold/kills/wind, with progress bars. When one completes, a new one rolls after 5 s. Each new act clears the panel and rolls 2 fresh quests.
- **Quest pool:**
  - sink N of an enemy type present in this sea
  - eat N fishing boats
  - collect N gold within 60 s
  - take no damage for 30 s
  - kill the boss within 60 s of its spawn
  - reach a **marked treasure spot** (a world marker plus an edge arrow) and sail through it
  - destroy a coastal battery (where available)
  - land N captain-spell hits
- **Rewards**, rolled per quest and shown up front:
  - gold (20–40)
  - XP burst
  - a free reroll
  - +doubloons at run end (10–25)
  - an instant module ability recharge
- **Juice.** A toast and a sound on completion, and a coin burst.
- **Meta stat** `questsDone`. Challenges can reference it, e.g. unlock Cartographer Ines via 50 quests as an alternative.
- **Debug:** `__game.quests`, `debug.completeQuest(i)`.

### i18n
Every new string must have EN and DE entries, and `debug.missingTranslations()` must stay `[]`. Each pass puts its strings in its own dictionary files (e.g. `src/i18n/*-seas.ts`, `*-enemies.ts`, `*-quests.ts`) merged into the main dictionaries, to avoid edit conflicts.

## v9: Active crew (Wanderburg-style "Besatzung")

Crew are units on deck. Each figure **does something** visible, crews are **recruited and levelled up during a run** through cards, and the figures on deck match the real count. This replaces the old passive crew bonuses.

### Model
- **State.** `G.crew[type] = {count, level}`. Level goes from 1 to 5. **Lv 5 unlocks the advanced form** (a one-time upgrade with a new name and effect).
- **Total figures cap per ship:** Sloop 6, Galleon 10, Frigate 14. Recruit cards are not offered when the ship is full, but level cards still are.
- **Starting crew** (from the loadout) gives 2 figures of that type at Lv 1. With no starting crew, the ship starts with 2 musketeers.
- **Bosun Brick:** recruit cards give double figures (his drawback text stays the same).
- **Cards.** A new card kind, **CREW**, appears in the level-up, loot and shop pools:
  - **Recruit:** "+2 Musketeers"
  - **Train:** "Musketeers Lv 2 → 3", with structured stat lines and the Lv 5 unlock text
  - Crew cards use the existing rarity system; rarer recruits give more figures, rarer training gives bigger steps.
- **The old harbor-derived ship cards** Carpenters, Quartermaster and Lookout become recruit/train cards of their crew. Copper Sheathing stays a ship card.

### Crew types

All numbers are per figure and scale with level.

| Crew | Per figure | Lv 5 → advanced form | Unlock |
|---|---|---|---|
| Musketeers *(new)* | Fire a musket shot at the nearest enemy within 14 u every 2.2 s, 4 dmg (+1 per Lv) | **Sharpshooters**: range 22, pierce 1, ×2 dmg | start |
| Boarders *(new)* | An enemy that rams or touches you takes 12 dmg per boarder (they leap across) | **Raiders**: also leap onto enemies within 6 u every 4 s | 250 |
| Carpenters | Repair 0.3 HP/s while not hit for 3 s | **Shipwrights**: also −8% damage taken | start |
| Gunners | Auto cooldowns −3% each, capped at −30% | **Master Gunners**: every 8th auto shot deals ×2 | 150 |
| Lookout | +4% weapon range each | **Eagle Eye**: +6 u vision in fog/ash, marks the nearest elite (it takes +15% dmg) | start |
| Surgeon | Heal 5% max HP every 12 s | **Field Surgeons**: heals also cleanse burn/slow | 200 |
| Cook | +8 max HP each | **Feast**: every 20 s, grog gives +10% dmg for 6 s | 150 |
| Quartermaster | +6% gold each | **Treasurer**: gold and orbs are pulled in from 2× range | start |
| Navigator | +3% speed and turn each | **Pathfinder**: nitro recharges +30% faster | 150 |
| Powder Monkey | Ability cooldowns −3% each | **Demolitionists**: explosions have +25% radius | 200 |
| First Mate | Captain spell cooldown −4% each | **Quartermaster-General**: spell cooldown additionally −15% | 250 |

- **Caps** keep it sane: −30% max on any cooldown from crew, +50% max on range.

### Visuals
- **Figures.** The deck figures (`src/dressing/figures.ts`) are placed per crew type up to the real count.
- **Actions** are visible:
  - Musketeers raise their muskets and fire, with a muzzle flash and smoke.
  - Carpenters hammer, throwing sparks while repairing.
  - The surgeon's heal shows a green pulse.
  - Boarders leap across with an arc trail.
  - The cook hands out grog with a mug pop.
  - The lookout climbs the mast.
- **Crew card thumbnails** (`src/thumbs.ts`) render a small group of 3 figures of that type.
- **HUD.** The inventory strip shows crew with their count and level. The tooltip shows the effect and the Lv 5 form.

### Meta
- New crew entries in the catalog: musket is in the start set, boarder costs 250.
- The Unlocks screen and the loadout crew row pick them up automatically.

### i18n
EN+DE for everything, and `missingTranslations()` must return [].

## v10: Music, difficulty, endless, evolutions & synergies, more modules, cosmetics, tutorial & controller, polish

### Music and ambience
- **Engine.** Procedural WebAudio only, no assets. New `src/music.ts` with a small sequencer (pattern scheduler with look-ahead).
- **Tracks:**
  - Title/menu: a calm sea-shanty theme.
  - One in-run theme per sea, matching its mood:
    - Calm: jaunty shanty
    - Reefs: bright steel-drum-ish
    - Fog: eerie low drones and bells
    - Volcanic: drums and low brass
  - A boss theme that crossfades in.
  - Short stingers for victory, death and level-up.
- **Ambience bed** per sea: waves, gulls, wind, fog-horn and rumble.
- **Settings:** separate Music and SFX volume sliders plus master. Music ducks during pick screens.

### Difficulty ("Heat") per sea
- 5 levels per sea. Level 0 unlocks with the sea; level N+1 unlocks after winning that sea on level N.
- Shown as skulls on the map panel. Each level adds a *mechanic*, not just numbers:

| Heat | Adds | Doubloons |
|---|---|---|
| 1 | Elite enemies (gold trim, +80% HP, one trait: fast / armoured / splitting) appear | ×1.25 |
| 2 | Bosses gain a new pattern | ×1.5 |
| 3 | The hazard is stronger and enemies drop burning wreckage | ×1.75 |
| 4 | No healing after bosses, and loot is reduced to 2 cards | ×2.0 |
| 5 | Ironman: no rerolls and no buy row | ×2.5 |

- Best heat is saved per sea in meta and shown on the map.

### Endless mode
- **Choice after act 4.** After the act-4 boss, choose **Retire** (win now) or **Sail On**.
- **Sail On** gives endless "waves". Every 90 s an escalation step adds enemy HP/damage/density, and every 3 steps a random boss from any sea appears.
- **Scoring.** Doubloons accrue per step (shown live). Death ends the run with the endless bonus.
- **Records.** Best endless step per sea goes in the Logbook.

### Evolutions and synergies
- **Evolutions.** When a module has BOTH tracks at Lv 8, the next level-up offers an **Evolution** card (unique gold+teal frame) that transforms it:
  - Broadside → Thunder Battery: double volleys, chain lightning on hit
  - Chaser → Long Tom: piercing rail shot
  - Mortar → Grand Mortar: cluster shells
  - Kegs → Napalm Kegs: burning pools
  - Witch → Storm Witch: permanent storm cloud
  - Siphon → Dragon's Breath: wider cone, ignites, roars
  - Ram → Kraken Prow: tentacles grab
  - Boarding → Marine Assault: longboats carry musketeers
  - Harpoon → Whaler: multi-harpoon
  - Rockets → Congreve Barrage
  - Crow's Nest → Eagle's Eyrie: marks targets
  - The others get similar treatment.
  - Each evolution has its own visual accent on the ship attachment.
- **Synergies.** Owning certain pairs grants a passive bonus, shown as a small badge in the inventory strip with a tooltip, plus a toast when you first get it:
  - Siphon + Kegs = Napalm (burn +50%)
  - Witch + Harpoon = Lightning Rod
  - Mortar + Net = Fish in a Barrel (+30% damage to slowed enemies)
  - Broadside + Gunners crew = Gun Deck
  - Boarding + Boarders crew = Boarding Action
  - Rockets + Lookout = Spotter
  - Ward + Pump = Fortified
  - Ram + Iron Bess = Juggernaut
  - At least 8 synergies.

### More modules (9 new; 25 total)
All have full integration: stats, tracks, specials, AUTO_COND, icon, 3D attachment, thumbnail, unlock and i18n.

| Module | Slot | Auto | Ability |
|---|---|---|---|
| Swivel Gun | bow | rapid small shots | **Hail of Lead** |
| Chain-Shot Cannon | side | chain balls slow and cut sails | **Dismast**: big slow |
| Fire Arrows | deck | archers ignite | **Volley of Flame** |
| Bomb Ketch Mortar | stern | lobbed bombs behind | **Carpet** |
| Tesla Coil | deck | arc to the nearest enemy | **Overload**: ring |
| Gatling Swivel | side | spin-up stream | **Bullet Storm** |
| Shark Cage | stern | releases sharks that bite | **Feeding Frenzy** |
| Spyglass Battery | bow | long-range precision | **Volley Fire** |
| Treasure Magnet | deck | pulls gold/orbs, +gold | **Golden Tide**: converts nearby crates to gold |

### Cosmetics ("Decorations")
A **Decorations** tab in the loadout. Bought with doubloons, cosmetic only, visible on the ship in preview and in run:
- sail colours/patterns
- flag emblems
- hull paint schemes
- figureheads (mermaid, dragon, skull, eagle)
- wake/trail colours

### Tutorial and controller
- **First-run tutorial.** A short guided overlay in Calm Seas act 1, skippable and re-playable from Settings. Steps:
  1. steer
  2. boost
  3. arcs and auto-fire
  4. eat boats
  5. captain spell with aim
  6. level-up cards and the buy row
  7. boss
- **Gamepad support (standard mapping):**

| Input | Action |
|---|---|
| Left stick | steer and throttle |
| RT / A | boost |
| Right stick | aim the spell |
| RB / X | cast |
| D-pad / A | menus and cards |
| B | back |
| Start | pause |

  Button prompts swap automatically when a gamepad is in use. Settings shows a controller section.

### Polish backlog
- The ghost ship should read clearly green and spectral.
- Enemies avoid reef patches.
- Fog Coast gets decorative lighthouse beams.
- The Coral Reefs card on the sea chart is missing its pale background.
- The buy row should use 3D thumbnails.
- Walking crew should avoid guns and deck clutter.
- Inventory badge legibility should be re-checked.
