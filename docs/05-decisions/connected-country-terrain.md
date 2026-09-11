# Connected country terrain foundation

## Accepted direction

The user rejected small isolated mountain representations and authorized the connected-terrain foundation as the next step toward a global 3D world. Mountains should occupy broad geographic areas, join into ranges, and blend into surrounding terrain. Local infantry, vehicle, building and road sizes remain the scale references.

## Implemented

`connectedTerrain.ts` in game-core builds a deterministic, versioned height surface from the existing world's land contours and native biome patches. Region polygons are a fallback; administrative subdivision does not reset heights. Distance fields merge mountain interiors into broad foothills and uplands. Warped multiscale ridge noise produces shared crests and valleys. Connected biome components supply named range navigation.

Rivers, reserved locations and the existing review corridor constrain local heights rather than reducing mountain extents. All cells supporting a reserved footprint are flat, with a smooth outer transition. Coast-distance fading keeps elevated meshes inside land. Current flat authored scenery remains supported.

The longest grid axis has 512 cells. A Three.js adapter splits this into independently culled 64-cell tiles with identical shared heights/normals, slope/altitude material colors and existing ground grain. The same triangulated height sampler drives camera clearance. A grade query is available for subsequent routing work. Show locations controls marker visibility without rebuilding the terrain.

The old isolated relief generator and its constant east/west trenches and detached tunnel study are superseded. Mountain passages must eventually follow real connectivity and route constraints before entering the campaign simulation.

## Provisional tuning and limits

Height amplitude, ridge frequencies, snowline and foothill widths are art tuning. This is not erosion simulation or a physical elevation reconstruction. Existing river channels return to sea-level rather than modeling longitudinal drainage. Grid-sized padding around sub-grid sites is deliberately conservative; it can create broad local basins. A higher-resolution terrain-first planner should grade and place sites instead of preserving all flat placeholders.

The coarse surface stays resident; only drawing is frustum-culled. Adaptive terrain LOD, streamed close detail, complete forest populations, full-city insertion, terrain-aware roads and authoritative slope/bridge/pass routing are later integration steps. Current campaign terrain blockers and air exemptions remain in place; these new heights neither grant mountain shortcuts nor alter existing saves or ETAs.
