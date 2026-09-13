# Project State

## Regional landscape and readable campaign — 2026-09-13

New campaign geography version 3 retains the fixed Meridian reference continent and physical asset scale while introducing 488 places, a five-level settlement hierarchy, two metropolises, multiple cities and twelve satellite settlements. Large places contain connected street blocks, dense centers, industrial quarters and lower-density edges. Their anchors reserve dry inland footprints; expanded industry and rural sites reserve terrain-cell clearance. Additional scenic neighborhoods and POIs do not automatically generate income or create capture objectives.

Farmland uses adjoining irregular polygons, coherent crop districts and route-led orientation, excludes steep ground, waterways, developments and road corridors, and shares polygon containment with woodland placement and vehicle movement. Version 3 terrain doubles lattice resolution to 1024 intervals, adds subdued lowland relief and grades rural settlement pads through the shared terrain planner. Older versions keep their saved geometry and generation dispatch.

The shared country/campaign overview fades terrain hatching before strategic distance, reduces survey-texture contrast, prioritizes labels by settlement rank and screen space, groups nearby disclosed force markers, and shows emplacement markers. Major roads persist at overview; local and settlement streets appear at regional scale. Production adds a searchable Places panel including terrain landmarks. Metropolis detail is culled around the camera, with instanced developed plots and shared urban ground surfaces. Fine terrain indices follow the camera while retaining a coarse exterior. The POI gallery exposes the same ranked settlement and industrial-complex planners.

Validation and remaining limits are recorded in the regional-world session note. Size, density, vegetation, label distances and player-count suitability remain provisional. This is still the fixed reference world, not a multiplayer population-sizing implementation or a new railway/economy system.

## Strategic survey-map art — 2026-09-13

The production Three.js campaign now becomes an illustrated military survey map at continental distance. Five generated 1024 px WebP materials cover plains, forests, highlands, mountains and ocean. The terrain shader blends the four land materials from the existing authoritative forest and relief fields, so the new look follows the actual map instead of painting a separate decorative biome layer. The ocean repeats a subdued engraved-wave material across the campaign extent. Close and tactical views retain the physical miniature terrain.

Generated sources, final prompts and the asset-processing contract are recorded in [the strategy map texture guide](docs/06-art/strategy-map-textures.md). The retired Pixi renderer remains unchanged.

Validation: focused active-map/campaign tests passed (16/16), plus typecheck, production build and isolated desktop/mobile browser checks. The browser regression confirmed strategic LOD, loaded textures, no page errors and no horizontal overflow at 1440 × 900 and 390 × 900.

## Strategic campaign rendering performance — 2026-09-13

The shared Three.js campaign scene batches distant settlement silhouettes into one instanced draw, uses a two-cell terrain LOD only beyond the regional camera range, and avoids recomputing labels or POI residency while the camera is still. Strategic terrain caps its internal pixel ratio at 1 and skips invisible close-ground shader work; tactical terrain, city assets, mountain materials and cross-hatching retain their detailed paths. Clickable settlement labels forward wheel input into the same cursor-anchored zoom controller as the canvas.

The reproducible full-campaign browser sample improved from 30.3 ms median / 36.4 ms p95 and 394 draw calls at overview to 6.1 ms / 6.2 ms and 15 draw calls. Close-city rendering remained 6.1 ms / 6.2 ms. These are four-second local headless-Chrome samples with the 64-individual integration roster, not a sustained-load ceiling.

## Campaign mountain materials — 2026-09-12

Mountain terrain now has a shared procedural material driven by the authoritative `mountainWeight` lattice. Foothill vegetation gives way to exposed warm or cool stone, slope-weighted scree and subtle elevation strata. The shader adapts its sampling scale with campaign zoom and adds no meshes or draw calls.

## Campaign cross-hatching — 2026-09-12

The production campaign now retains the country scene's illustrative, sun-directed terrain cross-hatching at full-continent zoom. The earlier 2,800–5,500 model-unit fade always disabled the ink from the massive campaign camera. Campaign rendering now cross-fades world-anchored hatch spacing across power-of-two scales based on camera distance; tactical zoom keeps the existing fine pattern, while the country test keeps its prior overview fade. The effect remains terrain-only and does not affect simulation.

## Full scale-test continent — 2026-09-12

New commands at `/` now use the actual Meridian geography and physical separation from the scale study: 411,840 × 274,560 model units, approximately 750 × 500 km including sea. There are 382 settlements/POIs, 1,937 crop parcels and 675 road sections. One detailed headquarters city uses the shared city plan; other settlements use seeded town/POI generators, with unscaled meshes and physical cover. The initial 64 individuals remain a bounded integration roster on the persistent world. Camera changes never stop combat.

Forests stream in shared deterministic 160-unit tiles (25 resident renderer tiles; 128 cached CPU tiles), country orders can use a road graph, and cover queries use a local obstacle index. Campaign geography/save version 2 is separate from the previous small-map version 1. Existing commands are preserved and can start the continent through the visible toolbar action.

This promotes the full geography, not a complete populated campaign economy. Recruitment, broad strategic AI, multiplayer and production-scale scheduling remain pending. Terrain uses a coarse global lattice with reserved settlement pads; coast navigation, detailed cities beyond headquarters, and more natural regional farmland need further work. Forty places currently lack a safe generated road connection.

Validation: 354/354 full-suite tests, 13 focused checks after the shared animation correction, typecheck, build, and full-map browser move/build/reload/visibility/compact-layout checks passed. The actual 5173 frontend creates the full geography successfully.

See [full-map validation and limits](docs/session-notes/2026-09-12-massive-campaign.md) and [decision 056](docs/05-decisions/056-full-scale-campaign.md). The bounded-alpha record below is historical.

## Persistent campaign alpha — 2026-09-12

The production `/` now opens the Meridian campaign alpha, using the same Three.js country scene and tactical presentation as the country test. This replaces the older abstract campaign UI at the main entry; existing proof saves and the Pixi recovery UI remain untouched at `/legacy.html`.

Shipped first pass: one 6,000 × 3,600 model-unit world (approximately 10.9 × 6.5 km), one detailed city and ten other places, connected roads/bridges, woodland and farms, two factions, 14 groups containing 64 individual soldiers/vehicles, persistent orders and casualties, continuous server combat, reactive squad support, filtered enemy vision and coarse distant hearing, common animation/effects/audio, territorial occupation, supplies and physical sandbags. There is no encounter-launch action, scenario deadline, battle-result import or simulation pause when the camera leaves a fight. The server advances all saved alpha worlds on a 250 ms timer; bounded catch-up retains its backlog across restarts.

This is a bounded campaign region and integration alpha, not the complete continental game. One commander controls Meridian against existing Crown forces. Multiplayer joining, recruitment/reinforcements, broad opponent strategy, the old economy/supply network, wire/trench/warehouse/artillery gameplay, a final campaign victory policy, and continent-scale simulation scheduling remain unintegrated. Their absence is explicit in the UI/integration record. Sandbags cost 10 supplies; territorial capture takes 30 uncontested seconds and generates 5 supplies per owned place per minute. These are provisional alpha rules.

Validation: 349/349 tests, typecheck, build and browser move/build/reload checks passed. The country test and city diorama also passed browser smoke checks. See [session results](docs/session-notes/2026-09-12-persistent-campaign-alpha.md).

See [decision 055](docs/05-decisions/055-persistent-campaign-alpha.md) and the [alpha integration record](docs/03-technical/campaign-alpha-integration.md). Older production descriptions below are historical.

## Three.js production campaign — 2026-09-12

Three.js is now the only active renderer direction for the campaign, country and tactical game. `/` opens one authoritative, living battlefield with a Three.js lobby preview and live map. Battles emerge wherever opposing units meet and remain part of the same persistent campaign simulation; there is no launch-battle flow or detached encounter result. `/country-slice.html` is an isolated development harness only. `/legacy.html` explicitly loads the retired Pixi renderer for historical comparison and saved-data recovery; it receives no new feature or parity work. Older entries below that describe Pixi as the default are historical and superseded by this decision.

## Staggered infantry fire — 2026-09-12

Tactical rifle and LMG fire is now approximately 10% slower: each soldier skips one of every ten otherwise-ready firing opportunities using a save-stable phase derived from its ID. This breaks up synchronized squad volleys while retaining deterministic restart behavior. The shared city/country presentation adds a stable per-soldier phase plus small per-shot variation below 200 ms and uses the same delay for muzzle flashes, tracers, recoil and audible reports. Country snapshots retain their authoritative shot times, so several 250 ms volleys received together replay in order within a bounded 650 ms window instead of appearing as one robotic firing line. Tank and anti-tank reload cadence is unchanged.

## Universal tactical tracers — 2026-09-12

Every authorized tactical projectile now receives a short moving tracer in city battles, country encounters and animation review. Rifle and machine-gun rounds use a 0.65-unit streak; tank shells retain their visible projectile and add a 2.2-unit trail. Both originate from the live muzzle socket when available, travel with the projectile, and expire at impact instead of drawing a muzzle-to-target beam. Visibility filtering still controls which shot events reach the player.

## Shared physical bridge surface — 2026-09-12

Country bridge decks, approach ramps, road ribbons, roadside props, ground-unit height, path overlays and navigation grade checks now consume one game-core bridge surface. Decks clear the water, use thicker physical slabs and meet their banks through bounded ramps. Ground navigation remains restricted to the bridge width; no general river-crossing exemption was added. Focused bridge/sector tests, typecheck, production build and a live landship crossing passed; full-suite results are recorded in the session note.

## Elevated airship reconnaissance — 2026-09-12

The country scout airship now flies 45 model units above local terrain, raised from 25, and observation evaluates terrain sight from that same altitude. Ground-level buildings and individual tree crowns no longer block an air observer; target-side forest density still shortens detection, fixed night still reduces the nominal 1,000-unit range to 450, and terrain high enough to cross the elevated sightline still masks contacts.

## Country group movement pace — 2026-09-12

Country-slice group orders now persist a shared movement identity across expanded infantry members, tanks and airships. Authority recomputes the group's pace every 50 ms from its slowest active member: soldiers wait while a grouped tank pivots, and the complete group inherits infantry firing penalties or tank terrain penalties. Fractional render projection uses the same cap between snapshots. Giving a unit a separate order detaches it immediately; completed or dead members no longer constrain the remaining group.

## Authoritative night reconnaissance — 2026-09-12

The country Light mode is now persisted authority rather than a client-only presentation switch. Cycle, Day and Night use one shared daylight calculation for sky lighting, selected-unit vision rings, enemy response filtering and encounter target acquisition. Fixed night scales nominal sight to 45%: infantry 81 model units (147 m), tanks 225 (409 m) and scout airships 450 (818 m), before forest concealment and line-of-sight checks. An enemy group is disclosed when any living member is detected by any living friendly observer; its collision-avoiding screen badge may be offset beyond the actual member position. Baseline daytime ranges remain unchanged and the 45% night factor is provisional balance.

## Country reconnaissance and forest concealment — 2026-09-11

Country encounters now return enemy groups only while at least one living friendly unit has authoritative vision. Open-ground sight is 180 model units for infantry, 500 for tanks and 1,000 for scout airships. Forest around an observer shortens ground sight by up to 35%; forest around a target shortens detection further, with moving units retaining a little more exposure than stationary units. Airships ignore observer-side forest obstruction and provide long reconnaissance vision, but have no weapon range. Selected friendly units show terrain-draped cyan vision and amber firing rings using the same shared weapon ranges as combat. The country visibility model is separate from city visibility and remains provisional balance.

## Extended tactical unit visibility — 2026-09-11

City and country tactical unit geometry now remains visible beneath fully opaque map badges until one world unit projects to 1.25 pixels, extending the ground-model cutoff from roughly 214 to 515 camera units at the standard perspective. Marker timing is unchanged, so tactical identification remains available throughout the overlap. Airships retain ten times the model distance. This is shared presentation tuning for the small tactical rosters, not campaign-scale unit rendering.

## Tactical weapon ranges — 2026-09-11

At the established 0.55 model-units-per-metre tactical scale, shared rifle, LMG, early rocket-launcher and tank profiles now own effective/maximum range, distance falloff, moving accuracy, soft/armor effectiveness, suppression, magazine and reload values. Effective/maximum ranges are 200/300 m for rifles, 300/500 m for LMGs, 69/100 m for rockets and 400/900 m for tanks. City and country combat adapters consume the same profiles. Buildings, terrain, vegetation and server-authorized vision still govern acquisition. Selected country units show cyan vision, strong amber effective range and faint amber maximum range. LMG profile support is authoritative but no persisted live roster fields an LMG team yet. See decision 051 and the range session note.

## Shared tactical presentation — 2026-09-11

City battle and country slice now use one presentation owner for infantry running/aiming/reloading/deaths, tank tracks/turret/recoil, muzzle flashes, short tracers, shells, dust/craters and camera-relative sound. Country rendering smooths individual soldiers and fractional movement steps, and uses authoritative impact events. Animation review shares run clips, rifle/armor effects, audio and tank animation primitives. Full/partial cover quality is retained for country poses. See docs/03-technical/shared-system-standards.md for required owner/consumer audits and the explicit preview/legacy inventory. Regression and browser results are recorded in docs/session-notes/2026-09-11-shared-tactical-presentation.md.

## Country squads, shared tactics and river banks — 2026-09-11

Validation: 303 tests passed, plus typecheck/build and browser checks.

Open-ground orders use loose staggered formations; clicking any living member selects its squad. Roads have no proximity preference, and the river surface extends under its banks to close the visible join.

Country infantry now consist of six independently persisted soldiers grouped for selection. Live placement previews and authoritative destinations share the city battle placement solver; cover reactions, cover quality, infantry stepping and preview colors/poses also use shared helpers. Dragging updates local ghosts without delayed server-preview swaps. Members retain individual paths, health and reload state; dead members no longer move.

The optional Deploy encounter review adds bridge/outpost objectives, authoritative fixed-step combat, saved casualties/projectiles/reloads and restart catch-up. Capture timing, force composition and a ten-minute encounter bound remain provisional review tuning, not campaign victory rules. River banks gain earth/sand, rocks, reeds and sparse lily pads with distance culling.

Routing follow-up: removed the forced city-road portal for crossing settlement boundaries. Clear terrain routes go directly; obstructed crossings use the shared sector lattice and clearance checks. Existing queued routes are retained; issue a new order to replace an old detour.

## Country atmosphere, channel and close detail — 2026-09-11

Final verification: all 293 tests passed, plus typecheck/build. Close-view hatching now blends to twice the line density and half intensity over 450–100 units, retaining fixed world-space stroke positions and the existing thin-line filtering.

Country presentation now has a procedural horizon/zenith sky, drifting stylized clouds, and soft sun-projected cloud shadows on ground. Sky and shadows share one cloud field and absolute time, with night colors driven by the existing lighting cycle. The sky uses one low-poly dome; clouds and shadows add no shadow maps or cloud meshes. Near ground gains procedural soil/grit and pebble flecks, filtered and faded from 65–220 units; grass uses five-blade miniature tufts in existing culled batches.

Authoritative terrain version 9 adds broad rolling/ridged relief, a below-water river bed and raised sloped banks. Settlement transitions remain wide enough for road grades; roads and units consume the same height lattice. Saved version-8 routes migrate through the existing pause/clear/relocate-only-if-blocked procedure. Bridge decks now stay above water even over a negative river bed. Clouds are cosmetic sky shading and ground projections, not volumetric weather or gameplay visibility. Targeted terrain/road/movement/persistence tests pass; full validation recorded in the session note.

## Country daylight and terrain ink — 2026-09-11

Latest tuning softens ink contrast by roughly 18% and narrows strokes progressively at close zoom using screen derivatives; distant visibility/fade distances are retained.

Visibility follow-up: hatching now responds to gentle country slopes, uses broader 14/18-unit strokes with stronger contrast, and fades independently of the ground texture between camera distances 2800–5500. Browser review confirms visible shading at the Sector overview; derivative filtering still suppresses subpixel lines. These values are provisional visual tuning.

