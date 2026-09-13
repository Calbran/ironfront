# Regional world and strategic readability — 2026-09-13

## Delivered systems

- Version-3 fixed Meridian reference world, with older geography dispatch and saved keys preserved. New world creation is available through Explore the new world.
- Hamlet/village/town/city/metropolis hierarchy; two metropolises, two cities including the retained headquarters core, twelve satellite settlements, and expanded industrial/rural sites. The final reference has 488 sites and 18,874 regional crop parcels. Extra scenic neighborhoods and POIs do not automatically create capture/income sites.
- Shared polygon farmland with route-led orientation, coherent crop regions and water/slope/settlement/road clearance. Polygon containment and broad version-3 woodland fields are shared by scenery and armored traversal.
- Finer 1024-interval terrain, subdued lowland relief and smoothly graded settlement reserves. A moving fine-index window plus coarse exterior keeps close rendering bounded without altering authoritative terrain.
- Rank/budget/collision-based labels, disclosed formation clusters, emplacement markers, regional street overlays and searchable Places with natural landmarks. Strategic hatch fade and restrained survey texture contrast reduce noise.
- Shared ranked-plan previews, instanced developed lots, continuous urban parcel surfaces and bounded large-city detail residency. Finished building variants replace construction-frame placeholders in the generated urban stock.

## Validation

`npm run typecheck` and `npm run build` passed. The full `npm test` suite passed 358/358. Subsequent affected-system runs passed 29/29, and the final street-facing geometry correction passed its four generation invariants. Coverage includes connected streets, physical kit dimensions, determinism, headquarters clearance, industrial compatibility, crop containment, old/new geography dispatch, authoritative movement/vision, construction and persisted restart behavior.

The production browser script uses a disposable in-memory SQLite store and headless Chrome. It checks building/land clearance, polygon fields, scenic/objective separation, Places search, metropolis/regional views, right-click orders, construction, reload, compact layout, label-wheel zoom and withheld living enemies. The `--shared` option opens the country harness, POI gallery and city renderer in separate browser contexts. Later shared-city checks identified HTTP 429 responses blocking preview assets. A spaced rerun was stopped at the user's request to leave remaining visual review to them. Screenshots and an earlier successful result are under `.impeccable/review/massive-campaign/`; that result is not a completed verification of the final refinements. Final shared-consumer visual review remains manual.

## Explicit limits and parity

- The generator still uses the fixed Meridian seed in production. Player-count map sizing and multiplayer balance remain unimplemented; physical unit scale is unchanged.
- The reference road planner connects 479 of 488 sites. Nine lack a safe generated connection; invalid long orders continue to be rejected. No forced water crossings or teleportation were added.
- Coastlines remain lattice-based and visibly angular at close regional scales. This pass increases resolution, not continuous coastal geometry or terrain streaming. Urban composition and rural density remain provisional and use a limited existing architectural kit.
- Production and the country harness use the shared scene; the gallery exposes the same new ranked/industrial owners. The original city diorama retains its detailed city planner, including the headquarters core. Static pacing previews intentionally retain the older compact scenery fixture, though their field renderer accepts the shared polygon contract.
- No railway simulation, recruitment/economy integration, geological mineral model, or validated player-count scaling is claimed. The active roster remains the 64-individual integration fixture; frame samples are not a sustained population or unit-ceiling benchmark.
