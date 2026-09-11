# Physical countryside pass

Accepted clarification: very large farmlands, not very large outpost towns. Build large areas from many crop parcels; retain authored local model dimensions. Reuse the other task's country POI library without editing it.

Implemented a pure seeded scenery planner and pacing-only renderer. Agricultural/plain regions can receive 10×8 candidate parcel districts with omitted parcels, crop variation, margins and broad central clearances. Each accepted district has at least 12 parcels. Forest/highland/plain regions select different compact POI pools. Local template extents remain 44 or 66 model units; nothing scales their buildings or props. Field surfaces share mipmapped grain/row texture and one instanced mesh. Six detailed POIs at most load within 1,800 model units of the focus, only at local viewing distances. Country overview retains farmland markers, with minor POI markers appearing at regional zoom and all destinations listed in Focus.

Placement samples 5×5 footprints on non-mountain land, rejects river-segment clearance and existing settlement/objective/base buffers, and reserves accepted fields/POIs. This is conservative sampled validation, not polygon clipping or navigability certification. Large fields have open margins but no connected country roads; local asset roads remain stubs. Flat terrain, full-city integration and biome scenery blending remain unfinished. Scenery creates no ownership, production, capture objective or movement orders.

Validation: six focused countryside/library tests and TypeScript check pass. Full suite/build results are reported separately when complete. Density, field shapes and colors remain provisional for visual review.
