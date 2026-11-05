# Design notes: mobile-fortress roguelite (browser, three.js)

## 1. How Wanderburg works (research summary)

Wanderburg by Randwerk (Berlin), published by Sidekick. Steam Early Access since 8 Sep 2026, $14.99, Mostly Positive (~79%). Press calls the subgenre "castles on wheels". Stated inspirations are Mortal Engines and Howl's Moving Castle. Reviewers compare it to Brotato, Rampage and BattleBots.

Confidence: **A** = Steam page, press, reviews. **B** = fan wiki or guide sites, not verified.

### Core loop (A)
- Top-down/isometric. You **drive** a castle that has momentum and a turning radius, and it sways. There is a nitro boost.
- Weapons sit in **fixed mount slots: front, back, top, side**, and each one only fires in its own arc. You aim by steering and turning the castle. Reviewers call it a "semi-autobattler" in the bullet-heaven style. No source confirms that weapons fire on their own, but it looks that way.
- The castle **eats** what it runs over or vacuums up: fleeing villages, sheep and cows, mobs, smaller fortresses. Eating gives gold and XP. Each level-up offers a choice of upgrade.
- Runs take about 15 min. Each map is procedurally generated with hazards and has **4 bosses on a timer**. After the last boss comes **Overtime**: enemies with huge HP and damage that end the run. Gold left at that point turns into meta currency.

### Fortress and build (A/B)
- About 4 module slots per run (B). The **chassis** sets the slot layout: Wanderturm (starter), Spiderburg (2× top, no side), Tankenburg (B).
- Modules level up during a run. Armor adds durability and costs maneuverability (A).
- **Captains** are run-wide modifiers that often come with a drawback (B). Examples: a melee drunk, a vampire-sustain captain, a racer.
- **Crew** are passive helpers: repair crew, gold printer, archer crew (B).
- **Artifacts** include second-chance relics and draft modifiers (B).
- Module families (B): Archer/Archer Tower, Cannon (front/side), Mortar, Mine Layer → Turret Layer, Ram (dash), Catapult, Barracks/Summon, Ballista, Fire Mage, Movement/Nitro.
- No grid or adjacency rules were found. Rarity tiers and stat values were not found either.

### Economy and meta (A/B)
- **Gold** is spent during the run and resets afterward. **Silver** is permanent and buys modules, captains, crew, vehicles and artifacts.
- New items unlock through usage goals, for example "consume 300 cows" for Catapult, "Ram lvl 10" for Side Arms, or "destroy 100 health boxes" for Repair Crew (B).
- Clearing a biome's boss route opens the next land (B). Known biomes: Grasslands/Meadows, Golden Dunes, Dark Forest (B).
- Bosses (B): Rusty Knight (armor counters cannons, so you switch damage type), Dark Tower, Large Rocket Tower. Boss archetypes are steamroller, vacuum, bumper and fire-eye. Running away from a boss is sometimes a valid choice.

### What players praise and criticize (A)
- **Praise:** the hungry, chaotic offense; the premise; trying out builds; the cute minimalist look; steering to aim, which "rewards physics mastery".
- **Criticism:**
  - A few dominant builds (side cannons, mortar).
  - Higher difficulty only means more enemy damage, and Overtime feels unfair.
  - Maps feel empty after boss 3.
  - Unlocked items clog the upgrade pool and can't be turned off.
  - Upgrade text is vague, and the menus are clunky.
  - Gold vs silver is confusing.
  - Some upgrades have a sci-fi flavor that clashes with the castle theme.

## 2. What we keep and what we fix

**Keep:** driving with real momentum, aiming by facing, slot-mounted weapons, eating to grow, short runs (10–15 min), boss timers, unlocks earned by doing things.

