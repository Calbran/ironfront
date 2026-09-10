# Terrain-aware miniature town and generator audit

Experimental branch. **Visit refined region** selects the new planned riverside town (Marshford for Meridian, Ironhaven for Atlas). Other towns retain the previous layout generator plus riverfront clearance. The authoritative settlement feature, ownership and saved route data are unchanged.

## Implemented town planner

`packages/game-core/src/miniatureTown.ts` is a pure deterministic planner. It selects dry land on an existing regional route near the settlement marker, grows connected street branches from that center, and stops branches before water, region boundaries or mountain obstacles. Lots are generated along those streets with conservative model envelopes, clear frontage, no road overlap and no overlap with other lots. Buildings face their street. Valid lots receive a civic hall, houses, shops and an outer workshop using the shared modular model kit. A site with fewer than four safe lots is rejected, rather than forcing buildings onto unsuitable ground. The preview tries up to eight bridge-adjacent candidates.

Three.js model rotation now converts the layout's XY angle into the renderer's XZ convention. The art tour focuses the actual town center and updates the settlement selector. Width, setbacks, spacing, branch count and search radius are provisional visual tuning, not gameplay balance.

## Generation order review

The existing authoritative generator already starts with relief/land and a connected mainland. It partitions administrative regions, derives local biome patches, computes drainage/rivers, then places settlement/resource features. `createWorld` assigns starts, ownership and armies, and prepares mountain obstacles. Administrative partitioning before hydrology does not cause the rivers to depend on province borders: drainage uses the underlying terrain raster. No authoritative stage was reordered and no saves were regenerated.

The preview previously generated fixed town grids before regional roads, then moved buildings out of rivers and clipped streets. It also recomputed presentation rivers independently for several consumers. Its new dependency order is:

1. Authoritative world and terrain constraints.
2. Regional routes and bridge locations.
3. One cached set of presentation river paths, preserving bridge approaches.
4. A terrain-aware study town; legacy layouts for remaining settlements.
5. Riverfront correction only for legacy towns.
6. Field parcels using final town footprints and regional routes.
7. Vegetation, followed by the existing field/road clearance predicate.
8. Main-thread meshes and cosmetic ground shaping, which flatten around final building and road footprints.

Each worker stage records elapsed time. The worker orchestrates existing pure generators and transfers the completed data once; polls in a live campaign do not regenerate static scenery. The live adapter skips the new town/field/clearance stages and retains its existing layouts. Presentation river paths are carried with the generated data and reused by terrain, road clipping and legacy building clearance.

## Efficiency findings

The main avoidable cost was legacy building clearance: each candidate placement repeatedly tested unchanged buildings against all river segments. It now filters segments to the town's bounded search area and precomputes its fixed dry buildings. On an initial local Atlas comparison, this stage fell from about 4,146 ms to 69 ms; whole-worker time fell from about 6,072 ms to 1,927 ms before the additional final scenery-clearance pass. These are illustrative local runs, not controlled hardware-wide guarantees.

Town planning took approximately 4 ms in those runs. The remaining larger stages are world geography, regional routing, field generation and final scenery clearance. Regional routing builds all settlement pairs and evaluates candidate routes; this is a scaling consideration, but rewriting it risks changing connectivity and bridge placement. It was retained pending the recorded four/eight-seat measurements rather than optimized speculatively. The existing city-layout pass also scans other settlement sites, but its measured cost was small relative to routing.

## Verification and limits

`tests/miniature-town.test.ts` checks determinism, no mutation of inputs, connected street roots, street-facing frontage, dry/non-overlapping model envelopes, role presence and rejection of unbuildable terrain. `scripts/generation-audit.ts` records stage times and compares full generated output hashes across repeated seeds, excluding timings. Browser checks cover summer/winter, strategy and phone width; existing selection, renderer switching and alternate-seed checks remain applicable.

The planner currently uses land boundaries, rivers and mountain obstacles. It does not evaluate a continuous terrain-slope field, optimize street networks globally, or simulate organic settlement growth. The cosmetic ground shaping is generated after lots and kept flat beneath them. Moving to true continuous elevation will require a shared height/slope sampler before town planning, followed by foundation grading—not moving finished buildings after terrain generation. The current four-spoke street plan and four model roles are a first bounded implementation, not a complete town-generation system. Decorative streets/bridges do not confer authoritative traversal or cover rules.

## Recorded final worker measurements

| Seed / seats | Regions / settlements | First / repeat total | Planned town |
|---|---|---|---|
| Meridian / 4 | 96 / 64 | 1,156 / 1,093 ms | Marshford, 8 buildings |
| Atlas / 4 | 96 / 74 | 2,252 / 2,182 ms | Ironhaven, 6 buildings |
| Meridian / 8 | 192 / 82 | 2,771 / 2,805 ms | Alderhaven, 7 buildings |

All repeated content hashes matched. The eight-seat field pass was 881 ms; routing 522 ms; final scenery clearance 342 ms. Those are the next measured optimization candidates if larger worlds require it. See [raw stage measurements](town-generation-results.json). These totals include generation, not browser asset loading, scene construction or long-running simulation.

Final validation: 108 tests passed, TypeScript and production build passed, and the browser verified selection, strategy, renderer switching, phone width and alternate-seed regeneration. The short final live campaign check passed selection, authoritative/rendered movement, attack, strategy and Pixi/Three round trip without page errors. The planned town's five-second local sample stayed near 60 FPS (p95 18.7 ms; no sampled frames above 33.4 ms). Vite still reports its existing large-bundle advisory.
