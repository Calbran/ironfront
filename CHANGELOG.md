# Changelog

## 2026-09-13 — Regional landscapes, cities and strategic readability

- Add version-3 campaign geography with hamlets through metropolises, connected urban blocks, industrial quarters, satellite settlements and expanded countryside facilities at unchanged building scale.
- Replace regional checkerboard farm stamps with irregular adjoining parcels, shared crop containment, terrain/river clearance and road-led orientation; broaden woodland patterns and refine terrain/coast sampling.
- Add rank-based label budgeting, grouped disclosed formations, emplacement markers, regional street overlays, natural landmark names and searchable Places.
- Batch developed plots and bound detailed metropolis residency around the camera. Preserve version-1/2 saves and expose Explore the new world for an independent new command.
- Keep additional scenic places separate from income/capture objectives. New scale and density remain provisional tuning.

## 2026-09-13 — Strategic survey-map art

- Add a generated, tileable survey-map material set for plains, forests, highlands, mountains and ocean, with restrained olive, umber and slate-blue inks suited to the campaign's industrial field-map presentation.
- Blend those materials from the campaign's existing forest and relief data at continental zoom while retaining the physical miniature surface at tactical distance. Ownership now reads as a translucent political wash over the terrain instead of replacing it.
- Add an isolated desktop/mobile browser regression for the production Three.js campaign. The retired Pixi renderer remains unchanged.

## 2026-09-13 — Strategic campaign rendering performance

- Batch every distant campaign settlement into one instanced strategic layer, retaining per-settlement silhouettes only for close streaming.
- Restore a two-cell continental terrain LOD, skip invisible close-ground shader work, use mipmapped mountain grain in place of per-fragment hash noise, and cap strategic rendering at device pixel ratio 1 while preserving the detailed tactical ratio.
- Cache label projection and POI residency work until the camera changes. Forward wheel input from clickable settlement labels into the shared cursor-anchored zoom controller, so hovering a nametag no longer blocks zoom. The full campaign benchmark improved from 30.3 ms to 6.1 ms median overview frame time and from 394 to 15 draw calls; close-city timing remained 6.1 ms.

## 2026-09-12 — Campaign mountain materials

- The shared Three.js country terrain now uses authoritative mountain coverage to blend vegetated foothills, exposed rock, scree and elevation strata. Broad warm/cool stone variation differentiates ranges, while scale-aware procedural sampling preserves the material from tactical to continental zoom without additional draw calls.

## 2026-09-12 — Strategic terrain cross-hatching

- Restored terrain cross-hatching on the full campaign map. Strategic zoom now cross-fades between world-anchored power-of-two stroke scales, while the country slice keeps its existing close-range ink and overview fade.
- Kept hatching terrain-only, slope- and daylight-driven, and derivative-filtered to avoid distant moiré without adding geometry or render passes.

## 2026-09-12 — Full scale-test campaign map

- Connected the actual Meridian continent and shared physical scale to new persistent Three.js campaigns, with unscaled tactical cities/towns, farmland, roads and cover.
- Added bounded shared forest tiles, continental road routing and local cover queries. Kept version-1 campaign saves on their original geography and added a full-continent start action with retained session keys.
- Added whole-landmass framing, scalable minimap marks and label clipping. Fixed a shared animation crash when a snapshot arrives after the current animation-frame timestamp.
- Added full-scale, forest residency, route safety and mixed-version persistence tests; extended the existing production browser check with `--massive`.

## 2026-09-12 — Persistent campaign alpha

- Promoted the shared tactical country scene to the main campaign entry, with expanded geography, persistent faction rosters, continuous combat, terrain/vision, common animation/effects/audio and coarse distant hearing.
- Added background server simulation, versioned geography and atomic alpha saves while preserving older worlds. Added territorial occupation, provisional supplies, a minimap and physical sandbag construction.
- Removed the renderer's four-friendly-unit assumption, shared emplacement models and reused immutable woodland samples. Documented multiplayer/economy/reinforcement/other-emplacement and continent-scale gaps explicitly.

## Three.js production campaign — 2026-09-12

- Make `/` the authoritative Three.js campaign and use Three.js for the lobby map preview.
- Remove the in-game Pixi/Three renderer switch and lazy-load Pixi only from the archived `/legacy.html` entry.
- Establish the campaign map as the single persistent battlefield; the country slice remains an isolated test harness.
- Record Three.js as the required target for campaign, country and tactical presentation work.

## Staggered infantry fire — 2026-09-12

- Reduce authoritative rifle and LMG cadence by one in every ten otherwise-ready shots, using a persisted deterministic phase per soldier.
- Spread each squad's muzzle flash, tracer, recoil and report across a stable per-soldier window below 200 ms.
- Preserve authoritative shot times when several 250 ms country-combat volleys arrive in one snapshot, replaying them in order within a bounded 650 ms window instead of collapsing them into one firing line.
- Preserve tank and anti-tank reload timing and all existing visibility filtering.

## Universal tactical tracers — 2026-09-12

- Give every disclosed rifle, machine-gun and tank projectile a short moving tracer in the shared city/country effects layer.
- Add a 2.2-unit trail behind the existing visible tank shell and retain a shorter 0.65-unit bullet streak.
- Start trails at the animated weapon muzzle socket when available so launch direction remains readable without creating persistent beams.

## 2026-09-12 — Physical bridge traversal

- Share one raised bridge/deck/ramp height contract across road rendering, unit placement, path guides and navigation grade checks.
- Raise and thicken the country bridge deck, align its rails to the walking surface and smoothly join both road approaches.
- Keep infantry and tanks inside the physical deck width while preserving water blocking everywhere else.

## Elevated airship reconnaissance — 2026-09-12

- Raise the scout airship from 25 to 45 model units and evaluate terrain sight from that same flight altitude instead of infantry eye height.
- Let airships observe over ground-level buildings and individual tree crowns while retaining target forest concealment, night range reduction and obstruction by sufficiently high terrain.

## Country group movement pace — 2026-09-12

- Carry the city battle's shared movement-group identity into country-slice squad expansion and persistence.
- Pace every grouped soldier, tank and airship to the slowest moving member, including waiting while a tank pivots and responding to terrain or firing slowdowns.
- Preserve the shared pace in fractional client playback; a separate unit order detaches that unit from its former group.

## Authoritative night reconnaissance — 2026-09-12

- Persist the country slice's Cycle, Day and Night lighting mode and use it in server-side enemy filtering and encounter target acquisition.
- Scale country vision continuously with the shared 20-minute daylight cycle; fixed night reduces nominal infantry, tank and airship sight to 45%.
- Draw selected-unit vision rings from the same daylight-adjusted range used by authority, and remove contacts beyond current detection range.

## Tactical unit selection hitboxes — 2026-09-12

- Select tanks and other tactical vehicles through their complete projected model bounds with additional screen-space padding in city and country views.
- Increase infantry's per-soldier click radius to 30 pixels while retaining individual member targets for overlapping squads.

## Squad selection outlines — 2026-09-11

- Replace infantry's aggregate-position selection circle with a rounded, terrain-draped outline around every living squad member.
- Rebuild the boundary from interpolated display positions so it expands and reshapes with moving formations.

## Country road centerline smoothing — 2026-09-11

- Collapse short pathfinding-grid reversals into longer, clearance-checked road segments before rounding corners.
- Preserve road endpoints, network junctions, terrain and grade avoidance, settlement clearance, and straight bridge approaches.
- Use a broader smoothing window for highways than local roads so regional routes read as intentional alignments without erasing large terrain-driven bends.

## Shared tactical weapon profiles — 2026-09-11

- Replace tactical hard-range-only tuning with shared rifle, LMG, early rocket-launcher and tank profiles.
- Add continuous accuracy and damage falloff between effective and maximum range, plus role-specific movement accuracy, suppression, effectiveness, magazines and reloads.
- Use the profiles in city and country authority, expand city infantry observation to the shared tactical vision scale, and retain visibility/exposure checks before acquisition.
- Draw strong effective and faint maximum firing rings for selected country units.

## Country reconnaissance and forest concealment — 2026-09-11

- Filter country encounter responses so unseen enemy units, their orders and unauthorized shots are absent from player state.
- Give infantry, tanks and scout airships distinct vision ranges; use nearby generated forest density to reduce ground observation and conceal targets from both factions.
- Show selected friendly units' current vision and shared firing radii as terrain-draped cyan and amber rings.
- Make close-view airship clicks follow the projected model bounds instead of a small point at the model origin.

## Extended tactical unit visibility — 2026-09-11

- Keep city and country ground-unit models visible beneath map badges until they fall below 1.25 pixels per world unit, roughly 2.4 times the previous camera distance.
- Preserve existing badge timing and the airship's tenfold model-visibility distance.

## Tactical weapon ranges — 2026-09-11

- Increase tank cannon range from 38 to 220 model units, equivalent to 400 metres at the tactical scene scale.
- Increase rifle infantry's effective range from 26 to 110 model units (200 metres), while retaining a separate early rocket-launcher role.
- Apply the shared role ranges to city and country combat, and align city tank sight with direct-fire range while retaining exposure checks.
- Bound long direct-fire visibility work to spatial cells crossed by the shot, retaining exact obstacle intersections.

## Country squads, shared tactics and river banks — 2026-09-11

Country infantry now consist of six independently persisted soldiers grouped for selection. Live placement previews and authoritative destinations share the city battle placement solver; cover reactions, cover quality, infantry stepping and preview colors/poses also use shared helpers. Dragging updates local ghosts without delayed server-preview swaps. Members retain individual paths, health and reload state; dead members no longer move.

The optional Deploy encounter review adds bridge/outpost objectives, authoritative fixed-step combat, saved casualties/projectiles/reloads and restart catch-up. Capture timing, force composition and a ten-minute encounter bound remain provisional review tuning, not campaign victory rules. River banks gain earth/sand, rocks, reeds and sparse lily pads with distance culling.

Routing follow-up: removed the forced city-road portal for crossing settlement boundaries. Clear terrain routes go directly; obstructed crossings use the shared sector lattice and clearance checks. Existing queued routes are retained; issue a new order to replace an old detour.

## 2026-09-11 — Country atmosphere and ground depth

- Fade close-view hatching to half strength and twice the line density, smoothly blending fixed world-space patterns.

- Add a procedural day/night sky, drifting clouds and matching soft ground shadows.
- Add broader ridges/hills and a sloped river channel with a submerged bed; migrate sector geometry to version 9 and keep bridge decks above water.
- Add close-range soil/grit/pebble detail and clustered grass blades, retaining distant culling and simplified terrain.

## 2026-09-11 — Country daylight, windows and slope hatching

- Soften hatch contrast slightly and thin strokes at close zoom while retaining distant readability.

- Strengthen terrain hatching for gentle hills, widen strokes, and retain shading through the sector overview instead of fading with ground texture detail.

- Brighten day lighting while preserving night intensities; connect country dusk to city and shared-kit illuminated windows.
- Add sun-responsive slope crosshatching, filtered and faded at distance without extra geometry or shadow passes.

## 2026-09-11 — Relief, day/night and shared infantry routes

- Add gentle authoritative hills, blended settlement clearances and riverbank approaches; migrate sector geometry to version 8.
- Reduce ambient brightness, add day/night lighting controls and simplify distant ground colors and mesh detail.
- Replace repeating surface bands with seeded value noise.
- Share infantry route variation between the city battle and country slice, with separate guide lines and exact endpoints.

## 2026-09-11 — Miniature ground style

- Simplify country ground into broad muted color patches with subtle grain, matching the low-poly models instead of the more realistic painterly reference.

## 2026-09-11 — Refined country landscape

