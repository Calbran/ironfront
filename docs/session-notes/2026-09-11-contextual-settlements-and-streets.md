# Contextual settlements and shared streets — 2026-09-11

## Owner direction

Use city/POI dioramas as examples of generation and asset quality, not literal square modules. Vary settlements by size and setting; fade into smaller, sparser outskirts while keeping buildings aligned with sidewalks and developing their individual plots. Connect city streets to the country road network with matching materials and a gradual transition. Add powerlines, eliminate competing road surfaces, and trim roads with no destination. Reuse the existing OpenStreetMap adapter for realistic settlement structure.

## Implemented

- Shared embedded diorama scene builder, with the caller's WebGL renderer, server-supplied plan and no second animation loop or test units. Standalone diorama behavior remains available.
- Separate inland city generation from a location seed, size budget and outward density falloff. Smaller outskirts variants fit clearance checks and move to sidewalk frontages. Empty parcels lose paving; occupied outskirts get individual developed pads. No artificial canal or square city display base.
- Roadside fuel/provisions POI; offline Painswick sample feeds Riverward town through the existing OSM adapter. Metadata, attribution and downloadable ODbL source remain available. POI square bases are disabled in the sector; individual plot pads and shared street grain replace empty display ground.
- Country carriageways reuse the diorama texture. Instanced curbs, highway markings and continuous sagging powerline spans stream in nearby model-space tiles. Texture/material resources dispose on unload.
- Explicit terrain/shoulder/carriageway/marking depth order and a distance-dependent camera near plane improve road depth precision.
- City exit shares an open curb junction and street width with the country approach, then eases to highway width over 32 model units.
- Prune unserved spurs, shorten serviced dead ends to their final frontage, and remove redundant empty loops only when connectivity survives. Protect the actual eastward country exit. Collapse collinear rendering samples for graph work, then restore smooth samples; this avoids treating 6,581 samples as separate road junctions.
- Server navigation consumes the matching city and OSM town obstacles. City-street routing joins the country lattice at the real entrance. Geometry version 5 pauses older sessions, clears obsolete routes, preserves valid unit positions and relocates blocked units.
- Reuse the React root across development updates to avoid blank previews during hot reload.

## Validation

Typecheck and production build passed. Full suite: 283 tests passed. After final graph optimization and entrance cleanup, all 13 targeted road/settlement/movement/persistence tests passed again. These include no building/road overlap, developed-parcel occupancy, sidewalk setbacks, size variation, inland water exclusion, route segment clearance, river bridge use, air exemptions, restart persistence and geometry migration. Final build passed with the existing chunk-size advisory.

Browser review confirmed the country sector loads, size-based city and trimmed outskirts render, fuel stop uses surrounding ground without a square base, and OSM attribution/source links are visible. The global physical preview also loaded successfully (377/420 connected locations); its close-up roadside showed the shared carriageway, curbs and connected pole/wire spans without browser errors. The extra global 3D review was unloaded afterward. The country sector remains paused on the city for inspection.

## Limits

The main city still uses the existing seeded street/parcel grammar; OSM is integrated for the satellite town, not every global settlement. The global preview still has city placeholders. Arbitrary terrain-shaped city boundaries, cut/fill grading, richer roadside forecourts, broader OSM archetypes and campaign-wide settlement streaming remain future work. Building counts, density falloff, setback and furniture draw distances are provisional visual tuning. No combat/supply/victory change.
