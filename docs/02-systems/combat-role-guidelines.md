# Combat role and counter guidelines

Status: accepted design guideline. Exact values remain provisional until playtested. This document defines intended roles; it does not claim every role is implemented.

## Core rule

Every combat unit needs a clear battlefield job, a target it handles well, a situation that limits it, and another unit that can answer it. A different model, projectile or animation does not establish a gameplay role. A role is implemented only when authoritative combat applies its weapon profile and automated tests demonstrate the intended matchup.

Avoid universal upgrades. A specialist should gain a decisive advantage in its intended situation by giving something up in damage, range, mobility, survivability, firing cadence, setup time or supply demand. Combined arms should outperform repeatedly fielding the strongest general-purpose unit.

## Intended first-line roles

| Role | Strong against | Weaknesses and counterplay | Primary effect |
| --- | --- | --- | --- |
| Rifle infantry | Exposed infantry, capturing and holding ground | Armor, entrenched machine guns, artillery in the open | Flexible direct fire with modest suppression |
| LMG team | Exposed or advancing infantry, narrow approaches | Armor, flanking, displacement while set up, indirect fire | High sustained suppression; moderate casualties |
| Anti-tank team | Tanks and light vehicles from prepared positions | Infantry pressure, suppression, limited ammunition, poor close defense | High armor penetration with a slow firing cycle |
| Light vehicle / motorized infantry | Rapid reinforcement, pursuit, exposed infantry | Dedicated AT, tanks, obstacles and restricted terrain | Mobility and light direct fire |
| Tank | Exposed infantry, light vehicles, fortified firing positions | Dedicated AT, other armor, constrained streets and unsupported close terrain | Durable direct fire and shock, not immunity |
| Artillery | Static concentrations, fortifications and suppressed targets | Close assault, counter-battery pressure, poor line-of-sight defense | Long-range area suppression and delayed damage |
| Engineer | Obstacles, fortifications and prepared assaults | General firefights without support | Breaching, construction and situational close-range utility |

## Damage and suppression are separate

Damage removes combat strength. Suppression temporarily reduces a unit's ability to move and return accurate fire. A weapon can be excellent at one without being excellent at the other.

- LMG fire should build suppression quickly and sustain it while firing, but should not erase infantry faster than every other weapon.
- Rifle fire should cause dependable soft-target damage and some suppression, while remaining nearly ineffective against tank armor.
- Anti-tank weapons should threaten armor through penetration and impact damage. Misses, reload time, ammunition and vulnerability between shots provide counterplay.
- Artillery should create strong area suppression and displacement pressure. Its warning, travel time and poor close defense should prevent it from becoming instant universal damage.
- Suppression should recover after fire stops. Cover should reduce incoming damage and suppression, without making a target permanently untouchable.

## Weapon-profile contract

Authoritative weapon profiles should define, at minimum:

- effectiveness against soft, light-vehicle and heavy-armor targets;
- suppression per shot or burst;
- effective and maximum range;
- accuracy falloff and movement penalty;
- burst size, cadence, reload and ammunition limits where relevant;
- setup, facing or minimum-range constraints where relevant;
- projectile/impact behavior and interaction with cover;
- supply cost or replenishment burden when strategically meaningful.

Rendering may read this state to choose bursts, recoil, tracers, rockets and reload animation. Rendering must not independently decide hits, damage, suppression or ammunition.

## Balance expectations

- Matchups should be advantageous, not automatic. Terrain, cover, readiness, numbers and support must still matter.
- Hard counters should stop an unsupported unit from operating freely, not guarantee a kill on contact.
- Range is not free power: long-range weapons need setup, spotting, travel time, low close-defense ability or greater supply cost.
- Suppression needs diminishing returns or a cap so multiple LMGs cannot indefinitely remove all agency.
- Tanks require infantry support in dense cities, forests and other constrained terrain. Infantry requires AT or armor support when tanks have open approaches.
- Faction differences may alter how a role is delivered, but should preserve readable counter relationships unless a deliberate faction exception is documented.

## Required verification

Before marking a role implemented, add deterministic tests for its intended matchup and failure case. The minimum matrix should cover rifle versus infantry and armor, LMG suppression versus rifle suppression, AT versus armor and infantry, tank versus soft and armored targets, artillery suppression/range, cover mitigation, movement penalties and suppression recovery.

Balance approval requires simulated mixed-force engagements and playtesting at campaign pace. Passing deterministic tests proves that rules are wired correctly; it does not prove that the values are fun or balanced.

## Current implementation boundary

The shared tactical resolver now has explicit rifle, LMG, early rocket-launcher and tank profiles covering effective/maximum range, distance falloff, soft/armor effectiveness, suppression, magazine, reload and moving accuracy. City and country authoritative combat consume the same profiles. Riflemen use aimed semi-auto fire at 1.5–2.25-second intervals, with longer breathing pauses after short strings and a four-second reload after ten rounds. Their damage does not compensate for this downtime. The faster cadence remains with the LMG support role and future assault weapons. The current live tactical rosters exercise rifle, rocket and tank roles; assigning an LMG team to a persisted playable roster remains future scenario work. Campaign-scale motorized, artillery and garrison combat retains its broader legacy profiles until campaign and tactical unit state are unified.
