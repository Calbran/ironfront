# Continental geography

**Accepted direction:** Ironfront uses a continent with many territories, forests and plains, and impassable mountain regions that nobody can own. Victory remains land ownership, without weighted objectives.

## Implemented

Version-5 new campaigns scale world area with nation count, using 4,800 × 3,200 for four nations. Width and height scale by the square root of seats / 4 and round to the eight-unit raster. Two nations use 3,392 × 2,264; eight use 6,792 × 4,528. Each nation adds 24 territories (48–192 total), keeping average territory area roughly constant for a given seed. Territories form contiguous named provinces. Provinces organize the map visually; they confer no scoring or economic bonus.

A seeded, transformed real-elevation field creates peninsulas, bays, channels, and a connected playable mainland. Offshore islands are decorative in this proof. There is no naval movement or island conquest. Territory borders follow a shared raster partition, with reciprocal adjacency. Equal starting territory counts do not guarantee equal area or equally favorable geography.

Correlated elevation and moisture create broad plains, forests, highlands and mountain ranges. Mountains are unowned, have no garrison or buildings, and cannot be built on, entered, supplied through, or captured. They are excluded from the victory denominator. Mountain placement preserves a connected traversable mainland, leaving highland passes through ranges. Forest and highland modifiers follow the military rules; plains are the baseline. Rivers are visual features, with no crossing penalty yet.

The client draws clean flat terrain colors beneath translucent ownership colors, with simple rivers and no grain or relief shading. At continent scale, province names and national boundaries lead. Zoom reveals local territory boundaries and names. Mouse-wheel zoom anchors beneath the cursor, dragging pans, and Fit restores the continent overview. Selection and essential commands use the compact bottom bar; secondary information opens separately.

## Persistence and scope

Existing campaigns retain their saved geography. Create a new campaign to use this generator; the server does not rewrite saved maps. The approved product name is Ironfront. The existing SQLite filename, Docker volume, and browser storage keys retain their previous identifiers to preserve saves and sessions.

Generation, mountain routing, scoring exclusions, deterministic seeds, reciprocal adjacency and connected traversable land have automated coverage. The larger map's starting economy, travel times and month-long pacing still need playtesting. Visual rivers, province groups, and decorative islands are not additional simulation systems.

## Earlier density and camera revision (version 1–2)

Following playtest feedback, the four-player default is 96 territories (75% fewer than the first continental generator) and eight provinces. Zoom spans 35–600%, with Fit at 100%. Territory borders stay visible at overview; local labels still emerge on approach. Shared boundaries are gently smoothed while retaining their junctions. Zoom gestures reuse the existing scene and defer detail refresh until 180ms after input stops. Static bounds and territory contours are cached per campaign. Saved campaigns keep their territory graph; the UI identifies original coarse saves and explains how to create a current map.

## Lobby generation

The preview follows valid seed and nation-count inputs. Generate new map selects a fresh seed. The generator selects and transforms bundled real elevation samples, with seeded rotation/reflection, coordinate warping, sea threshold, and secondary-source erosion and relief. Inland lakes are not mandatory. Campaign creation uses the displayed seed and nation count; preview generation does not create a campaign. Existing saved maps retain their geography.

The lobby displays world dimensions. Fit always frames the whole continent, so a larger world occupies the same viewport at a smaller world-to-screen scale.

## Earth-derived version 2

Terrain precedes territory partitioning. Mountains follow normalized relief; wind transport produces moisture and rain shadows; priority-flood drainage accumulates runoff and merges tributaries. Territories grow through adjacent land cells, preserving single-region necks and winding peninsulas. The largest connected mainland is playable; detached islands are decorative. Twenty fixed seeds verify connected land routes, non-disconnected territories, and meaningful bottlenecks across most samples. Source data and transformations are documented with the atlas; source credits are accessible from the footer. Lobby previews use a cancellable worker, and each fresh lobby chooses a random seed.

## Display mesh and zoom sharpness