Daytime sun/fill are brighter while night intensities remain unchanged. The country lighting cycle now switches the shared kit and embedded city window/fixture lighting at dusk. Terrain adds subtle world-anchored crosshatching on slopes facing away from the sun, with derivative filtering and overview fading to avoid distant striping. This is inexpensive illustrative shading over existing geometry and shadows, not new relief or occlusion. Strength and lighting values remain provisional. Typecheck/build passed; browser checks verified warm night windows, brighter day, and close terrain without shader errors.

## Country relief, lighting cycle and shared infantry routes — 2026-09-11

The country slice now adds deterministic gentle rolling elevation (up to nine additional model units), easing to settlement reservations and river approaches. Rendering, road generation and authoritative movement consume the same heights; geometry version 8 safely migrates prior routes. Non-repeating value noise replaces periodic surface bands. At distance, ground colors/grain simplify and a coarse terrain mesh uses approximately 1/16 the ground triangles. Lighting is less washed out, with near-camera terrain/object shadows and atmospheric haze. The Light selector offers a synchronized wall-clock 20-minute day/night cycle plus fixed Day/Night modes. As of 2026-09-12, this saved mode also controls country visibility authority; it still does not change simulation pace.

City battle and sector infantry now share one deterministic route-variation helper: simplify grid stair-steps, then apply small collision-checked personal deviations. Sector guide lines are stored separately from actual footsteps, with exact destination/cover endpoints preserved. Long routes use bounded sampling; saved movement remains authoritative. Existing routes are cleared only by the geometry migration, not by client rendering.

Validation: all 293 tests, typecheck and production build passed. Browser checks covered the Light selector, daytime bridge/terrain rendering and nighttime city rendering with no shader errors. Night brightness and the 20-minute visual cycle remain provisional tuning.

## Miniature ground style — 2026-09-11

Accepted the simpler miniature-landscape direction after the painterly image was judged too realistic. Country terrain now uses broad fields of muted meadow, lush green, dry grass and exposed-earth color, with soft lattice-shaped transitions and greatly reduced grain. Existing models, placement and terrain heights are unchanged. Browser review confirmed the revised ground alongside city models with no shader errors; typecheck and build passed.

## Refined country landscape — 2026-09-11

The country slice carries the original refined landscape's palette, grain, authored tree/pine models and small shrub/rock/grass accents across the sector. Seeded grove clusters leave settlement reservations, roads/powerline margins and rivers clear. Meadow/dry-ground color variation and slope tinting follow the existing terrain, with blended grain samples to reduce repetition. ACES tone mapping and near-camera soft shadows match the city renderer. Fine vegetation uses nearby tile visibility; distant groves use low-poly material-matched shapes. Browser overview review measured 14 draw calls. This is cosmetic scenery: it creates no new hills, cover or tree collision; authoritative heights and navigation remain unchanged.

Validation: typecheck/build and the deterministic scenery-clearance test pass. Browser review confirmed city-scale groves, ground color variation, overview LOD and no logged shader errors after reload.

## Tank steering and open ground — 2026-09-11

City vehicles may now traverse clear off-road ground; building, wall, planted-bed, water and slope restrictions remain. Shared vehicle route planning removes lattice steps and rounds corners only when the complete sampled curve clears the vehicle envelope. The sector applies the same treatment to tank routes across the wider map. Tank heading corrections up to 0.25 radians occur during travel at the existing bounded turn rate; larger heading changes pivot down to that steering range first. This preserves elapsed-time movement and restart behavior. New orders use the updated routing; existing queued paths are retained. Turn thresholds and six-unit maximum corner cut remain provisional.

Validation: all 290 tests, typecheck and production build pass. Regression checks cover off-road city destinations, collision-clear rounded corners, simultaneous steering/travel, snapshot cadence and persisted movement. Browser confirmed the updated sector loads; turn feel remains subject to user review.

## Broader outskirts and consistent distance colors — 2026-09-11

The country-sector city now has a smaller downtown proportion and wider lower-rise outskirts, retaining authored building scale and sidewalk setbacks. Occupied inner suburban blocks use textured developed soil/gravel, breaking into individual pads at the fringe. Town/city/metropolis lot budgets are provisionally 120/440/950. Geometry version 6 migrates saved routes using the existing safe pause/relocation behavior. Far city geometry uses instanced material-colored masses with the same appearance variants and lot tints as detailed buildings. Ground models persist until markers fully appear; airships transition at ten times the ground range. These are presentation and generator tuning, not balance changes.

Validation: typecheck and production build pass, as do the settlement clearance/frontage test, all eight country-sector tests (including persistence/migration), and three marker tests. Browser review confirmed the expanded outskirts and developed ground. The bounded-concurrency retry completed with all 287 tests passing after the initial worker cancellation.

Follow-up: satellite towns and POIs retain one small colored silhouette batch when detailed assets unload. Bridge approaches now keep bends outside their straight physical decks; a single raised carriageway carries the road surface over an untextured structural deck. Geometry version 7 migrates prior routes safely. Browser review confirmed the repaired crossing; four road tests and eight sector tests pass after this follow-up.

Final verification: all 288 tests pass with bounded concurrency, along with typecheck and production build. Browser review confirmed the repaired bridge and persistent satellite settlement silhouettes at sector distance.

## Shared tactical controls — 2026-09-11

The city battle now owns the tactical interaction contract used by the playable country sector. Both views use the same marquee selection controller, terrain-anchored middle-mouse orbit/right-drag order controller, cursor-anchored zoom and WASD/Q/E keyboard camera controller. Shift adds selections; in the persisted sector it also queues orders. The sector replaces crosshair destinations with the city's translucent unit-ghost language while retaining server-validated routes and green/red acceptance feedback. Perspective zoom uses a fixed exponential ratio so it remains responsive near the city. Distant units are culled behind shared tactical markers. At overview distance, the sector replaces the embedded city with one instanced box-silhouette batch plus a single flat street mesh, and replaces detailed country roads with highway lines. Simulation remains intentionally separate: the city battle is a local combat test, while sector movement follows authoritative persisted server paths.

The full 285-test suite passed after the shared control refactor. The final zoom/LOD pass additionally passed 11 focused camera, marker and road tests, typecheck and production build. Browser review confirmed city initialization, sector zoom/detail restoration, four distant unit badges and a measured overview reduction from 368 to 7 WebGL draw calls.

## Sector selection and continuous movement — 2026-09-11

The playable country sector now supports left-drag box selection, Shift-add selection, right-drag destination/facing previews, Shift-queued orders, empty-click/Escape deselection and middle-drag orbiting. Route previews are checked on a server-side copy without saving an order. Formations center on the target and tanks respect their turn rate when adopting the final facing. Rendering samples approved paths continuously between 750 ms snapshots, with short correction blending and a two-second projection cap; long gaps still snap to authoritative state. This remains a movement proof. Typecheck, build and all 285 tests passed. Browser checks covered marquee selection, deselection and accepted group movement; held right-drag preview interaction still needs manual review.

## Contextual settlements and shared road art — 2026-09-11

The country sector now reuses the diorama's detailed architecture/street renderer with a separately generated inland city, rather than copying its test layout. Seed and size control building selection; outward density falls off, smaller models line sidewalks, and only developed plots receive paving. The square city/POI preview bases are omitted. A roadside fuel/provisions POI and an offline Painswick-derived Riverward town connect to the country network. OSM attribution and source download accompany the preview. The authoritative navigation uses the same city plan and source-derived town obstacles; old geometry versions clear queued routes, relocate blocked units and pause safely.

Global and sector roads share the diorama carriageway texture. Highway markings, curbs and connected roadside powerlines stream in near the camera at authored model scale. Depth offsets and camera near-plane adjustment address competing road/shoulder/terrain surfaces. POI roads share the carriageway grain and occupied buildings receive individual developed pads.

This remains a bounded movement/visual proof. The city size budgets, frontage density and road detail distance are provisional. The primary city still grows from the existing street/parcel grammar; the OSM adapter is integrated for the satellite town, not every generated city. The full global view retains its settlement placeholders. Typecheck/build and the 283-test suite passed; all 13 affected road/settlement/movement tests passed again after final cleanup. Browser review confirmed the updated sector. Country terrain is still flattened around site reservations; arbitrary terrain-adaptive urban grading is not implemented. No combat, supply, capture or victory changes.

## Playable country sector — 2026-09-11

`/country-slice.html` now provides a persisted movement proof around a real Meridian river reach: a generated city, satellite town, roadside fuel stop, river bridge and outpost. Two infantry representatives, a tank and an airship accept direct/group/queued orders. Ground routing shares the rendered terrain, bridge and obstacle geometry; infantry can occupy sandbag positions, tanks turn before moving, and aircraft cross directly. SQLite saves routes and resolves elapsed server time across reload/restart. Long snapshot gaps snap to current positions. The pacing page links to the sector.

City architecture and streets are batched; nearby POI detail loads on demand. The city now uses the full civic hall and shared diorama architecture. The earlier 279-test baseline predates the contextual settlement pass. This is a bounded single-player movement slice, not global combat/capture/supply integration. See [playable sector decision](docs/05-decisions/playable-country-sector.md).

Country-road entrance nodes now explicitly clear their own reserved footprint, fixing blocked joins discovered during sector integration. The older 372/420 coverage measurement below predates this fix; current coverage is calculated in the preview.

## Country roads — 2026-09-11

The physical pacing preview now generates a country-wide network of highways and local roads to settlement edges, actual countryside POI entrances and sampled base sites. Shared segments follow terrain, avoid mountain cells and steep slopes, and receive river bridges. Crop parcels clear road footprints; close-up roadside detail follows the network. Physical widths remain six model units for highways and three for local roads.

Meridian with timed objectives connects 372/420 destinations across four land networks, with 44 river crossings. The preview lists the 48 sites lacking a safe coarse-grid approach or onward route. This supersedes the single-corridor-only road display. Roads are visual; live travel and supply remain unchanged. See [country road decision](docs/05-decisions/country-road-network.md).

## Connected country terrain foundation — 2026-09-11

The physical pacing preview now renders one shared terrain surface instead of isolated circular relief props. Native biome contours seed broad mountain belts, adjoining foothills and uplands; seeded warped ridges cross administrative borders. River channels, the review road and reserved city/farm/POI footprints carve local clearances instead of shrinking an entire range. Coasts taper back to the original land boundary. A 512-cell longest-axis lattice is rendered as independently culled 64-cell tiles with shared edge heights/normals. Camera clearance samples the exact mesh triangles; the core exports height and grade queries for later physical routing.

Mountain ranges and a named Terrain selector focus connected landforms; Show locations hides the marker overlay for inspection. The old circular relief generator, fixed east/west trenches and stand-alone tunnel prop have been removed from this preview. Existing local building/unit scale is retained.

This is a connected terrain foundation, not authoritative enlarged campaign navigation. Regional morphology, peak heights, valley widths and snow treatment are provisional. Existing rivers are flattened corridors, not simulated drainage. Sub-grid reservations are conservatively widened to keep current flat scenery clear; terrain-first city placement, graded roads, actual mountain crossings and slope-based ground routing remain next work. The bounded coarse surface is resident and frustum-culled; it is not adaptive ground-detail streaming. Live movement, air exemptions, saves and travel-time rules are unchanged. See [connected terrain decision](docs/05-decisions/connected-country-terrain.md).

## Camera-relative battle audio — 2026-09-11

The full-city tactical view has an opt-in Sound control, volume slider and Test SFX button. Sixteen original synthesized one-shot variants cover rifle cracks, cannon reports, impacts and footsteps; two loops provide tank engines and tracks. WAV assets and a stereo near/far demonstration are reproducible with scripts/generate-battle-sfx.ts. Runtime buffers are synthesized once and shared, with no network or external sound-library requirement. This is a replaceable sound-design prototype, not recorded foley.

Sources pan with camera orientation, attenuate and lose high frequencies with distance, and include a bounded propagation delay. Orthographic zoom changes the virtual listener distance. Footsteps follow traveled distance and stop when idle; at most four visible vehicles have engine/track loops. A shared 32-voice cap drops lower-priority effects, distant rifle bursts are rate-limited per spatial cell, and master compression controls stacked transients. Muting, pausing, hiding the tab and disposal stop voices; snapshot cursors avoid replaying old shots. Pause/mute tests and further sound-quality tuning remain useful manual review areas.

Server hearing events are separate from visible combat events. Living friendly observers must be within 160 scene units of rifles or 360 of cannon/impacts. Returned cues contain only event ID, class, time and 32-unit-cell centers; no enemy identity, target, damage or exact hidden position. Hearing never creates a visual contact or authorizes attack commands. Visible shot events can supply exact sound positions already authorized by vision. Hearing history is capped at 128 cues and two simulation seconds.

Scope: currently the staged city battle. Cross-map simultaneous campaigns need a shared audio-event feed; this does not invent ambient battles. Distance filtering is not building occlusion, terrain acoustics or a full reverberation simulation. Generated samples are originals without third-party recording attribution requirements. Verify auditory quality by listening; automated PCM tests do not establish realism.

## Corridor detail and relief studies — 2026-09-11

The physical pacing scene reuses refinedSurface ground grain and loads up to nine nearby 96-unit roadside chunks with instanced grass, shrubs, pebbles and trees. Existing POI/field interiors and road lanes stay clear. Reserved-footprint-aware mountain/highland relief uses bounded 96×96 terrain grids, with open east/west pass valleys in mountain studies. A hollow cut-and-cover tunnel with a real bore is available for visual scale review. Focus buttons expose roadside, hills, mountains/pass and tunnel. Camera clearance now samples relief rather than only sea level. These are presentation studies: campaign mountains remain blocked, tunnel/pass travel and supply are not connected, and detailed-city terrain is unfinished. Five focused tests, typecheck and build pass; full suite started separately.

## Road-led settlements and real map samples — 2026-09-11

Removed repeated rectangular settlement modules. Procedural sites now grow around seeded bending spines, branching lanes and activity centers, with variable occupancy/setbacks, road-facing buildings, individual gardens, open edges and thematic yard/ruin props. Compact sites retain 44-unit half extents for existing world-placement clearance; estate/district presets use 115/185. The shared renderer batches angled road segments and joins instead of drawing one mesh per segment.

The country gallery also offers offline OpenStreetMap samples of Castle Combe, Bibury and Painswick, downloaded via bounded Overpass queries. Real street topology, streams, building centers and orientation are adapted to the existing city kit at 0.55 model units per meter. Density controls select sparse/mixed/dense building retention; size changes the source crop. Buildings can be moved back up to ten units for frontage clearance and are omitted if their conservative envelopes still conflict. This is not an exact reconstruction. All map-derived previews and exports retain OSM attribution/ODbL metadata; filtered source data is downloadable and available under ODbL. No live map queries occur during gameplay.

The three estate samples at seed 732 retain 19/32/39, 43/70/93 and 120/212/268 buildings at sparse/mixed/dense settings respectively. One local generation audit measured approximately 4–43 ms per sample; this is generation time, not a rendering or combat benchmark. Architecture remains instanced. Nine focused country tests validate determinism, curved-road clearance, bounded geometry, source validation, clipping and density variation.

Limits: real-data adapters are gallery studies, not authoritative campaign battle imports. Terrain is flat; way-only samples omit multipolygon buildings, real vegetation/field boundaries and routing restrictions. Existing world views consume the new procedural compact plans but do not yet place the real-data samples. A full country still needs road stitching, terrain-aware placement and broader source archetypes.

## Pacing camera floor limit — 2026-09-11

The pacing preview now constrains camera height to at least four model units above its flat map floor and recovers below-ground orbit targets. Ground-plane panning replaces screen-plane vertical panning. The existing 10-unit target-distance limit remains; the new world-space floor guard covers cursor zoom, buttons, damping and orbit updates. This is not building collision or an elevation-aware terrain constraint.

## City–farm–outpost review corridor — 2026-09-11