**Fix:**
1. **Real build choices.** Give each mount slot a neighbor (front↔side↔back, top touches all) and add **adjacency synergies** based on tags (fire, pierce, summon, heavy). This adds depth without a full grid.
2. **Fewer stats, more behavior.** Upgrades change *how* a weapon acts (it splits, ricochets, leaves fire) more often than they add +X%.
3. **Pool control.** Players can ban items from the pool before a run. One currency per scope, with names that fit the theme.
4. **A fair endgame.** Replace Overtime with an optional "push on" that has **visible** escalation and better rewards. Don't punish strong builds.
5. **Full maps.** Points of interest are seeded across the whole map, not just early on.
6. **Clear text.** Every upgrade shows exact numbers and tags.

## 3. Theme options (all original)

Each theme gets one **signature mechanic** that changes play, not just a new skin.

| # | Theme | You drive | You eat | Signature twist |
|---|---|---|---|---|
| A | **Snail Bastion**: fungal forest | A giant snail with a walled town on its shell | Mushrooms, beetles, spore-villages | A **slime trail** stays on the ground. Enemies slow on it and fire spreads along it, so the route you drive becomes your weapon. |
| B | **Icebreaker**: frozen sea | A steam icebreaker fortress | Seals, ice-fishing huts, frozen wrecks | You **crack the ice** behind you, which drowns heavy enemies but limits where you can go back. Bosses break the ice too. |
| C | **Scrap Leviathan**: post-apoc salt flats | A junk crawler with a magnet crane | Wrecks, scavenger buggies | Salvage is **physical loot** that sticks to the hull: armor that falls off as you take hits, or ammo for a flinger. |
| D | **Turtle Grove**: druid jungle | A temple-garden on an ancient tortoise | Fruit, river tribes, beasts | Modules are **plants that grow** with distance traveled. They are weak when planted and strong when mature, so you choose between growing and replanting. |
| E | **Hungry Diner**: kitchen-world comedy | A sentient food truck | Ingredients that run away | The **recipe combo**: eating ingredients in certain orders "cooks" buffs. This is the tag-adjacency system in a playful form. |
| F | **Lantern Abyss**: deep sea | An anglerfish submarine-citadel | Plankton, glowfish, wrecks | **Light radius**: you can only see and hit what your lantern lights. Eating makes it brighter, and some enemies hunt the light. |

### Close variants (same game as Wanderburg, new setting)

Everything from Wanderburg stays: driving with momentum, slot-mounted weapons that fire in arcs, eating to grow, level-up choices, 4 timed bosses, unlocks earned by doing things. Only the setting and one flavor rule change.

| # | Theme | Fortress | Eat | Flavor rule |
|---|---|---|---|---|
| V1 | **Galleon**: pirate archipelago | A sailing warship | Fishing villages, merchant ships, sea monsters | Wind direction speeds you up or slows you down. Side cannons give the classic broadside. |
| V2 | **Shiro**: feudal Japan | A pagoda castle on giant legs | Rice villages, ashigaru, rival daimyo forts | Leg-stomp attack in place of a ram. Samurai crew. |
| V3 | **Iron Frontier**: Wild West | An armored stagecoach fort | Cattle, bandit camps, gold towns | Revolver turrets that reload. Lasso to pull things in. |
| V4 | **Longhouse**: Viking tundra | A mead hall on a giant sled | Reindeer, monasteries, frost giants | You slide on ice. Raiding party crew. |
| V5 | **Star Bastion**: space | A citadel ship | Asteroids, freighters, alien hives | You drift without friction. Fully sci-fi, so the upgrades fit the theme. |
| V6 | **Sun Temple**: jungle empire | A pyramid on stone rollers | Villages, jaguars, rival temples | Sun idol charges during daytime. |

**Pick: V1 Galleon.** Fixed-arc weapons on a ship feel natural, a sailing ship gives you momentum and wide turns for free, and a sea map looks good in three.js with little effort.

### More ideas (batch 2)

