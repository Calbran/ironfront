# Country road network

Date: 2026-09-11

## Accepted direction

The country should have highways between major centers and smaller roads serving cities, hamlets, farmsteads, outposts and other local destinations. Connections should follow geography and meet site entrances. Local model scale remains unchanged. This extends decisions 024 and 026.

## Implemented in the physical pacing preview

Pure generation in game-core routes on the shared terrain lattice. A weighted multi-source search joins accessible destinations; a minimum connecting forest supplies shared physical segments. Paths linking major centers become highways, with local branches to minor destinations. Existing POI entrance sockets provide the endpoints. City placeholders use cardinal edge entrances until tactical layouts are integrated.

Roads avoid mountain biome cells, steep grades, coast edges and other destination footprints. Validated corner cuts soften grid bends. River intersections receive bridge decks; sea gaps remain disconnected. The preview reports locations for which the lattice cannot find a safe approach or another reachable destination. This is not proof that no finer route exists.

Road strips follow the terrain triangles. Highway overview lines preserve readability without enlarging physical carriageways. Crop parcels intersecting routes are omitted, and nearby roadside detail follows the surface. Road meshes are batched; local POI detail retains its six-site budget.

## Provisional tuning and limits

Highways use shared diorama carriageway grain and dashed center markings, six model units wide; local lanes are three. Curbs and timber-pole powerline spans load in nearby model-space tiles. Their dimensions stay fixed as the camera zooms. Depth-biased shoulder/carriageway/marking layers and an adaptive camera near plane improve depth precision. The 18% grade ceiling, coast margin, forest penalty and bridge dimensions are provisional visual-generation settings. The coarse lattice can miss narrow passes or coastal approaches. Bridges currently cross the existing schematic river centerlines; actual river-bank engineering, cut/fill, ferries, tunnels and redundant highway loops remain future work.

This is preview scenery. No movement-speed bonus, supply effect, ownership, combat or persistence rule changes. Terrain-aware authoritative navigation needs separate integration and validation.
