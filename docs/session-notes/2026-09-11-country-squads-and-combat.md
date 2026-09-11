# Country squads and combat

## Country squads, shared tactics and river banks — 2026-09-11

Country infantry now consist of six independently persisted soldiers grouped for selection. Live placement previews and authoritative destinations share the city battle placement solver; cover reactions, cover quality, infantry stepping and preview colors/poses also use shared helpers. Dragging updates local ghosts without delayed server-preview swaps. Members retain individual paths, health and reload state; dead members no longer move.

The optional Deploy encounter review adds bridge/outpost objectives, authoritative fixed-step combat, saved casualties/projectiles/reloads and restart catch-up. Capture timing, force composition and a ten-minute encounter bound remain provisional review tuning, not campaign victory rules. River banks gain earth/sand, rocks, reeds and sparse lily pads with distance culling.

Routing follow-up: removed the forced city-road portal for crossing settlement boundaries. Clear terrain routes go directly; obstructed crossings use the shared sector lattice and clearance checks. Existing queued routes are retained; issue a new order to replace an old detour.

Validation: live browser drag review showed changing individual ghosts with zero server preview requests and no browser errors. Isolated encounter review reached the outpost phase and retained encounter state on reload. SQLite reopen/rollback and deterministic encounter tests passed. Final regression results recorded below after completion.

Follow-up: road proximity no longer changes navigation cost; all traversable ground has equal cost. Every visible living soldier supplies a selection hit target mapped to its parent squad, with duplicate marquee hits collapsed to one squad selection.

Open-ground infantry placement now uses stable, staggered personal offsets with depth. Cover orders retain the shared cover-slot solver. The water surface overlaps the existing sloped bank footprint rather than ending at the narrower deep-channel boundary. These are presentation/placement refinements, with no new campaign rules.

Camera follow-up: removed the 300-unit/second WASD ceiling in the country slice. Speed remains 0.6 times camera distance, with the existing seven-unit/second close-view minimum; maximum-distance panning now reaches 4200 units/second.

## Dense forests and continuous woodland LOD

Accepted: broad, dense low-poly forests at the existing tree scale, with roads and rivers cutting through them. Generation now uses broad irregular woodland fields and spaced, jittered trunks rather than isolated eight-tree clusters. Infrastructure footprints remain clear; forests continue on both sides. Nearby trees use instancing and spatial culling. Beyond the detailed area, occupied patches use low-poly canopy geometry, selected per tile rather than a global zoom switch, so woods remain visible at shallow angles. Forest ground shading follows the same density field. Density and LOD distances remain provisional visual tuning. No new trunk collision rules were introduced.

Final validation: 303 tests passed; typecheck, production build and git diff whitespace checks passed. Isolated browser checks reported no page errors for squad view, bridge join, WASD camera movement and near/far forest views. Distant forest continuity was visually verified in a wide daytime view. Production build retains the existing large-chunk advisory.
