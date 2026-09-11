# Physical region layouts — 2026-09-10

Replaced the rejected scattered countryside pass with a saved terrain-layout foundation and first functional scrapyard, lake-crossing and mountain-pass regions. Details and accepted scope are in decision 030.

Generation now precedes settlement reservations. It preserves navigation components, keeps region anchors open, checks bridge access, and excludes settlement footprints from obstacles. Rendering, ground endpoint/segment checks, pathfinding, direct tactical motion, stale routes and directional cover consume the same geometry. Water can only be crossed on the deck or bypassed along the shore. Solid edges offer nearby cover to either faction.

The earlier countryside modules and standalone visual script/test were retired. Historical session notes remain. Existing saves are not regenerated. Generation remains seeded and new layouts serialize with ordinary world state.

Validation: the full 128-test run passed before the obsolete countryside test was retired; all nine new physical-terrain tests pass. Typecheck and build pass. The three-seed check produced two examples of each theme on Boreal, Ironfront and Meridian. Desktop browser interaction accepts a generated bridge crossing and rejects open water; all three theme renders and a phone view have no page errors. Screenshots are under `.impeccable/review/terrain-layout-*.png`. The initial per-sprite exclusion was replaced by raster suppression; an isolated Boreal generation check measured approximately 1.04 seconds locally.

The art is an initial functional treatment; richer salvage textures, more natural ridge composition, and density/balance tuning remain future art and playtest work. Region ownership, economy, victory scoring, existing rivers and old campaign geography are unchanged.

## Follow-up: features not visible

The running Vite instance returned an older terrainTexture module without terrainLayoutGraphics, while the D: source included it. Triggering the existing Vite/API watchers refreshed live code; HTTP checks confirmed the renderer and generator integrations. The sole saved campaign AF727DD8 remains version 6 without layouts, as expected. No campaign was reset or migrated. Added a preview-only Explore terrain selector with footprint-centered zoom. Live browser verification of Boreal (four nations) shows two lakes, two scrapyards and two mountain passes; each theme was selected and visually checked. Typecheck/build passed.
