# Steam jeep model study

Open `/jeep-preview.html` with Vite or the production server. This standalone preview uses the bundled Three.js dependency, with no CDN requirement. Source: `apps/web/src/prototypes/jeepModel.ts`; preview: `jeepPreview.ts` and `jeepPreview.css` in that directory.

Experience mode: the vehicle leads; a compact iron/enamel control panel provides model inspection. Barlow Condensed headings, ivory text and brass control edges extend the game's art style guide. Desktop reserves space beside the model; phone places controls below it. This surface does not replace the campaign visual system.

The preview uses locally bundled Barlow Condensed at weight 600 for its title and capacity statement, with Arial for body copy and controls. At widths up to 650px, the model stage sits above the control panel; wider screens offset the stage to leave room for the panel. Buttons show a brighter enamel hover state and a brass keyboard-focus outline.

Six inward-facing passenger sockets plus a separate driver socket use the infantry study's native coordinates. The static reference figures match the original torso, legs, helmet and backpack dimensions; they are inspection poses, not a replacement animation rig. Standing helmet height: 1.925 units. The vehicle model is authored geometry, not generated raster art.

Drag the model to orbit; scroll or pinch to zoom. **Hide passengers** toggles the six bench occupants while the driver and standing comparison figure remain visible. **Lower tailgate** toggles the rear gate between closed and lowered inspection poses. **View from above** switches between overhead and three-quarter camera positions. These inspection controls do not animate boarding or issue campaign orders.

Use Download 3D model to export an empty `.glb` with named passenger sockets and tailgate pivot. Passengers and the standing comparison figure belong to the preview and are excluded from the vehicle export. The exported tailgate starts closed. The default distance model merges vertex-colored parts into two meshes (body and articulated gate), using one shared material and cached geometry across copies. Crowd instancing and live map integration remain future optimization work. No performance budget is claimed.

Accepted capacity and future gameplay boundary: [decision 027](../05-decisions/027-steam-jeep-transport.md).

A checked-in empty vehicle export is available at `apps/web/public/art/vehicles/steam-jeep.glb` (77,736 bytes, 692 triangles). GLB v2 header, declared file size, and all six named passenger nodes were checked after export. This mesh count is a model statistic, not a performance benchmark.

Validation: desktop 1280×720 and phone 390×844 browser inspection; passenger toggle, tailgate, overhead/three-quarter views and browser GLB export exercised. TypeScript check and production build passed. Independent screenshot/code review returned **ship for the bounded standalone model preview**. Orbit/zoom are pointer/touch controls; keyboard users have preset view buttons. No gameplay/server changes or campaign transport tests are claimed.

## Distance simplification — September 10, 2026

Reduced the empty jeep from 3,964 triangles/188 meshes to 692 triangles/2 meshes (82.5% fewer triangles). The GLB shrank from 433,192 to 77,736 bytes. Removed tread blocks, rivets, glass, gauges and fine plumbing; continuous benches and low-sided wheels retain the silhouette. The original authoring model remains available through `createDetailedJeep()`, while `createJeep()` and the preview/export now use the simplified version.

The two opaque meshes each use a single material with vertex colors; this reduces vehicle submission count to two per ordinary render pass, excluding passengers, shadows and scene content. Shared geometry avoids rebuilding buffers for every copy. This is not yet a vehicle crowd instancing implementation or a measured FPS improvement.

Validation: typecheck/build, browser silhouette and tailgate inspection at enlarged and reduced viewing scales, exact six socket positions/headings against the original, shared geometry identity across copies, independently articulated gates, and GLB header/length/passenger nodes. Infantry dimensions, boarding requirements and campaign behavior are unchanged.
