# City outskirts and distance presentation

Accepted: retain units farther out, retain aircraft substantially farther than ground units, preserve building colors across silhouette changes, and make developed outskirts proportionally larger around downtown.

Implemented: ground marker fade at 6–3 projected pixels/unit, air at 0.6–0.3, with meshes retained through the fade. City silhouettes batch coarse source-material masses using the same appearance variants and tints as detailed buildings. They share scene lighting. Settlement reach and lot budgets increase without scaling models; the lower-rise conversion begins at 32% of reach. Occupied inner suburban blocks receive textured developed ground; outer plots retain separate pads. Geometry version 6 migrates obsolete saved paths through existing pause/relocation logic.

Validation: typecheck/build passed. Direct tests passed: settlement clearance and sidewalk access (1), sector generation/movement/API/persistence/migration (8), marker projection (3). Browser verified the larger lower-rise ring and developed surfaces. Full-suite execution initially encountered pending-promise worker cancellation; the limited-concurrency retry completed with 287 passing tests. Generator and distance values remain provisional.

Subsequent requests: repair the misaligned bridge and retain distant satellite towns. Implemented persistent POI silhouette batches from their source building materials/bounds. Straightened road crossing approaches against the authoritative deck axis, raised the carriageway above the deck and removed the competing deck texture. Version 7 migrates saved routes. Four road tests and all eight sector tests passed after these changes; browser confirmed the repaired crossing.

Final full-suite rerun: 288 tests passed, none failed or cancelled. Typecheck and build passed. Browser confirmed satellite silhouettes remain visible at overview distance.
