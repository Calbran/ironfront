# Changelog

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