The physical pacing preview searches for one river-free, sampled-land corridor between a representative city, farmstead within a farmland district and compact settlement/redoubt. Country road width stays five model units; connections join the existing local east/west road sockets. Intersecting large crop parcels are omitted, with sparse roadside trees and a gold overview route guide. Review corridor / city / farm / outpost buttons expose each scale; walking ETA uses unchanged infantry reference speed. No full-city replacement, authoritative movement or national road network is implied. Three corridor regressions and typecheck/build pass; the preceding full regression run completed with 246 passes.

## Physical-scale countryside — 2026-09-11

Pacing 3D now generates seeded large farmland districts from individually textured parcels and scattered compact POIs from the country asset library. All POI buildings retain library scale (44/66-unit half extents); only fields occupy broad expanses. Plains/agricultural regions receive farms; forest/highland/plain POIs use different template pools. Sampled ground, river and reserved-location clearance reject placements. Country scenes are decoration, with no income, ownership or route changes. At most six nearby POIs load detail; broad field surfaces use one instanced draw. Named farmland/POI focus controls provide review access. Local template roads are not stitched into a regional road network, terrain remains flat, and sampled clearance is not a polygon proof. Six focused tests and TypeScript check pass.

## Country-scale navigation — 2026-09-11

3D pacing review now overlays fixed-screen-size, clickable settlement/resource/base/unit-reference markers with named labels. Regional cities receive label priority; crowded names hide until hover/focus while their markers remain. Clicking focuses the local scene. Cursor-directed wheel zoom accelerates above 1,000 model units of camera distance and slows near detail, with 4× in/out buttons and Fit country. This is preview navigation only; model sizes and simulation remain unchanged. Typecheck passes.

## Physical country scale experiment — 2026-09-11

Pacing review defaults to a switchable 171.6× geography/anchor separation. Buildings, settlement radii, local model offsets and military scale remain unchanged. Calibration uses the city infantry reference (1.43 model units/s) versus the strategic study's capped 360 world units/hour. Route lists compare constant-speed physical walking hours with strategic hours; smaller-region strategic penalties mean these need not match. Centered coordinates and logarithmic depth support country-to-street focus. This is a schematic presentation experiment, not authoritative enlarged navigation, full tactical cities, streamed countryside or connected road geometry. Models/set pieces are left to the parallel user task. Three focused tests, typecheck and production build pass (bundle size warning remains).

## World scale references — 2026-09-11

The 3D pacing scene includes a static infantry reference and tank at the city-diorama 0.55 placement scale, beside the first city. Focus → Soldier + tank scale review gives a close comparison against the representative buildings. Cyan/gold rings identify the models. References are disposed with the scene; they are not campaign units. Full tactical city layouts remain unconnected and will require footprint validation before replacing the miniatures. Typecheck and browser visual review pass.

## Exact-placement 3D world review — 2026-09-10

Pacing preview now has Show 3D world after generation/placement. It renders the existing study objects directly (no regeneration): identical region contours, river coordinates, city/resource centers and vetted base points using the shared 1/12 world-to-model conversion. Instanced Victorian kit buildings represent settlements within their footprint radii; rigs/factories and base markers show other locations. Focus menu, orbit/pan/zoom and cleanup are implemented. This is a schematic flat-terrain placement review, not full tactical city layouts, dense scenery or sampled elevation. Routing/ETAs and live saves are unchanged. Typecheck/build pass; browser verified the scene and city focus.

## Viable start fallback and five-seed audit — 2026-09-10

Place timed cities & objectives now filters sampled base footprints, searches up to twenty alternative regions for a player lacking resource-viable choices, preserves other players' viability, and publishes only passing candidate points. Failed maps explicitly report missing players; region interiors remain unapproved. Meridian relocates Player 2 from Cinderwick to Valford and offers 12 vetted candidates. All five audited seeds have viable choices for all four players. Fuel/industry travel is within 2–4h for every published candidate. City access remains uneven, reaching 60–73h in some samples; shared resource exit-region indicators are reported, not treated as proven chokepoints. See the starting-zone audit session note. Two focused regressions, typecheck and build pass; browser verified repaired placement. No live saves or ownership changes.

## Uneven regional city access — 2026-09-10

User clarified that regional cities need not be guaranteed near every start. The experimental pass now attempts five map-wide regional cities rather than one per player plus extras, preserving existing generated settlements. City search centers come from distributed map regions; no starting-zone time band is enforced, though a ground route from a reference start and footprint clearance remain required. All players can inspect their routes to these cities. Nearby economic-site audits remain separate. This permits unequal access, not validated competitive balance. Focused placement regression and typecheck pass.

## Resource-site economy sandbox — 2026-09-10

Timed placement now identifies fuel deposits, industrial sites, agricultural sites, hamlets and cities. Each selected base has a resettable economy sandbox: simulate control/connection, pay for construction, advance time and inspect automatic income. Home income is provisionally 2 industry / 1 fuel / 1 manpower per hour; restored city works provide 4 / 1 / 1. Site output requires control, a connection and completed construction. No live campaign ownership, economy or persistence changes. Warehouses remain logistics-only design, not implemented storage; depletion, real supply routing, terrain-specific deposit suitability and final balance remain open. Three focused tests, typecheck and build pass; browser verified rig purchase/completion and fuel-income increase.

## Experimental timed settlement placement — 2026-09-10

The pacing preview now has a Place timed cities & objectives pass. It preserves existing cities and adds expansion hamlets, market/resource/industrial sites and regional cities using actual route-time bands at an explicit preview-only 6× strategic speed. Settlement radii remain unchanged; sampled footprint legality and separation reject unsuitable placements. Every displayed base candidate receives a nearby-objective audit. Meridian produces 15 objectives, 10/15 passing nearby-access candidates, and all five Player 2 slots fail placement; that zone is not approved. This is a schematic world placement pass, not detailed 3D city instantiation or campaign-save integration. Frontier contestability, full footprint proof and cross-map fairness remain open. Three focused tests, typecheck and build pass.

## Starting-zone and travel-time study — 2026-09-10

New `/pacing-preview.html` provides a read-only generated map with four reserved-zone proposals, land-valid base-site samples and infantry route-time overlays to six nearby settlements. Uses existing routing and per-region unsuppressed movement speeds; no live saves, placement or economy are changed. Meridian player 1 site 0 measures 22.3h to the nearest sampled settlement, with other sampled routes 57.4–110.6h: current spacing/speed does not meet the provisional nearby-access targets. This is diagnostic, not fairness certification. Home-base/resource rules and remaining gates are recorded in decision 031. Targeted tests, typecheck and build pass; browser verified generation, selection and route labels.

## Reactive infantry and cover placement — 2026-09-10

City infantry use bounded, staggered local cover reactions; Hold position disables relocation. Move previews prioritize the protected side of nearby cover, including corners, and reserve separate destinations. Active move routes remain authoritative and tanks do not reposition reactively. Drag-facing is now sent to the server. These behaviors remain scoped to the city skirmish.

## Tank cadence and battlefield scars — 2026-09-10

City tanks now reload for five seconds, fire larger faster solid shells, and leave non-fiery dust impacts with temporary crater impressions. Craters are capped at 64, lasting 90 seconds. These are visual ground marks, not terrain deformation or persistent campaign scars.

## Combat feedback — 2026-09-10

Independent tank turret aiming and alignment gating, moving infantry fire at reduced accuracy and 65% speed, three infantry casualty falls with retained bodies, and stronger cannon flash/recoil/dust are implemented in the city skirmish. Effects use shared geometry and bounded instance counts. Timing and balance remain provisional.

## Smooth battle display — 2026-09-10

City unit movement, heading and walk/track animation now interpolate between network snapshots. Short travelling tracers, staggered recoil and bounded muzzle/impact flashes replace beam-like full shot lines. Damage remains authoritative on the server. Two focused tests, typecheck and production build pass.

## Primary direction — full-city tactical game

User-approved promotion: default page opens the full-city battle. Previous campaign remains at /legacy.html. Archive target is codex/archive-pre-city-2026-09-10 at c5e407e; publication awaits destination approval. City battles remain separate from campaign saves.

## Commanded full-city skirmish — 2026-09-10

The full-city view now stages an isolated server-controlled battle: six infantry and a tank against six defending infantry. Select squad or individual units, move on ground, click enemies to attack, and start/pause/reset. Shared seeded fire rules, city building obstruction, live health, casualties and tracers are connected. This supersedes the earlier statement that the city preview has no combat connection; campaign save integration is still separate. See [controls and limits](docs/02-systems/city-battle-trial.md).

## Floor-only orbit anchor — 2026-09-10

Clarification: middle-drag anchors to the terrain/floor beneath the cursor, including through building geometry. Roofs and walls do not supply pivots. If the cursor ray misses the floor, orbit retains the current camera focus. This supersedes fixed-focus orbit below. Movement orders and idle animation are unchanged.

## Authoritative squad fire — 2026-09-10

Campaign combat now uses fixed campaign-time steps, saved seeded hit rolls and reload state, retained targets, spatial enemy queries, cached polygon exposure, weapon-versus-armor profiles, and delayed tank/artillery impacts. Losses are applied simultaneously. The API polls at 250 ms with a campaign due-time gate. Test pace produces four exchanges per second; normal pace remains scaled to campaign time. The separate 3D city preview still needs its geometry and effects connected. Balance and whole-server capacity remain unverified; see [system and benchmark notes](docs/02-systems/squad-fire-model.md).

## Fixed-focus orbit and subtle idle motion — 2026-09-10

Middle-drag now orbits the current camera focus, never the clicked building or surface. This supersedes the surface-anchor behavior below; movement orders still pick terrain. Command destinations no longer become remembered orbit anchors. Relaxed infantry receive staggered, low-amplitude breathing and sway; running, aiming and cover suppress these additions. No extra geometry or draw calls. Seven focused regression tests, typecheck and production build pass; live preview loads with the updated controls. Motion tuning remains provisional.

## Zoom-aware unit markers — 2026-09-10

The city diorama now shows screen-space infantry, tank and jeep badges when units become small on screen. Badges remain visible through buildings, spread into separate slots with leader lines, highlight selected units, support click/Shift-click selection and double-click focus, and fade at close range. Projection supports both camera modes and excludes offscreen/behind-camera units. This is the five-unit local trial, not campaign force visibility or large-army clustering. Two marker regression tests and typecheck pass; browser review confirms overview selection and close-view hiding.

## Close perspective city camera — 2026-09-10

Street View now switches the diorama to a 50-degree perspective camera near the selected unit (or last grabbed surface), with slower WASD panning and distance-based zoom. Planning View restores the saved orthographic pose. Camera picking, selection projection and LOD scaling use the active camera. Selected units get a soft screen-door cutaway through foreground building surfaces, preserving opaque instancing and existing lighting shaders; this is a local reveal corridor, not whole-building transparency or camera collision. Cutaway surfaces are ignored by orbit-pivot picking. Four pivot/cutaway regression tests, typecheck and production build pass. Browser review verified close street rendering and restoration of the planning overview; manual orbit/movement usability remains worth reviewing.

## Visible-surface orbit pivots — 2026-09-10

Middle-drag now raycasts the rendered opaque surface under the cursor, including instanced rooftops, walls and ground. Hidden LODs, transparent effects and their hidden ancestors are excluded. Empty-space clicks fall back to a plane through the current view target, preventing a distant ground pivot. The grabbed point remains stable on screen; orbit preserves zoom and camera-target distance. Right-drag movement orders retain terrain picking. Orthographic projection is retained, so natural ground foreshortening remains. Two camera regression tests, typecheck and build pass; the live preview reloads successfully.

## Streetscape lighting, distant windows and roof correction — 2026-09-10

The local tank/jeep trial now admits the same paved town-hall plaza rectangle used by rendering, with radius clearance at the paving edges. Vehicle routes through gates pass regression checks; walls, garden beds, buildings and unbridged water remain blocked. This supersedes the earlier roads-only restriction. Vehicle swept-hull turning and detailed decorative-prop collision remain separate work.

The city now includes fitted tram-stop shelters, illuminated facade trade signs and rooftop water tanks/service pipes. Dusk shows emissive fixtures plus a single batch of static pavement light pools; the three real civic lights remain bounded. These pools approximate spill on ground, without dynamic shadows or facade illumination. Low-detail models retain the seeded lit-window pattern as outward-facing quads, with one sixth the full window triangles. New Gothic/observatory/exchange tower cornices now end above the storey top, removing coplanar roof-deck faces; snow clearance follows the raised deck. Typecheck/build and model envelope/window-seed audits pass. Citywide seed 732 was reviewed at dusk and overview; see the streetscape session note.

## Victorian city variety and refined surfaces — 2026-09-10

The city diorama now selects seven additional footprint-compatible building appearances: Gothic, observatory and stepped exchange towers; bay terraces, Dutch gables and glass arcades; and sawtooth works. Seeded facade tints, two tree proportions and bounded pebble/grass clusters break repeated streets. Ground, soil, planting and paths use a world-space grain shared with the generated-world refined terrain. Appearance selection applies across city study modes; campaign city rollout remains separate. A patrol airship uses the existing 0.55 military placement scale, cruises above the highest rendered roof and has an Airship review camera that pauses its route. Other camera presets resume flight.

Validation: TypeScript and production build pass; all seven new model envelopes and distant variants pass geometry checks. Full-city seed 732 was inspected in the browser at skyline, capital and airship views, with winter/dusk controls exercised. This is local visual verification, not a production performance gate. See docs/session-notes/2026-09-10-victorian-city-variety.md.

## City prop scale audit — 2026-09-10

City street furniture now references the existing 0.55-scale infantry: smaller benches with knee-height seats, lower/narrower civic walls and pillars, trimmed hedges, smaller lamps, bins, crates, drums, fences and street equipment. Parked cars use 0.55 placement scale. Civic obstacle widths match rendering through shared `cityPropScale.ts` dimensions. See `docs/06-art/city-prop-scale.md` for the audit and retained structural scales.

## Diorama zoom — 2026-09-10

City and animation dioramas now reverse zoom direction: scroll down to zoom in, up to zoom out. City maximum zoom is 12 (previously 8); animation minimum camera distance is 3 (previously 5).

## City tank turning — 2026-09-10

The city movement-trial tank pivots at a bounded 0.55 radians/second before driving a new route heading, eliminating sideways sliding during turns. Left and right track links animate independently from signed travel and hull rotation; forward speed builds after alignment. Road/obstacle checks remain the existing circular-clearance prototype, not a swept hull collision model.

## Anti-tank rocket team — 2026-09-10

The animation diorama includes an infantry-scaled anti-tank gunner with a riveted shoulder launcher, brass bands, visible rocket nose and spare ammunition, accompanied by a rifle escort and ammunition crate. Select Anti-tank rocket team to inspect its single-shot launch, smoke/trail and reload. This is a shared art study; campaign recruitment, armor damage and faction assignment remain undecided.

## Military animation review — 2026-09-10

Running now uses distinct contact/down/push and heel-recovery phases, longer leg reach, stronger opposing hip/shoulder rotation and short airborne intervals. The review run cycle is provisionally 0.8 seconds at 2.6 model units/second (2.08 units per cycle), replacing the short 0.48-second shuffle. Rifle grips remain attached during the armed run.

Low-cover actors now remain behind sandbags, rise to fire above them and duck/reload in place. Cover-edge clips resolve to over-cover fire for low walls; side peeks remain available at tall walls. Tank shots have a faster barrel kick with slower recovery, a slight backward hull displacement and larger smoke puffs that linger after the shot. This remains visual diorama behavior.

LMG review actors now use eight-round bursts at a provisional visual 600 rpm, brief pauses, rapid recoil, larger muzzle flashes and short tracers. Heavier receivers, cooling bands, folded bipods and larger drums distinguish their weapons while retaining infantry scale. This changes the animation study only.

