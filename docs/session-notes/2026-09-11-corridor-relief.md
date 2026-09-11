# Corridor refinement and relief

Accepted direction: richer landscape presentation, large mountains/hills at country scale, and eventual passes/tunnels as meaningful connections. Mountains need not be imported models: broad landforms use terrain meshes with smaller rock/engineering assets for detail.

Implemented preview pass: shared refinedSurface grain; nine bounded nearby roadside chunks, 350 candidate decorations per chunk, excluding mapped water, fields, POI envelopes and the road lane. Instanced grass/shrubs/pebbles and shared tree assets dispose on leaving the area. This is not complete diorama visual parity or full terrain streaming.

Relief uses circles fitted conservatively inside mountain/highland territories, with footprint/river/corridor reservations, tapered ridged height profiles and bounded grids. Mountain studies include a continuous zero-height east/west pass valley and five-unit visual road. A short hollow cut-and-cover tunnel study sits in the first pass; the bore is actual geometry, not a portal decal. It is an engineering-scale study, not a fully bored long-range mountain tunnel. Camera clearance conservatively samples adjacent terrain-grid heights. No authoritative movement, combat, supply, ownership or saved geography changes are made.

Next gates: shape passes from geographic connectivity instead of the current synthetic orientation; create explicit tunnel endpoint/edge records in the authoritative route graph, validate dimensions/grade/clearance, recalculate travel times, and decide access/ownership/blocking rules before enabling mountain shortcuts. Integrate full tactical cities and imported/organic country road entrances before certifying the corridor.

Validation: five focused terrain/camera tests, typecheck and final build passed; existing bundle-size warning persists. Full regression suite passed 258/258 tests. Browser checks confirmed the hollow tunnel opening and nearby roadside grass, shrubs, pebbles and trees. Visual review remains an iterative art pass, not final quality approval.