- Extend the refined diorama palette, grass/shrub/rock accents and scaled tree/pine groves across the country slice.
- Add meadow/dry-ground variation, slope coloration, blended grain and camera-following soft shadows.
- Keep fine scenery near the camera and use simplified grove shapes at distance; preserve infrastructure clearance.

## 2026-09-11 — Tank steering and off-road routes

- Remove the city vehicle road/plaza whitelist while retaining obstacle, water and slope checks.
- Simplify and round vehicle routes with collision-checked corner curves, shared between city navigation and the country sector.
- Allow sector tanks to steer while moving through gentle bends; retain bounded tread pivots for sharp heading changes.

## 2026-09-11 — City outskirts and distance presentation

- Extend lower-rise outskirts around a proportionally smaller downtown without enlarging buildings; retain road clearance and sidewalk access.
- Texture occupied suburban blocks with developed ground, transitioning to individual pads at the fringe.
- Preserve source building material colors and appearance tints in instanced distant silhouettes.
- Keep unit models visible through the marker transition and retain airships ten times farther than ground units.
- Advance sector geometry to version 6 so saved routes migrate safely to the changed layout.
- Keep satellite towns visible using persistent, colored low-detail building batches.
- Align bridge approaches to their physical decks and raise the road surface over the crossing; remove the competing stretched deck texture. Geometry version 7 migrates prior routes.

## 2026-09-11 — Shared tactical interaction contract

- Make the city battle's controls canonical across the city and playable country-sector tests.
- Share marquee selection, terrain-anchored middle orbit/right-drag facing, inverted cursor zoom and WASD/Q/E camera navigation.
- Replace sector destination crosses with translucent unit ghosts while retaining server route validation and queued Shift orders.
- Attach city battle overlays through their owned viewport host so delayed scene generation survives canvas replacement.
- Keep perspective zoom responsive with a cursor-anchored ratio; cull distant unit models behind shared tactical markers.
- Swap detailed city buildings and streets for two silhouette draw calls, and detailed country roads for highway lines, at sector overview distance.

## 2026-09-11 — Country sector RTS controls

- Add box selection, right-drag formation facing and server-validated route previews; keep Shift for queued orders and additive selection.
- Bind middle-drag to camera orbit while keeping selection on left-drag and orders on right-drag.
- Sample server-approved movement continuously between snapshots instead of stopping after each short interpolation.
- Persist final facing and retain bounded tank turning; preview requests do not commit orders.

## 2026-09-11 — Contextual city edges and country street presentation

- Share diorama architecture/paving with a separately seeded, size-driven inland settlement; remove the copied canal and empty paved blocks.
- Taper outskirts into smaller sidewalk-aligned buildings with individual developed yards; add a fuel/provisions stop.
- Integrate the existing offline OpenStreetMap adapter for Riverward town, with attribution and downloadable Painswick source.
- Remove square city/POI display bases in the sector. Share carriageway grain across city/country/POI roads and stream highway lines, curbs and continuous powerline spans near the camera.
- Order road depth layers and adjust camera depth precision to reduce road flicker. Preserve the React root across development updates.
- Trim unserved road spurs and empty redundant loops; preserve building access and ease the city exit into the highway through a shared curb opening.
- Match server routing to the generated street/building plan and safely migrate obsolete saved routes.

## 2026-09-11 — Persisted playable country sector

- Add a geographically anchored city–hamlet–bridge–outpost proof, linked from the pacing preview.
- Add authoritative individual/group movement, queued routes, cover positions, bounded tank turning and direct air movement.
- Persist sector sessions and routes in SQLite; catch up server time across reload/restart and snap long browser snapshot gaps.
- Batch district buildings/streets, stream nearby POIs and fix country-road sockets that remained inside reserved footprints.

## 2026-09-11 — Country highway and local road network

- Generate shared terrain-following highways and local branches to cities, hamlets, farmsteads, outposts and base candidates in the physical pacing preview.
- Connect POI entrances, bridge river crossings, clear crop parcels and place roadside detail along the network.
- Preserve local model scale and report inaccessible destinations; authoritative campaign movement is unchanged.

## 2026-09-11 — Connected country terrain

- Replace isolated mountain circles with a shared geographic height surface, broad ranges, foothills and river valleys across territory borders.
- Carve reserved sites and the review road locally; preserve authored model scale and coastlines.
- Add terrain-range navigation and a marker visibility toggle; share mesh height sampling with camera clearance.
- Remove the superseded circular relief and artificial east/west pass/tunnel preview; campaign routing remains unchanged.

## 2026-09-11 — Refined corridor and mountain studies

- Reuse refined ground grain; stream bounded local roadside grass, shrubs, stones and trees.
- Add terrain-mesh ranges/hills, open pass valleys and a hollow cut-and-cover tunnel review asset.
- Extend camera clearance to relief and add direct review controls; authoritative mountain travel remains unchanged.

## 2026-09-11 — Pacing camera ground limit

- Prevent cursor zoom and orbit targets from passing beneath the flat preview map; retain fast country zoom and constrain camera clearance to four model units.

## 2026-09-11 — City–farmland–outpost corridor

- Add one deterministic, conservatively validated review road joining local entry sockets at unchanged road width.
- Clear intersecting crop parcels, add sparse roadside trees and an overview route guide, and expose walking ETA and destination focus controls.

## 2026-09-11 — Farmland districts and compact country POIs

- Integrate seeded multi-parcel farmland expanses into the physical pacing map, preserving local building sizes.
- Reuse country-kit compact settlements, farms and industrial/frontier sites with six-site bounded detail loading.
- Add terrain/river/reservation checks, scenery-only labels and dedicated review controls; no economic or ownership changes.

## 2026-09-11 — Readable country map navigation

- Add screen-sized named location markers with click-to-focus and crowded-label handling.
- Add cursor-directed adaptive wheel zoom, 4× zoom controls and Fit country.

## 2026-09-11 — Physical countryside scale

- Add physical/compact pacing-world comparison with 171.6× anchor separation and unchanged local model footprints.
- Compare physical infantry walking ETAs against strategic estimates; preserve animation and live movement rules.
- Add centered rendering, logarithmic depth and focused scale regressions. Full city/countryside integration remains future work.

## 2026-09-11 — Soldier and tank world scale review

- Add existing infantry and tank models at the diorama military scale to the pacing world's city edge.
- Add a dedicated focus option and identify static references with colored rings.

## 2026-09-10 — 3D pacing map review

- Render the exact in-memory pacing geography and placements in Three.js with instanced Victorian miniatures and resource markers.
- Add focus selection and orbit/pan/zoom, preserving footprint scale and existing routing.
- Label flat terrain and representative city layouts as schematic, not final tactical geometry.

## 2026-09-10 — Viable starting-zone fallback

- Search alternative zones when a player has no resource-viable base candidate; keep already viable players viable.
- Remove rejected sample points from the selectable preview and explicitly flag unsolved maps.
- Audit five seeds for every selectable candidate's resource access, city access and shared exit-region indicators.

## 2026-09-10 — Map-wide regional cities

- Remove guaranteed per-player regional city slots and attempt five independent map-wide cities, preserving existing settlements.
- Show shared cities in every start's route/economy study; allow variable city travel times without penalizing nearby-resource checks.

## 2026-09-10 — Resource extraction and production study

- Replace generic nearby-objective roles with typed fuel, industrial and agricultural sites and map legend colors.
- Add an isolated construction/income sandbox with baseline home production, site control/connection gates and stronger city works.
- Test cost deductions, construction completion, suspended income, deterministic time advancement and immutable state.

## 2026-09-10 — Timed world settlement placement

- Add experimental route-timed settlements and objectives to the full-world pacing preview, retaining original city footprint sizes.
- Test a clearly labeled 6× strategic movement multiplier only in the study; live movement is unchanged.
- Audit all displayed candidate starts and report failed placement slots instead of forcing invalid sites.

## 2026-09-10 — Starting-zone pacing study

- Record player-selected home-base zones, baseline economy direction and provisional travel-time targets in decision 031.
- Add an isolated preview with proposed starting zones, sampled legal land points and existing infantry route-time overlays.
- Report target mismatches without modifying campaign speeds, ownership, saves or economy.

## 2026-09-10 — Restore floor orbit anchoring

- Restore cursor-based floor/terrain anchors while excluding building surfaces; use current focus if the floor ray misses.

## 2026-09-10 — Stable orbit and soldier idles

- Replace click-surface orbit with the current camera focus; preserve terrain movement orders.
- Add small staggered breathing and sway to relaxed soldiers, suppressed by running, aiming and cover.
- Verify fixed-target orbit and bounded/context-sensitive idle motion with regression tests.

## 2026-09-10 — Distant city unit markers

- Add zoom-aware infantry, tank and jeep badges above the city rendering, with selection highlights and ground-position leader lines.
- Separate overlapping badges; support click/Shift-click selection and double-click focus, fading icons out near units.
- Test orthographic/perspective visibility and badge separation; verify selection and close-range hiding in the browser.

## 2026-09-10 — Close street camera

- Add perspective Street View alongside the saved orthographic Planning View.
- Focus street inspection near selected units, slow street panning and adapt picking/LOD to the active camera.
- Reveal selected units through a dithered building cutaway without extra transparency draw calls; exclude revealed surfaces from orbit picking.
- Add perspective anchor and cutaway reset regression tests.

## 2026-09-10 — Natural city orbit pivots

- Pivot middle-drag around the clicked visible roof, wall or ground surface, excluding hidden detail models and transparent effects.
- Use a stable view-target plane for empty-space clicks; preserve screen anchor, zoom and camera-target distance.
- Retain terrain picking for movement orders; add regression checks for surface selection and stable orbit framing.

## 2026-09-10 — City streetscape and distant nighttime detail

- Allow tanks and jeeps to traverse the shared rendered civic paving; preserve gate clearance, walls and planted-bed exclusions.

- Add tram shelters, lit trade signs and rooftop tanks/service pipes.
- Batch soft pavement light pools for street fixtures and signs at dusk, keeping real point lights bounded.
- Retain glowing windows in distant models as flat quads with matching room seeds.
- Separate tower cornice/deck top planes to fix roof flicker; adjust snow clearance.

## 2026-09-10 — Victorian city variety and refined surfaces

- Add seven distinct tower, terrace and industrial appearances, seeded facade tints and two tree proportions to the shared miniature kit.
- Apply shared generated-world grain to city ground, soil, paths and planting; add bounded tree-side pebbles and grass tufts with infrastructure clearance.
- Add an infantry-scaled patrol airship above the skyline, animated propellers and an Airship inspection camera.
- Verify model envelopes, TypeScript, production build and full-city browser views.

## 2026-09-10 — Infantry-referenced city props

- Correct oversized benches and civic walls/pillars, including shared obstacle widths.
- Normalize street furniture, parked cars, hedges, lamps and small industrial props against city infantry; preserve manhole surface height.
- Record the scale audit and shared prop dimensions.

## 2026-09-10 — City camera mouse binding

- Moved click-anchored city-camera orbit to middle-drag, including while units are selected.
- Kept right-click/right-drag exclusively for movement and facing orders; city-camera panning remains on WASD with no mouse-pan binding.

## 2026-09-10 — Inverted diorama zoom

Reversed zoom direction in the city and animation dioramas: scrolling down zooms in, scrolling up zooms out.
Increased city maximum zoom from 8 to 12 and reduced the animation camera's closest distance from 5 to 3 for closer model inspection.

## 2026-09-10 — Tracked city tank turns

- Replace infantry-style tank steering with limited-rate track pivots followed by forward acceleration.
- Animate left/right tread links from actual forward travel and heading change, including counter-rotation while pivoting.

## 2026-09-10 — Anti-tank rocket team