`/animation-review.html` stages every military-kit type, original infantry and the jeep at shared model scale. A deterministic 24-second timeline supports pause, frame stepping, scrubbing, slow motion and focused cameras. Infantry clips cover walking, running, aiming, recoil, crouching, cover peeks/returns and reload gestures; LMGs include a drum change. Armor has circulating tread links, turret traverse and barrel recoil; air units patrol/hover and animate propellers/turbines. These are authored visual studies, not live combat/cover AI or exported skeletal GLB animations. See decision 049-military-animation-review.

## Faction military model studies — 2026-09-10

The military preview now includes the Iron Directorate heavy landship, Crownward Armored Guards, Aether turbine gunship and shared combat engineers. All four retain existing infantry coordinates; the two squads reuse actual infantry bodies. Ten GLBs are available in the military asset catalog. These remain art studies with provisional faction assignments and no new deployment/combat rules.

## Military model kit — 2026-09-10

Added six infantry-scaled 3D studies: steam tank, patrol airship, artillery emplacement, modular sandbags and wire, and a six-person LMG squad. `/military-preview.html` supports original infantry comparison, orbit/overhead views and GLB export. Assets are in `apps/web/public/art/military`; no live gameplay integration is enabled. City integration should apply the same 0.55 transform used for existing city infantry. See decision 047.

## Dense frontage and full-city direction — 2026-09-10

Final road tangents now determine rigid building bearings and doorway access. A second packing pass fills remaining frontage, with compact industrial workshops and clear-access rear industrial rows. Steps use final doorway coordinates; smoke compensates for city rotation; seating is smaller and no longer sits on oversized slabs.

Accepted next architectural target: the full terrain tile is a city footprint with a dense civic/commercial core, tallest towers near the town hall, distributed residential/commercial/industrial districts and intentional open space. Current code remains a bounded neighborhood study; full-tile street planning and wedge-footprint buildings are not yet implemented.

## District infill and fitted foundations — 2026-09-10

Combined cities retry unsuitable frontage sites with inset placement and smaller compatible buildings, preserving clearance and access checks. Industrial cargo/tank yards and commercial seating/planters occupy suitable residual space. A shared paved forecourt joins the civic market to the district. Foundations now use rigid building footprints and orientations rather than deforming clearance-envelope slabs with the river.

## Clean angled road joins — 2026-09-10

Connected road endpoints no longer extend square caps beyond the receiving road. Both curb outlines and carriageway caps share this junction rule; acute curb offsets have bounded miter lengths. Isolated road ends retain their caps.

## Waterfront road widths — 2026-09-10

Road ribbons, end caps and curb/sidewalk unions are now constructed after centerline deformation in combined city studies. Their cross sections no longer inherit the river transform’s lateral stretching. Surface height uses inverse terrain sampling. Decorative parcel surfaces still follow the district shape.

## Local waterfront influence — 2026-09-10

River displacement is now confined to the waterfront: banks follow the full smoothed bend while displacement falls to zero at the inland street edges. Northern district bounds stay outside that transition. Blocks vary in depth rather than copying river curves at their far edges. Foundation heights use an inverse corridor lookup to remain aligned with the reshaped terrain.

## Smoothed city river reaches — 2026-09-10

Worldgen city previews round drainage-grid corners using three endpoint-preserving corner-cutting passes. Water, banks, terrain transforms and fitting audits share the smoothed reach. Raw world-source points remain available for provenance; campaign drainage data is unchanged.

## World-generated river samples — 2026-09-10

The seed gallery defaults to `worldgen`: each numeric seed generates world `city-<seed>` and selects an actual river reach. Uniform scaling and restored source bearing preserve the river geometry and direction. Fitting rejects unsafe buildings; the exported audit records world seed, river index and reach start. Terrain and civic planning remain authored. Reversals, confluences and complete world-terrain integration are not yet supported.

## Seeded city composition — 2026-09-10

Combined cities now seed the street skeleton before fitting buildings: diagonal quarters, quay grids, converging avenues and cross-town boulevards vary dimensions, angles and subdivisions. Parcels assign residential, commercial and riverside industrial roles, combining existing towers, shops, housing, mills and warehouses with the civic precinct, terrain, water, bridges and street detailing. Flat districts vary broad/axial/asymmetric growth. The original 28-building town remains explicitly labeled an authored reference. These are bounded composition families, not unrestricted city generation.

## City seed gallery — 2026-09-10

`/city-seeds.html` compares twelve consecutive seeds using one sequential renderer, overview/detail captures, geometry flags and exportable reports. Six cases cover town, district, large district, combined terrain, tight bends and steep slopes. Exact-seed links preserve terrain settings in the diorama. The 72-case sweep (731–742) has no geometry flags; this is bounded study coverage, not arbitrary-world validation.

## Combined terrain and river — 2026-09-10

Combined terrain & river unifies a seeded bend with two-dimensional slopes in the diorama. Static surfaces share the corridor transform while buildings stay rigid, with world-space road, bank, overlap and entrance checks plus level foundations. Unsafe candidates are omitted. This remains a bounded authored terrain model; arbitrary world geography and rollout are unfinished. See decision 041.

## Continuous curb corners — 2026-09-10

Curbs and sidewalks now follow joined boundaries of the combined road footprint instead of sampled junction cutoffs. Exact edge intersections and mitered band corners close ordinary junction gaps. Dedicated bridge transitions retain their own geometry.

## Street surfaces and lamp variety — 2026-09-10

Diorama streets now distinguish dark cobbled carriageways, raised curbs and sidewalk strips. Curbs leave junction mouths open. Lamp spacing is roughly doubled, nearby duplicate poles are suppressed, and three shared-material lantern styles vary by street. Geometry remains decorative; gameplay road widths and movement rules are unchanged.

## Street-facing lamps — 2026-09-10

Diorama lamp arms and lantern assemblies now orient toward their local street centerline, including angled roads and waterfront streets. The capped point lights follow the lantern positions.

## Developed waterfront — 2026-09-10

The channel studies now have higher water and shallow arched masonry bridges. The river-through-district quay has stone coping, an open rowboat with a mooring rope, bollards and cargo accents. Waterfront provides a close camera view. These are decorative study assets; no boat movement or navigation changes.

## River-cut district — 2026-09-10

River through district clips the angled parcels around a protected channel before fitting buildings. Bank streets connect through two seeded cross-street bridges; other crossing roads meet the quays. Waterfront paving and retaining walls finish the banks. This flat controlled comparison is separate from the hill profile; arbitrary river routing and world rollout remain open. See decision 040.

## Hillside stoop correction — 2026-09-10

Terrain-study stairs now stay near doorways and clear the carriageway. Step count responds to actual rise, near-level approaches retain paving, and solid risers meet the slope beneath horizontal treads.

## Terrain fitting comparison — 2026-09-10

Fit to hills & river adds a six-unit northern rise, level foundations with ground-fitting skirts, stepped entrances and a bridge over a protected northern channel. Excessive-relief candidates are rejected. This is an authored one-dimensional terrain profile on the angled street framework, not general terrain-first routing or generated-world rollout. See decision 039.

## Angled street parcels — 2026-09-10

The city diorama offers an Angled streets comparison: a boulevard and seeded side streets form six convex irregular parcels, with envelope-checked frontage buildings and inset garden polygons. Counts reflect fitted buildings; the regular budget selector is disabled in this study. The civic neighborhood stays connected. This remains a flat bounded study, not terrain-derived city generation. See decision 038.

## Block composition — 2026-09-10

The diorama now includes terraced rear gardens, handed corner shops with blank adjoining walls, and explicit outward entrance paths checked against other buildings. Partial frontages can receive bounded pocket gardens. This remains a prescribed street-grid study; terrain-derived parcels and gameplay navigation are not implemented.

## Courtyard fit and rooftop correction — 2026-09-10

Courtyard wings now use a shallower dedicated model, retaining facade/floor scale and leaving a wider rear-window court. Planted centers and gardens in unused frontage slots replace unexplained paving, with clutter excluded from the courtyard garden. Pitched-roof water tanks now sit above the roof on supports and their brass lids no longer share the tank top surface. Presentation remains experimental and cosmetic.

## Building envelopes, distant detail and block recipes — 2026-09-10

The city study validates conservative horizontal envelopes including roofs, awnings, steps, scaffolds and pipes, with a browser check against generated mesh bounds. Legacy organic/world placement retains its prior rules. The diorama switches between full and simplified instanced kits by projected scale with hysteresis; large volumes, roof crowns/stacks and snow remain, while small details disappear at distance. Residential blocks now alternate seeded courtyard wings and stepped frontages; Vary blocks changes their arrangement while maintaining exact budgets and the reserved civic block. Streets still follow the study framework: arbitrary parcels and terrain-first planning remain future work. See decision 037.

## Mills, service buildings and first skyline towers — 2026-09-10

The district study now places wider mills and boiler houses/coal storage in industrial blocks, and sparse nine-storey commercial towers with setback copper-domed crowns. Towers reserve two frontage slots while counting as one building; mills use wider lots. Model scale and exact city budgets remain. Industry/Skyline camera presets expose the additions. These are miniature-study assets, not campaign buildings or completed LOD/terrain integration.

## Victorian civic square — 2026-09-10

The diorama hall now has a pediment, roof dormers, copper tanks/pipes and detailed clock trim. Low capped walls, gate openings, broad clipped planting beds and benches now fill the street-bounded civic block. The four former front shops relocate to a connected rear market street, preserving counts and providing clear hall approaches. The authored grounds remain decorative, not collision/cover geometry. Mixed indexed/non-indexed geometry is normalized before static material batching. See decision 035.

## Varied window occupancy — 2026-09-10

Daylight windows share a consistent non-emissive glass treatment. At dusk, urban windows use a stable per-room/per-building shader pattern: approximately 38% off, 32% dim, 20% medium and 10% bright. Pattern derives from local window coordinates and instance position, independent of time/camera; existing material batches remain. This is cosmetic occupancy, not simulated residents or power. Stage 1 still needs larger mills/service assets, full envelopes and LODs before block-shape variety.

## Diorama smoke and local light visibility — 2026-09-10

Replaced faint polygon smoke with soft camera-facing plumes, correctly transformed at factory and selected urban chimneys. At most 12 sources emit six particles each. Three non-shadow-casting civic street lamps now illuminate nearby surfaces; a Dusk lighting toggle lowers daylight to reveal them. Emissive windows remain glow-only, without bloom or individual lights. Effects remain cosmetic and diorama-only.

## Urban kit continuation — 2026-09-10

Roadmap stage 1 now has corner-shop facades wrapping exposed block ends, rear-balcony tenements and loading-door warehouses in the district study. Shared nominal footprint dimensions drive placement checks and new model bodies; larger city budgets retain model scale. Commercial corners are reserved before seeded construction variants. Stage 1 remains open for larger mills, service assets, full roof/foundation envelopes and LODs; rectangular block planning and campaign rollout are still future stages. The portable browser runner uses `CHROMIUM_PATH`, `CITY_TEST_URL` and `CITY_REVIEW_DIR`. See decision 034.

## Current entry points and next work

`/` is the production Three.js campaign and continuous battlefield. `/country-slice.html` is an isolated tactical test harness, while `/city-diorama.html` remains the detailed city development surface and defaults to the 160-building district city. `/legacy.html` is the archived Pixi renderer. The Ancoats street-seed study remains in source but is no longer the default layout. [Development roadmap](docs/04-roadmap/miniature-city-development.md) gives the ordered remaining work, acceptance criteria, performance limits and code/test entry points. Historical sections below record earlier stages and are not alternate current defaults.

## Dense district city — development study

The city diorama defaults to 160 buildings organized into commercial, residential and industrial blocks around the crafted civic neighborhood. Urban roof/parapet and foundation/facade faces now have distinct boundaries to prevent coplanar flicker. New narrow/deep urban models, varied heights, construction shells, cranes, selected alley walkways, clutter, emissive windows and capped instanced smoke establish a denser steampunk direction. The 28-building study remains available. District planning is restricted to the study terrain, not integrated with campaign generation. See [decision 033](docs/05-decisions/033-dense-steampunk-districts.md).

## Crafted neighborhood — development study

The selectable 28-building block study with elevated civic paving, dense aligned frontages and a lower warehouse quay. Shared developed surfaces cover the interior; placement validates clearance, level foundations and street-facing entrances. Existing larger city options remain available. This is a bounded authored composition, not a general terrain parcel solver. See [decision 032](docs/05-decisions/032-crafted-neighborhood-blocks.md).

## Real-city street seed — development study

The earlier large-city study used a local Ancoats/Manchester OpenStreetMap street and canal sample with attribution. It replaces concentric roads with real district geometry, closer footprint-checked frontages, canal workshops, scattered outer housing, procedural cobbles and batched steampunk lamps. The hall now uses the neighborhood brick/slate materials at 72% of its original dimensions, with side windows, a smaller square and tighter civic reservations. Civic/depot/park reservations remain; the canal is adapted around fixed landmarks. After lot placement, a graph pass removes unused street branches and retains frontage routes plus three outward approaches; the default sample retains about 37% of imported road length. This is one offline reference in the diorama, not integration into the campaign/world generator. See [decision 031](docs/05-decisions/031-real-city-street-seeds.md).

## Large-city diorama — development study

`/city-diorama.html` contains a 160-building candidate with a capital/clock tower, civic square, residential and market blocks, workshops, supply yard, 144 infantry scale figures and two jeeps. Building-density tests cover 128–1,024 buildings at fixed model scale. Capital-based capture is accepted direction but not implemented; existing capture rules remain unchanged. See [diorama and benchmark](docs/prototypes/large-city-diorama.md) and [decision 030](docs/05-decisions/030-city-capitals-and-large-city-study.md).

## Terrain-aware town and generation audit — development study

The preview now attempts terrain-aware planning across settlements, with riverside, farming and industrial patterns, size-dependent density and recorded regional-road entrances. Unsafe or undersized plans retain labeled legacy layouts. The art tour selects one sculpted example, with connected streets, street-facing lots and distinct civic/home/shop/workshop models. Fields and vegetation follow completed footprints. The worker records stage times, caches river presentation paths and avoids repeated global river checks in legacy town repair. Pure planner invariants and repeat-seed generation audits are included. Continuous-slope planning and eliminating legacy fallbacks remain future work. See [generator audit](docs/prototypes/town-generation-audit.md).

## Live campaign adapter and generated landscape — historical development study

This adapter was promoted into the production Three.js campaign on 2026-09-12. Existing server snapshots drive live squad models and existing commands handle selection, movement and attacks. Missing campaign presentation is now Three.js production backlog; Pixi parity is no longer a goal. See [live integration and soak methodology](docs/prototypes/live-campaign-performance.md).

The generated preview now offers **Visit refined region**: one actual river-adjacent settlement region with sculpted ground, wear, grain, bank rocks, vegetation, field furrows, fences and bridge decks. River bends now use continuous rounded strips; ground height, color and texture fade into the surrounding region material. Preview road strips stop at riverbanks, with raised bridges retained. Preview buildings overlapping riverbanks now relocate to nearby dry lots with model-footprint clearance. It is a bounded art study, not a continent-wide or live terrain replacement. See [landscape notes](docs/prototypes/generated-landscape.md).

## Full-world miniature stress test — development study

The Three.js world preview now shares the art scene’s building/tree kit, with chunked instancing, zoom-dependent detail, tactical shadows and bounded offscreen chunk retention. A stress panel and repeatable browser runner measure distributed/concentrated synthetic troop loads, pan/zoom scales and winter. This remains a rendering test, not live campaign or minimum-device validation. See [performance methodology and results](docs/prototypes/world-performance.md).

## Crafted miniature art scene — development study

`/reference-preview.html` contains an authored summer/winter diorama with sculpted terrain, river channel, bridge, modular town, forest, rocky hill and field. It reuses infantry/jeep models and retains fixed-camera navigation and reference-squad selection. This is an art study, not campaign-wide generation or gameplay migration. See [scene notes](docs/prototypes/crafted-miniature-scene.md).

## Three.js renderer experiment — opt-in study

