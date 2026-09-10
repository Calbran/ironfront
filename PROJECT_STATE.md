# Project State

## Steam jeep model study — September 10, 2026

The default jeep is simplified to 692 triangles and two merged meshes (previously 3,964 triangles and 188 meshes), with geometry/materials shared across copies. Six passenger sockets and the hinged gate remain. Crowd instancing and live campaign performance are not yet measured.

A Victorian steampunk jeep preview is available at `/jeep-preview.html`, with six passenger seats, a separate driver station, rear boarding step and hinged tailgate. Static reference figures use the existing infantry model dimensions. Orbit/zoom, overhead view, passenger visibility and empty-vehicle GLB export are available. Boarding/disembarking and live campaign rendering are future work; current forces and transport rules are unchanged. See [decision 027](docs/05-decisions/027-steam-jeep-transport.md).


## Infantry rendering prototype

A standalone 3D infantry preview and repeatable crowd benchmark are available at `/prototypes/infantry-benchmark.html`. It uses 348-triangle soldiers, instanced parts and shared cached animation over a captured map. Local overlay-only measurements reached approximately 165 FPS at 2,000 soldiers and 91 FPS at 4,000. These exclude the live map and simulation; squad movement and cover-like repositioning are staged. The infantry model is now integrated into the live campaign as a lazily loaded, viewport-culled Three.js overlay. The prototype measurements remain separate from whole-game performance. See [benchmark methodology and history](docs/prototypes/infantry-benchmark.md).

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