- Added a launcher-equipped infantry actor and two-person rocket-team station to the animation diorama, with projectile/trail, launch smoke and reload presentation.
- Added a focused camera and retained original infantry scale.

## 2026-09-10 — Longer running strides

- Rebuilt the review run with longer contact/push-off strides, higher heel recovery, airborne intervals and stronger hip/shoulder counter-rotation.
- Slowed the cycle from 0.48 to 0.8 seconds while increasing travel from 1.44 to 2.6 model units/second; kept the armed grip.

## 2026-09-10 — Cover firing and tank shot weight

- Keep low-cover infantry in position and fire over sandbags; reserve edge peeks for tall cover, with muzzle-clearance regression checks.
- Increase tank barrel recoil, add a small recovering hull kick and expand shot smoke with a lingering fade.

## 2026-09-10 — LMG automatic-fire presentation

- Replaced rifle-paced LMG shots in the diorama with rapid eight-round bursts and short pauses, braced recoil, stronger muzzle flashes and tracers.
- Enlarged the review weapon's receiver, cooling shroud and drum; retained soldier scale and reload behavior.

## 2026-09-10 — Military animation diorama

- Added a standalone, infantry-scaled animation review with all military model types, cover props and a jeep.
- Added reusable infantry pose sampling for run/crouch/lean/reload, LMG drum changes, moving tank tread links and separate recoil pivots.
- Added timeline scrubbing, frame stepping, slow motion and focused cameras; existing campaign animation tables retain their default inputs.

## 2026-09-10 — Tailscale preview access

Pointed the existing Tailscale Funnel at the live model preview on port 5181 and allowed the Funnel hostname in Vite. The public military-preview page and its JavaScript module now return HTTP 200 instead of Vite's host-validation 403.

## Documentation and main integration

- Consolidate the miniature-city roadmap with ordered stages, acceptance criteria, code/test entry points and performance limits.
- Correct stale default-layout and branch-only descriptions; document preview URLs and the opt-in campaign renderer.
- Integrate the development studies without changing Pixi as the default or enabling prototype gameplay rules.

## Experimental branch — urban surface overlap fix

- Remove coplanar foundation/facade and roof/parapet faces from tall urban buildings.
- Separate window mullion edges and adjust winter roof coverage for the revised slab.

## Experimental branch — dense steampunk districts

- Grow commercial, residential and industrial blocks from the crafted neighborhood with checked placement and shared developed surfaces.
- Add deep urban buildings, height/roof variants, construction shells, cranes and selected raised alley walkways.
- Differentiate maintained commercial areas from cluttered service alleys; add emissive windows and capped instanced chimney smoke.

## Experimental branch — crafted neighborhood

- Add a default 28-building composition with raised civic/residential blocks and a lower warehouse quay.
- Use continuous developed surfaces, connected paving and shared elevation for buildings, roads, props and units.
- Validate block clearance, flat foundations and entrance orientation; preserve larger city comparison options.

## Experimental branch — street cleanup

- Prune the imported street graph after selecting lots, retaining frontage access and connecting routes with three principal outward approaches.
- Remove disconnected empty streets and unused spurs; reassemble road runs before placing lamps and vegetation.

## Experimental branch — integrated town hall

- Reduce the hall and civic square, bring surrounding frontages closer, and add pedestrian approaches to nearby streets.
- Reuse neighborhood brick/slate materials and add side windows while retaining the clock-tower ownership landmark.

## Experimental branch — real-city organic layout

- Seed the large-city study from a bundled, attributed Ancoats street/canal extract; add a repeatable offline converter.
- Fit closer street-facing model footprints, canal workshops, open pockets and rural housing.
- Add procedural cobblestones, merged steampunk lamps and raised canal crossings.
- Add deterministic count, frontage, building overlap and open-space checks.

## Experimental branch — large-city scale study

- Add a standalone 160-building diorama with a capital landmark, civic/market/residential/industrial areas, supply yard, infantry and jeeps.
- Add city/street density comparisons through 1,024 buildings, winter views and a repeatable local benchmark.
- Record capital-based capture as accepted direction with ownership semantics still unresolved; no campaign capture rules changed.

## Experimental branch — settlement patterns and road entrances

- Attempt terrain-aware plans across preview settlements, with farming/riverside/industrial patterns and size-dependent density.
- Record regional-road entrances, constrain main streets to existing road segments and keep neighboring planned lots apart.
- Retry bounded dry centers before using a labeled legacy fallback; expose rollout counts and pattern labels in the preview.
- Extend pattern, frontage, entrance and multi-town overlap checks, with repeat-seed audits and browser captures.

## Experimental branch — terrain-aware town generation

- Plan one riverside town from existing road access, connected streets, safe lots and street-facing model roles.
- Order preview routes/crossings before towns and fields before final vegetation clearance; cache presentation rivers and instrument worker stages.
- Reduce legacy riverfront repair work through local segment filtering and cached dry-building checks.
- Add deterministic, dry-lot, frontage and overlap checks plus repeatable generation profiling.

## Experimental branch — roads over water

- Clip town and intercity road ribbons at riverbanks with full-width clearance, retaining raised bridge geometry.

## Experimental branch — riverfront placement

- Relocate decorative buildings off rivers using model-footprint clearance, dry-land checks and nearby street/building avoidance before generating fields and scenery.

## Experimental branch — river and region-edge refinement

- Rounded preview river bends, joined strip edges and shared those paths with channel/riverbank placement while preserving bridge approaches and mouths.
- Blended terrain height, color and grain into neighboring ground, including winter; cached repeated terrain vertices during construction.

## Experimental branch — live Three.js and generated landscape

- Added an opt-in live map adapter using existing authoritative snapshots and command callbacks, with Pixi retained as default.
- Added a repeatable real-server soak with movement/attack checks, recurring orders, camera transitions and resource sampling.
- Added a bounded generated-region landscape study with terrain shaping, worn ground, riverbank scatter, real field parcels, fences and bridge decks; summer/winter and baseline comparison remain available.

## 2026-09-10 — Infantry rendering and performance prototype

- Added a standalone map-overlay infantry preview with small low-poly models, independent squad motion and firing cadence, instanced geometry, and shared cached animation.
- Added a repeatable 500–4,000-soldier rendering benchmark with viewport/count validation, cancellation, and measured performance history.
- Published this as an isolated visual prototype, without changing campaign simulation or the live unit renderer.

## 2026-09-10 — Grand scale applied to the running project

- Identified D:/ironfront as the active Vite project; earlier edits to the partial Documents copy had not affected the preview.
- Applied global settlement budgets, doubled world width/height, and fixed physical city/dock dimensions.
- Kept global settlement budgets scaled for the larger map.
- Verified the live preview reports 28,800 × 19,200 and inspected settlement artwork at tactical zoom. Recorded sample density and remaining travel-balance limits in decision 029.

## 2026-09-10 — Eight-direction port-town artwork

- Added a genuine-alpha 4 × 2 atlas with authored N, NE, E, SE, S, SW, W and NW port-town graphics.
- Qualifying coastal settlements select the closest authored direction from their dock normal, then rotate by no more than 22.5 degrees to follow the local shoreline curve.
- Removed the mistakenly added rule that guaranteed a port for every nation; port graphics do not alter campaign starts or settlement placement.
- Corrected the generated atlas's reversed vertical frame order and now select direction from sampled visible open water, preventing docks from pointing inland on bays and narrow peninsulas.

## 2026-09-09 — Smooth farmland and settlement artwork

- Matched farmland rendering to the shared smoothed region geometry, eliminating raster-stepped coastal and regional field edges while preserving infrastructure clearances.
- Capped new-map agriculture by both passable area and region count, with deterministic multi-seed regression coverage.
- Restored five tiered transparent settlement illustrations inside detail-view city clearings while keeping readable ownership/type badges and fallback behavior.
- Replaced circular farm/scenery exclusions around settlements with tier-specific elliptical footprints fitted to the visible sprite dimensions.

## 2026-09-09 — Clear tactical terrain

- National ownership washes now fade beyond strategy zoom, disappearing completely at 400% rather than the earlier 230% cutoff.
- Selected-army sector fills share the same progressive fade, while borders, fronts, fog, selection outlines, and owner-colored city symbols remain visible.

## 2026-09-09 — Physical city capture

- Added authenticated city capture orders for selected living ground squads, using the existing local and cross-region path validation.
- City control changes only after uncontested physical arrival and persists independently from surrounding territory ownership.
- Added nation-colored city icons, controller hover text, and a right-click Capture menu.
- Preserved land-area victory and regional conquest rules; added capture, contesting, persistence, and API tests.

## 2026-09-09 — Full-screen map and mouse camera

Expanded the campaign map to the whole viewport with a 200% initial view, cursor-anchored mouse-wheel zoom, all-scale drag panning, and Fit reset. Consolidated campaign information, selected-region orders, reports, and session details into one collapsible left panel. Capped label/counter screen sizes and increased text raster resolution for crisp zooming. Added a browser camera interaction check.

## 2026-09-09 — First documented playable proof

Established vision, blueprint, factions, executable rule notes, architecture, hosting instructions, milestone roadmap, and two decision records. Implemented a persistent server-authoritative browser campaign with generated land, faction selection, claimable automated nations, construction, standing army orders, combat, abstract air support, and land-area victory. Added automated rules/persistence/authorization tests and verified desktop/mobile multiplayer flow. SQLite is the local proof adapter; PostgreSQL and public-launch accounts remain future work.

## 2026-09-09 — Armies and coherent fronts

- Added line, assault, and mobile army presets with meaningful infantry/motorized/artillery/armor composition; automatic sector defense and traveling reserves.
- Added persistent legal offensive corridors, friendly redeployment, capture consolidation, connected depot relays, finite army supplies, risk policies, and legal fallback retreats. Removed distant relocation.
- Added save upgrades preserving existing campaigns and sessions, authoritative API validation, army command controls, route previews, and military invariant/restart tests. Numerical values remain provisional.

## 2026-09-09 — Ironfront continental geography

Renamed the product Ironfront. Added 384–768 territory continents with named provinces, irregular coasts, inland seas, decorative islands, rivers and continuous forest/plain/mountain relief. Impassable mountains remain unowned and outside conquest scoring. Added geography invariants and desktop/mobile browser checks. Kept saved maps and session identifiers compatible; new campaigns opt into the new generator.

## 2026-09-09 — Density and zoom correction

Reduced continental density by75% to72–192 territories (96 with four players), with two provinces per seat. Extended zoom-out to35%, made territory boundaries visible at overview, smoothed shared boundaries, and corrected old-map polygon fills. Cached geometry and deferred detail refresh during zoom gestures. Added an original-map notice and session/lobby guidance without rewriting saves.

## 2026-09-09 — Clean terrain and lobby generation

- Replaced procedural relief/grain with flat terrain colors and simple rivers.
- Connected lobby preview to seed/nation inputs and added Generate new map.
- Seeded large-scale land shapes, bays, and orientation; saved campaigns keep their geography.
- Added silhouette regression coverage and a desktop/mobile lobby-to-campaign browser check.
- Player-count correction: scale world area with nations, keep 24 territories per nation, and display preview dimensions. Added area/density regressions.

## 2026-09-09 — Earth-derived geography

- Replaced ellipse coastlines with transformed real elevation samples and retained player-scaled world size.
- Added land-constrained territory growth, relief-derived mountains, wind-driven moisture, and merging drainage.
- Added a random initial lobby seed and cancellable worker previews.
- Added data provenance, visible terrain credits, a six-seed gallery script, and 20-seed topology/river regression coverage.

## 2026-09-09 — Aligned vector territory edges

- Replaced independent fill/border smoothing with a shared, junction-preserving display mesh.
- Replaced fixed-resolution terrain imagery with vector fills, rivers, and coastline strokes.
- Added exact shared-edge coverage and high-zoom desktop/mobile verification; saved maps remain unchanged.

