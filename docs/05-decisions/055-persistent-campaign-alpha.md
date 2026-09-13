# 055 — First persistent campaign alpha

Date: 2026-09-12. Status: implementation of the accepted continuous-battlefield direction; dimensions, roster, capture and economy values are provisional.

## Decision

Production `/` uses the shared country Three.js scene with a campaign-specific authoritative save. The geography is an expanded assembly of the proven city and countryside planners, preserving physical building/unit scale. One saved world contains every individual unit and all fighting. Camera changes only affect presentation/streamed scenery.

Game-core `advanceCountryCombat` owns shared fixed-step combat. A campaign has a `battlefield` clock, pending projectiles and authorized events, without the test encounter's stages, capture sequence, deadline or terminal victory/defeat. The country slice remains an independent test adapter. No production API launches it or imports results.

The API advances saved campaigns every 250 ms even without clients. Each update processes at most eight combat steps and retains all remaining time in saved state. New commands wait while a large restart backlog catches up. This prevents an unbounded request stall; it is not a complete multi-day/offline or many-world performance solution.

Versioned alpha worlds and generated geography live in new SQLite tables. Existing campaigns, sessions and test saves remain intact. Immutable geography is persisted rather than regenerated differently on server restart. Session tokens are stored hashed. Orders and advances commit atomically. Hidden enemy routes, pending shots and unit positions are filtered; hearing uses the existing coarse, anonymous cue contract.

## First playable scope

- One 6,000 × 3,600 world; one full city and ten other places, forest/farm landscapes, connected roads and bridges.
- Two factions, six player groups and eight opposing groups, 64 individual units. Infantry, AT, tanks and a scout airship use shared movement, group pacing, reaction, vision, damage and presentation.
- Persistent control of the land around each place; 30 seconds of uncontested infantry occupation transfers that territory. Land share is ordinary area, with no weighted key-zone victory score. There is no final campaign win condition yet.
- A small supply stock funds physical sandbags. Geometry and build validation are shared with city construction; sandbags block infantry and provide low cover, while tanks cross/crush them.

## Explicit limits

This does not ship multiplayer seats, recruitment, reserve production, the old economy/supply chain, a strategic opponent director, artillery firing, other emplacement mechanics, a full continent or production-scale unit counts. The UI and integration inventory identify these gaps. Do not describe them as connected merely because their models or older code exist.
