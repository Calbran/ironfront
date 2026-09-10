# Changelog

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
