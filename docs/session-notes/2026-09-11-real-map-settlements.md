# Real map settlement studies


## Road-led settlements and real map samples — 2026-09-11

Removed repeated rectangular settlement modules. Procedural sites now grow around seeded bending spines, branching lanes and activity centers, with variable occupancy/setbacks, road-facing buildings, individual gardens, open edges and thematic yard/ruin props. Compact sites retain 44-unit half extents for existing world-placement clearance; estate/district presets use 115/185. The shared renderer batches angled road segments and joins instead of drawing one mesh per segment.

The country gallery also offers offline OpenStreetMap samples of Castle Combe, Bibury and Painswick, downloaded via bounded Overpass queries. Real street topology, streams, building centers and orientation are adapted to the existing city kit at 0.55 model units per meter. Density controls select sparse/mixed/dense building retention; size changes the source crop. Buildings can be moved back up to ten units for frontage clearance and are omitted if their conservative envelopes still conflict. This is not an exact reconstruction. All map-derived previews and exports retain OSM attribution/ODbL metadata; filtered source data is downloadable and available under ODbL. No live map queries occur during gameplay.

The three estate samples at seed 732 retain 19/32/39, 43/70/93 and 120/212/268 buildings at sparse/mixed/dense settings respectively. One local generation audit measured approximately 4–43 ms per sample; this is generation time, not a rendering or combat benchmark. Architecture remains instanced. Nine focused country tests validate determinism, curved-road clearance, bounded geometry, source validation, clipping and density variation.

Limits: real-data adapters are gallery studies, not authoritative campaign battle imports. Terrain is flat; way-only samples omit multipolygon buildings, real vegetation/field boundaries and routing restrictions. Existing world views consume the new procedural compact plans but do not yet place the real-data samples. A full country still needs road stitching, terrain-aware placement and broader source archetypes.

Commands: node scripts/fetch-country-osm.mjs (cached extracts); node --import tsx scripts/audit-country-osm.ts; node --import tsx --test tests/country-*.test.ts. Browser reviewed real-source selection and street patterns. Final validation results are recorded in the task response.

Final validation: all 255 regression tests pass; TypeScript and production build pass. Eleven focused country/placement checks also pass. Browser reviewed Castle Combe, Painswick, and Bibury; changing Bibury from mixed to sparse retained the road network while reducing buildings from 70 to 43. The separate review tab was closed after inspection.
