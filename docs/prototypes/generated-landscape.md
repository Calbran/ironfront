# Generated-region landscape study

Experimental branch only; open `/three-preview.html` and choose **Visit refined region**. This selects a generated settlement near a river and removes synthetic stress soldiers from the view. **Refined landscape study** switches the added layer off for comparison. Winter and strategy controls remain available.

The study retains actual region boundaries, settlement footprints, roads, river paths and farmland parcels. One region gains subdivided ground with gentle height variation, a shallow channel along existing rivers, procedural ground grain, worn building/road margins, instanced bank rocks, shrubs and grass. Actual field parcels receive furrow shading and merged fence geometry; existing road bridge locations receive simple raised decks. Nearby shared miniature buildings and trees remain reused.

At strategy or distant zoom the layer is hidden and the original region surface restored. Detail budgets cap shrubs, rocks and tufts, and placement is deterministic. Winter updates existing color buffers rather than allocating a fresh GPU attribute on every toggle. The refined landscape is restricted to the generated preview; live campaign terrain and navigation are unchanged.

This is a first translation of the authored image into generated scenery. It does not introduce hydrological river generation, new cover or movement rules, a snow biome, or final production assets. The wider world retains simpler terrain. Further work should improve regional blending and asset silhouettes after visual review, then apply the rules through the existing chunk/LOD system before extending across every region.

Verification: `scripts/generated-landscape-browser.ts` captures summer/winter, baseline, strategy and phone views, checks errors/overflow, and measures five-second on/off frame samples at the same camera position. Results are local desktop evidence, not minimum-device certification.

## Local measurement

The default Meridian study contains 83,626 ground triangles, eight fields, 32 trees, 77 shrubs, 105 bank rocks, 479 grass tufts and one bridge deck. At the same town camera, detailed rendering submitted 193 calls / 572,418 triangles versus 148 calls / 421,956 triangles with the layer hidden. Five-second samples stayed near 60 FPS: p95 18.7 ms detailed, 18.6 ms baseline; neither sample contained a frame above 33.4 ms. Browser error and phone-width overflow checks passed. See [raw comparison](generated-landscape-results.json).

Turning the layer off hides it for drawing; it intentionally retains its allocations for immediate comparison. Extending this ground geometry to every region without chunk streaming is not authorized by these numbers. River paths still show the underlying generated angular geometry, and regional transitions and asset detail remain visibly short of the authored reference.

## River and edge refinement

The preview now rounds river corners with bounded quadratic segments while retaining original mouths and bridge approaches. Joined strip edges avoid gaps at bends. The sculpted channel and bank placement consume the same presentation paths; authoritative river/navigation data and the live renderer remain unchanged. This improves existing paths rather than creating a new drainage simulation.

Terrain height, color and texture grain fade over a ten-model-unit margin into the original region material, including the winter palette. The art-tour button clears its temporary region outline; ordinary map selection still draws an outline. Terrain construction caches repeated vertices to avoid recalculating nearby roads, rivers and buildings for shared triangle corners.

Follow-up measurement: p95 17.6 ms both detailed and baseline, no sampled frames over 33.4 ms, no browser errors or phone overflow. Refined rendering submitted 192 calls / 574,918 triangles. The runner reached the study in 4,452 ms including its 1,500 ms settling delay. See [river/edge comparison](generated-landscape-river-results.json); the earlier comparison remains retained above. These are short local samples rather than a new full campaign soak.

## Riverfront building clearance

A preview-only worker pass relocates building models whose conservative footprint plus bank margin overlaps the presented river. It accounts for model eaves/porches, stays on local land, avoids town streets and other building envelopes, and searches deterministically within 180 world units. If no safe lot is available, the decorative model is omitted. Layout radius and later field/scenery generation reflect relocated buildings. Authoritative settlement features and the live campaign renderer are unchanged. Summer/winter review and local performance sampling passed (p95 17.3 ms detailed; no sampled frames over 33.4 ms).

## Road clipping at riverbanks

Cosmetic road strips now stop at the presented river banks, accounting for both water and road width. Sampling includes a conservative half-step margin, so a retained strip cannot cut through water between samples. Raised bridge geometry remains independent. This applies to generated-preview town streets and intercity ribbons, not authoritative routes or the live campaign renderer.

Each road's retained pieces share one geometry batch. Final summer/winter, strategy and phone checks passed without browser errors; local p95 was 17.7 ms with no sampled frames above 33.4 ms and 185 draw calls in the refined view. Typecheck and production build passed (existing large-bundle advisory remains).

The later terrain-aware town pass changes the default art-tour region to the selected planned town (Marshford for Meridian); counts above describe earlier captures. See [town generation audit](town-generation-audit.md) for the current planner, pipeline ordering, measurements and limitations.
