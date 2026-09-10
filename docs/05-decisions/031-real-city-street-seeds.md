# 031 — Real city references for organic settlements

## Accepted direction

The user wants cobbled streets, steampunk lamps, close downtown frontages, alleys, open spaces, waterways tied to the surrounding geography and rural outskirts. They rejected the concentric-ring layout and its sparse spacing. They asked to seed the algorithm with actual city data and selected an industrial river town with warehouses, canals and dense worker housing.

## Implemented in the experiment

The standalone large-city diorama uses a bundled OpenStreetMap street/canal extract from Ancoats and adjacent Manchester streets. A smaller district crop respects the miniature building scale. Pure generation in `organicCity.ts` samples frontages, checks oriented model footprints against neighbors and streets, reserves civic/depot/park spaces, assigns canal-side workshops and selects dense inner lots before scattered outer housing. Rendering adds world-aligned procedural cobbles, merged brass lamps with emissive glass, canal strips and raised crossings. No individual lamp lights or remote runtime requests are added.

The reference database is kept separately under its ODbL license with provenance and visible attribution. The converter is repeatable from a saved Overpass response. The seed currently chooses building placement/variants; it does not change the fixed reference street network.

## Provisional and unresolved

This is one contemporary street sample adapted to game proportions, not a historical reconstruction. The fixed diorama capital and depot require a diverted canal corridor. Actual terrain/river inputs, grade-separated road interpretation, full block/parcel infill, varied worker terraces, multiple reference districts, connected regional entrances and deployment to the campaign town planner remain future work. Real-world building footprints are not yet imported. Density and art require user review. Existing authoritative capture and continent generation are unchanged.
