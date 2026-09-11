# Country set-piece library

## Shipped first pass

The country POI gallery at /country-poi.html provides 24 deterministic templates. The same miniature building kit used by the city supplies architecture; new props use brick/stone walls, timber crates, iron boilers, brass fuel pumps and cover barricades. Each generated plan contains buildings, oriented obstacle rectangles, fields, props, trees, roads and road-entry points. Export downloads the selected plan as JSON.

Templates: ribbon hamlet, crossroads market, miners' terrace, mill village, estate hamlet, coaching inn, abandoned warehouse, rail freight depot, boiler works, sawmill, foundry, coal yard, fuel station, steam pumping station, telegraph exchange, toll house, ruined manor, chapel/cemetery, field hospital, road redoubt, mixed farmstead, sectioned crop fields, orchard and hop garden.

Variation seeds change building choices/occupancy, cover dressing, trees and crop rotation. Agricultural sites have six large separated parcels with wheat, barley, potatoes, flax, beets or fallow ground; rows are instanced. Orchards and hop gardens add regular planting/trellis arrangements. Ruins use fragmented walls with open interiors and breaches rather than invisible solid building footprints. Collider overlays and a ground-clearance probe expose geometry for review.

## Global-map study integration

The Three.js study places roadside candidates along multiple route segments. It requires sampled land clearance across administrative borders and rejects river corridors, existing-settlement buffers and overlap with accepted sites. It never forces a quota. Six nearby sites at most are resident in detail, sharing the city kit; distant markers replace detail. The country-site dropdown focuses a generated site. Existing campaign saves and strategic ownership are untouched.

The Meridian audit initially found sites straddling a presentation river; river clearance was added. The final conservative pass accepts three sites across crossroads-market and telegraph-office templates. This is not a final density target. Other seeds and future terrain-aware placement can use the entire library, including large farms. Whole-footprint clearance is sampled, not a polygon intersection proof. Route stitching and terrain sculpting need further work before campaign use.

## Tactical integration boundary

Obstacle records use the existing CityObstacle structure: building volumes block, low walls/barricades provide cover, and open lanes are kept clear. Decorative vegetation and crop rows do not become per-plant colliders. Plans are ready to feed tactical geometry, but the global preview does not start authoritative local battles, change world pathfinding, implement resource output or create campaign construction. The gallery probe is a clearance/adjacency check, not a combat simulation. Template extents, prop density and crop colors remain provisional art tuning.


## Expandable country layouts and farmland references — 2026-09-11

The country gallery now defaults to expanded, irregular farmland. Its size selector offers 14 / 32 / 72 convex crop parcels across 320 / 640 / 1,280 model units. Seeded subdivision, varied crop colors and row orientation follow the aerial farmland references. Grass lanes separate parcels; low hedge obstacles include eight-unit gates. Buildings and cover retain their tactical dimensions. Non-agricultural templates expand by joining one, four, or nine independently seeded modules with connected streets, sharing instanced assets.

Crop surfaces and furrows are clipped to the same parcel polygons, tessellated into non-overlapping color bands, and batched into one geometry/material. This avoids distant depth flicker and per-row draw calls. Gallery collection mode deliberately retains compact templates. Existing calls without a size option retain their previous output, so existing world placement is not silently enlarged.

Boundary: the new 171.6x physical-separation pacing scene still needs terrain streaming and placement integration; these are reusable size presets, not a fully populated enlarged country. No authoritative battle behavior is added here. Largest generation remains bounded rather than unbounded terrain generation.


## Road-led settlements and real map samples — 2026-09-11

Removed repeated rectangular settlement modules. Procedural sites now grow around seeded bending spines, branching lanes and activity centers, with variable occupancy/setbacks, road-facing buildings, individual gardens, open edges and thematic yard/ruin props. Compact sites retain 44-unit half extents for existing world-placement clearance; estate/district presets use 115/185. The shared renderer batches angled road segments and joins instead of drawing one mesh per segment.

The country gallery also offers offline OpenStreetMap samples of Castle Combe, Bibury and Painswick, downloaded via bounded Overpass queries. Real street topology, streams, building centers and orientation are adapted to the existing city kit at 0.55 model units per meter. Density controls select sparse/mixed/dense building retention; size changes the source crop. Buildings can be moved back up to ten units for frontage clearance and are omitted if their conservative envelopes still conflict. This is not an exact reconstruction. All map-derived previews and exports retain OSM attribution/ODbL metadata; filtered source data is downloadable and available under ODbL. No live map queries occur during gameplay.

The three estate samples at seed 732 retain 19/32/39, 43/70/93 and 120/212/268 buildings at sparse/mixed/dense settings respectively. One local generation audit measured approximately 4–43 ms per sample; this is generation time, not a rendering or combat benchmark. Architecture remains instanced. Nine focused country tests validate determinism, curved-road clearance, bounded geometry, source validation, clipping and density variation.

Limits: real-data adapters are gallery studies, not authoritative campaign battle imports. Terrain is flat; way-only samples omit multipolygon buildings, real vegetation/field boundaries and routing restrictions. Existing world views consume the new procedural compact plans but do not yet place the real-data samples. A full country still needs road stitching, terrain-aware placement and broader source archetypes.


Country-sector integration (2026-09-11): the Painswick offline adapter now supplies Riverward town in `/country-slice.html`, with its street entrances stitched to the geographic road network and its buildings used by authoritative movement collision. The preview links attribution and the filtered ODbL source. Display bases are disabled in the sector; individual occupied plots receive developed ground. The full country view still uses procedural POIs rather than automatically selecting OSM samples for every site.
