# Large-city diorama and building-density benchmark

**Current entry:** 160-building dense district city; select 28 for the crafted neighborhood. Earlier Ancoats and sparse-layout descriptions below are historical stages. [Roadmap](../04-roadmap/miniature-city-development.md) is the current development plan.

Open `/city-diorama.html`. The original default was 160 buildings, including a custom capital building, plus 144 static infantry figures and two existing jeep models. City, Capital, Depot and Street presets provide scale comparisons. Building counts can be changed to 128, 256, 512 and 1,024. The large densities expand the land occupied by the city; model and unit scales stay unchanged. Winter is a visual treatment, not a new biome.

The original composition reserves a civic precinct and supply yard, places houses/shops/workshops in street-facing blocks, adds gardens, fences, crates, lamps and a river-edge bridge, and uses a raised clock-tower capital as its landmark. It is authored presentation geometry, separate from the world generator and campaign authority. Further architectural refinement and integration into the town planner require visual review.

## Current real-city layout

The current scene uses `packages/game-core/src/organicCity.ts` with a bundled Ancoats OpenStreetMap reference. Dense frontage placement uses oriented footprint separation and street clearance; civic/depot areas and small parks stay reserved. Canal-side lots favor factories, and outer lots favor homes. The units retain their scale; a subsequent hall-integration pass reduces the capital to 72% of its original dimensions, shrinks the square to 36×32, shares neighborhood brick/slate and brings nearby lots closer. Existing benchmark measurements predate that visual pass. Cobbles use one procedural texture; lamps share merged geometry and emissive materials, without individual lights. Reference data and licensing live in `packages/game-core/data/city-samples/README.md`.

This is a contemporary street seed, with canal geometry diverted around the fixed sample landmarks. It does not yet import building footprints or connect the diorama to actual campaign rivers. The density controls enlarge the same source district, not the geographic coverage of the source. See [decision 031](../05-decisions/031-real-city-street-seeds.md). Earlier results below describe the original layout; the updated measurements are stored separately in `organic-city-results.json`.

## Method

`scripts/city-diorama-browser.ts` captures the default city, capital, depot and street, then measures four-second frame intervals at city/street zoom for 128/256/512/1,024 buildings. A separate 256-building city sample uses CPU4x throttling. It restores the 160-building sample, checks winter and phone-width overflow, and records browser errors. Shadows use a fixed 2,048² map whose coverage expands with city extent; increasing coverage reduces shadow resolution per unit of land. Geometry/material counts are checked across rebuilds in the captured results.

Buildings reuse instanced parts from the miniature kit; street furniture and ground geometry are merged by material. Infantry are static reference poses, not simulated or animated troops. The scene is a single city's rendering test, not an entire campaign, construction or destruction test. Frame times include display pacing. No GPU timer query, total GPU-memory measurement or real low-end/mobile-device test is included. Street zoom still submits many instances outside the view because the standalone study batches variants across the city; the generated world uses spatial chunks instead.

## Interpretation

There was no previously validated per-city building ceiling. Earlier world benchmarks measured generated scenery and synthetic soldier loads. The new measurements establish headroom for this repeated kit, not an unrestricted unique-asset count. Keep the initial city design around 160–256 buildings provisionally; retain 512 and 1,024 as stress cases. Richer models/materials, animated combat, visibility overlays, texture memory and multiple visible cities can change the budget substantially.

Distant settlements should use simpler LODs and camera-based culling. Larger city spacing helps, but continent views can include multiple settlements and must remain supported. Do not hide every city except the nearest one.

See [decision 030](../05-decisions/030-city-capitals-and-large-city-study.md) for accepted direction and unresolved capture semantics.

## Recorded local results

| Buildings, including capital | City p95 frame interval | Street p95 frame interval | City calls / triangles |
|---|---|---|---|
| 128 | 17.4 ms | 17.4 ms | 64 / 153,960 |
| 256 | 17.1 ms | 17.1 ms | 64 / 203,186 |
| 512 | 17.2 ms | 17.3 ms | 64 / 301,504 |
| 1,024 | 17.1 ms | 17.2 ms | 64 / 497,866 |

All normal samples stayed near 60 FPS with no frames above 33.4 ms. The renderer reported 62 geometries and four textures across density rebuilds. Browser error and phone-width overflow checks passed. See [raw results, including CPU4x](large-city-results.json). TypeScript and production build passed; Vite retains its large-chunk advisory. These figures are the static diorama's budget, not a production cap.

### Ancoats-seeded layout rerun

The updated local run recorded p50 frame intervals of about 16.7 ms and p95 of 18.5–18.7 ms across the nine samples, including 256 buildings at CPU4x. No sampled intervals exceeded 33.4 ms, and no browser errors were recorded. City view used 58 calls; the 1,024-building stress case submitted about 3.50 million triangles, substantially more than the original sparse study. This is still a repeated-asset/static-unit benchmark on the local machine. Typecheck, all 111 tests and the production build passed. Winter and phone-width overflow checks passed in the browser script.

### Street cleanup after hall integration

The default 160-building layout now retains approximately 1,564 of 4,174 scene units of source street length (62.5% removed). Shortest routes connect occupied frontage nodes to civic-facing roots within each source component, plus three principal outward approaches. Unused components disappear. Vegetation is placed against the retained roads. This is visual pruning; source components are not joined across arbitrary terrain. The earlier density benchmark predates this pass and the hall integration. Browser city/capital captures were checked without page errors, alongside typecheck, the full 112-test suite and an additional passing connected-spur test, and build.

## Crafted block study

The earlier default was 28 buildings, including the hall. This authored composition establishes an elevated civic/residential area, shared developed ground and a lower warehouse quay. Count selections from 128 upward retain the larger Ancoats experiment. See decision 032 for scope. A short local 28-building sample recorded p95 17.1 ms, 59 calls and 104,300 triangles with 144 static infantry. This was a three-second smoke measurement, not a full hardware benchmark. Summer/winter and switching 28→128→28 were checked without browser errors. All 114 tests passed; focused block validation and typecheck/build passed after surface refinements.

## Dense district expansion

The current default is a 160-building district city; 28 retains the authored neighborhood. Larger counts now use `districtCity.ts` rather than the earlier Ancoats placement mode. The real-data experiment remains in source. District summaries describe expansion blocks; the original 28-building civic neighborhood is separate. See decision 033 for accepted crowded-steampunk direction and current limitations.

`district-city-results.json` records nine local samples with the urban kit, construction shells, cranes, alley walkways, clutter, emissive windows and capped instanced smoke. Frame-interval p95 was 17.1–17.5 ms, with 84 city-view calls and about 1.13 million triangles at 1,024 buildings. No browser errors; winter and narrow-width checks passed. A final paving-seam fill followed that measurement; it does not constitute a new full benchmark. This is static-unit scenery plus decorative smoke, not live combat or minimum-device certification. No isolated before/after GPU timing for smoke or emissions was collected. All 115 tests and typecheck/build passed.