`/three-preview.html` explores the existing generated world in Three.js with miniature building volumes, reused infantry/jeep models, sprites, winter colors and a Pixi comparison. The camera now stays at a fixed isometric angle, with pan/zoom and distance presets. The original game remains available. Friendly army box/additive selection, Escape clearing, right/middle/touch and WASD panning, roster focus and a manual ownership strategy view are now available. Generated force selection is read-only; campaign orders and new biome mechanics are not shipped. See [prototype notes](docs/prototypes/threejs-migration.md) and decision 029.

## Steam jeep model study — September 10, 2026

The default jeep is simplified to 692 triangles and two merged meshes (previously 3,964 triangles and 188 meshes), with geometry/materials shared across copies. Six passenger sockets and the hinged gate remain. Crowd instancing and live campaign performance are not yet measured.

A Victorian steampunk jeep preview is available at `/jeep-preview.html`, with six passenger seats, a separate driver station, rear boarding step and hinged tailgate. Static reference figures use the existing infantry model dimensions. Orbit/zoom, overhead view, passenger visibility and empty-vehicle GLB export are available. Boarding/disembarking and live campaign rendering are future work; current forces and transport rules are unchanged. See [decision 027](docs/05-decisions/027-steam-jeep-transport.md).

## Infantry rendering prototype

A standalone 3D infantry preview and repeatable crowd benchmark are available at `/prototypes/infantry-benchmark.html`. It uses 348-triangle soldiers, instanced parts and shared cached animation over a captured map. Local overlay-only measurements reached approximately 165 FPS at 2,000 soldiers and 91 FPS at 4,000. These exclude the live map and simulation; squad movement and cover-like repositioning are staged. The infantry model is now integrated into the live campaign as a lazily loaded, viewport-culled Three.js overlay. The prototype measurements remain separate from whole-game performance. See [benchmark methodology and history](docs/prototypes/infantry-benchmark.md).

## Harbor shoreline attachment

Compact harbor art now meets the smoothed coastline, with water-facing piers and a road back to the saved settlement position. Diagonal atlas directions were corrected and all eight views visually checked. Existing campaigns update on refresh; settlement tests, typecheck and build pass.

## Harbor artwork scale

Directional port art now uses a compact footprint (0.85 times layout radius, capped at 180 world units) instead of stretching two buildings over twice the settlement radius. Ordinary city art and gameplay footprints remain unchanged. Existing campaigns receive the correction on refresh. Browser comparison, typecheck and build passed.

## Terrain preview visibility

The live Vite preview had stale cached source despite updated files on disk. Refreshing its watcher restored the terrain generator and renderer. New-map previews now include an Explore terrain selector that frames each saved landmark. Boreal with four nations exposes two of each theme; other seeds may have fewer suitable regions. Existing saved campaigns retain their original terrain. Browser checks confirmed lake, scrapyard and mountain-pass views; typecheck and build pass.

## Physical themed regions

New maps now generate saved scrapyard, lake-crossing and mountain-pass layouts before settlements and derived roads. Shared polygons drive artwork, ground collision, bridge traversal and directional cover. Connectivity checks preserve region approaches and settlement clearances. The selected squad shows nearby terrain cover. This replaces the decorative countryside pockets; existing campaigns keep their saved terrain. The foundation has initial procedural artwork and provisional tuning. See decision 030 and the 2026-09-10 physical-region-layouts session note for tests and limits.

## Active project and verified grand scale

The development app at http://127.0.0.1:5173/ runs from D:/ironfront. Earlier changes in the partial Documents/ChatGPT/Ironfront copy were not live. The complete active project now contains the version-7 generator: 28,800 × 19,200 for four nations, unchanged territory count, sparse global settlement budgets, and fixed city sizes. The live browser confirms the expanded dimensions and substantially more countryside at tactical zoom. See decision 029. Longer travel times remain provisional.

## Eight-direction port-town artwork

At detail zoom, settlements that already qualify as ports use a genuine-alpha atlas with separately authored N, NE, E, SE, S, SW, W and NW port-town views. The renderer samples the actual land/water silhouette around the town, maps that direction to the atlas's verified frame order, and applies no more than 22.5 degrees of correction. The layout dock is only a fallback. This prevents graphics pointing inland on bays and peninsulas. The change is presentation-only: it does not guarantee ports, alter national starts, or move settlements. See decision 028.

## Smooth farmland and inhabited settlements

Farmland now renders through the same smoothed shared region geometry as terrain and borders, removing the raw raster staircase at coasts while retaining precise road, river, city and mountain exclusions. Settlement exclusions are tier-aware ellipses fitted to each sprite's actual aspect ratio instead of oversized circles. New-map agriculture is capped to 24% of passable area and 26% of passable regions so a fertile seed cannot become almost entirely fields. Detail zoom fills settlement clearings with tiered transparent city artwork while retaining the owner/type badge. Saved land use and geography remain unchanged. See decision 027.

## Boundary-filling farmland

Farm parcels now clip to whole agricultural-region contours and around infrastructure, water, settlements and mountain obstacles. Partial edge fields replace the former unused margins. Texture scale stays fixed; display geometry masks coastal edges and scenery clearance uses actual clipped fragments. Existing campaigns update on reload.

## Coherent regions and shared roads

Drainage now precedes settlement placement. New maps store geographic region purposes and use greater town spacing, riverbank/shore access and slope suitability. The selection card shows each purpose. Agricultural neighbors share parcel orientation and retain connected estates rather than isolated scraps. Roads share real junctions and unique physical stretches, with deduplicated bridges/utilities. Existing maps receive cosmetic farmland/road cleanup; new roles and placement require new maps. See decision 026.

## Generated rural land use and scenery clearance

New maps persist agricultural land use before settlement placement, reserving farm regions with no settlement or a single hamlet/village. Farmland follows saved land use. Decorative hills and biome scenery share field/road footprint clearances. Existing maps retain settlement locations and receive rendering fixes on reload. See decision 025.

## Agricultural countryside

Farmland now derives from suitable plains regions rather than town anchors, covering broad areas with adjoining fields, rural lanes and tree/hedge boundaries. Farming can appear without any settlement. Existing cities and campaign rules remain unchanged. Visual generation applies on reload.

## Textured farmland and roadside utilities

Agricultural blocks now subdivide into adjoining seeded field parcels using generated crop, wheat, soil and pasture materials. Crop rows follow parcel orientation; land, roads, rivers and settlement clearances remain validated. Utility lines use road-width-aware verges and omit blocked spans rather than falling back onto roads. Both changes are presentation-only and apply to saved campaigns. Art prompt: docs/06-art/farmland-textures.md.

## Non-blocking map detail generation

Fixed a repeat client freeze during map startup and refresh. Campaign 1886A31B exposed a roughly 35-second synchronous settlement-road pass on the browser main thread. Shared region-border gateways and legal local-navigation edges are now cached, reducing the same cold road calculation to roughly 2.5 seconds locally. Roads, terrain accents, fields, utilities, and biome scenery are generated in a dedicated Web Worker, so the remaining work does not block input, animation, or three-second campaign polling. High-resolution ground materials bake and upload one per animation frame instead of arriving as one large task. Deterministic output, mountain avoidance, road connectivity, and saved geography are unchanged.

## Connected city roads

Settlements now share a sparse connected road network with a main-city backbone, local feeders, occasional alternate routes, and river bridge markers. Existing campaigns receive the derived visual network on reload. No movement or supply rules change. See decision 024.

## Territory enclave repair

New maps repartition fully inland, single-neighbor territories with their enclosing region, opening both to their combined perimeter. Territory IDs/count and land area are preserved; saved campaigns keep their existing borders. Regression coverage checks connectivity, determinism, unaffected land, and 20 generated seeds.

## Coastal transition

Terrain view now includes a softly layered shallow-water shelf and narrow sandy shoreline, following the smoothed coast and offshore islands. This is presentation only; land geometry and movement remain unchanged.

Read after AGENTS.md. Update this as the current save file; historical details belong in CHANGELOG.md and docs/session-notes.

## Manual strategy view — 2026-09-09

Strategy/Terrain is now a toggle beside the zoom controls. Terrain opens by default, and changing zoom or using Fit preserves the selected mode. Switching does not reposition the camera or clear unit selection. See decision 022.

## Contextual landscape — 2026-09-09

Terrain now includes irregular farmland around plains towns, crop/plow rows and broken hedges, meadow/scrub patches, small groves, and reed beds with occasional trees along rivers. Groups create readable landscape features while individual sprites retain their existing world scale. These additions are decorative and update existing campaigns on reload. See decision 023.

## Current milestone

**Milestone 1: first persistent multiplayer proof implemented, 2026-09-09.** Approved name: Ironfront. Documentation mirrors Crownfall's organization. This is an early rules experiment, not the full MVP or a public launch.

## Shoreline-qualified ports — 2026-09-09

Settlement layouts classify a city as a port only when the coast is reachable relative to its actual, spacing-constrained footprint and the geometry yields at least one dock whose land end is on land and water end is in water. This removes inland anchor markers such as campaign 1886A31B's Wolfswick, which was 548 world units from shore, had a roughly 194-unit layout radius, and could generate no docks. Existing campaigns receive the corrected visual archetype on refresh without moving settlements or changing saved geography.

## Close-zoom ground detail — 2026-09-09

Land materials now bake at 2048 pixels with 512-pixel stamps, preserving more source detail. A second world-anchored material frequency spans 16 navigation cells rather than 96, fading in smoothly between 300% and 800% zoom. Both layers share the same biome and coast geometry; roads, rivers, and units remain above them. Cached textures are shared between both layers; water retains its existing resolution. This is a presentation-only change and applies on reload.

## Terrain accents and unified sprite scale — 2026-09-09

Follow-up: powerline routes now retain all bends and border gateways without skipped spans, falling back to the validated road when the verge is obstructed. Roads and utility details are 20% smaller.

Trees are roughly one-third their previous width and form denser stands. A shared world-scale table now sizes scenery, small props, roads, poles, and unit glyphs; city badges and labels remain readable UI markers. Eight generated terrain accents add low hills, scrub, grass, flowers, reeds, and stones. Nearby towns receive sparse winding ground-valid roads with small utility poles on short connections. These details are decorative; existing campaigns update on reload, with saved mountain obstacles preserved. See decision 021. Typecheck, 21 test files, build, and desktop/mobile browser checks passed.

## Group movement lanes — 2026-09-09

Multi-squad Move commands now assign deterministic, spaced destinations across the direction of travel instead of sending every squad center to the same point. Mobile and armored squads prefer an outer lane beside infantry. Formation spacing contracts or falls back to the valid clicked position when terrain is too narrow, and single-squad orders remain exact. The existing shared slowest-member pace, authoritative paths, atomic validation, persistence, and cross-region rules are unchanged. This is simple formation movement, not continuous collision avoidance; squads may close up briefly at narrow border gateways. Formation distance remains provisional.

## Ocean repetition correction — 2026-09-09

The ocean no longer repeats a small material tile. A seeded 4096-pixel surface spans the map and surrounding water, using irregular placements, varied crop scales, gentle direction variation, and reduced contrast. It is rendered once in world coordinates with a fade into the unbounded ocean background. Removed the quarter-turn material pattern that produced repeated pinwheel swirls. River rendering is unchanged.

## Textured water — 2026-09-09

Ocean and rivers now use generated water materials. The ocean uses a restrained deep teal pattern anchored in world coordinates during camera movement. Rivers retain their existing smoothed paths but use a wider channel (6.5 world units), light bank edge (9), and subdued outer bank (12), replacing the previous 1.7/4 strokes. River and ocean materials use the existing periodic blend helper. Navigation, borders, river paths, and gameplay are unchanged. Source assets and prompts are documented in docs/06-art/water-textures.md.

## Settlement and label readability — 2026-09-09

All visible settlements now use a consistent 24-pixel badge with a high-contrast backing. Five tier slots encode hamlet through metropolis independently of icon size, with type shown by the central symbol and capital seats retaining a star. Hover spells out the tier; the compact legend explains 1–5. Labels render at a minimum 14 screen pixels with device-aware resolution, uniform inverse camera scaling through zoom gestures, and thinner outlines. Province names use title-case sans-serif; nation names preserve their large strategic treatment and hide when too small to read.

## Map label simplification — 2026-09-09

Routine territory names are hidden; only the selected territory is labeled, and settlement selection avoids a duplicate region label. Settlement names prioritize capital seats, then major cities at 400% zoom and towns at 800%. Small settlements remain icon-only with names available on hover or selection. Ordinary settlement labels have a viewport-based budget and wider spacing. Existing strategy nation labels and province-level overview names remain.

## Abstract settlement icons — 2026-09-09

The owner reverted city presentation to iconography. Small vector badges now replace illustrated settlements and all ambient city animations. Port, industry, fortified, and ordinary settlements have distinct symbols; rank uses restrained size steps and capital seats receive a star. No city atlases are loaded by the map. Existing selection, hover, and garrison behavior remains. Prior art is retained as unused source material. See decision 020; this supersedes the detailed scene presentation below.

## Varied settlement silhouettes — 2026-09-09

Added six authored alternatives: linear border town, branching rural village, rectangular industrial strip, L-shaped port, L-shaped metropolis, and metropolitan boulevard. Every family has at least four seeded variants (metropolis has five). Each illustration has its own calibrated width and preserves its aspect ratio; silhouettes are not achieved by stretching or rotating the old art. Reduced settlement scale, smoke, and airships remain; moving trains stay removed.

## Settlement/terrain scale refinement — 2026-09-09

Halved the width and height of every authored settlement scene, preserving all relative variant scales. This reduces their map footprint area by 75% so cities sit more comfortably beside terrain. Airships and smoke remain, proportionally reduced; animated trains and the added rail overlay are removed. Source art containing stations/railways is retained. Existing campaigns update on refresh.

## Authored settlement scenes — 2026-09-09

Fifteen designed settlement scenes now replace procedural building placement: three variants each for border, rural, industrial, port, and metropolis. Seeds choose stable variants; each variant retains its calibrated physical width, and larger settlements add districts where space permits. Scene sprites preserve their aspect ratio and original viewpoint. Close zoom adds separate cosmetic smoke, trains, and airships, respecting reduced motion. Existing settlement selection and garrison commands remain. See decision 019 and the settlement-scenes asset guide. Verified: typecheck, all 18 test files, production build, desktop/phone selection and garrison flow, and a shared-camera scale comparison. Scene variants use distinct calibrated widths: border 160–180, metropolis 900–980 world units.

## Filled city blocks and port kit — 2026-09-09

Layout v4 partitions the authored street templates into rectangular blocks and subdivides them into lots. Buildings fill the lots, using smaller homes for narrow parcels and industry/port warehouses on wider parcels. Land and road collision checks still apply. Removed the circular plaza texture. Added a six-piece generated port atlas with piers, quays, harbor office, warehouse, crane, and cargo. Building art remains unrotated; only flat dock surfaces follow coast direction. These presentation changes apply to saved campaigns on refresh. Typecheck, all 16 test files, production build, and desktop/phone interaction checks pass. Lot-containment and minimum occupancy regressions are covered. Sprite fitting preserves source proportions.

## Larger building art — 2026-09-09

Building dimensions are increased 30% from the initial fixed-orientation templates. Frontage spacing follows the larger footprints to prevent overlaps. This is visual tuning and applies to existing campaigns.

## Fixed-orientation city templates — 2026-09-09

City layout v3 uses six authored street templates (port quays, riverside terraces, market square, industrial blocks, woodland main street, fortified courtyard). Buildings and props retain their original sprite orientation, and collision footprints match. Seeds vary occupants and dimensions within the chosen plan. Geography still clips streets/buildings and connects ports to real water. Existing campaigns receive the visual change without regeneration. Verified with typecheck, all 16 test files, production build, and desktop/phone settlement interaction checks.

## Compact city refinement — 2026-09-09

City layout v2 replaces random roadside scatter with contiguous, road-aligned frontage lots and narrow alleys. Seeded offset blocks, winding main streets, and loop neighborhoods replace repeated grids/stars. Larger building footprints and alpha-trimmed atlas frames improve readable detail without camera-dependent scaling. Existing saves receive this visual change without moving settlements. City density remains provisional.

