# Miniature city and world development roadmap

## Current baseline

The default game remains Pixi. Three.js campaign rendering is opt-in with `?renderer=three`; it consumes authoritative snapshots and commands. Standalone entries are `/three-preview.html` (generated-world comparison), `/reference-preview.html` (crafted miniature reference), and `/city-diorama.html` (160-building district study, with the original 28-building neighborhood selectable). These studies are included in the repository; merging their code does not make them the default game renderer.

Implemented: shared instanced infantry/vehicle/building kits; fixed isometric camera; generated town/river clearance; district block composition on prescribed terrain; narrow urban models and varied heights; developed paving/yard surfaces; construction shells, cranes, selected alley links, clutter, emissive windows and capped smoke. The tall-building kit has distinct foundation/roof/trim boundaries to avoid coplanar flicker. City prototypes do not change capture, supply, construction, collision or cover authority.

Accepted direction: a crowded, overdeveloped Victorian/steampunk city with commercial, residential and industrial character, dirty service areas and maintained civic/commercial spaces. Cities should resemble crafted miniatures, with terrain-aware connected surfaces and coordinated blocks. A capital building is the intended city ownership anchor. Larger continental scale should make travel and logistics meaningful in a 2–4-week game. Exact land-area multiplier, city limits, travel times and balance are not validated.

## Stage 1 progress — 2026-09-10

Added corner shops, tenements and warehouses to the district study, with shared nominal footprint dimensions and unchanged model scale across city budgets. Commercial frontage ends reserve corner variants. Seed and partial-budget regressions cover placement. The follow-up adds wide mills, boiler houses with coal storage, and sparse nine-storey commercial towers with copper-domed crowns. Towers reserve two frontage slots and all city budgets retain architectural scale. A follow-up now validates horizontal attachment envelopes against generated meshes and supplies full/distant instanced kits in the diorama. Three-dimensional collision/entrance semantics, district-level culling and generated-world integration remain separate. Stage 2 has begun with seeded courtyard wings and stepped frontages inside the existing street framework; the composition follow-up adds handed corner glazing, outward entrance paths, terraced rear gardens and bounded vacant-slot gardens. A separate angled-street study now fits frontages into six convex triangular/trapezoid parcels with polygon paving and gardens. Concave/general parcel networks and terrain fitting remain ahead.

## Ordered next work

| Stage | Work | Exit criteria |
|---|---|---|
| 1. Urban kit and composition | Add compatible corner buildings, tenements, shops, larger mills/warehouses, service structures and several roof/facade families. Establish dimensions, entrances, foundation bounds, roof attachments and LODs. Improve construction/cranes/walkways as distinct assets. | Review one dense mixed district at unit scale; continuous frontages, intentional alleys/courtyards, no overlapping roofs or pasted-on surfaces. Art direction accepted before multiplying assets. |
| 2. District/block variety | Replace repeated rectangular recipes with multiple block shapes, partial blocks, corner treatment, frontage depth and height distributions. Separate district zoning from individual block instances. Tune maintained-versus-grimy surfaces and bounded clutter. | Repeated seeds are deterministic but visibly varied; requested counts, density, street access and footprint clearance pass. No leftover empty-road grids or accidental interior grass. |
| 3. Terrain-first city planner | Terrain/water → settlement suitability → regional entrances/bridges → connected street grades → districts → parcels/blocks → foundations → developed surfaces → vegetation/props. Fit blocks to actual slopes and river corridors; reject or downsize unsafe candidates. | Riverbanks remain clear; roads and bridges meet; entrances and paving align in position, direction and height. Moderate slopes produce explicit terraces/retaining structures; steep sites reject placement. Repeated-seed and pathological-terrain tests pass. |
| 4. Generated-world rollout | Feed district plans into the existing generation worker and miniature renderer. Share footprint/entrance metadata, cache spatial queries, preserve safe legacy fallbacks and saved-map compatibility. Add district-level culling and LOD. | A seed gallery covers small villages through large cities across terrain types; generation time/memory measured; no client mutation of campaign authority. One-city visibility is not assumed. |
| 5. Campaign interaction and city capital | Complete Three.js interaction parity. Design how city capitals relate to existing physical settlement capture, garrisons and regional ownership before implementing rules. Define any building cover/collision/destruction interfaces separately from decorative models. | Server-validated orders, persistence/restart, fog, selection, camera and capture regressions pass. Existing land-area victory remains; no weighted key-zone scoring. Elevated visual walkways are not assumed traversable. |
| 6. Continental scale and logistics | Establish physical map units and city/army scale; expand contiguous landmass, then tune travel, depots and construction for the intended campaign duration. Keep management light and asynchronous. | Measured journeys and supply decisions support a long campaign without excessive micromanagement. Starting positions, routes and saved data remain valid at larger extents. No arbitrary 10× coordinate multiplier without timing/rendering checks. |
| 7. Production readiness | Compare Pixi and Three.js on a populated campaign, multiple visible cities, moving/fighting units, shadows, smoke, winter, selection and strategy overlays. Exercise low-end devices and long sessions. | Explicit hardware/frame-time, generation-time, memory and interaction budgets; no resource growth on regeneration; reconnect and long-soak checks pass. Only then decide whether to change the default renderer. |

