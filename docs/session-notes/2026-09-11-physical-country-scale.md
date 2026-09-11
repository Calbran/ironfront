# Physical country scale experiment

Accepted direction: enlarge distances between destinations to support hours-long travel without enlarging local buildings, roads or units, or slowing infantry animation. Future transports can reduce travel times; their speeds are not chosen here. Another user task owns countryside models and set pieces.

Implemented only in pacing preview: toggle between original compact space and 171.6× geographic anchor separation. The multiplier derives from 1.43 model units/s divided by the study reference of 360 world units/h at 1/12 model conversion. Geography contours, river centerlines and destination anchors expand; local meshes, local offsets and settlement radii do not. The terrain stays coarse and flat. No road network is generated or widened by this change.

Route comparison sums existing path segment lengths at constant city infantry reference speed. Strategic calculations and pass/fail labels remain separate; per-region speed differences prevent exact equivalence. These are estimates, not authoritative navigation on the new physical terrain. Existing saves and city-unit simulation are untouched. Rendering centers map coordinates and uses logarithmic depth; this is not a streamed/floating-origin world implementation.

Validation: three focused mathematical regressions, full TypeScript check and Vite production build pass. Existing bundle-size warning remains. No full gameplay suite was run for this preview-only change.

Next: integrate actual city footprints and entry sockets; connect them with fixed-width country roads; stream nearby terrain/scenery and POI chunks rather than filling the entire enlarged map with detail; provide strategic destination markers; rerun physical-route and footprint audits once those systems exist. Do not stretch authored POIs or city-local street geometry.