## 2026-09-09 — Compact territories and local features

- Reduced new maps to eight territories per nation (32 for four players); saved maps stay unchanged.
- Replaced regular equal-speed partition growth with uneven terrain-sensitive expansion, preserving connected regions and traversable routes.
- Added local terrain patches, named hamlets through major cities, zoom-dependent settlement symbols, woodland/ridge landmarks and region feature listings.
- Recorded accepted direct-unit/group-order direction and deferred local combat mechanics in decision 007. Density, settlement distribution and start fairness remain provisional.
- Verification: typecheck, full test suite and production build pass; geographic checks include twenty seeds, connected land, varied areas, in-territory features and terrain area conservation. Desktop/phone preview generation matches campaign geography exactly.

## 2026-09-09 — Countries and visible warfare direction

Recorded owner direction for multi-city territories, territorial capitals, coherent countries, and animated squad-level battle presentation. Distinguished these requirements from proposed capture rules and unimplemented simulation changes in decision 008.

## 2026-09-09 — Visual style guide draft

- Added docs/06-art/style-guide.md with palette tokens, typography roles, component states, cartographic hierarchy, settlement and unit art direction, and design review criteria.
- Added an interactive conversation specimen for interface, territory layers and typography. This is proposed art direction, not an application redesign.
- Linked the guide from the documentation index and current design record.

## 2026-09-09 — Live server squad engagements

- Replaced aggregate combat exchanges with persistent squads, positional range, morale/suppression and ongoing simultaneous damage.
- Added transactional sub-hour tactical updates, reinforcement/support intervention, and restart-safe persistence.
- Added animated squad/vehicle markers and representative firing, active-engagement navigation, and squad telemetry.
- Added tactical behavior/persistence tests and isolated desktop/mobile browser verification.

## 2026-09-09 — Game HUD art direction

- Revised the style guide after reference feedback: dark metal/brass controls, unit illustrations, bottom command tray and richer terrain replace the website-like paper-panel direction.
- Added a three-part art generation brief for original HUD, unit-card and terrain/building studies. No game code or generated artwork changed.

### 2026-09-09 — Continuous squad motion and separation

- Replaced one-second snapshot animations with continuous cadence-aware position following to remove polling pauses and backward resets.
- Added stable server formation destinations and bounded, land-constrained squad separation.
- Representative soldiers now retain individual slots, move with different follow timing and subtle stride offsets, and avoid overlapping nearby icons.
- Added regression coverage for three-second polling gaps, relocation, individual movement and deterministic on-land spacing.

### 2026-09-09 — Strategy icons and tactical zoom

- Hide soldier detail in the overview, with a smooth reveal above 200% zoom.
- Scale soldiers and combat effects with the map; use compact clickable army symbols for strategy navigation.
- Extend the isolated battle browser check to overview and maximum zoom on desktop and phone.

### 2026-09-09 — Player vision and force identity

- Added authenticated server-side vision projection; distant military activity and enemy private information no longer reach the client.
- Added own/other force markers, highlighted home borders, persistent nation/faction identity and fog shading with unknown-intelligence labels.
- Added gaining/losing vision and two-session API privacy regression tests; complete authoritative saves are preserved.

### 2026-09-09 — Political strategy map

- Added automatic political view below 145% zoom with solid owner colors, clear borders and controller labels over connected holdings.
- Suppressed terrain/settlement clutter in strategy view while preserving military fog and compact force markers.

### 2026-09-09 — Nation lettering and clean overview

- Replaced political label badges with large serif nation names fitted and angled across controlled land.
- Removed army icons, battle indicators and route overlays from strategy zoom; local detail returns on approach.

### 2026-09-09 — Later strategy transition and muted palette

- Strategy view now starts below 85% zoom instead of 145%.
- Softened political owner colors toward warm stone and reduced border brightness.

### 2026-09-09 — Remove blotchy biome overlays

- Temporarily hid local biome-patch fills and softened regional terrain colors.
- Retained rivers, detail symbols, gameplay terrain and saved geography.

### 2026-09-09 — Map interaction feedback

- Added unit/territory hover outlines, distinct custom cursors and explicit hover/selection labels.
- Made visible squad formations clickable and separated map army focus from territory inspection.
- Enlarged counter hit targets and preserved drag-versus-click handling.

### 2026-09-09 — Right-click army commands

- Added contextual right-click orders for selected friendly armies while preserving right-drag panning.
- Replaced the asymmetric territory cursor with a symmetrical diamond.

## 2026-09-09 — Calmer squad movement

- Removed looping individual wobble and frame-to-frame formation/avoidance tugging.
- Slowed snapshot following and soldier transitions; stable ordering prevents formation changes when the payload order changes.
- Added regression checks for stationary formations, slow forward travel without lateral wander, and reordered snapshots; retained polling continuity, separation, relocation and reduced-motion coverage.

### 2026-09-09 — Group controls, cover, camera and scale

- Added friendly army box-selection with Shift-add and group right-click orders.
- Added contextual settlement/fort cover orders with persistent server movement and positional protection.
- Added WASD, Escape deselection and selection-specific context panels.
- Reduced standard soldier glyphs while retaining vehicle size and generous click targets.

## 2026-09-09 — Local squad positioning

- Added persistent direct squad Move, waypoint and Hold commands; server validates ownership and local land routes atomically across a selection.
- Squads follow bounded tactical movement and hold their destinations without automatic pursuit; army orders and retreats supersede local plans.
- Added detail-map squad selection, local right-click/Shift-right-click routes, waypoint drawing, and touch/keyboard positioning controls.
- Added path geometry, command authorization/atomicity, secrecy and restart regression coverage plus an isolated browser flow.

## 2026-09-09 — Development map startup fix

- Guarded ticker cleanup before Pixi initialization to prevent a React StrictMode blank screen on the Vite server.
- Added a development-server browser regression for mount, map regeneration and reload; verified at 1440px and 390px. Typecheck and build pass.

### 2026-09-09 — Define the simpler squad model

- Recorded fixed squad membership, optional command groups and permanently mounted mobile support as accepted direction.
- Added explicit squad role descriptions and normalized health in squad controls.
- Documented the remaining legacy army relationship without implying that it has been removed.

## 2026-09-09 — Direct cross-region routes

- Extended precise squad movement and queued waypoints across shared land borders; group map commands use the same routes.
- Added physical squad entry, combat/capture, consolidation and continuous withdrawal; stopped headquarters relocation from overriding direct squads.
- Removed legacy travel/sector buttons from the player panel, retaining group supply/support information and legacy API compatibility.
- Added crossing, split-squad, hostile entry, consolidation, restoration and generated-border regression coverage.

### 2026-09-09 — Real 6/6/2 starting roster

- New nations start with two six-soldier infantry squads and one two-vehicle mobile infantry squad, all at their capital.
- Each starting formation contains exactly one squad with explicit assigned unit counts and independent health/orders.
- Removed hidden mixed starting armor/artillery; existing saves retain their rosters.

### 2026-09-09 — Anchored squad health and idle positions

- Replaced close-up territory-center army counters with health bars above each visible squad, following its animated members.
- Removed automatic idle formation repositioning, avoiding drift and repeated competition with collision spacing. Explicit orders and combat still move squads.
- Verified typecheck, full test suite, build and desktop/phone starter-squad browser checks.

### 2026-09-09 — Vehicle facing profiles

- Added wheeled steering arcs, tracked pivoting, and rotating-upper-body/fixed-body walker presentation profiles.
- Current mobile squads use wheels and armor uses tracks. Individual vehicle poses and directional silhouettes remain still at rest and follow confirmed squad movement.
- Added coverage for pivoting, steering, strafing, independent aiming, reversals, idle stability, pose/member consistency and cleanup.
- Validation: typecheck, all 13 test files, production build, and isolated desktop/phone squad browser checks pass. Existing bundle-size advisory remains.

## 2026-09-09 — Functional command HUD

- Moved resources/time to the top and contextual information/actions to a bottom dock.
- Added persistent squad selection buttons and live health/morale meters, with responsive layouts and improved contrast.
- Updated map sizing/focus for the dock and retained nation, dispatch, development and session controls.

### 2026-09-09 — Preserve parked vehicle orientation

- Final arrival corrections no longer rotate vehicle bodies; turrets retain their last aim after losing a target. Position resets preserve existing upper-body heading too.
- Added a regression check for northward arrival corrections across all four profiles.

## 2026-09-09 — Compact selection bar and fixed camera

- Removed “Your forces” from the bar and reduced it to selection/status and essential actions.
- Replaced scrolling information sections with separately opened, paginated details.
- Kept the map viewport fixed while selecting/deselecting or opening/closing the bar, eliminating the camera shift.

### 2026-09-09 — Group orders, pace and squad cards

- Connected drag selection to squad IDs and made selected route/waypoint overlays visible above strategic zoom, including when soldier detail is hidden. Added active move-order counts.
- Added per-selected-squad bottom cards showing type, assigned count, health and current orders; clicking a card inspects that squad.
- Group move orders now share the slowest active member's server-side travel speed, persist across reload, and detach on separate orders. Added group pacing, suppression, removal and persistence coverage.

## 2026-09-09 — Grand-campaign map scale

- Doubled world width/height for four times the area, retaining eight territories per nation.
- Broadened seeded territory-growth variance for larger hinterlands and compact regions.
- Improved initial territory allocation around chokepoints; expanded maximum zoom to 1200%.
- Preserved saved campaign geography and existing campaign duration/economy rules.
- Validation: typecheck/build and movement/persistence tests pass. Isolated desktop/phone browser checks confirm drag selection, three cards, successful right-click orders for all three squads and active-order feedback, with no page errors or overflow. Full suite: 12 of 13 files pass; the existing starting-territory-count assertion in tests/game.test.ts:25 fails outside this change.

### 2026-09-09 — Live overview squad positions

- Moved overview icons to the live squad renderer; icons, detailed units and selection follow the same interpolated position instead of the parent territory center.
- Updated drag selection to match visible squad locations at overview and detailed zoom.
- Added an isolated browser check selecting a squad displaced from its home center in both overview and detail.

### 2026-09-09 — Visual selected-squad information

- Added an infantry/vehicle portrait, status badge, assigned member count, health and morale meters to single-squad selection. Group pace and suppression are shown when applicable.
- Preserved the compact bottom dock and per-squad multi-selection cards, with phone layout adjustments.
- Validation: typecheck, production build, squad-motion tests and isolated desktop/phone overview/detail selection checks pass. Browser checks assert health/morale values and no page errors or horizontal overflow; screenshots reviewed.

### 2026-09-09 — Neutral defender identity

- Inspected campaign 76C6E04C: nearby non-player troops were neutral garrisons (owner null), not displaced Cinder squads. Cinder armies were deployed near their own holdings.
- Corrected detailed unit coloring so neutral garrisons use sand rather than hostile coral; added a neutral-defender legend. No campaign positions were changed.

## 2026-09-09 — Expansion room and tab return

- Increased new-map territories to 24 per nation (96 for four nations), with connected starting clusters separated by neutral land.
- Added initial territory growth to reduce tiny slivers while retaining size variation.
- Refresh authoritative state immediately on foreground return; snap stale infantry/vehicle poses rather than fast-forwarding animation.
- Pause hidden-tab polling/rendering and ignore superseded refresh responses.

### 2026-09-09 — Targeted attacks and distinct gunfire

