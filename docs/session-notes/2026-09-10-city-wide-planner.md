# Full city planning — 2026-09-10

Implemented the accepted structure-first pass using the existing kit. The new citywide case fills a 320-unit square with connected parcels around the preserved central civic precinct and dock. Seeded spacing, central commercial height falloff, residential perimeter blocks, waterfront industry and two river crossings produce a complete city study. The existing combined fitter handles final-space frontages, entrances, river clearance and foundation limits. Extended quay geometry to the full developed width.

Added a Full city control and seed-gallery case/default, preserved mode across seed changes, and opened seed 732 for review. Seed 732 contains 836 buildings including the town hall. Inspected overview renders for seeds 732 and 733, plus waterfront detail. Browser control/seed-switch checks returned no page errors.

Validation: typecheck, build and all 41 test files passed. The 96-case seed sweep (731–742 across eight cases) reported no geometry flags; results are in docs/prototypes/city-wide-audit-2026-09-10.json. An initial corner coverage assertion assumed residential building counts in the larger-lot industrial waterfront corner; revised it to require substantial development in every quadrant. An unrelated military-model test failed once during the first concurrent run and passed both its isolated rerun and the final full suite. Build retains the existing chunk-size warning.

Limits: this is a grid-based visual planner with authored civic/dock anchors, not a general organic city or tactical simulation. Navigation, cover, player construction, wedge footprints and arbitrary water/terrain integration remain future work. No campaign mechanics changed.

## Follow-up: varied streets, civic square and asset library

Removed the inherited dock/canal and factories from full-city mode; the civic reserve now ends at the square's southern street. Shared junction offsets and selected diagonals create varied parcel sizes/bearings. The full-city civic terrace uses a common ground level rather than the old dock's descent. Civic monument/fountain and planted/open wings vary by seed.

Added 19 procedural steampunk assets and seeded selection in city blocks. Full and distant geometry share existing materials and instance by variant. Library bounds/detail checks passed for every model; the largest new tower is 2,576 triangles, each abandoned vehicle 296 before instancing. Street props avoid building envelopes and entrance corridors; cars sample multiple positions along each eligible street rather than occupying the default central entrance.

Roads now have dark fine-grain surfacing and arc-length-spaced dashed center lines, with paved sidewalks/alleys. Restored orbit rotation and camera-relative WASD panning with input-focus/blur handling. No authoritative combat, cover or vehicle collision mechanics changed.

Validation: all 41 test files passed, typecheck and both standard/public builds passed, and 96 geometry audits passed (steampunk-city-audit-2026-09-10.json). Browser library catalog and geometry report are under .impeccable/review/asset-library; final city visual checks under .impeccable/review/final-city. A software-rendered headless sample had high frame times, so no laptop framerate guarantee is implied. The city-only Funnel has been refreshed and public DNS/HTTPS now respond; one Chromium DNS cache required an explicit mapping to the independently resolved public Funnel IP during testing.
