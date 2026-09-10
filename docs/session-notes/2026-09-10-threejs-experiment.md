# Three.js experimental branch

User requested an isolated experiment preserving existing work and explicitly excluded Impeccable. Copied current tracked/untracked infantry/vehicle changes into a separate worktree and checkpointed them as baseline 9c476dc. Main checkout was not edited. Added a standalone renderer adapter and Pixi comparison, then validated build/typecheck, all 106 existing tests and desktop/mobile browser behavior. See the prototype notes for reproducible inspection and outstanding limits. No production renderer decision or gameplay migration was made.

Fixed the experimental camera to one isometric angle per user direction. Mouse/touch dragging pans; zoom and settlement navigation remain. Removed overhead preset.

Restored experimental friendly army box selection, Shift-add, Escape, roster selection/focus and WASD/right/middle/touch panning. Strategy mode renders ownership and connected-holding labels, hides tactical scenery and preserves selection/camera. Replaced staged route actors with generated roster positions. Fixed continent near-plane clipping. Typecheck/build and desktop/mobile browser checks pass, including selection and mode preservation; no server/simulation changes. Recorded proposed concept-B reference-scene art roadmap.

Added an authored crafted-miniature reference scene at `/reference-preview.html`: continuous terrain and river channel, bridge, five modular building silhouettes, shared runtime materials, forest/rocks/field props and separate winter snow surfaces. Reused infantry/jeep sources with static reference selection. Fixed camera, responsive views and seasonal controls verified in browser; typecheck/build pass. Main/Pixi and campaign authority remain unchanged. See docs/prototypes/crafted-miniature-scene.md for scope, local measurements and remaining art limitations.

Added shared miniature building/tree assets to the generated world with chunked instancing, detail levels, tactical-only shadows and synthetic troop stress controls. Measured a 96-region / 64-settlement / 2,135-tree world through 12 scenarios, including 8,000 visible soldiers, winter and CPU throttling. Normal cases were near 60 FPS locally; CPU-throttled battle near 55 FPS. No sampled interval over 33.4ms or page errors. Automatic continent mode reduced submitted triangles from 2.83M to 39.9k. Scope excludes dense reference terrain, live simulation and real minimum-device validation. Raw results/methodology committed in docs/prototypes.

## Live integration and generated-region refinement

Connected an opt-in Three.js map to the existing App polling and command callbacks. Built an isolated real-server soak harness. After the user requested further art refinement, added one generated-region terrain study driven by existing roads, rivers, settlements and field parcels. Preserved the original checkout, Pixi default, campaign authority and the fixed camera. See prototype notes for test scope and limitations.

## River and edge follow-up

User approved continuing the generated-region study. Added bounded river-corner rounding, continuous strip joins and matching channel/bank paths, with bridge approaches and mouths retained. Added material/grain edge blending and cached terrain-vertex evaluation. Live renderer and authoritative world remain unchanged.

## Riverfront placement correction

User identified buildings overlapping a river. Added conservative model-footprint clearance and deterministic dry-lot relocation in the generated preview worker, ahead of scenery/fields. Reviewed the affected town in summer and winter; browser checks reported no errors or phone overflow.

## Roads over water

User identified remaining town-road ribbons crossing the river after building relocation. Added width-aware bank clipping for preview road geometry while retaining the raised bridge and leaving campaign route data unchanged.

## Terrain-aware town and generator review

Reviewed authoritative geography and preview dependencies. Implemented a pure bounded town planner in game-core, reordered preview regional roads before town layouts, shared presentation river paths, and placed fields before final scenery clearance. Removed repeated global river scans from legacy building repair. Added planner invariants and repeat-seed four/eight-seat timing audits. See town-generation-audit.md for measured costs and remaining slope/planning limitations.

## Documentation follow-up

Verified implementation, test and performance records after the user asked whether everything was documented. Recorded the user’s acceptance of the current baseline and the proposed next steps separately from authorized work in the town-generation audit and decision 029.

## Multi-settlement planner continuation

Authorized continuation adds farming/riverside/industrial patterns, size-based density, explicit regional entrances, bounded candidate retries and neighboring-site lot clearance. The worker attempts all settlements and labels fallbacks. Expanded tests and browser/audit scripts cover patterns, entrances, deterministic seeds and independent town overlap.

## Large-city diorama and capture capital direction

User requested an upper-end city sample with units for scale and asked for a per-city building benchmark. Added a separate 160-building diorama with a prominent capital, civic square, neighborhoods and depot yard, plus density controls and benchmark captures. Recorded intended capital-based ownership separately from unchanged server rules. Expanded shadow coverage with city size to keep high-density measurements representative.

## Organic layout and real-city seed

User requested curved streets, close downtown density, alleys, open pockets, waterways, cobbles and steampunk lamps. They rejected the first concentric layout and requested actual city data, choosing an industrial river town. Replaced the ring approach with a locally bundled Ancoats OpenStreetMap street/canal seed, cropped to a smaller district for model scale. Pure frontage placement checks oriented model footprints against streets and neighbors; canal-side workshops, open pockets and looser outer homes are included. The fixed capital/depot require a diverted canal in the study. Added attribution, data provenance/license, offline conversion script and decision 031. World-generator integration, historical building footprints and a broader template library remain unimplemented.

Validation: typecheck, 111 tests, build, city/capital/depot/street screenshots, winter and narrow viewport, and nine browser performance samples through 1,024 buildings. No browser errors; p95 18.5–18.7 ms locally. Results recorded separately in `organic-city-results.json`; higher geometry density remains a material limit for other devices/live combat.

## Town hall integration

User requested that the hall blend into the town. Reduced its dimensions to 72%, reused kit brick/slate, added framed side windows, tightened the civic square and shared its reservation shape between generation and rendering. Added clear pedestrian approaches where nearby roads can be connected without crossing buildings. Kept clock tower, capital intent and infantry scale. Checked summer/winter in the browser with no page errors; full typecheck/test/build validation recorded for this change.

## Prune unused imported streets

User flagged excessive roads and empty stubs. Added pure street-graph pruning after lot selection: nearest frontage terminals, shortest connecting routes within source components, three outward approaches, and run reconstruction before lamps/vegetation. The default sample removes 62.5% of imported street length; all building centers remain within 4.76 scene units of a retained street. Browser overview/capital checked without errors. Typecheck, full 112-test suite, additional spur regression and production build passed. Earlier performance records are labeled as predating this change.