- Added visible-target attack commands, contextual attack cursors and target reticles for selected squads, including neutral defenders.
- Server pursuit preserves group pace, stops within range, prioritizes designated targets, and ends when a target becomes invalid or leaves vision. Orders persist; Move/Hold replaces targeting.
- Replaced squad-wide alternating volleys with independently timed member fire. Added semi-auto, burst, sustained and cannon visual profiles with smaller fixed-length tracers and flashes.
- Typecheck, all 14 test files and production build pass.
- Isolated 1440px and 390px browser checks pass for the attack crosshair, accepted target command, saved target identity, reticle and server-confirmed combat, with no page errors or overflow.

### 2026-09-09 — Attack hover highlight

- The exact hostile squad or neutral defender under the attack cursor now gets coral corner brackets and a subtle halo, at overview and detailed zoom. Hover identity is tracked by squad, so adjacent squads in the same formation are not highlighted together.

### 2026-09-09 — Seeded firing cadence

- Replaced fixed repeating firing clocks with seeded per-member, per-sequence timing: variable pauses, burst lengths, shot spacing, rifle double-taps and occasional skipped sequences.
- Added subtle projectile timing and muzzle-flash variation without changing server fire rate or damage.
- Cadence tests verify non-repeating intervals, weapon-profile density and frame-independent sampling. Typecheck and build pass.

### 2026-09-09 — Steampunk settlement art

- Replaced procedural settlement visuals with distinct hamlet, village, town, city and metropolis sprites while retaining the procedural renderer as an asset-loading fallback.
- Preserved settlement visibility thresholds, labels, selection and hit targets; sprites remain compact at overview and grow moderately at detail zoom.
- Added transparent runtime PNGs totaling 1.6 MB and retained full-resolution art sources outside the public bundle.

## 2026-09-09 — World space, terrain, and settlements

Expanded new worlds ninefold in area without increasing territory counts; preserved generation workload and saved-map compatibility. Campaigns open at the capital with readable labels. Added continuous biome fills, woodland/ridge symbols, size-based building clusters, clickable settlement inspection, and server-authoritative squad garrison orders with arrival-dependent cover. Typecheck, 15 test files, build, and desktop/phone browser interaction checks pass. Balance remains provisional.

### 2026-09-09 — World-space settlements

- Removed inverse zoom sizing from city art and replaced dense PNG clusters with readable vector building/street silhouettes.
- Detailed cities now scale naturally with terrain, overview uses small markers, and close zoom reveals roof details. Settlement rank still controls footprint and building count.
- Preserved city inspection, selection rings and garrison interaction.
- Validation: typecheck/build pass. Desktop and phone browser checks confirm settlement selection, retained squad selection and Garrison commands; overview and close-up screenshots reviewed.

## 2026-09-09 — Seeded modular cities

Added deterministic geography-aware city layouts, reusable building/prop graphics, coastal docks, and archetype labels. Building footprints avoid land edges, neighboring settlements, streets, and each other. Reduced satellite frequency and added cross-territory settlement spacing for new campaigns. Preserved saved settlement locations and garrison commands. Added layout determinism, geography, collision, and spacing tests; verified desktop and phone selection/garrison flows.

## 2026-09-09 — Compact city blocks

Replaced scattered buildings with aligned frontage lots, tighter alley spacing, larger roofs, and seeded street families. Atlas frames now trim transparent padding at load time so visible buildings fill their world-space footprint. Oriented rectangle collision checks preserve separation without excessive circular exclusion zones. Saved settlement positions and gameplay are unchanged.

## 2026-09-09 — Fixed city art orientation and templates

Stopped rotating building and prop sprites. Replaced randomly oriented street families with six authored archetype templates, retaining seeded building choices and sizes. Placement footprints now remain axis-aligned with the art. Added orientation and template stability checks.

## 2026-09-09 — Larger city buildings

Increased building footprint dimensions by 30%, with corresponding frontage spacing and collision clearance. Original sprite orientation and city templates remain. Existing campaigns receive the visual update on refresh.

## 2026-09-09 — Repeating biome ground materials

Generated meadow, forest-floor, highland heath and mountain-rock ground tiles. Added compact WebP exports, world-aligned mirrored texture fills, preserved solid-color fallback, repeat preview, and source/prompt records. Existing saved maps receive the visuals. Verified typecheck/build and desktop/phone loading and camera rendering.

## 2026-09-09 — Filled city blocks and harbor art

Replaced frontage-only city placement with street-defined blocks subdivided into filled building lots. Added lot containment and occupancy verification. Removed the circular plaza stamp and integrated six generated port assets, preserving building orientation while flat pier/quay modules follow the coast. Existing settlements and gameplay orders are retained.

## 2026-09-09 — Group movement lanes

- Multi-squad Move orders now fan out into deterministic world-space lanes around each waypoint instead of converging every squad on one coordinate.
- Mobile and armored squads sort to an outer lane, keeping vehicles alongside infantry in the common two-infantry/one-mobile group.
- Formation slots shrink or fall back on constrained terrain; single-squad targeting, group pace, atomic validation and saved-order behavior remain intact.
- Added regression coverage for distinct destinations, minimum spacing, vehicle placement and final separation.

## 2026-09-09 — Shoreline-qualified ports

- Port archetypes now require shoreline reach based on the settlement's actual constrained footprint, not a loose rank-only distance.
- A settlement is only shown as a port when its geometry produces at least one valid land-to-water dock.
- Corrected existing campaign 1886A31B's inland Wolfswick marker from port to riverside without changing its saved position.
- Added regressions for distant coasts and the invariant that every port layout has a valid dock.

## 2026-09-09 — Non-blocking map detail generation

- Moved settlement roads, terrain accents, fields, utilities, and biome scenery off the browser main thread into a dedicated worker.
- Cached immutable shared-border gateway geometry and each region's legal navigation-grid edges.
- Reduced campaign 1886A31B's measured cold road generation from roughly 35 seconds to 2.5 seconds while preserving its 99-road deterministic network.
- Staged high-resolution ground-material baking and GPU initialization one texture per animation frame; seam wrapping skips fully clipped canvas copies.
- Retained asynchronous detail loading, mountain avoidance, road connectivity, camera controls, and campaign polling.

## 2026-09-09 — Seeded biome scenery

Replaced terrain triangles with four tree and four rocky sprite variants distributed across continuous biomes. Added deterministic density/size variation, coastal checks, river and settlement clearings, spatial visibility groups and ground-only asset failure fallback. Existing saves need no regeneration. Added generator invariants and expanded desktop/phone biome visual checks.

## 2026-09-09 — Authored settlement scenes

Replaced procedural building grids with 15 designed settlement variants across five archetypes. Added deterministic scene selection, fixed family scales, optional adjoining districts, and separate close-zoom ambient smoke, trains, and airships. Preserved sprite aspect ratio, original orientation, saved settlement locations, and garrison interactions. Added scene planning invariants and an explicit art-load check to browser verification.

## 2026-09-09 — Larger, fewer mountains

Increased rocky sprite scale from seven to fifteen geography cells and candidate spacing from six to eleven cells. Two sampled maps show about 84% fewer rocky sprites and roughly double their average size. Preserved land/biome constraints and settlement/river clearings. Typecheck, scenery invariants and build pass; mountain-focused browser review covers desktop and phone.

## 2026-09-09 — Cities sit within the terrain

Reduced all authored settlement dimensions by 50%, preserving town/metropolis ratios and sprite proportions. Reduced airships and smoke to match. Removed the animated train and its rail overlay; retained airships. Existing settlement counts and gameplay locations are unchanged.

## 2026-09-09 — Settlement silhouette variety

Added six new authored scene variants with linear, branching, rectangular, L-shaped, and boulevard compositions. Seed selection now includes the additional silhouettes for every settlement family. Preserved the reduced terrain-relative scale, fixed art orientation, and original aspect ratios; trains remain removed and airships retained.

## 2026-09-09 — Abstract settlement icons

Replaced illustrated city scenes with compact vector icons for settlements, ports, industry, and fortified towns, with a capital-seat star. Removed city sprite loading and ambient animations. Reduced settlement scenery clearings to match the abstract display. Preserved campaign data, selection, and garrison commands; retained prior artwork as unused source assets.

## 2026-09-09 — Quieter map labels

Removed always-on territory names and duplicate selected-region labels while inspecting a settlement. Added zoom-dependent settlement naming, capital priority, a viewport-based ordinary-label budget, and wider label spacing. Names remain available through hover and selection.

## 2026-09-09 — Legible settlement badges and map text

Standardized settlement badges at a readable size with five filled/unfilled tier slots, replacing size-only classification. Added tier information to hover and the map legend. Labels now use logical screen-pixel font sizes and track camera scale continuously during zoom, with lighter outlines and simpler province typography. Hidden overly compressed strategic labels.

## 2026-09-09 — Physical ground mountains and less repetitive textures

Saved visible mountain placements with matching ground collision footprints. Added obstacle-aware routes, swept-segment validation, stale-route recovery, air-layer exemption and protected migration clearings/passages. Replaced mirrored terrain tiles with cached randomized patch blends. Verified full checks, database reopen, browser mountain commands and desktop/phone terrain rendering.

## 2026-09-09 — Textured ocean and clearer rivers

Added generated ocean and river water textures. Widened river channels and added contrasting bank edges. Anchored ocean pattern transforms to map coordinates so the texture follows pan/zoom, with restrained highlights beneath labels. Saved geography and gameplay remain unchanged.

## 2026-09-09 — Terrain accents, roads, and shared sprite scale

Added seeded hills, scrub, flowers, grass, reeds, stones, and rural fences. Nearby towns receive winding roads validated against ground and mountain geometry; small utility poles follow short connections. Centralized artwork sizing, reduced trees to about one-third their previous width, and made physical unit glyph size independent of viewport dimensions. Existing campaigns receive visual updates on reload. Typecheck, all 21 test files, build, and desktop/mobile browser verification passed.

## 2026-09-09 — Continuous, smaller utility connections

Fixed missing powerline spans by retaining every road bend and region gateway instead of discarding short or cross-border segments. Connections fall back to the validated road route when a complete roadside offset cannot fit. Reduced roads, poles, wire spacing, and utility line details by 20%. Added regression coverage for continuous endpoints, town connections, bounded spans, and border crossings.

## 2026-09-09 — Nonrepeating ocean surface

Replaced the ocean's periodically tiled material with a seeded world-sized water surface. Irregular sampling, reduced contrast, and gentle direction changes remove the repeated pinwheel motifs. The surface remains anchored during pan/zoom and fades into the background outside the map. River materials are unchanged.

## 2026-09-09 — Sharper close-zoom terrain

Preserved more source detail by increasing land material baking to 2048 pixels with 512-pixel stamps. Added a smaller-scale material layer that fades in at close zoom and stays anchored to world coordinates. Both layers use identical biome/coast geometry and share cached textures. Water rendering and campaign mechanics are unchanged.

- Added a soft shallow-water shelf and narrow sandy shore to terrain-view coastlines and offshore islands, using the shared coastline mesh without altering gameplay geometry.
  - Validation: typecheck/build passed; shoreline-only desktop/mobile browser checks passed at opening/detail/overview with no page errors. The broader settlement script stopped on a selection assertion (selected mobile squad instead of fixture city).

## 2026-09-09 — Manual strategy view

Replaced the zoom-driven strategy/terrain switch with a Strategy view toggle beside the zoom controls. Terrain is the default; zoom and Fit preserve the chosen view. Switching preserves camera position, zoom, and selection. Strategy hides physical scenery and tactical unit graphics at any zoom; terrain retains ordinary zoom-dependent detail.

- New continent generation repairs inland territories enclosed by a single neighbor. Repartitions only the affected pair, retaining territory count, connected regions, unchanged coastline, and valid region anchors. Existing campaigns retain their saved borders.

## 2026-09-09 — Farmland and vegetation groups