## Latest modular city pass — 2026-09-09

Seeded city layouts now assemble individual buildings, roads, props, landmarks, and coastal docks. Ports, riverside towns, markets, industrial centers, woodland settlements, and fortified towns respond to geography. A 36-sprite transparent atlas and three ground textures replace repetitive whole-city grids. New maps have fewer satellite settlements and global spacing between cities. Existing campaigns receive the visuals while keeping their saved settlement positions. See decision 018 and the city-kit asset guide. Typecheck, all 16 test files, production build, and desktop/phone settlement selection and garrison checks pass. A generated-world audit exercised all six archetypes with no empty settlements.

## Latest world and settlement pass — 2026-09-09

Version-6 new maps use a 14,400 × 9,600 four-nation world, nine times version-5 area, with the same 96 territories (24 per nation). Existing campaigns keep saved geography. Continuous biome paint, forest/mountain symbols, and recognizable clickable settlements improve map readability. Campaigns open centered on the player's capital at 300%; Fit restores a whole-continent overview. The compact bottom HUD and selection preserve viewport dimensions.

Selected squads can garrison a friendly settlement through the existing authoritative movement system. Cover begins only on physical arrival and stops on new orders or loss of territory ownership. Settlements inherit region ownership; independent capture, city economy, and local biome combat effects are deferred. Scale, travel pacing, and cover remain provisional. See decision 017.

Verification: typecheck, all 15 test files, build, desktop/phone world-scale and settlement-interaction browser checks pass.

## Implemented

- React/Vite browser client with PixiJS continent rendering, inspection, zoom/pan, ownership boundaries, army counters, and objective arrows.
- Seeded connected continent with 48–192 territories, local settlements and terrain features, named provinces, rivers, decorative islands, forests, plains, highlands, and impassable unowned mountains. Existing saves retain their old geography.
- Campaign creation/joining, three selectable factions, claimable bot seats, private browser session keys.
- Single authoritative Fastify server with transactional SQLite campaign/session storage.
- Three mixed army presets (line/assault/mobile), divided sector defense, Hold/Advance/Redeploy/Reserve/Recover orders, persistent offensive corridors, consolidation, capital-connected depot supply, finite reserves, risk/fallback policies, and legal retreats. Abstract fuel-consuming air support remains.
- Industry/fuel/manpower, four building types, timed construction and automatic recovery.
- Polygon-area victory, provisional majority countdown, 672-hour deadline.
- Automatic clock, accelerated test mode, host advance control, deliberate downtime pause.
- Dispatch feed, mobile land-standings disclosure, accessible region selector.

## Verified

- TypeScript check and production build pass.
- Twenty-one Node tests pass, including two-session authorization, transactional rollback, persistence across reopen, duplicate-tick suppression, restart pause, generator invariants, construction, capture, and victory.
- Three deterministic bot fixtures run up to 672 ticks with finite/nonnegative resources and legal strength ranges. These are correctness fixtures, not a balance study.
- Desktop 1440×1000 and phone 390×844 browser flow: create, join with independent session, construct depot, issue advance; no page errors or horizontal overflow.
- npm install's final audit reports zero known vulnerabilities after upgrading the static-file plugin.
- Initial-proof review returned **ship — early playable proof**. The military-control extension independently returned **ship** after desktop/phone verification; its detector reported advisory design-metadata discrepancies, recorded in the military session note.

- Military browser flow on desktop and phone verifies army switching, sector/policy persistence, Reserve, Redeploy, Advance, and mountain blocking. Army status uses a phone-safe two-column layout. See `scripts/fronts-browser.ts` and the military session note.

## Running

npm run dev for development; npm run build then npm start for local production on 127.0.0.1:3000. Database: data/warfare.sqlite. No Tailscale deployment has been performed. Docker/Compose configuration is supplied but untested because Docker is unavailable here.

## Known limits

SQLite, not PostgreSQL/Drizzle. No recoverable accounts or session expiration/revocation. Three armies with fixed preset compositions, abstract air support, no recruitment/research. Region-based military vision; geography and political borders remain public. Local legal retreats and simplified rotating-priority multi-party combat. Bots do not develop economies. Generated starts have equal region counts but unequal area and unvalidated fairness. Test timings are deliberately much faster than proposed final offensives. Last 250 dispatches only. The primary browser chunk produces Vite's 500kB advisory; full renderer code splitting is deferred.

## Next

1. Play the proof and decide which five-minute decisions are satisfying.
2. Improve order/route previews, retreat behavior, and start fairness from feedback.
3. Playtest frontage, logistics, and unit roles together; add recruitment and a complete return report.
4. Add accounts and ready/start lobbies, then PostgreSQL/Drizzle deployment and recovery tests.
5. Validate accelerated and real-time campaign pacing before introducing diplomacy/research depth.

## Continental terrain update — 2026-09-09

Ironfront is the approved name. New maps use continuous procedural relief and zoom-dependent labels. Mountains block ownership, construction, army movement and supply, and do not count toward victory area. Passable land remains connected. Geography rules and compatibility are recorded in decision 004 and the continental geography contract. Larger-map pacing and start fairness are unvalidated.

Verification for continental terrain: `npm run typecheck`, all 21 simulation/persistence tests, and production build pass. `scripts/geography-smoke.mjs` passed desktop and phone creation, mountain inspection, zoom/detail, fit, and overflow checks with no page errors.

Latest playtest correction: default reduced to 96 territories and eight provinces, zoom-out extends to35%, borders are visible at overview, legacy polygon fills align with original borders, and wheel gestures transform cached geometry instead of rebuilding all detail each frame.

Density/camera verification: 21 tests, typecheck/build, geography96territories/22mountains/8provinces, camera regression, and desktop/phone checks pass. Sustained100-event zoom on192territories at1968×1450 measured median16.7ms/p9517.1ms frame intervals locally. Fresh independent review: ship for density/boundaries/camera; angular rivers remain a visual limitation.

## Clean terrain and lobby map generation — 2026-09-09

Terrain now uses flat plains, forest, highland, and mountain colors with simple rivers instead of grain and shaded relief. The lobby preview follows the map seed and nation count, with a Generate new map button. Campaign creation waits for the current valid preview. The generator seeds its large land masses, orientation, bays, and inland lake, so seeds change the broad silhouette. Existing campaigns retain saved geography.

Validation: typecheck, simulation/persistence tests (including coarse silhouette differences), and production build pass. `scripts/lobby-map-smoke.ts` checks desktop/mobile seed edits, nation count, regeneration, and exact preview-to-created-map geography. Starting fairness remains provisional.

Player-count correction: World area now grows proportionally with nation count (four nations: 2,400 × 1,600; eight: 3,392 × 2,264), with 24 territories per nation. Generation uses a larger raster rather than adding density inside fixed bounds. Regression checks cover increasing mainland area and stable average territory area across 2/3/4/6/8 nations. The lobby displays dimensions; Fit continues to frame the whole map.

## Earth-derived geography — 2026-09-09

Version-2 new maps use five bundled real elevation samples, with seeded rotation, reflection, coordinate warping, sea level, and secondary-source relief/erosion. Removed ellipse-shaped land lobes, fixed mountain bands, mandatory lake, and synthetic island chains. Mountain regions follow the real relief field; wind controls moisture; flow accumulation yields merging rivers. Territory growth stays on connected land to preserve peninsulas and channels. Detached islands remain decorative. Lobby generation now runs in a cancellable worker and starts with a random seed.

Crownfall's actual generator was reviewed: its geography-first approach informed the sequence, but it does not consume real elevation data. Source manifest and attribution accompany the bundled atlas. See decision 006 and `packages/game-core/src/data/README.md`.

Validation: typecheck, test suite, production build; 20-seed connectivity, mountain, unique-silhouette, strategic bottleneck and river checks; desktop/mobile preview-to-campaign equality. Five-fixture local generator median: 51ms at two nations 82ms at four nations, and 178ms at eight nations. Different seed families still vary in land fraction and starting fairness; these checks do not establish balance. Existing saved geography is preserved.

## Shared vector map edges — 2026-09-09

Terrain fills, ownership hit areas, selection, internal borders, and coastline strokes now use the same display mesh. Raster contour segments are expanded to shared vertices and smoothed together with junctions anchored and displacement bounded. This removes independently rounded fill corners and mismatched border lines. Terrain and rivers render as PixiJS vectors instead of a fixed-resolution canvas texture, keeping high zoom sharp. Saved geography and gameplay adjacency are not modified; existing campaigns benefit on reload.

Verification: shared-edge partition tests, existing test suite, typecheck/build, and desktop/mobile browser checks at 600% zoom with pan/Fit and screenshots. See `scripts/map-edges-smoke.ts` and `.impeccable/review/edges-detail-1440.png`.

## Countries, cities, and visible combat direction — 2026-09-09

Owner direction recorded in decision 008: territories may contain multiple cities and one territorial capital; the continent should feel like countries; moving squad dots/icons and visible firing should reveal ongoing engagements. Existing settlements are decorative and armies remain aggregate region-level entities. City control, territorial-capital capture, and persistent engagements are not implemented. Visual versus independently simulated squads remains pending clarification. No runtime behavior changed in this design update.

## Visual style guide draft — 2026-09-09

Created docs/06-art/style-guide.md as a working proposal covering UI tokens, typography, territory/terrain hierarchy, settlement architecture, unit symbols, motion and accessibility. Uses the existing paper/petrol palette and Barlow Condensed headings. Separates current implementation from proposed squad/city visuals; no gameplay or application styling changed. Linked from docs/README.md and DESIGN.md. A companion conversation specimen previews UI, map layers and font roles.

## Server squad combat — 2026-09-09

First dynamic squad-combat slice implemented under decision 009. Persistent squads carry role, strength, position, morale, suppression, target and action. Persistent engagements resolve simultaneous exchanges between campaign-hour ticks; weapon range, cover, support, supply and arriving reinforcements affect the outcome as it develops. Existing retreat and territorial consolidation rules remain. Region-route travel remains coarse; there is no city-level capture or individual soldier physics.

The client interpolates server positions and draws soldier/vehicle dots, firing bursts, and artillery tracers. Stale snapshots and reduced motion disable firing animation. Active-engagement navigation focuses the battle; squad morale/firing appears in the army panel. Tactical state persists transactionally and pauses over server downtime.

Verification includes range/cover, reinforcement and air-support intervention, suppression, withdrawal before the next hour, persistence/reopen and duplicate-tick checks. `scripts/tactics-browser.ts` uses an isolated in-memory local server for desktop/mobile verification. Pacing and balance remain provisional.

## Visual direction correction — 2026-09-09

Owner rejected the first style specimen as too website-like and supplied grand-strategy, steampunk HUD and battlefield references. Style guide v0.2 now proposes dark iron/brass game framing, a top instrument bar, bottom unit tray, illustrated cards and richer 2D/2.5D terrain. Paper becomes a dispatch insert. The previous conversation specimen is superseded; no runtime restyling or image generation performed. Asset prompts: docs/06-art/art-asset-brief.md.

## Squad movement continuity and spacing — 2026-09-09

Fixed the one-second animation/three-second polling mismatch: display positions now follow confirmed snapshots continuously with cadence-aware smoothing, without resetting to the server's previous tick. Persistent representative soldiers have stable formation slots, varied follow timing, subtle movement offsets, and local icon separation. Server squads seek distinct formation destinations and separate deterministically within territory boundaries. Region-to-region arrival remains the existing strategic abstraction; cosmetic soldier offsets do not resolve damage. Spacing and movement tuning remain provisional.

Validation: polling-gap continuity and individual-motion tests, deterministic on-land squad separation, full simulation suite, typecheck and production build; isolated desktop/mobile battle smoke check.

## Zoom-dependent unit detail — 2026-09-09

Strategy zoom now uses compact army symbols with an engagement indicator; individual soldiers and firing effects fade in from 200% to 260%. Soldier size, formation spacing and effects follow map scale instead of remaining screen-sized as the camera pulls back. Army symbols remain clickable at every zoom, and the selected army reveals its strength counter in detail view. Stacked symbols are spaced side by side. This is presentation only; combat authority is unchanged.

Zoom-detail validation: typecheck/build and isolated desktop 1440px/phone 390px checks passed at 100%, 300% and 600%, with no page errors or overflow. Reviewed overview and battle screenshots.

## Vision and force identity — 2026-09-09

Decision 010 adds server-filtered region vision: own territories and living formations reveal their region plus adjacent passable regions. Public geography/borders remain; distant units, engagements, garrisons/buildings, enemy orders/resources and private dispatches are concealed. Hosts have the same vision restrictions. Existing saves remain complete and are projected per session on read. No last-seen memory or terrain raycasting yet; vision reach is provisional.

The map identifies the player's nation/faction persistently, highlights own borders/forces in cyan and other forces in coral with diamond army markers, and shades regions outside vision. The inspector labels unknown intelligence. Army selection and zoom detail remain available.

Vision validation: full eight-file test suite, typecheck and build pass. Isolated desktop/mobile battle checks verify per-player payloads, unknown garrisons, identity badge placement, fog, zoom and live combat with no page errors or overflow.

## Political strategy view — 2026-09-09

Below 145% campaign zoom, the map switches to solid national colors, strong national borders, quieter internal territory lines, and controller names over each connected holding. Labels follow current ownership rather than historical capitals. Terrain/settlements and geographic province labels return above the threshold. Fog remains enforced and lightly shades unseen political regions; strategy view does not reveal military information. Lobby previews retain terrain. The zoom control identifies Strategy/Terrain mode.

Political-view validation: typecheck/build and isolated desktop/phone battle checks pass across 100%, 300% and 600% zoom; reviewed political overview screenshots with controller labels, national colors, fog and compact markers.

## Nation lettering refinement — 2026-09-09

Strategy view now uses unboxed, spaced uppercase serif nation lettering sized and angled along continuous land inside each connected holding. Army/capital/settlement icons, battle indicators, route lines and local names are hidden below 145%; these details return on approach. This follows the owner's Crusader Kings 2 political-map direction. Military fog remains enforced.

Strategy-view tuning: threshold lowered from 145% to 85%, so Fit (100%) keeps terrain and one zoom-out step (80%) enters the political overview. National fills now blend 35% toward warm stone, with softer border colors. Shared threshold keeps icons and mode indicator synchronized.

Threshold/palette validation: typecheck/build pass; desktop/phone browser checks verify Terrain at 100% and Strategy at 80%, with no page errors or overflow. Reviewed the muted political palette.

## Temporary clean terrain — 2026-09-09

Removed local biome-patch fills from the map renderer after the owner found them blotchy. Terrain now uses closely related muted regional tones, retaining rivers and zoom-dependent terrain symbols. Saved terrain patches, terrain rules and map geometry remain intact; existing campaigns and lobby previews benefit immediately. Political strategy view is unchanged.

## Map interactivity — 2026-09-09

Army and territory selections now have independent map focus: inspecting a region no longer highlights the first army implicitly. Army counters gain larger click targets and bright hover/selection outlines; detailed formations are directly selectable and highlight together. Territory hover traces its boundary. Distinct vector cursors identify army versus land targets; a map status label distinguishes hovering from persistent selection. Unit clicks stop propagation to the territory; dragging retains selection suppression. Command-panel army choice still selects that army on the map.

Interactivity validation: typecheck/build pass. Desktop and phone browser checks exercise army hover/custom cursor, army click without region selection, territory hover/click, hover cleanup over the header, persistent selection labels, zoom, and no page errors/overflow. Reviewed phone selection feedback.

## Right-click orders — 2026-09-09

Selected friendly armies now accept right-click territory orders: friendly destination → Redeploy; hostile/neutral destination → Advance; current location → Hold. Server validation remains authoritative. Right-drag pans without ordering, and secondary clicks do not change selection. Enemy/unselected armies cannot receive orders; mountains give an explicit error. Territory cursor is now a symmetrical diamond.

## Calmer squad motion — 2026-09-09

