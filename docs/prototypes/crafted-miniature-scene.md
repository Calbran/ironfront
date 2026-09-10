# Crafted miniature reference scene

Implemented on `codex/threejs-miniatures` at `/reference-preview.html`. Linked from the generated-world experiment; the original Pixi game remains intact.

## Scope

A bounded authored diorama, based on the summer/winter concept B composition. Continuous terrain includes a recessed, variable-width river and a raised rocky hill. An arched masonry bridge crosses the channel, with road approaches; worn ground blends around roads and building yards. Five building silhouettes share procedural slate/masonry materials and trim: civic hall, homes, sawtooth workshop and awning shop. Industrial fittings, barrels, crop rows, fences, deciduous trees, conifers and bank rocks supply context.

Winter reuses the same scene with separate canopy/roof/rock snow surfaces and ground coverage preserving road/yard wear. Materials and geometry are generated in TypeScript; no new remote assets or image-generation costs. Static details are merged by material. Existing infantry and jeep sources establish scale.

Fixed isometric camera, scene/town/bridge presets, pan/zoom, two selectable reference squads (box selection, Shift-add, Escape and accessible select/clear buttons), summer/winter switch, shadows and a simplified strategy-readability mode are available. Return to `/three-preview.html` for actual generated geography, ownership and army roster selection.

## Validation and limits

Typecheck and production build pass. `scripts/reference-preview-browser.ts` checks summer/winter, camera presets, squad and box selection, Escape, strategy toggling and phone layout, with zero browser errors. Screenshots are written to `/private/tmp/ironfront-reference-review`. Local warmup samples were approximately 52–60 FPS, around 200 draw calls and 260–300k triangles depending on season/view. These are local art-scene measurements, not campaign performance guarantees. The production build retains large-chunk warnings.

This is a first working art-quality reference, still visibly simpler than the concept illustration. Trees, rocks and surface shading need further refinement. River motion is only a subtle ripple-opacity effect; there is no fluid simulation. Terrain is authored using analytic height functions, not connected to generated drainage. Snow caps are geometric approximations, not a weather system. Strategy colors are illustrative. No movement, collision, cover, capture or persistence rules change. The chosen reference troops are static and do not receive orders. There is no campaign-wide asset placement or LOD integration yet.

Next decision: review composition, scale, material character and seasonal coverage here, then adapt approved pieces into the existing generator instead of copying this fixed layout across the continent.

Building and tree factories are now shared with the [world stress test](world-performance.md). The reference scene still batches its static placements. This integration does not yet extend the authored terrain/water treatment to generated worlds.