Display geometry is derived from saved territory contours, with raster-length segments expanded into a common vertex graph. Degree-two vertices receive eight local smoothing passes; junctions stay fixed and displacement stays within 0.65 raster cells. Fills, borders, coastlines, hit areas, and selection use those same vertices. Terrain is vector-rendered at the viewport's pixel density, avoiding fixed-image blur at high zoom. The transformation is presentation-only and does not change saved areas, terrain, ownership, or routing.

## Version 3 — compact territories and local features

This supersedes the density and partition details above for new campaigns: eight territories per nation (16–64), with 32 for four nations and unchanged world dimensions. Uneven sites and terrain-sensitive, variable-speed connected expansion produce varied areas and winding borders. Peak coverage above 30% makes a region a mountain candidate; connectivity checks still preserve traversable passes.

Elevation/moisture now also generate local terrain patches independently of territory borders. Regions store optional named settlements (hamlet, village, town, city, metropolis) and woodland, ridge, peak and open-country landmarks. Settlements use interior land positions and are omitted from impassable mountain regions. The map shows settlement symbols by size and zoom, and inspectors list local features. These are geographic landmarks, without additional combat or economic effects. Existing region-level rules and one construction slot remain in effect. Old saves retain their geography and render without local features.

See [decision 007](../05-decisions/007-territory-features.md). Direct squad control is accepted future direction, not shipped behavior. Starting fairness, reduced-map economy and travel pacing remain unvalidated.

## Version 4 — grand-campaign scale

The world now has four times the area while retaining eight territories per nation. Territory growth varies more strongly (0.5–3.0 seeded growth speeds) to mix compact regions and large hinterlands. Separated sites and connected land growth remain. Zoom reaches 1200%. Saved campaigns are unchanged. See [decision 015](../05-decisions/015-grand-campaign-map-scale.md) for measurements and pacing limitations; campaign duration, movement and supply rules have not been rebalanced by this generator pass.

## Version 5 — neutral expansion space

The owner clarified that the world needs more territories overall. New maps now have 24 per nation, with 96 at four nations, retaining the 4,800 × 3,200 base. Four-region starting clusters are jointly planned with neutral buffers rather than grown sequentially into adjacent national borders. The target buffer is two intervening neutral regions, with a one-region fallback. A brief initial growth phase protects against slivers. See decision 016.

## Current v6 physical scale and settlements

Decision 017 supersedes earlier world dimensions: four nations use 14,400 × 9,600 and 96 territories. Coordinates and saved navigation cell size scale together after generation. Existing saves are retained. Continuous biomes and building clusters are presentation; region terrain remains the movement/combat authority. Friendly settlements accept squad garrison orders, applying existing cover only after arrival within 24 world units. City ownership follows the region; city economy and independent capture are deferred. See [decision 017](../05-decisions/017-terrain-settlements-and-world-space.md).

## Seeded modular settlements

Decision 018 adds geography-aware building layouts without changing the saved geography schema. New generation uses global settlement spacing across region boundaries, fewer small satellite villages, and greater separation for major cities. Existing saves keep their locations and receive new cosmetic layouts. See [decision 018](../05-decisions/018-seeded-modular-cities.md).

## Inland enclave repair

New maps repair any non-coastal territory with exactly one neighbor after terrain-sensitive expansion. The enclosed territory and its host are repartitioned by connected, equal-speed growth from two separated points on their combined exposed perimeter. This preserves territory IDs/count, land area, and unrelated regions while giving the pair outward-facing borders. Region anchors are relocated onto their own land when necessary. Adjacency, terrain, settlements, and starting nations are derived after repair. Saved campaigns retain their original geography.

## Connected road network

Settlement roads now connect reachable towns into a sparse network with a major-city backbone, minor-town feeder routes, a few useful alternate links, and visible river bridges. This derives from existing geography and also applies to saved campaigns on reload. Ground routing avoids impassable mountains; roads do not yet affect travel or supply. See decision 024.

## Generated rural land use

New maps assign agricultural land use from fertile lowland coverage before settlement placement. Farming regions contain no settlement or a single hamlet/village, giving larger rural stretches between urban centers. Saved `landUse` drives farmland presentation; old saves retain their locations. Decorative scenery shares road and field footprint exclusions. See decision 025.
