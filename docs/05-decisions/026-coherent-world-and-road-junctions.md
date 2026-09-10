# Coherent regions and shared infrastructure

Accepted: regions should have a reason to exist geographically. Farmland should form cohesive estates; roads from different towns should meet at intersections and share approaches.

Implemented generation order now establishes Earth-derived relief/coastlines, terrain partition, and drainage before land use and settlements. Rivers continue to follow priority-flood runoff, with existing water bodies and relief preserved. Agricultural selection uses spatially smooth fertility variation. Settlements favor flat low ground, riverbanks and actual shore access, with increased separation. Regions store a geographic purpose: farming basin, woodland district, upland district, highland pass (highlands adjoining multiple mountain territories), port hinterland, settled heartland or wilderness. The selection card shows this purpose. Roles affect land use and settlement character, not new economic bonuses.

Neighboring agricultural regions share parcel orientation and scale. Connected parcel groups of at least six fields become named-by-ID districts; isolated scraps are discarded. Roads/rivers/unsuitable terrain remain exclusions. This improves existing maps cosmetically; newly saved roles and new settlement placement require a new map. Administrative borders are still terrain-sensitive connected partitions, not a completely new hydrological-boundary generator.

Physical road consolidation splits intersections and collinear overlaps, removes redundant physical circuits, and retraces town connections through the shared network. Rendering and utilities consume unique physical segments; bridge markers are deduplicated. Shared intersection surfaces cover road-casing seams. This supersedes the previous optional-loop policy: redundant physical loops are currently removed in favor of a sparse connected network. All town endpoints remain connected; terrain-valid geometry is retained.

Future work can give roles economic/supply consequences and further refine regional borders around watersheds. This change does not claim those mechanics or a new lake simulation.