Added deterministic irregular crop/plowed/pasture fields around plains settlements with furrows and broken hedges, plus meadow/scrub pockets, small groves, and riverbank reeds with occasional trees. Uses existing sprite dimensions and authored art, with wider footprints supplied by groups. Fields avoid transport routes, rivers, settlements and impassable terrain. All additions are decorative and available to existing campaigns on reload.

- Replaced isolated nearby-city road pairs with a connected, deterministic settlement network, differentiated main/local roads, limited alternate routes, and bridge markers at river crossings. Roads remain visual and are derived for existing campaigns as well as new maps.
  - Added bank-side detour preference to reduce repeated river crossings. Validation: typecheck, build, all 23 test files, and desktop/mobile road-rendering browser checks passed.

- Moved utility poles and wires onto verges sized for road width and pole height; removed the whole-route fallback onto road centerlines. Blocked verge spans are omitted rather than placed on asphalt.
- Added generated crop, wheat, plowed-soil and pasture textures, clipped to adjoining seeded agricultural parcels with narrow verges near suitable towns. Farmland remains decorative and applies to existing campaigns on reload.
  - Validation: terrain-accent regressions, typecheck/build, and desktop/mobile browser inspection passed. Inspected textured field clusters and roadside cable clearance at close zoom.

- Replaced town-centered farm patches with region-wide seeded agricultural land use. Suitable plains receive adjoining field mosaics independently of settlement presence, with rural lanes, hedgerow edges and sparse full-scale trees. Rivers, roads, towns and unsuitable terrain retain clearances.
  - Validation: typecheck/build, terrain-accent regressions including substantial farmland coverage without towns, and desktop/mobile visual inspection passed.

- Added saved agricultural/settled/wilderness land use to new world generation. Agricultural regions reserve rural space with zero or one small settlement; field rendering follows this designation.
- Added shared full-footprint exclusions for decorative hills, trees and natural clutter near fields and roads. Biome scenery now waits for agricultural layout so exclusions are independent of asset load order. Existing maps retain settlement placement and receive the overlap fix on reload.
  - Validation: all 24 test files, typecheck/build, and desktop/mobile visual inspection passed.

- Consolidated independently generated town routes into a shared physical road network: real intersections, shared approaches, unique road stretches, deduplicated bridges/utilities, and removal of redundant circuits.
- Reordered generation so drainage precedes settlements. Added terrain-grounded region purposes, shown in the selection card; increased town spacing and preferred riverbanks, low slopes, and genuine coastal sites.
- Farming neighbors now share a parcel layout and keep connected estates of at least six fields, discarding isolated scraps instead of scattering disconnected plots.

- Agricultural fields now fill the region footprint through polygon clipping, including partial parcels at irregular boundaries, instead of leaving large unused margins. Preserves lake holes, road/river corridors, settlement and mountain clearings, original texture scale, and narrow field verges. Added a shared display-land mask to keep textures inside the smoothed shoreline.
  - Validation: typecheck/build, clipping and terrain-accent regressions (including over 90% agricultural coverage without infrastructure), and final desktop/mobile browser checks passed.

## September 10, 2026 — Steam jeep model

Added a TypeScript Victorian steampunk troop vehicle with six passenger sockets, separate driver station, infantry-scale reference figures, rear step and tailgate. Added standalone browser inspection and GLB export. Recorded future server-authoritative embark/disembark requirements in decision 027. Campaign mechanics unchanged.

Jeep validation: typecheck and production build passed; desktop/phone browser controls and GLB export verified. Saved a 3,964-triangle GLB with six passenger nodes. Independent preview review: ship at its bounded visual scope.

## September 10, 2026 — Distance jeep optimization

Reduced the default jeep from 3,964 to 692 triangles and 188 to two meshes. Vertex colors preserve the enamel/brass/copper palette with one shared material; body/gate geometry is cached across copies. Retained infantry scale, six passenger sockets and independent tailgate articulation. Updated GLB to 77,736 bytes; original detailed factory retained for comparison. Browser inspection, typecheck/build and structural/export checks passed. No crowd FPS or campaign integration claim.

## 2026-09-10 — Live infantry models

Integrated the benchmark infantry model with live squad positions, facing and firing. Added lazy loading, viewport/zoom culling, offscreen member-animation omission, instanced poses, contact shadows and renderer cleanup/fallback. Existing saves work on reload.

## 2026-09-10 — Experimental Three.js world renderer (branch only)

Added a standalone generated-world preview with retained Pixi comparison, instanced model buildings/forests, reused infantry and jeep, sprite/texture switches, winter palette and camera presets. Kept the original checkout and campaign authority intact. Typecheck/build and all 106 tests passed; desktop/mobile browser smoke passed with no page errors. Art parity, elevation and live campaign migration remain future work.

Fixed the experimental camera to one isometric angle per user direction. Mouse/touch dragging pans; zoom and settlement navigation remain. Removed overhead preset.

Restored experimental friendly army box selection, Shift-add, Escape, roster selection/focus and WASD/right/middle/touch panning. Strategy mode renders ownership and connected-holding labels, hides tactical scenery and preserves selection/camera. Replaced staged route actors with generated roster positions. Fixed continent near-plane clipping. Typecheck/build and desktop/mobile browser checks pass, including selection and mode preservation; no server/simulation changes. Recorded proposed concept-B reference-scene art roadmap.

Added an authored crafted-miniature reference scene at `/reference-preview.html`: continuous terrain and river channel, bridge, five modular building silhouettes, shared runtime materials, forest/rocks/field props and separate winter snow surfaces. Reused infantry/jeep sources with static reference selection. Fixed camera, responsive views and seasonal controls verified in browser; typecheck/build pass. Main/Pixi and campaign authority remain unchanged. See docs/prototypes/crafted-miniature-scene.md for scope, local measurements and remaining art limitations.

Added shared miniature building/tree assets to the generated world with chunked instancing, detail levels, tactical-only shadows and synthetic troop stress controls. Measured a 96-region / 64-settlement / 2,135-tree world through 12 scenarios, including 8,000 visible soldiers, winter and CPU throttling. Normal cases were near 60 FPS locally; CPU-throttled battle near 55 FPS. No sampled interval over 33.4ms or page errors. Automatic continent mode reduced submitted triangles from 2.83M to 39.9k. Scope excludes dense reference terrain, live simulation and real minimum-device validation. Raw results/methodology committed in docs/prototypes.

## 2026-09-10 — Urban kit roadmap continuation

- Pulled main through `0adb6aa`, including the experimental Three.js renderer and city roadmap.
- Added reserved commercial corner shops, seeded tenements and industrial warehouses to the district study. Shared nominal dimensions replace duplicated planner footprint switches.
- Preserved model scale across city counts, exact budgets and deterministic validated placement. Made the city browser runner portable.
- Kept Pixi as default; campaign capture, collision and authority are unchanged. Stage 1 remains in progress.
- Validation passed: typecheck, 32 test files, build, desktop/winter/phone browser checks. Linux headless performance samples are recorded separately; performance remains unvalidated for production.

## 2026-09-10 — Visible diorama effects

- Soft smoke plumes replace faint low-poly particles; fixed rotated chimney anchors and added selected urban sources.
- Three actual civic lamp lights and a dusk toggle make the distinction from emissive-only windows clear. Bounded cosmetic effects remain outside campaign authority.

## 2026-09-10 — Window brightness variation

- Urban window panes now have deterministic off/dim/medium/bright states unique to rooms and building positions, using the existing instanced material batch.
- Reviewed the city roadmap: complete stage-1 asset/envelope/LOD work next, followed by district/block variety.

- Daylight correction: uniform non-emissive window glass during the day; seeded brightness and off states appear only at dusk. Switching time of day preserves the room pattern without rebuilding geometry.

## 2026-09-10 — Victorian civic square

- Framed the hall with low stone walls, shrubs and benches; retained clear central and side approaches inside the civic reservation.
- Added a pediment, dormers, copper rooftop equipment, pipes and clock trim at the existing hall scale.
- Normalized mixed geometry before batching extruded details. Added a focused 28/160-building day/dusk/winter/phone browser check.

## 2026-09-10 — Full civic block reservation

- Relocated the four front shops to a connected rear market street while preserving building budgets. Expanded hall gardens and walls to the surrounding street verges, retaining front/rear/side entrances.
- Added a regression that keeps non-civic building footprints outside the whole civic block.

## 2026-09-10 — Mills and steampunk skyline

- Added wide multi-storey mills, boiler houses with coal bunkers, and nine-storey commercial towers with copper domes and setback crowns.
- Industrial slots widen for mills; towers reserve two urban frontage slots while retaining exact building budgets and fixed scale.
- Added Industry/Skyline camera presets; existing dusk window variation and bounded chimney smoke apply to the new models.

## 2026-09-10 — City bounds, detail levels and block variety

- Added tested horizontal model envelopes for study placement, including attachments; adjusted shop spacing and rear market alignment.
- Added full/distant instanced kits with projected-size hysteresis in the diorama.
- Added seeded courtyard and stepped-frontage recipes, preserving civic reservation and building counts, plus a Vary blocks control.

## 2026-09-10 — Courtyard fit and roof flicker

- Shallow courtyard wings preserve facade scale and provide clear internal space. Added planted courts and treatment of unused frontage slots.
- Raised pitched-roof tanks onto supports and separated brass lids from tank tops to remove intersecting/coplanar surfaces.

### City block composition — 2026-09-10

- Added outward entrance-to-street records and paths, with clearance regression coverage.
- Added terraced rear-garden blocks and handed corner shops with blank adjoining walls.
- Reserved pocket gardens on partial blocks, checking building and other garden bounds.

### Angled street study — 2026-09-10

- Added a separate diorama comparison with a diagonal boulevard, seeded side streets and six triangular/trapezoid parcels.
- Fit full building envelopes along street edges; reject blocked entrances and unsuitable corners.
- Added polygon paving, inset gardens, benches and trees, plus an Angled camera preset.

### Terrain fitting comparison — 2026-09-10

- Added Fit to hills & river to the angled diorama: graded streets and tessellated parcel surfaces, level foundation pads and stepped approaches.
- Added a protected northern river channel and bridge to its far bank.
- Rejects building candidates exceeding footprint relief or entrance-rise limits; preserves fixed building scale.

### Hillside doorway steps — 2026-09-10

- Replaced long pale stair strips extending to road centers with short, ground-supported stoops inside the sidewalk.
- Tread count follows elevation change; near-level doors use existing paving. Treads remain horizontal and use the surrounding masonry palette.

### River-cut district — 2026-09-10

- Added River through district comparison: clips parcels before building placement, creates bank streets and retains only two connected bridge crossings.
- Added quay paving and retaining walls with bridge openings, preserving dry building envelopes and clear entrances.

### Developed waterfront — 2026-09-10

- Raised channel water toward the quay edge and added masonry walls with stone coping.
- Replaced straight study bridges with shallow arched masonry decks, paved tops and capped parapets.
- Added an open moored rowboat, oar, bollards, rope and cargo accents; Waterfront camera preset provides a close view.
- Rowboat follow-up: the pointed interior floor now covers the water plane above the waterline while the lower hull remains submerged.

### Street-facing lamps — 2026-09-10

- Lamp arms, lanterns and shades now face the local street centerline instead of a fixed world direction; nearby point lights follow the lantern position.

### Street surfaces and lamp variety — 2026-09-10

- Reduced lamp frequency from every 12 to every 24 sampled road segments, removing nearby duplicates and lamps in junctions.
- Added post-top, straight-bracket and curved-neck Victorian lantern styles using shared materials.
- Added dark cobbled carriageways, raised curbs and sidewalk strips with junction openings.
- Shortened entrance paving to curb edges and kept road cobbles world-aligned for consistent texture scale.

