# Crafted miniature reference-scene plan

Status: first bounded scene implemented; further art refinement and generator integration remain proposed, based on the user's supplied summer/winter concept B. This is not a shipped generator or a promise of exact concept-image reproduction.

## First milestone

Create one bounded reference scene: a small settlement, dirt road, bridge, river, forest edge, rocky hill and field. Keep the accepted fixed isometric camera and the existing infantry/jeep as scale references. Inspect the same composition in summer and winter at tactical and strategy distances. Establish quality and cost here before extending procedural generation to the continent.

## Work order

1. **Shape and scale.** Agree road widths, building footprints, tree heights and soldier scale. Replace the flat ground plane with gently shaped terrain. Integrate rock masses into slopes and cut a river channel. Keep gameplay coordinates and collision metadata explicit; visual relief alone must not change cover or traversal.
2. **Water and routes.** Reuse existing generated drainage and road paths as inputs. Vary river width, smooth visible bends without breaking crossings, build banks/gravel margins, place bank rocks and connect a bridge to the road surface. Add restrained water color variation and flow. Generator topology improvements follow evaluation; decorative river shading cannot repair invalid drainage.
3. **Ground materials.** Blend grass, worn dirt, bare earth and rock with broad color variation and small surface detail. Drive transitions from slope, banks, roads and building footprints. Avoid square patch edges, high-contrast tiling and uniform texture noise.
4. **Small modular model kit.** Proposed starter set: 4–6 recognizable building types (homes, workshop, sawtooth factory, civic building), 2–3 deciduous/conifer tree silhouettes, several rock shapes, bridge pieces, fences and a few reusable industrial props. Prioritize roof geometry, windows/doors and silhouette before tiny modeled details. Use shared materials/texture atlases and instancing where appropriate; existing assets remain usable references or distant sprites.
5. **Composition and lighting.** Cluster vegetation around plausible forest edges, moist banks and field boundaries. Place worn yards at doors and tracks where roads enter settlements. Establish one soft directional light, contact shadows and restrained surface shading. Judge readability with unit selection and strategy overlays active.
6. **Winter variation.** Reuse geometry and layout. Snow accumulates on upward-facing roofs, rocks and branches; preserve exposed slopes, trunks, road tracks and river edges. Ground snow needs broad uneven coverage and small surface texture, not a global white tint. This is initially visual; no seasonal movement/combat rules are implied.

## Exit criteria

A coherent still view comparable in composition to the reference; units and roads remain legible at normal play scale; summer/winter variants share assets; pan/zoom and selection remain usable; measured frame time, draw calls and texture memory stay within an explicitly chosen target device budget. Then expand the generator using the same rules and modular kit. Full continent performance remains to be validated.

See [implemented scene and limits](crafted-miniature-scene.md).