Removed time-driven soldier wobble. Formation separation now resolves stable desired slots rather than pushing rendered positions away and pulling them back each frame. Snapshot ordering is normalized; centers ease over at least 2.8 seconds and representative soldiers follow over 0.9 seconds. Stationary snapshots remain still, including squads marked moving without new displacement. This is presentation tuning; server movement/combat timing and discrete region arrivals are unchanged.

Calmer-motion validation: typecheck, all eight test files and build pass; isolated desktop/phone live-battle browser checks pass with no page errors or overflow.

## Group controls, cover, and camera — 2026-09-09

Decision 011: left-drag boxes friendly armies, Shift adds; right/middle drag and touch drag pan. Right-click orders apply to the selected group, reporting individual failures. WASD pans outside text fields; Escape clears selection and menus. Context panels now show only the selected region, army, or group. Infantry/garrison glyphs are smaller while vehicles and hit targets retain their size.

Friendly settlements and forts offer a right-click Take cover menu. Server cover orders persist through friendly travel; squads move toward the site, hold rather than chase, and gain a provisional defensive benefit once nearby. Orders/site ownership changes clear cover. Settlement interiors and sandbags/trench objects remain future work; this is army-level control through representative squads.

Controls/cover validation: full nine-file simulation/API suite and typecheck pass, including cover validation, positional damage reduction, friendly travel, persistence and loss/cancellation. Isolated desktop/phone browser flow passes group box-selection, group cover submission, WASD movement, Escape across polling, selection-specific panels, right-click orders and right-drag suppression. Infantry-scale screenshots reviewed.

## Direct local squad orders — 2026-09-09

Implemented server-owned local Move/waypoint/Hold orders on individual squads, with atomic group validation and routes constrained to each squad's current region. Commands persist across restart; enemy route data remains private. Detail-map squad clicks, Shift selection, right-click/Shift-right-click orders, route lines and Command-panel touch/coordinate controls are available. New army orders and retreat supersede local orders. Local paths avoid land boundaries/holes; terrain costs, building obstacles, directional weapons and line of sight remain deferred. See decision 012.

Local-order verification: full ten-file suite, typecheck and production build pass; isolated desktop/phone flows pass for selection, Move/append/Hold, map placement and Shift-right-click. Reviewed route display at 300% zoom. Local positioning, cover, army supply and campaign pacing need playtesting together.

## Dev blank-screen fix — 2026-09-09

Fixed map cleanup accessing app.ticker before asynchronous Pixi initialization finishes during React StrictMode effect replay. Cleanup removes the keyboard ticker only after initialization; the existing disposed-init continuation handles delayed teardown. Reproduced on Vite and verified desktop/phone initial mount, preview regeneration and reload without page errors. Typecheck/build pass. scripts/dev-map-smoke.ts exercises the development-only lifecycle without creating campaigns.

## Simple squad direction — 2026-09-09

Owner clarified fixed squad membership, squad health, optional multi-squad command groups, and mobile vehicles that stay mounted. Decision 013 supersedes the proposed transport/dismount hierarchy. The squad panel now defines infantry/mobile support/armor/artillery roles and shows normalized health. Existing independent squad commands remain. Legacy parent-army travel/logistics and aggregate health have not yet been migrated to fully standalone squads; no crew, transport or individual-unit management was added.

## Cross-region squad movement — 2026-09-09

Direct Move/Hold and waypoint routes now cross real shared territory edges continuously. Individual physical presence drives hostile engagements and capture; unselected siblings hold position when the group's old strategic plan is retired. Group selection issues the same squad command. The main panel no longer offers legacy army travel/sector orders; supply, withdrawal risk and air support remain group settings. Legacy API/bot movement remains compatible.

Direct capture consolidates for six hours; retreat uses a land route toward adjacent friendly territory. Supply/recovery follow actual squad locations, with shared reserves. Old headquarters loss does not relocate or surrender detached squads. See decision 013 for accepted direction, implementation and provisional limitations. Cross-region and existing simulation tests, typecheck and production build pass; browser verification is recorded in session notes.

## Actual starting squads — 2026-09-09

New campaigns start each nation at its capital with exactly two infantry squads of six assigned soldiers and one mobile infantry squad of two assigned vehicles. Each has its own 100-point squad health/order identity. The legacy campaign formation is now one-to-one with a starting squad, so it does not hide additional mixed squads, tanks or artillery. Explicit unit counts drive rendering; glyph counts no longer derive from strength for these squads. Panels name the squad type and assigned count. Existing saved forces/orders are deliberately preserved; start a new campaign to get this roster. Health remains squad-level, and displayed members stay assigned until the squad is destroyed.

Starting-roster validation: full twelve-file test suite, typecheck/build pass. Tests verify exact squads and rendered 6/6/2 members across 2/4/8 nations, separate orders, save/load and idempotent upgrades. Fresh desktop/phone campaign browser checks verify the squad inspector, zoom and screenshots without errors or overflow.

## Squad anchoring — 2026-09-09

At 260% zoom and above, per-squad health bars follow the rendered soldier formation, replacing territory-center counters. Idle server squads retain their current positions instead of continuously returning to a default formation; collision spacing, explicit travel/cover orders and combat movement remain active. Existing saves receive this behavior without resetting orders or positions. Regression coverage checks unordered starting squads across repeated ticks and upgrade.

## Vehicle movement profiles — 2026-09-09

Mobile vehicles now visibly steer through arcs; armor pivots before moving. Reusable walker profiles support omnidirectional movement with a rotating upper body, or fixed-body turning before travel. Individual vehicle headings and small stable turning-rate differences drive oriented silhouettes. Optional squad vehicleProfile metadata defaults safely for saved games. These are visual movement profiles; authoritative routes/combat and travel time are unchanged. Walker recruitment and physical turning penalties are not implemented.

## Functional command HUD — 2026-09-09

Reorganized the campaign UI around the reference composition: persistent resources/time at the top, unobstructed map in the middle, and a collapsible bottom command dock. Added a persistent friendly squad strip, side-by-side desktop selection/actions, health/morale meters, and phone controls-first stacking. Nation, dispatches, development and group support remain accessible. Dark panels and readable light labels replace the paper sidebar; no generated art or gameplay changes. Camera Fit/focus now use the map's available viewport. See decision 014 and `scripts/hud-browser.ts`.

Vehicle arrival correction: final sub-unit formation settling preserves body heading; turrets keep their last aim when no target is present. Relocation/reduced-motion updates preserve both existing headings. Vehicles do not turn to face tiny destination corrections.

## Compact HUD and stable selection camera — 2026-09-09

Removed the persistent force roster and replaced the large dock with a selection-only strip (94px desktop, 138px phone). Move/Hold and brief selected status remain immediately available. Secondary information uses paginated dialogs instead of internally scrolling sections. The map renderer now keeps the same viewport whether the dock is open or closed; selecting/deselecting no longer changes map position or scale.

Verification: `scripts/compact-hud-browser.ts` passes at 1440×900, 900×700 and 390×844, checking no roster/scrolling, compact height, exact camera stability through real squad selection/deselection, Hold submission, details and paging. Typecheck/build pass. This replaces the previous HUD browser layout expectations.

## Group command feedback and pacing — 2026-09-09

Drag selection now resolves to the selected squad IDs, so each member displays its confirmed path and waypoint markers at tactical and overview zoom. The map status reports how many selected squads have active move orders. Multi-selection displays an inspectable bottom-dock card per squad with health, count and order status.

New group move orders persist a shared movement identity. Server stepping caps members to the slowest living, moving member's current speed (including suppression); separate orders detach recipients. This synchronizes travel speed, not arrival time on unequal routes. Existing orders without group metadata retain their previous pace until reissued.

## Grand-campaign map scale — 2026-09-09

Doubled each map dimension without adding territories. Seeded growth-speed variance creates a wider mix of compact regions and hinterlands. Four sampled seeds show 5.0–9.1× 80th/20th-percentile area differences. Starting allocation now prefers viable components and peripheral expansion before junctions. Maximum zoom increased to 1200%; Fit and fixed selection camera behavior remain. Existing saves retain their geography. See decision 015: economy, supply and two-to-four-week pacing still require playtesting.

Grand-map verification: all 13 test files, typecheck/build pass. Isolated 1440px/390px browser checks pass for expanded previews, unchanged territory counts, preview/campaign equality, 1200% zoom and Fit. Local four/eight-nation generation spot checks measured approximately 0.4/0.8 seconds.

Overview squad icons now render inside the live squad layer, sharing interpolated positions with detailed soldiers across zoom levels. They no longer stack at territory centers. Pointer targets and drag-selection use the same rendered locations, including independent cross-region squads; legacy formations without tactical squads retain their fallback counters.

Single-squad selection now shows a compact role portrait, assigned soldier/vehicle count, current status badge, and labeled health/morale meters in the bottom dock. Group pace and suppression appear when relevant. The reusable SelectedUnitInfo component keeps these visuals separate from command actions and leaves room for additional stats.

Neutral garrisons render in sand, friendly squads in cyan and hostile national squads in coral. Neutral defenders no longer inherit the generic non-player enemy color. Campaign 76C6E04C's reported distant Cinder spawn was traced to this identity ambiguity, not a misplaced national squad.

## Neutral expansion space and tab resumption — 2026-09-09

Owner corrected the map-scale interpretation: increased territory count to 24 per nation (96 at four nations). Joint start planning gives each nation four connected regions separated by neutral land, preferring two neutral regions and allowing one when necessary. An initial growth phase reduces slivers while preserving varied territories. New campaigns only; see decision 016.

On window/tab return the client immediately refreshes authoritative state and resets soldier/vehicle interpolation. Long frame gaps and stale snapshot recovery snap to current positions rather than replaying fast catch-up movement. Hidden tabs pause rendering/polling. Request sequencing prevents older overlapping refreshes from overwriting newer ones. Existing server persistence remains authoritative; no save-schema change is required.

Expansion/resume verification: all 13 test files, typecheck/build and isolated desktop/phone resume + map-generation browser checks pass. Resumption retrieves current server revisions without changing the camera; unit tests verify exact pose snapping and smooth subsequent motion.

## Explicit squad targeting and scaled gunfire — 2026-09-09

Selected squads can right-click visible hostile squads or neutral garrisons with an attack crosshair. Server-validated target orders pursue visible targets, prioritize them within an engagement, stop inside firing range, and clear pursuit on target loss/destruction, Hold or a replacement move. Selected targets show a coral line and reticle. Attack metadata persists in local orders and enemy orders remain hidden.

Gunfire now originates from each representative member with independently phased firing clocks. Infantry defaults to semi-auto, mounted units to sustained fire, and armor/artillery to cannon fire; optional squad fireProfile supports burst and other weapon definitions. Rifle tracers and muzzle flashes are scaled to the smaller soldiers. Animation does not add damage or simulate individual bullets; no new gunner/assault recruitment types are introduced.

Attack hover now highlights the exact targeted enemy/neutral squad with coral brackets and a subtle halo when friendly units are selected. This preview is separate from the confirmed attack reticle and clears on pointer exit.

Visual firing cadence now varies per member and per firing sequence using deterministic seeds: irregular pauses, occasional semi-auto double-taps, 2–4 round bursts and 5–9 round automatic strings with variable shot spacing. Occasional skipped sequences produce breathing room, with subtle muzzle-flash variation. These affect presentation only, and remain stable regardless of animation frame rate.

## Steampunk settlement sprites — 2026-09-09

Hamlets, villages, towns, cities and metropolises now use distinct transparent top-down sprites with progressively denser Victorian-steampunk machinery. Overview sizes stay restrained; detail zoom grows the art enough to reveal boilers, copper pipes, pressure tanks, gantries and rail works. The earlier procedural building clusters remain as a loading/failure fallback, and settlement selection, labels and zoom thresholds are unchanged.

Runtime sprites are downsampled per tier to a combined 1.6 MB. Full-resolution steampunk sources and the earlier quieter Victorian set are retained under `docs/06-art/source/settlements/`. Typecheck, all 15 test files and production build pass. Browser review at 100%, 244% and 596% confirms texture loading and the intended scale hierarchy with no runtime errors.

## Settlement readability — 2026-09-09

Replaced noisy, screen-sized settlement PNG clusters with clean vector streets and roof blocks. Detailed settlements occupy fixed map-space footprints (scaled to geography dimensions for legacy saves), with no inverse camera compensation or capped detail growth. At overview zoom they use small town/city markers; roof accents emerge above 400%. Selection and garrison targets retain their feature coordinates and minimum click areas. Original art remains on disk for future art direction.

## Repeating biome ground textures — 2026-09-09

Four generated ground materials now fill plains, forests, highlands and mountains beneath the existing map overlays. Runtime uses four 512px WebP files (about 350 KB combined), shared world-space alignment and mirrored repetition to keep edges continuous. Textures are clipped to the existing biome/land geometry; loading failure retains solid colors. Existing campaigns benefit immediately. Original source art and prompts are retained in docs/06-art; repeat swatches live at /art/biomes/preview.html. Typecheck/build and desktop/phone texture-load, zoom/Fit and visual checks pass. No simulation changes.

## Seeded forest and mountain scenery — 2026-09-09

Triangle markers are replaced with an eight-variant transparent tree/rock atlas and deterministic biome-wide sprite generation. Woodland density varies spatially; mountains form rocky fields and highlands receive sparse outcrops. Placement respects the existing land/biome raster, river corridors and settlement-layout clearings. World-space scale and spatial chunk visibility keep camera changes stable and avoid drawing off-screen groups. Existing campaigns benefit immediately. This is cosmetic: no new collision, movement, cover or visibility rules. See decision 019 and the recorded sprite prompt.

Scenery verification: typecheck, all 17 test files and build pass. Desktop/phone browser checks cover sprite loading, woodland panning, close zoom/Fit and rendering errors. Reviewed the denser woodland pass and mountain silhouettes.

Mountain scenery scale refinement: rocky sprites now use roughly 2.1× their previous dimensions and a wider placement grid. Boreal/Ironfront samples drop from 126/246 rocks to 20/40, with average widths increasing from 160/164 to 351/349 world units. Coast/biome envelopes and river/city clearings remain. Trees are unchanged; existing campaigns receive the visual tuning on reload.

## Physical city capture — 2026-09-09

Settlements now have persistent controllers independent of region ownership. Selected living ground squads can right-click a non-friendly city, choose Capture, and follow the existing authoritative route to it. Control changes only after an ordered squad physically arrives within 24 world units and no hostile or neutral living squad contests that radius. Successful occupiers remain assigned as the city garrison. City icons use the controller's nation color and hover text names the controller; legacy settlements without a saved controller inherit their region owner until first capture. Territory ownership and land-area victory are unchanged. See decision 022.

Close tactical zoom now shows the terrain without national or selected-sector color washes. Ownership and sector tint fade progressively after strategy scale and reach zero at 400%, leaving more political context through ordinary tactical zoom. Borders, fronts, fog, selection outlines, and city ownership colors remain.

## Mountain collision and ground material blending — 2026-09-09

Visible mountains now have saved circular ground footprints used by server endpoint/segment checks and squad pathfinding. Direct movement, pursuit and retreat share obstacle-aware routing; stale paths reroute or stop before crossing a rock. Save initialization protects existing squads, settlements and indispensable land passages. The client draws the same saved placements. Ground is the default movement layer; air ignores mountain obstacles, and existing abstract air support remains unchanged. No recruitable aircraft or new line-of-sight system is added. See decision 020.

Replaced mirrored ground sampling with cached 1024px blended materials: shuffled, rotated and offset source patches with feathered edges. Larger world-aligned repeats reduce recognizable tile symmetry without extra downloaded art. Four cached generated textures use about 16 MiB of base RGBA storage. Source swatch preview is labeled separately from the in-game blend.

Verification: typecheck, 19 test files and build pass. Additional database reopen test passes. Desktop/phone biome checks pass; direct browser movement verifies the visible mountain detour and server rejection of an interior destination. Visual review confirms reduced repetition at overview and close zoom.