### Continuous curb corners — 2026-09-10

- Replaced sampled curb cutoffs with joined outlines of the combined road footprint.
- Curbs and sidewalk bands share corner joins; duplicate road strips no longer introduce internal seams. Square-ended road caps fill their matching outlines.

### Combined terrain and curved river — 2026-09-10

- Added a selectable combined study with a seeded river bend and terrain rising away from the banks.
- Streets, quays, gardens and bridge approaches share the terrain transform; buildings remain rigid on level foundations.
- Rechecks transformed road/building clearance, dry footprints and entrances, rejecting unsafe candidates.

## 2026-09-10 — City seed gallery

Added twelve-seed visual comparisons, six study cases, geometry audits, JSON export and exact-seed diorama links. Tight-bend and steep profiles stress the existing fitting rules. Added reproducible audit sweep and browser checks.

## 2026-09-10 — Seeded city composition

Seeds now control street skeletons and growth patterns, rather than only frontage details. Combined terrain cities include commercial towers, residential variants and riverside industry using existing models. Broad sites are reserved before small frontages; fitting checks remain active. Whole-city overview framing and gallery composition labels expose the differences. The hill-only reference keeps its northern river corridor protected.

## 2026-09-10 — World river samples

Added a worldgen gallery case using actual generated river polylines, with source bearing restored and river provenance in audit exports. Reach selection excludes unsupported reversals without replacing curves with sine waves. Whole-city framing and detail targets follow the source bearing.

## 2026-09-10 — Rounded city river bends

Smoothed worldgen river samples before city fitting/rendering. Endpoint-preserving corner rounding removes hard drainage-grid turns; the shared curve keeps bank, street and building-clearance calculations aligned. Raw source geometry is retained.

## 2026-09-10 — Fixed inland block edges

Localized river influence to the waterfront band, preserving smoothed water and bank geometry while holding inland perimeter roads fixed. Added inverse terrain lookup for rigid foundation sampling and regression coverage for fixed boundaries, full bank displacement and non-folding transitions.

## 2026-09-10 — Waterfront road deformation

Rebuilt combined-study carriageways, end caps and joined curb bands in transformed coordinates to preserve road/sidewalk widths. Terrain sampling converts back through the corridor transform, avoiding double deformation.

Curved road strips now share joined cross sections instead of repeating square caps at every sampled point, eliminating small curb steps.

## 2026-09-10 — Angled junction protrusions

Removed square-cap overhangs where roads terminate on other roads and bounded acute curb miters. Added a regression for a diagonal T junction and maximum corner extension.

## 2026-09-10 — District infill and foundation alignment

Added smaller-building and inset-placement retries for rejected frontage sites, with updated entrances and parcel/court clearance. Clear residual industrial/commercial areas receive cargo, tanks or seating/planters. Added a paved civic transition. Rebuilt elevated foundations under the rigid model footprint with brick skirts, eliminating warped oversized slabs.

## 2026-09-10 — Road-aligned frontage and detail fixes

Aligned rigid building bearings and doors to final street tangents, added a second frontage packing pass and compact industrial workshop model, and tested direct doorway-to-road alignment. Steps now use transformed doorway geometry without a second bend. Smoke billboards compensate for rotated cities; seating is smaller with slab bases removed.

### 2026-09-10 — Full city planning

- Added a seeded full-tile city case with a preserved civic precinct, central commercial skyline, surrounding housing and waterfront industry.
- Joined block edges into connected streets, retained two river crossings, and extended quay surfaces across the developed frontage.
- Reused final-space frontage/foundation/entrance checks and added coverage, civic-clearance and skyline regression checks.
- Added the Full city preview switch and made full cities the seed gallery default. Tactical mechanics remain unchanged.

## 2026-09-10 — Military model kit

Reviewed the current city-generation direction and articulated infantry reference. Added infantry-scaled tank, airship, artillery emplacement, modular sandbags, barbed wire and LMG squad models with a standalone 3D inspection/export page and six GLB assets. Retained named articulation/join nodes and documented matching city-scale integration. These are model assets, with no campaign rule or deployment changes.

### 2026-09-10 — Public preview preparation

- Added a compiled-only public preview preparation script and Tailscale Funnel operating instructions in docs/public-city-preview.md.
- Prepared a static city preview landing page without forwarding the development server or campaign API. Tailscale host sign-in is required before activation.

- Activated the city-only Tailscale Funnel at https://brutus.tail250251.ts.net/ after host sign-in. Added a dedicated build config to exclude unrelated pages from the public bundle.

## 2026-09-10 — Faction signatures and engineers

Added Iron Directorate heavy landship, Crownward Armored Guards, Aether twin-turbine gunship and shared engineer squad models. Extended the military preview and exported GLB catalog to ten models, preserving original infantry scale and named articulation nodes. No gameplay rules changed.

### 2026-09-10 — City variation and steampunk assets

- Removed the inherited canal, dock yard and factory reservation from full-city layouts; developed that space around the civic square.
- Added shared-junction street angles, diagonal corner parcels, seeded civic layouts and a 360-degree orbit camera.
- Added 19 shared low-poly models, district-aware building selection and bounded roadside accent/car placement with clearance checks.

- Added dark two-lane carriageways with dashed center markings while retaining paved sidewalks and alleys.
- Added camera-relative WASD panning with input-focus and key-release handling.

### 2026-09-10 — Urban square and steam utilities

- Replaced the oversized civic template and small canopy buildings with fitted urban frontage parcels around the town hall square.
- Continued road surfacing and center markings across arched bridge decks.
- Added instanced manhole covers, valve stands and vent cabinets, with bounded street-level steam effects.

### 2026-09-10 — City tactical geometry foundation

- Added full-city obstacle, candidate-cover, precinct and bounded route queries with separate infantry/vehicle constraints.
- Added tactical inspection controls and batched overlays, sharing civic wall dimensions with rendering.
- Kept campaign movement, cover and capture behavior unchanged; documented remaining prop/vertical collision limitations.

### 2026-09-10 — Selectable city movement trial

- Populated the full-city planner with three independently selectable infantry test units, walking animation, selection rings and order paths.
- Added right-click route orders, stop/deselect controls and regeneration cleanup; blocked destinations preserve the current valid order.
- Switched prototype route search to A* and placed moving soldiers on arched bridge decks. Campaign combat remains unchanged.

### 2026-09-10 — Natural city gait and group controls

- Slowed trial infantry to a walking pace, tied poses/bobbing to distance traveled, and added subtle collision-checked route variation.
- Added box/Shift selection and spaced group orders; right-drag now orbits and middle-drag pans, without a drag issuing a move order.

### 2026-09-10 — City orders, cover previews and input refinements

- Running infantry and a selectable steam tank; footprint-based infantry clearance opens lawns and narrow civic paths.
- Directional partial/full cover, covered poses, civic sandbags and local test-shot/health inspection.
- Right-drag placement/facing with colored destination ghosts; click-anchored orbit when unselected or using Alt.
- Fixed sidebar/canvas scrolling and keyboard focus so panel interactions do not strand WASD.

- City destination previews now flow along nearby obstacle edges instead of leaving soldiers embedded in buildings; bounded fitting preserves facing, spacing and preview/commit agreement.

Added a selectable friendly jeep and dynamic vehicle cover: tank full, jeep partial, with directional hull checks and cover updates after vehicle movement.

Documented future attacker-relative line-of-fire cover, flanking, dynamic vehicle hulls, authoritative integration, performance gates and regression criteria; no gameplay changes.

## 2026-09-10 — Countryside scenery

- Added cosmetic woodland pockets, marsh pools and reeds, and tiny farmsteads with gardens and lanes.
- Reused tree artwork and world-scale graphics; retained land, farm, road, river and settlement exclusions and chunk culling.
- Typecheck/build and all three browser visual checks pass. Full suite: 106/107 during separate city-padding work; remaining settlement-clearance assertion documented in session notes.

## 2026-09-10 — Physical region-layout foundation

- Generate scrapyard, lake-crossing and mountain-pass layouts before settlement placement, with protected approaches and connectivity checks.
- Share saved obstacle/deck geometry across rendering, pathfinding, direct motion, stale-route checks and directional terrain cover for either faction.
- Add region guidance and a selected-unit cover indicator; replace the rejected decorative countryside pass.
- Preserve old campaigns. Nine new terrain tests, the full regression suite, typecheck and build pass; isolated browser coverage verifies the bridge interaction, open-water rejection and desktop/phone rendering.
- Initial artwork and balance remain provisional; details in decision 030.

### 2026-09-10 — Terrain preview discovery

- Refreshed stale live development-server source; verified both new terrain generation and rendering are served.
- Added Explore terrain to new-map previews, framing actual landmark footprints.
- Verified all three themes in the live Boreal preview; typecheck and production build pass. Existing saved maps are preserved.

### 2026-09-10 — Correct harbor building scale

Reduced directional port artwork from 2 times the settlement radius to 0.85 times, capped at 180 world units. The atlas contains a warehouse and dock office rather than a full city; fitting it to a city footprint exaggerated individual buildings. Kept orientation, settlement placement, badges and mechanics unchanged. Verified a side-by-side browser comparison against city art and the former harbor scale. Typecheck/build passed. Existing campaigns update on refresh.

### 2026-09-10 — Harbor shoreline attachment

Port artwork and its badge now anchor to the nearest rendered coastline edge around the validated dock. Internal territory borders are excluded. A short approach joins the saved settlement location to the compact harbor; gameplay locations remain unchanged. The coastline normal selects the view, with corrected diagonal atlas mapping N/NE/E/SE/S/SW/W/NW = 4/7/2/3/0/1/6/5. All eight orientations were visually checked against shoreline fixtures. Settlement tests, typecheck and build pass. Existing campaigns update on refresh.

### 2026-09-10 — Efficient authoritative squad damage

Added fixed-step seeded volleys, saved reload state and delayed shell events, target retention and spatial queries, polygon line-of-fire caching, and distinct armor effectiveness. Casualties resolve simultaneously. API scheduling skips unnecessary campaign writes between simulation steps. Added damage/cover/target/restart/split-step regression coverage and a sustained combat-kernel benchmark. The standalone city preview is not yet wired to campaign fire geometry or shot events. Tuning remains provisional; see docs/02-systems/squad-fire-model.md and docs/05-decisions/fixed-step-squad-fire.md.

### 2026-09-10 — Commanded full-city battle

Connected the full-city view to isolated authoritative server skirmishes: six friendly infantry and a tank versus six defenders, with selection, move/attack, start/pause/reset, live health, casualties and firing effects. Shared fire kernel and city obstacle geometry drive damage. Background city-plan generation avoids blocking the main API during staging. See docs/02-systems/city-battle-trial.md for controls and prototype limits.

### 2026-09-10 — Promote full-city direction

User approved the experimental city direction as primary. Default entry opens the full-city skirmish; previous campaign retained at /legacy.html. Archive target: codex/archive-pre-city-2026-09-10 at c5e407e. Publication awaits destination approval.

### 2026-09-10 — Smooth city battle presentation

Interpolated visual position, heading, walk-cycle distance, speed and tracks between server snapshots instead of snapping at polling cadence. Replaced persistent full-length firing lines with occasional short moving tracers, staggered recoil, muzzle flashes and local impact flashes. Server damage rules unchanged. Two presentation regression tests and typecheck/build pass. Initial interpolation adds up to 150 ms of display lag; network stalls can still pause movement.

### 2026-09-10 — Turrets, moving fire and combat feedback

City tanks rotate their turret independently of the hull and wait for alignment before firing. Infantry keep walking while firing, with 65% movement speed and the existing 0.55 moving accuracy multiplier. Upper-body aiming is separated from the walking legs. Infantry casualties use three timed forward/backward/sideways falls and remain as bodies for the session. Tank fire now has barrel recoil, slight hull kick, a muzzle flash at the cannon tip, and bounded expanding dust puffs. These are cosmetic effects; no physical wind simulation or ragdolls.

