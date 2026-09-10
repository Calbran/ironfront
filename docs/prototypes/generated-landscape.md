# Generated-region landscape study

Experimental branch only; open `/three-preview.html` and choose **Visit refined region**. This selects a generated settlement near a river and removes synthetic stress soldiers from the view. **Refined landscape study** switches the added layer off for comparison. Winter and strategy controls remain available.

The study retains actual region boundaries, settlement footprints, roads, river paths and farmland parcels. One region gains subdivided ground with gentle height variation, a shallow channel along existing rivers, procedural ground grain, worn building/road margins, instanced bank rocks, shrubs and grass. Actual field parcels receive furrow shading and merged fence geometry; existing road bridge locations receive simple raised decks. Nearby shared miniature buildings and trees remain reused.

At strategy or distant zoom the layer is hidden and the original region surface restored. Detail budgets cap shrubs, rocks and tufts, and placement is deterministic. Winter updates existing color buffers rather than allocating a fresh GPU attribute on every toggle. The refined landscape is restricted to the generated preview; live campaign terrain and navigation are unchanged.

This is a first translation of the authored image into generated scenery. It does not introduce hydrological river generation, new cover or movement rules, a snow biome, or final production assets. The wider world retains simpler terrain. Further work should improve regional blending and asset silhouettes after visual review, then apply the rules through the existing chunk/LOD system before extending across every region.

Verification: `scripts/generated-landscape-browser.ts` captures summer/winter, baseline, strategy and phone views, checks errors/overflow, and measures five-second on/off frame samples at the same camera position. Results are local desktop evidence, not minimum-device certification.

## Local measurement

The default Meridian study contains 83,626 ground triangles, eight fields, 32 trees, 77 shrubs, 105 bank rocks, 479 grass tufts and one bridge deck. At the same town camera, detailed rendering submitted 193 calls / 572,418 triangles versus 148 calls / 421,956 triangles with the layer hidden. Five-second samples stayed near 60 FPS: p95 18.7 ms detailed, 18.6 ms baseline; neither sample contained a frame above 33.4 ms. Browser error and phone-width overflow checks passed. See [raw comparison](generated-landscape-results.json).

Turning the layer off hides it for drawing; it intentionally retains its allocations for immediate comparison. Extending this ground geometry to every region without chunk streaming is not authorized by these numbers. River paths still show the underlying generated angular geometry, and regional transitions and asset detail remain visibly short of the authored reference.