| # | Theme | You drive | You eat | Signature twist |
|---|---|---|---|---|
| G | **Circus Train**: carnival countryside | A circus locomotive pulling wagons | Crowds, hay, rival troupes | Each module is a **wagon**. Eating adds wagons, so the train gets longer. Long trains hit harder but turn wider, and enemies can cut off the tail. |
| H | **Living Storm**: open plains | A tornado (you *are* the fortress) | Barns, trees, livestock | Swallowed debris **orbits you as ammo and armor**. Heavy debris orbits slowly but hits hard, and taking hits flings it away. |
| I | **Magma Walker**: ash wastes | A volcano on stone legs | Ore, ice golems, lava slugs | **Heat meter**: eating makes you hotter, and heat boosts damage. Overheating erupts in a huge blast that also hurts you, so you time when to vent. |
| J | **Hive Beetle**: flower meadows | A beetle carrying a beehive | Pollen, wasps, honey thieves | Your weapons are **bee swarms** whose size depends on how much nectar you hold. You spend swarm size on attacks or bank it to level up. |
| K | **Rail Baron**: wild frontier | A track-laying fortress train | Towns, bandit carts, gold | You can only move on track you **lay ahead of yourself**, and you have a limited supply. You plan a route like in Snake, and loops make kill zones. |
| L | **Gravity Station**: asteroid belt | A drifting mining station | Asteroids, drones, debris | **Gravity well**: everything nearby is pulled toward you. Eating adds mass, so the pull gets stronger and you get slower. Enemy shots curve around you. |
| M | **Chicken-Leg Hut**: haunted folklore woods | A walking witch's hut | Wisps, wolves, lost lanterns | A **day/night cycle**: by day the hut farms and builds, and at night it changes into a monster form with a different module set. |
| N | **Paper Fort**: inside a kid's drawing | A cardboard castle on toy wheels | Crayons, paper soldiers, ink blots | You **draw new terrain** as you go (ramps, walls, ink pools) with ink you collect. The art style looks like doodles on paper. |

**Chosen: V1 Galleon** (see MVP.md). Earlier recommendation was A (Snail Bastion). The slime trail turns the driving into the build: where you've been matters as much as where you're going. That's the strongest twist here, and it's cheap to build (a decal/ribbon mesh plus a spatial lookup). It also stays clear of Wanderburg's medieval setting. **D** is the runner-up. **E** is the most fun to look at if you want a comedy tone.

### Snail Bastion sketch
- **Chassis (shells):** Garden Snail (balanced), Cone Shell (fast, only 2 sides), Hermit Crab (swaps shells mid-run).
- **Mounts:** Spore Mortar (top), Thorn Volley (side), Horn Ram (front), Ooze Sprayer (back, feeds the trail), Firefly Tower (top, auto-targets anything on the slime), Beetle Barracks (summons).
- **Tags:** Slime, Fire, Spore, Pierce, Swarm. Example synergy: Ooze Sprayer next to Firefly Tower makes the slime burn.
- **Currencies:** *Nectar* is spent during a run. *Pearls* are permanent.
- **Bosses:** Toad King (tongue grabs), Centipede Train, Salt Witch (dries up the trail), Moth Queen (dives at light and fire).

## 4. Tech plan (three.js)

- **Stack:** Vite + TypeScript + three.js. No physics engine: custom arcade vehicle physics (velocity, angular velocity, drift factor).
- **Camera:** angled orthographic, low-poly, flat shading, with a palette per biome.
- **Hordes:** `InstancedMesh` for each enemy type and projectile pool. A uniform-grid **spatial hash** for collisions, eating and the slime-trail lookup.
- **Data-driven content:** modules, upgrades, tags and enemies as typed definitions in TS. The synergy system reads tags only.
- **Saves:** meta progression in `localStorage`.

**MVP (first playable):** one biome, one chassis, 4 mounts, 6 upgrades, 3 enemy types plus edible critters, 1 boss, level-up choices, death screen. Meta progression, more biomes and the ban list come after the core driving feels good.