### 2026-09-10 — Slower tank fire and temporary battlefield scars

City tanks reload for five real seconds between shots. Shell visuals are solid, larger projectiles with flight speed of 150 scene units/second (minimum 60 ms visual flight); server impact resolution remains quantized to combat exchanges. Impact flashes are replaced by gray-brown dust puffs, with no fireball. Two instanced ground-mark batches render at most 64 temporary crater impressions, retained for 90 seconds and shrinking away over the final 15 seconds. These do not deform terrain or affect movement.

### 2026-09-10 — Local infantry reactions and protected cover formations

City infantry can make short, reserved moves toward better directional cover after a target change or incoming damage. Attack orders may improve a blocked firing angle. Reactions remain within four scene units of the assigned anchor, reject routes over seven units, and check on staggered 3.5–4.7 second intervals. Active move routes and vehicles are excluded. Hold position stops the selected units and disables relocation until a new move/attack order.

Move previews now search along nearby cover faces, preserve the destination's side around corners, and prioritize protected distinct slots instead of spreading the group in a straight line across cover. Safe capacity remains finite; blocked positions are not silently placed across the wall. Right-drag facing now reaches the server as well as the preview.

Final reaction refinement: autonomous movement only takes short unobstructed steps, avoiding city-wide path searches. Explicit player routes still use normal pathfinding.

## 2026-09-10 - Wider, cheaper cover-order previews

- Expanded order activation to 3 scene units without extending physical cover bonuses.
- Removed per-frame formation solving and repeated full-city obstacle scans from candidate scoring; preview refresh is limited to 80 ms intervals.
- Added distance regression coverage and scripts/bench-cover-preview.ts for full-city CPU measurements.

## 2026-09-10 — City skirmish shared vision

- Added range-limited, building-blocked shared friendly vision and server-filtered enemy snapshots.
- Hid unseen models, markers and target picking; counts now report visible enemies.
- Rejected hidden target commands and filtered unseen firing events; removed enemy route disclosure.

## City planning camera — 2026-09-10

Implemented an elevated orthographic planning view with Overview / Reset, Neighborhood and explicit Overhead presets. Normal planning elevation is 55 degrees, with orbit limited to 40–75 degrees; the Overhead preset permits a near-vertical view. WASD and Alt + middle-drag pan. Middle-drag orbits around the terrain point under the cursor, ignoring all building geometry; a missed terrain ray falls back to the focus projected onto terrain. Q/E rotates around the floor beneath the focus. Scroll down zooms in toward the cursor. Street view uses a narrower 36-degree perspective field of view.

Ten focused camera tests, TypeScript checking and production build pass. Browser checked Neighborhood and Overhead presets and updated control hints. See docs/05-decisions/city-planning-camera.md.

## 2026-09-10 — City tank shell lethality

- Replaced campaign-scaled tank payload with fixed 120 base shell damage in city skirmishes (162 against unarmored infantry at impact center).
- Failed accuracy rolls now produce deterministic off-target impacts, with real splash damage instead of zero-damage explosions directly on targets.
- Preserved five-second reload, flight delay, three-unit splash radius and building occlusion.

## 2026-09-10 — Last-known contacts and sight outlines

- Added fading, frozen last-known contact markers with no live targeting or tracking.
- Clear stale contacts when reacquired, expired, confirmed dead or their empty location is scouted.
- Added selected-unit sight boundaries clipped by buildings, with bounded refresh frequency.

## 2026-09-10 — Construction UI first pass

- Added an in-viewport Build menu with five basic emplacement models, placement previews, rotation, cancellation and undo.
- Added footprint, slope, overlap and unit-clearance validation; bounded local placement count.
- Clearly labeled the local placement prototype and its unconnected combat/supply effects.

## 2026-09-11 — Reusable country set pieces

- Added 24 seeded templates, reusing city architecture with new roadside/industrial/ruin props and varied agricultural parcels.
- Added a gallery, collision/cover overlay, ground probe, collection view and JSON export.
- Added conservative global-map study distribution, river clearance, site navigation and bounded near-camera detail loading.

## Ocean port districts — 2026-09-11

The full-city planner now gates cargo quays, bonded warehouses and a lower-rise harbor quarter on an adjacent typed ocean frontage. Inland and river-only cities retain their existing zoning. The coastal fixture includes an open ocean plane, quay walls, timber piers, cranes, cargo and coastal steam lighters using existing city materials. Preview: /city-diorama.html?case=ocean-port&seed=732, then Harbor. The battle API accepts the same ocean profile. Focused regression checks pass across three seeds; browser reviewed the waterfront. Detailed world-city placement and naval/port economy rules are outside this pass. See docs/05-decisions/ocean-port-districts.md.

Validation: full npm test suite passed (234/234); the subsequently added split-frontage pier regression also passed. Final typecheck and production build passed. Browser verified the coastal profile, zone counts, Harbor framing and Battle ready state.

## Curved ocean frontage — 2026-09-11

The ocean-port study now follows an ordered shoreline polyline with bays and outward bends. A bounded inland displacement curves the street/parcel network, while the existing fitter keeps buildings rigid and refits or rejects footprints that no longer clear their plots. The same forward/inverse mapping is used for rendered geometry, authoritative obstacles and the ground movement boundary. The civic and northern river anchors remain fixed.

Quays follow short shoreline sections. Each berth rotates its pier, crane, cargo and vessel toward the local sea normal; steep or sharply changing sections and berth envelopes that intersect land or neighboring docks are skipped. Ocean triangulation follows the same shoreline. Harbor focus uses the actual coast position. Inland/river/lake exclusion remains in force.

The local coastline must advance along X and remain within 48 units inland of its seaward reference; invalid reversals are rejected. This supports curved open coast segments, not closed harbors with overhangs or a complete world-to-city coastline placement pipeline. Piers and vessels remain scenery. Focused geometric, navigation and mesh-batching tests pass; browser shows the curved waterfront.

Curved-port validation completed: full npm test suite passed 246/246. The final exact-inverse projection passed the three focused coast/navigation regressions; the ocean mesh-batching regression also passed. Final typecheck and production build pass. Browser review confirmed curved quays, coast-following roads, rotated dock assemblies and a ready skirmish.

## Road-led settlements and real map samples — 2026-09-11

Removed repeated rectangular settlement modules. Procedural sites now grow around seeded bending spines, branching lanes and activity centers, with variable occupancy/setbacks, road-facing buildings, individual gardens, open edges and thematic yard/ruin props. Compact sites retain 44-unit half extents for existing world-placement clearance; estate/district presets use 115/185. The shared renderer batches angled road segments and joins instead of drawing one mesh per segment.

The country gallery also offers offline OpenStreetMap samples of Castle Combe, Bibury and Painswick, downloaded via bounded Overpass queries. Real street topology, streams, building centers and orientation are adapted to the existing city kit at 0.55 model units per meter. Density controls select sparse/mixed/dense building retention; size changes the source crop. Buildings can be moved back up to ten units for frontage clearance and are omitted if their conservative envelopes still conflict. This is not an exact reconstruction. All map-derived previews and exports retain OSM attribution/ODbL metadata; filtered source data is downloadable and available under ODbL. No live map queries occur during gameplay.

The three estate samples at seed 732 retain 19/32/39, 43/70/93 and 120/212/268 buildings at sparse/mixed/dense settings respectively. One local generation audit measured approximately 4–43 ms per sample; this is generation time, not a rendering or combat benchmark. Architecture remains instanced. Nine focused country tests validate determinism, curved-road clearance, bounded geometry, source validation, clipping and density variation.

Limits: real-data adapters are gallery studies, not authoritative campaign battle imports. Terrain is flat; way-only samples omit multipolygon buildings, real vegetation/field boundaries and routing restrictions. Existing world views consume the new procedural compact plans but do not yet place the real-data samples. A full country still needs road stitching, terrain-aware placement and broader source archetypes.

## Camera-relative battle audio — 2026-09-11

The full-city tactical view has an opt-in Sound control, volume slider and Test SFX button. Sixteen original synthesized one-shot variants cover rifle cracks, cannon reports, impacts and footsteps; two loops provide tank engines and tracks. WAV assets and a stereo near/far demonstration are reproducible with scripts/generate-battle-sfx.ts. Runtime buffers are synthesized once and shared, with no network or external sound-library requirement. This is a replaceable sound-design prototype, not recorded foley.

Sources pan with camera orientation, attenuate and lose high frequencies with distance, and include a bounded propagation delay. Orthographic zoom changes the virtual listener distance. Footsteps follow traveled distance and stop when idle; at most four visible vehicles have engine/track loops. A shared 32-voice cap drops lower-priority effects, distant rifle bursts are rate-limited per spatial cell, and master compression controls stacked transients. Muting, pausing, hiding the tab and disposal stop voices; snapshot cursors avoid replaying old shots. Pause/mute tests and further sound-quality tuning remain useful manual review areas.

Server hearing events are separate from visible combat events. Living friendly observers must be within 160 scene units of rifles or 360 of cannon/impacts. Returned cues contain only event ID, class, time and 32-unit-cell centers; no enemy identity, target, damage or exact hidden position. Hearing never creates a visual contact or authorizes attack commands. Visible shot events can supply exact sound positions already authorized by vision. Hearing history is capped at 128 cues and two simulation seconds.

Scope: currently the staged city battle. Cross-map simultaneous campaigns need a shared audio-event feed; this does not invent ambient battles. Distance filtering is not building occlusion, terrain acoustics or a full reverberation simulation. Generated samples are originals without third-party recording attribution requirements. Verify auditory quality by listening; automated PCM tests do not establish realism.

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

## Shared tactical presentation — 2026-09-11

City battle and country slice now use one presentation owner for infantry running/aiming/reloading/deaths, tank tracks/turret/recoil, muzzle flashes, short tracers, shells, dust/craters and camera-relative sound. Country rendering smooths individual soldiers and fractional movement steps, and uses authoritative impact events. Animation review shares run clips, rifle/armor effects, audio and tank animation primitives. Full/partial cover quality is retained for country poses. See docs/03-technical/shared-system-standards.md for required owner/consumer audits and the explicit preview/legacy inventory. Regression and browser results are recorded in docs/session-notes/2026-09-11-shared-tactical-presentation.md.

- Fixed country movement bouncing: render projection now includes the encounter movement accumulator, converted from simulation seconds at the selected pace. Regression crosses irregular snapshot arrivals for infantry and tanks at 1x and 20x; finished encounters do not extrapolate. Focused presentation tests, typecheck and build pass. Browser loaded the change; saved encounter was already finished, so live movement visual verification remains pending.

- Restored shared infantry idle presentation: breathing remains active while aimed or covered, relaxed soldiers retain individual weight-shift timing, and a separate cosmetic clock keeps idle movement alive while combat is paused. Movement suppresses idle sway; death/recoil keep their combat clock. City and country use the same implementation. Nine focused checks, typecheck and build pass; country page loads without runtime errors.

- Country encounter recovery: finished battles now offer Restart encounter, rebuilding full squads and clearing prior combat state. Active battles reject redeployment. Run is disabled after victory/defeat and server commands explain that restart is required. Browser verified restart from saved defeat, fresh 6/6 squads, accepted move order and visible infantry movement; left paused at 1x. Focused encounter checks 6/6, typecheck and build pass.

- Added shared density-based forest slowdown for tanks without per-tree collision. Country roads retain 90% vehicle speed; dense woods fall to 35%. Campaign armor also slows locally and mobile armies lose rapid forest transit.
