# 007 — Fewer territories and local features

Date: 2026-09-09

## Accepted direction

The owner wants directly commanded squads/units with optional RTS-style group orders, slow asynchronous play, fewer territories, and generated settlements of varied sizes plus local forests and terrain. Territory outlines should vary naturally rather than resemble a regular grid. Work starts with generation and map presentation. Land ownership remains the victory measure.

## Implemented first pass

New version-3 geography has eight territories per nation (16–64; four-player default 32), with the existing player-scaled world dimensions. Uneven seed spacing and variable-speed, terrain-sensitive expansion replace evenly spaced, equal-speed cardinal flood growth. Each territory stays connected by cardinal land cells; shared raster borders and reciprocal adjacency remain authoritative.

Local elevation/moisture patches cross territory boundaries. Named hamlets, villages, towns, cities and metropolises occupy interior land cells. Forest, ridge, peak and open-country landmarks are stored per territory. Settlement icons and zoom-dependent labels appear in preview and campaign maps; the region inspector lists places and terrain. Mountains are selected by peak-area coverage rather than only average elevation, retaining connected traversable routes. Existing serialized maps are not regenerated.

## Provisional and deferred

Eight territories per nation, settlement counts and size distribution, growth weights and mountain coverage thresholds are provisional. Starts still claim up to four territories; fewer regions and unequal areas change economy, frontage and expansion pacing, and require playtesting. Settlement size currently conveys geography only: no production, slots, cover, control points or victory multipliers. Local terrain does not yet change combat within a region. Recruitment, direct squad commands, position movement and contested territory ownership remain future work. Rivers remain visual; roads and bridges are not generated in this pass.