## Live infantry integration — 2026-09-10

Infantry and garrisons use the benchmark articulated model at close zoom. Shared poses and instancing follow authoritative squad motion; offscreen member animation and model submission are culled. Existing selection/orders, vehicle glyphs and fallback markers remain. See decision028 for limits and verification.

### Accepted urban warfare direction — 2026-09-10

Full-city generation must support fighting within cities, building/wall cover and player-created sandbags, barbed wire and anti-vehicle emplacements, with town-hall-centered city control. This is accepted architecture direction; the diorama does not yet implement these systems. Existing site-level cover, physical settlement capture and land-ownership victory remain unchanged.

### Full city preview — 2026-09-10

The `citywide` seed case now extends connected street-first parcels across the square tile using the existing building kit. It preserves the central town hall precinct, grows a taller commercial core, fills surrounding residential blocks and assigns waterfront industry. The gallery defaults to full cities; the diorama also exposes a Full city switch. Geometry-aware wedge models and tactical navigation/cover/construction integration remain unimplemented. See decision 047.

### Public city preview — 2026-09-10

Tailscale Funnel is configured in the background at https://brutus.tail250251.ts.net/ for the city-only compiled bundle. The entry page opens seed 732/full-city, with the seed gallery alongside it. No campaign/API proxy or unrelated preview pages are published. Refresh using the dedicated Vite public-preview config and preparation script; see docs/public-city-preview.md. The host must remain awake and online.

### Varied city and steampunk library — 2026-09-10

Full-city generation now replaces the inherited dock/canal with city parcels, perturbs shared junctions, and introduces occasional diagonal cross streets. Civic monument/fountain/garden arrangements vary by seed. The camera supports unrestricted horizontal rotation. The procedural kit adds 19 instanced models across towers, frontage buildings, workshops, derelict cars and street accents, with simplified distant detail. See decision 048; tactical cover/navigation remain separate work.

City streets now distinguish two-lane carriageways from paved sidewalks, with interrupted center markings at crossings. Camera controls: left drag rotates, WASD or right/middle drag pans, wheel zooms. The city-only public preview is served at https://brutus.tail250251.ts.net/ and refreshed from its dedicated build.

### Urban civic frontage and utilities — 2026-09-10

The full-city civic reserve now protects only the actual hall square. Surrounding fitted urban parcels replace all authored small home/shop lots. Bridge decks use the road surface and center markings. Added instanced manholes, valve stands and vent cabinets; up to eight manholes emit low steam using the existing particle batch. See decision 049.

### City tactical geometry inspection — 2026-09-10

The full-city preview now provides infantry/vehicle route inspection with obstacle outlines, candidate cover normals and a town-hall control boundary. Queries live in `cityTactics.ts`; civic walls share dimensions with rendering. This is prototype geometry, not campaign authority. Prop collision, full vertical traversal, construct placement and capture-rule integration remain future work. See decision 050.

Full-city movement trial: three selectable test soldiers spawn at the civic frontage. Click to select, right-click clear ground to route, Escape to deselect; the sidebar provides selection/focus and stop controls. Middle-drag/WASD pan while a unit is selected. Walking uses shared baked infantry poses and bridge surface heights. State is local to the preview and resets on regeneration; no campaign authority changes.

City-trial control update: left-drag box-selects (Shift adds), right-click orders the selected group, right-drag orbits, middle-drag/WASD pans. Movement is roughly one-third the original speed, with stride-driven bob/sway, interpolated poses and small checked path deviations. Group destinations are spaced; dynamic unit avoidance remains future work.

### Current city movement/cover trial controls

Three running infantry plus a tracked tank are selectable. Left-drag/Shift selects, right-click orders, and selected right-drag sets destination/facing with colored ghost previews for directional none/partial/full cover. Middle-drag orbits around the clicked ground point; WASD pans, with no mouse-pan binding. Sidebar focus is restored after non-text controls. Infantry traverse lawns; physical building footprints, walls/sandbags and water constrain movement. Stopped infantry take cover poses; local directional test-shot buttons exercise provisional protection values without changing campaign state. This supersedes the earlier walk-speed/right-drag-only-orbit controls. See decision 050.

Destination ghosts now fit around obstacles: blocked slots slide along nearby building/wall edges while preserving facing and unit separation. Cover colors are recalculated at the fitted positions. Search is bounded to 4.5 scene units; unreachable orders remain rejected on release.

Friendly tank/full and jeep/partial cover now follow live vehicle hulls in the local city trial. Directional attack queries remove protection for exposed approaches; preview facing is only an assumed threat direction.

Future combat direction recorded in decision 050: resolve cover separately for each actual attacker, with flanking and moving vehicle hulls; preview indicators are advisory. Server integration, battle-scale profiling and height-aware exposure remain future work.

## Countryside visual pass — 2026-09-10

Seeded woodland pockets, river-adjacent marsh pools/reeds, and small decorative farmsteads now fill suitable countryside at detail zoom. They respect land and infrastructure clearance and use existing chunk culling. No functional region types or saved-game rules change. Existing maps receive these details on reload. See docs/session-notes/2026-09-10-countryside-visuals.md for validation and the concurrent settlement-clearance test limitation.

Validation: all 119 tests pass; TypeScript checking and the production build pass. Verified the live preview at http://127.0.0.1:5173/ with Boreal and Map-e05fa536 at 244% zoom; the footer reports 28,800 × 19,200. Existing campaigns retain their saved maps.

### Cover-order responsiveness (2026-09-10)

Shipped: cover-aware move orders activate within 3 scene units of a cover surface (previously 1.1). Physical protection distance remains unchanged. Formation preview solves are capped at one per 80 ms, with local obstacle filtering, reused vehicle geometry, cached cover queries, and single-pass candidate ranking. Final orders still solve fresh. Tuning remains provisional.
Validation: 202 tests passed; typecheck/build passed. Full-city seed 732 benchmark: six infantry, 887 obstacles, 200 solves, mean 1.29 ms / p95 2.92 ms. This measures solver CPU time, not whole-game FPS. Browser courtyard order accepted for all six infantry.

## Shared city-skirmish vision — 2026-09-10

Shipped a server-filtered player view: living friendlies share 360-degree sight (40 scene units infantry, 45 vehicles; provisional). Buildings block sight through the existing spatial LOS index; low cover does not. Unseen enemies are omitted from API snapshots, model rendering, markers, picking and visible-enemy counts. Hidden attack IDs are rejected. Enemy routes are stripped; shot events require visibility at emission and snapshot time. No last-known contacts, terrain fog, hearing, or campaign visibility integration yet.

City vision validation: 205 regression tests, typecheck and build pass. Browser connection and visible count verified; the staged initial enemy squad is within shared LOS.

## City planning camera — 2026-09-10

Implemented an elevated orthographic planning view with Overview / Reset, Neighborhood and explicit Overhead presets. Normal planning elevation is 55 degrees, with orbit limited to 40–75 degrees; the Overhead preset permits a near-vertical view. WASD and Alt + middle-drag pan. Middle-drag orbits around the terrain point under the cursor, ignoring all building geometry; a missed terrain ray falls back to the focus projected onto terrain. Q/E rotates around the floor beneath the focus. Scroll down zooms in toward the cursor. Street view uses a narrower 36-degree perspective field of view.

Ten focused camera tests, TypeScript checking and production build pass. Browser checked Neighborhood and Overhead presets and updated control hints. See docs/05-decisions/city-planning-camera.md.

### City cannon damage correction

City shells use a fixed 120 base payload, scaled by target armor and distance from impact. An exposed infantryman at impact center takes 162 damage. Accuracy failures scatter 3.5–5 units instead of visually landing a harmless shell on the target. Five-second reload and building-blocked splash remain. This is provisional city-only tuning; campaign fire values are unchanged.

Close-range tank follow-up: stationary tank/target pairs within 12 scene units use direct impacts after turret alignment and LOS checks. Regression test verifies the first shell kills exposed infantry after flight.

## City battlefield awareness — 2026-09-10

Last-observed enemy positions are held on the server and shown as non-targetable dashed question marks after LOS is lost. They fade over 30 simulated battle seconds and clear on reacquisition, observed death, or revisiting an empty location. No hidden live position/health/route data is added to contacts. Selected friendly units show approximate 64-ray sight outlines clipped against buildings, refreshed at most four times a second. Physical visibility remains server-controlled. Contact lifetime is provisional.

Awareness validation: 216 passing tests, typecheck/build passed, browser checked the connected battle and selected-unit overlay.

## First construction UI — 2026-09-10

Shipped local placement prototype in the full city: Build opens a five-item menu (sandbags, barbed wire, artillery, warehouse, trenches). Selecting an item closes the menu and enables a colored ground preview; R rotates 45 degrees; click places; right-click/Escape cancels; Undo last removes the most recent emplacement. Footprint tests reject terrain/obstacle collisions, excessive slope, units and overlapping placements. Maximum 48 local placements. These are visual prototypes: no resource economy, construction timers, firing, terrain excavation, navigation/cover changes or persistence. Reload clears placements.

Physical sandbag/group pacing validation: 227 tests passed, typecheck/build passed, and browser placement accepted by the server.

## Country set-piece library — 2026-09-11

Added /country-poi.html with 24 seeded Victorian/steampunk templates using the existing city art kit, cover/collision records, crop parcels, road entrances, clearance inspection and JSON export. Includes small settlements, industrial sites, ruins, roadside services, military sites, orchards/hop gardens and six-parcel farms. The global Three.js study has conservative road-linked placement and site navigation; final Meridian audit accepts three river-clear sites. Detail cache holds at most six nearby POIs. Full tactical battles, resource output and campaign persistence are not integrated. See docs/02-systems/country-set-pieces.md.

## Ocean port districts — 2026-09-11

The full-city planner now gates cargo quays, bonded warehouses and a lower-rise harbor quarter on an adjacent typed ocean frontage. Inland and river-only cities retain their existing zoning. The coastal fixture includes an open ocean plane, quay walls, timber piers, cranes, cargo and coastal steam lighters using existing city materials. Preview: /city-diorama.html?case=ocean-port&seed=732, then Harbor. The battle API accepts the same ocean profile. Focused regression checks pass across three seeds; browser reviewed the waterfront. Detailed world-city placement and naval/port economy rules are outside this pass. See docs/05-decisions/ocean-port-districts.md.

Port validation completed: 234/234 full-suite tests plus the split-frontage regression pass; final typecheck/build pass. Browser shows the ocean port and ready skirmish.

## Curved ocean frontage — 2026-09-11

The ocean-port study now follows an ordered shoreline polyline with bays and outward bends. A bounded inland displacement curves the street/parcel network, while the existing fitter keeps buildings rigid and refits or rejects footprints that no longer clear their plots. The same forward/inverse mapping is used for rendered geometry, authoritative obstacles and the ground movement boundary. The civic and northern river anchors remain fixed.

Quays follow short shoreline sections. Each berth rotates its pier, crane, cargo and vessel toward the local sea normal; steep or sharply changing sections and berth envelopes that intersect land or neighboring docks are skipped. Ocean triangulation follows the same shoreline. Harbor focus uses the actual coast position. Inland/river/lake exclusion remains in force.

The local coastline must advance along X and remain within 48 units inland of its seaward reference; invalid reversals are rejected. This supports curved open coast segments, not closed harbors with overhangs or a complete world-to-city coastline placement pipeline. Piers and vessels remain scenery. Focused geometric, navigation and mesh-batching tests pass; browser shows the curved waterfront.

Curved-port validation completed: full npm test suite passed 246/246. The final exact-inverse projection passed the three focused coast/navigation regressions; the ocean mesh-batching regression also passed. Final typecheck and production build pass. Browser review confirmed curved quays, coast-following roads, rotated dock assemblies and a ready skirmish.

### Audio timbre, city reflections and range retune — 2026-09-11

Footsteps use a softer low-frequency heel/toe envelope with greatly reduced bright friction. Rifle reports have a shorter pressure crack, stronger 88–100 Hz body and darker mechanical/echo tails; cannon blast noise is also darker. One shared 0.72-second convolution impulse adds a restrained city reflection tail to one-shot effects; vehicle loops remain dry. Muting/pausing clears the shared reverb history, and the 32-source budget remains unchanged.

Rifle/cannon presentation cutoff distances increase to 2,800/5,600 model units with a gentler low-volume falloff, progressively dark filtering and a capped 2.5-second travel delay. Quiet-source culling can end audibility before these outer bounds. Authoritative hearing expands to 1,200/3,200 units; reported positions become 128-unit cells beyond 160 units and 256-unit cells beyond 640 units. Hearing remains observer-authorized and never enables targeting. These ranges and timbres are provisional listening adjustments, not calibrated real-world acoustic distances.

## Varied rifle reports and simultaneous city firefights — 2026-09-11

Shipped: rifle reports use independently hashed sample choice, playback rate (1.06–1.24) and gain (0.88–1.12), plus varied transient/body decay across the four baked samples. Rifles include a 65-unit acoustic stand-off in the camera distance calculation, making even close overhead views quieter and darker while preserving a slightly higher underlying pitch. Cannon playback pitch and gain tuning are retained. These are provisional listening adjustments.

Infantry muzzle flashes now originate from the animated rifle barrel tip, use a small elongated flash and remain visible for 85 ms. They reuse the existing instanced effect pool without point lights, and remain restricted to disclosed visual shots.

Stage multiple firefights opens the optional battles=multiple city configuration. The server and local roster generator find two additional separated, walkable six-infantry engagements with clear opposing firing lanes. Seed 732 stages 25 total units: the original six friendly infantry/tank versus six enemies plus two three-versus-three fights. Sites are at least 75 units apart; unsuitable sites are skipped rather than placing troops inside obstacles. All use normal authoritative targeting, damage, visibility and hearing, with no fabricated ambient shots. Main squad/West/East buttons focus sites; Restage firefights reloads a fresh paused scenario. This is simultaneous fighting inside one city, not a global campaign battle-event service. Existing default staging remains unchanged.

Focused validation: 10 audio and multi-battle tests pass, including real shots and casualties from both extra sites. Browser verified 13 friendlies/12 visible enemies at start, Sound enable, run/pause, and West/East focus. Full regression/build checks recorded below when complete.

Rifle distance-muffling follow-up (2026-09-11): rifle low-pass now falls more steeply (about 1.5 kHz at minimum stand-off, 385 Hz at 180 horizontal units, settling at 140 Hz far away). Existing rifle loudness/range/delay, cannon/impact mix, and voice budget are retained. Provisional listening tuning.

Follow-up: road proximity no longer changes navigation cost; all traversable ground has equal cost. Every visible living soldier supplies a selection hit target mapped to its parent squad, with duplicate marquee hits collapsed to one squad selection.

## Dense forests and continuous woodland LOD

Accepted: broad, dense low-poly forests at the existing tree scale, with roads and rivers cutting through them. Generation now uses broad irregular woodland fields and spaced, jittered trunks rather than isolated eight-tree clusters. Infrastructure footprints remain clear; forests continue on both sides. Nearby trees use instancing and spatial culling. Beyond the detailed area, occupied patches use low-poly canopy geometry, selected per tile rather than a global zoom switch, so woods remain visible at shallow angles. Forest ground shading follows the same density field. Density and LOD distances remain provisional visual tuning. No new trunk collision rules were introduced.

Country presentation follow-up: corrected snapshot rewind by including pending encounter movement time in render projection; covered by repeated-snapshot infantry/tank regression.

Shared soldier idle follow-up: breathing and relaxed weight shifts now remain available in both playable scenes while waiting for orders; aimed/covered stances retain reduced breathing.

Country slice now supports restarting completed encounters; verified restored troops and live movement, left paused at normal pace.

Armored forest movement: country tanks now slow from 72% in sparse woods to 35% in dense woodland, retain 90% speed on roads and full speed in developed clearings. Campaign armor squads move at 40% local speed in forest regions, and mobile armies take four hours through forests instead of the two-hour plains rate. Individual trees remain non-colliding.
