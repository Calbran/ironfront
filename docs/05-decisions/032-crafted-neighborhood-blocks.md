# 032 — Crafted neighborhood blocks and developed ground

## Accepted direction

The user wants cities to resemble the crafted-miniature reference through coordinated blocks, elevation, connected surfaces and placement constraints. Inside developed blocks, paving and yards should replace incidental grass. Establish one small neighborhood before expanding the generator across a city.

## Implemented in the experiment

The default 28-building option in `/city-diorama.html` is a bounded neighborhood: 27 kit buildings and the capital, with paired residential frontages, market shops and a lower warehouse quay. Civic land is two scene units above the quay, connected by a 14-unit graded transition. Shared paving covers the civic/residential area; yard material covers the waterfront. Vegetation is outside the developed blocks. Hall, streets, paving and foundations use the same elevation profile; subdivided surfaces prevent ground clipping through paving. Kit models remain instanced, furniture merged, and cobblestone UVs share world scale/orientation.

Pure `craftedNeighborhood.ts` places a fixed composition through clearance, flat-foundation and street-facing entrance checks. It rejects invalid placements rather than forcing them. The hall shares the block axes and developed surface. Existing larger Ancoats-seeded options remain available. Capital capture remains visual intent only.

## Provisional and future

This is an authored block prototype with validation, not a general terrain-aware parcel solver. Block dimensions, elevation/gradient and building count are art-study tuning. It reuses existing models; bespoke terraces, corner buildings, materials, automatic block fitting, terrain-derived rivers, stepped foundation alternatives and campaign rollout remain future work. The existing city-count performance results do not establish performance for future detailed blocks.
