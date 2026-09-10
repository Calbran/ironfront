# 009 — Dynamic server squad combat

Date: 2026-09-09

## Accepted

The owner authorized the proposed model: persistent squads with positions and combat state, combat recalculated on the server throughout an engagement, representative soldier/tracer animation on the client, and no predetermined battle winner. Players continue issuing standing army orders. Reinforcements, artillery, air support, supply, terrain, and retreat can change ongoing fights.

## Implemented first playable slice

- Armies receive persistent infantry/motorized/armor/artillery squads from their existing compositions. Individual squad strength, position, range, morale, suppression, target and action affect combat.
- Reaching an offensive objective begins a persistent engagement. Exchanges are simultaneous and use bounded simulation steps; the winning side is not chosen at battle creation.
- The server updates tactical state approximately once per second, in transactions, between economy/campaign-hour ticks. Game-time speed follows campaign pace. Normal battles can last real hours while their map presentation stays active.
- Existing sector coverage allocates squads among defended regions; each squad is assigned to at most one engagement. New arriving formations join at the next tactical update.
- Artillery has longer range and greater suppression. Existing air-support orders consume fuel and add damage/suppression during an active fight. Terrain, fortifications, entrenchment, faction effects, fuel, and supplies influence exchanges.
- Army retreat policies and low morale can end participation. Territory capture and consolidation use the existing rules after defenders are defeated or withdraw.
- Squad losses reconcile to aggregate army strength, and existing manpower-based replenishment restores squad strength. Save upgrades initialize missing tactical state without resetting campaigns. Restart resets the wall-clock anchor, preserving the engagement without replaying downtime.
- PixiJS interpolates confirmed positions and draws representative soldiers/vehicles, firing bursts and artillery tracers. Cosmetic projectiles do not cause damage. Stale snapshots and reduced-motion preferences suppress animated firing. Active-engagement buttons focus the map; the army panel shows squad firing state and morale.

## Limits and provisional tuning

This is army-commanded squad combat, not individually commanded soldiers. Long-distance travel remains the existing region-route/arrival abstraction; squad movement and weapon range within an engagement are positional. Regional garrisons remain aggregate defensive units. There are no terrain-grid flanking commands, individual projectile physics, separate bomber missions, artillery bombardment orders, or city-level capture rules in this slice. Territorial capitals and coherent country generation remain separate work recorded in decision 008.

Weapon ranges, damage rates, morale/suppression coefficients, support costs, and pacing are provisional. Determinism and invariants do not validate multiplayer balance.

## Verification

Simulation tests exercise ongoing exchanges, range/cover effects, reinforcements, mid-battle air support, suppression, immediate withdrawal, persistence, duplicate tick suppression, and restart pause. Existing military, geography, authorization and rollback coverage remains. `scripts/tactics-browser.ts` serves an isolated in-memory campaign to check desktop/mobile animation, tactical telemetry, engagement navigation, polling and withdrawal without creating campaigns in the user's database.

### Movement refinement — 2026-09-09

Owner requested smooth movement, spatial separation and individuality inside squads. Server squad centers now maintain distinct formation destinations and apply deterministic local separation constrained to their territory. Presentation follows confirmed snapshots continuously using observed polling cadence; representative soldiers use stable individual slots, varied follow timing and subtle movement offsets with local icon avoidance. These cosmetic positions and projectiles remain non-authoritative. Long-range region arrivals remain discrete. Separation distance and visual timing are provisional.

### Zoom detail — 2026-09-09

Owner requested compact strategy icons when zoomed out and individual units when zoomed in. Implemented compact clickable army symbols at overview; soldiers and firing effects fade in between 200% and 260% zoom. Tactical sprites and formation spacing scale with the map, calibrated to the previous 300% detail size. Selected army strength remains visible in detail view. Thresholds are presentation tuning.

### Calmer presentation correction — 2026-09-09

Owner found representative movement too fast and shuffle-like. Removed periodic individual offsets and relaxed desired formation positions independently of rendered history. Display centers follow at a slower cadence-aware rate (minimum 2.8-second time constant); soldiers follow separated slots with a 0.9-second time constant. Squad processing order is stable across payload reordering. Server positions, speed, damage and travel duration are unchanged. These visual time constants remain provisional.