## Performance and art constraints

Reuse meshes/materials and batch static props. Keep decorative smoke capped (currently 12 chimneys × six instanced soft billboards). Emissive windows do not cast light. The diorama now has three non-shadow-casting civic lamp lights and a dusk comparison; further lights require profiling. Shadow-casting lights, transparent smoke overdraw, larger texture libraries and unique models require new profiling. Current 128–1,024-building samples use repeated assets and mostly static units; they are not a production building cap or mobile guarantee.

Record p50/p95/p99 frame intervals, draw calls/triangles, loading/generation time and available memory measures. Distinguish short static samples, live campaign checks and long soaks. Rerun a relevant baseline when assets, shadows, LOD, terrain geometry or effects change; preserve old reports as dated stage evidence rather than overwrite their meaning.

## Entry points and validation

- Planning: `packages/game-core/src/craftedNeighborhood.ts`, `districtCity.ts`, `miniatureTown.ts`, `organicCity.ts`, `cityStreetPruning.ts`.
- Presentation: `apps/web/src/experiments/cityDiorama.ts`, `referenceAssets.ts`, `buildMiniatureData.ts`, `miniatureScene.ts`, `worldDetail.ts`.
- Tests: `tests/crafted-neighborhood.test.ts`, `district-city.test.ts`, `organic-city.test.ts`, `city-street-pruning.test.ts`, plus the existing generation/gameplay suite.
- Run `npm run typecheck`, `npm test`, `npm run build`; verify changed interfaces in the browser. `scripts/city-diorama-browser.ts` defaults to local Vite port 5173 and Playwright Chromium; set `CHROMIUM_PATH`, `CITY_TEST_URL` and `CITY_REVIEW_DIR` to override. Browser scripts and historical performance reports are not portable CI guarantees yet.
- Source records: decisions [029](../05-decisions/029-threejs-renderer-experiment.md), [030](../05-decisions/030-city-capitals-and-large-city-study.md), [031](../05-decisions/031-real-city-street-seeds.md), [032](../05-decisions/032-crafted-neighborhood-blocks.md), [033](../05-decisions/033-dense-steampunk-districts.md); [city results](../prototypes/large-city-diorama.md), [generation audit](../prototypes/town-generation-audit.md), [live soak](../prototypes/live-campaign-performance.md).
- OpenStreetMap-derived samples stay separately attributed/licensed in `packages/game-core/data/city-samples/README.md`. Current district recipes are authored and do not fetch map data at runtime.

Dates and effort estimates are intentionally unassigned. This is the proposed implementation sequence around accepted direction; individual balance values and production adoption still require validation.

## Initial terrain comparison — 2026-09-10

The angled study now has an optional smooth northern rise with foundation fitting, stepped approaches, grade checks and a protected river crossing. This begins stage 3 on an authored one-dimensional profile. General 2D terrain queries, river-cut parcel planning, steep-road rerouting and generated-world integration remain open. See decision 039.

## River-cut comparison — 2026-09-10

Added straight-channel parcel clipping before frontage placement, connected bank streets, two bridge crossings and built quays. This advances water-first block fitting on the authored street framework. Curved rivers, general crossing selection, combined 2D terrain and generated-world rollout remain open (decision 040).

## Combined terrain comparison — 2026-09-10

Unified the controlled bend and two-dimensional slope profile in one selectable district. Rigid buildings are revalidated in world coordinates, with supported foundations and clear entrances. This advances the combined study but does not complete arbitrary terrain routing or generated-world rollout. See decision 041.

## Seed consistency gallery — 2026-09-10

`/city-seeds.html` now compares twelve seeds with overview/detail captures and geometry reports. Six modes include controlled bend and slope stress. The 72-case audit covers seeds 731–742; no flags were found. Visual review remains necessary for surface seams, model quality and composition. Next: broaden the authored street framework into distinct city shapes before generated-world integration; arbitrary terrain routing and production performance gates remain open.

