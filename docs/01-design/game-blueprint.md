# Game Blueprint

**Accepted:** browser multiplayer, roughly month-long campaigns, generated continent, player-scaled regions, land conquest, simple development, asynchronous orders, faction selection.

**Provisional:** 28 days; 72–192 territories per continent in the current proof; three factions; 3–6 armies per nation in the full game; hourly simulation; 12–24-hour meaningful offensives. All numbers need testing.

## World and ownership

One playable region layer. A nation is the set it controls. Generated geography supplies terrain, neighbors, and routes. Neutral territory makes opening expansion possible. Fair-start generation must eventually compare economic access, distance, and defensive opportunity, not merely starting region counts.

## Victory

The proof scores polygon land area divided by total land area. Each square unit counts equally regardless of industry or capital status. Provisional early win: more than 50% for 48 simulated hours; otherwise greatest land area after 672 hours. Exact ties share the result in the proof. Region-count versus area and early-win timing remain open design decisions. No key-zone points.

## Nation

Industry funds development and equipment; fuel supports armor and aviation; manpower replenishes armies. Planned buildings: factory, recruitment center, refinery, supply depot, airfield, fortifications. Planned short research tracks: infantry, vehicles, aviation, logistics. One active research project, queued work, few clicks.

## War

Armies combine infantry, motorized infantry, artillery, and armor. The implemented first slice has line/assault/mobile presets; Hold, Advance, Redeploy, Reserve, and Recover orders; limited defensive sectors; consolidation; connected supply; and cautious/balanced/aggressive risk policies with legal retreats. See [armies and fronts](../02-systems/fronts-and-armies.md) for shipped behavior and provisional tuning. Fighters and bombers on standing area missions, recruitment, and configurable compositions remain future work. Defenders and retreats function offline.

## Campaign rhythm

Opening: neutral expansion and development. Middle: border wars and competing fronts. End: defend a lead or disrupt it. These are expected patterns, not locked phases.

## Open questions

Alliance victory, diplomacy restrictions, fog of war, elimination/re-entry, notification delivery, inactive-player policy, recruitment depth, tie rules, and exact faction bonuses. Avoid resolving these by accidental implementation. The proof's bot-filled seats and complete map visibility are test conveniences.