## Integrated city composition — 2026-09-10

The combined study now selects four seeded street skeleton families with differing angles, proportions and parcel subdivisions. District roles place existing residential, commercial skyline and industrial assets together around the civic anchor, terrain and river. Flat district expansion varies its growth direction and width. Whole-city framing replaces the cropped district overview in gallery captures. Further work: less rectangular outer boundaries, civic-anchor relocation, terrain-driven regional street growth and generated-world placement. Four bounded families are not general geography-driven generation. See decision 043.

## Generated river reach comparison — 2026-09-10

Worldgen gallery samples now use actual river points from `generateContinent`, uniformly scaled to the study and rendered at the source bearing. Source seeds/river indices/reach starts are exported. The fitter currently selects reaches with a monotonic local axis and bounded deviation; full meanders, confluences, lakes and the surrounding world terrain still require general parcel/terrain integration.

World-generated city river reaches now receive bounded, endpoint-preserving corner rounding before fitting and rendering. Campaign drainage polylines remain unchanged; this refinement applies to the city preview adapter.

Waterfront shaping now preserves fixed inland block edges instead of displacing the whole district. Blocks change depth between the river and the original perimeter streets. General street-first parcel clipping around arbitrary water remains future work.

## Infill and district transitions — 2026-09-10

Combined fitting now retries rejected frontage sites before leaving them empty. Residual suitable industrial and commercial space receives functional yard/plaza props, and a paved forecourt connects the civic market. Foundation skirts follow rigid model footprints. This improves the bounded city study; arbitrary interior service-lane generation and civic relocation remain future work.

## Accepted full-city target — 2026-09-10

The entire square terrain tile is intended as the city footprint, not a background for one neighborhood. Plan a dense central civic/commercial core with the town hall and tallest towers, then connected residential, commercial and industrial districts distributed throughout the tile. Ease density toward edges with secondary centers rather than rigid concentric rings. Water, parks, courtyards and streets are intentional open space.

Next architecture: define the city boundary and geographic constraints; lay a connected city-wide street hierarchy; allocate district roles and density/height targets; subdivide and pack parcels; add polygon-aware wedge/corner models; integrate the existing streetscape and effects. Current neighborhood fitting is a component of that pipeline and does not yet produce a full-tile city.

The full-city plan must support urban combat: connected infantry/vehicle routes, building/wall cover, defensible intersections and space for player-built sandbags, barbed wire and anti-vehicle emplacements. The town hall anchors city control. Define navigation, cover and construction constraints before treating the final city geometry as purely visual. Detailed tactical rules remain unimplemented and untuned; current settlement capture is unchanged.

## First full-tile planner — 2026-09-10

The `citywide` preview now implements the first square-tile grid, connected district parcels and a central height gradient using existing models (decision 047). This supersedes the neighborhood-only limitation above. Next: polygon-aware corner/wedge buildings and better residual parcel fitting, then navigation/cover/construction data for tactical validation. Secondary commercial centers and non-grid street growth remain future layout work.

## City variation and kit expansion — 2026-09-10

Added gentle street-angle variation, occasional diagonal parcels, a cleaned-up central square, and 19 shared Victorian/steampunk assets (decision 048). Full horizontal camera rotation is restored. Next geometry work remains wedge/corner footprints and better small-parcel fitting, followed by explicit navigation/cover/construction data.

The civic surround now uses fitted urban parcels instead of authored home/shop lots. Bridge decks carry road surfaces; manholes and utility accents add restrained street-level detail (decision 049).

## Tactical geometry foundation — 2026-09-10

Full-city inspection now exports conservative obstacles, cover candidates, a town-hall precinct and bounded infantry/vehicle approach routes (decision 050). Next: complete prop and vertical collision metadata, audit entrance reachability and construction space, then integrate server-authoritative orders and contested capture with persistence tests. The preview overlay does not change campaign capture or combat.

## Directional cover integration — future work

Before campaign combat uses city cover, implement attacker-relative protection on authoritative attack resolution: friendly tanks provide full cover and jeeps partial only along intercepted lines of fire; flanking bypasses that protection. Preview facing remains advisory. Track moving hulls, separate cover from visibility, add frontal/flank/movement/multiple-attacker and restart regressions, and benchmark battle-scale query costs. Height-aware exposure is a later extension; damage tuning remains provisional. See [decision 050](../05-decisions/050-city-tactical-geometry.md#future-combat-line-of-fire-cover--accepted-direction).
