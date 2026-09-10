# 006 — Earth-derived geography

Date: 2026-09-09

## Accepted direction

The owner rejected slight variations of a blob-shaped continent and requested varied natural geography, thin peninsulas, channels, chokepoints, and mountains, using real topographical data and the existing Crownfall generator as references. The earlier restriction on importing Crownfall gameplay does not prevent this explicitly requested generator study. Ironfront retains its existing military rules, clean map style, and player-scaled world area.

## Implemented

The ellipse-based coastline and two fixed mountain bands are replaced by a version-2 generator using a bundled five-sample elevation atlas. Seeded sample choice, rotation/reflection, anisotropic scale, coordinate warping, sea threshold, and secondary-source erosion/relief create fictional coastlines and elevations. Elevation drives mountain regions; wind transport affects moisture; priority-flood drainage and accumulation drive merging rivers. Terrain is generated before territories. Land-constrained territory growth preserves narrow necks and never assigns disconnected land to one region. Mountain selection leaves the passable territory graph connected.

The lobby generates a random initial seed, uses a cancellable worker for previews, and preserves deterministic reproduction for explicit seeds. World area still scales with nation count and territories remain 24 per nation. Existing serialized maps remain unchanged.

## Crownfall comparison

Read the local `apps/web/src/generateWorld.ts`, world-generator spec, and world-generation methodology. Crownfall uses domain-warped multi-scale elevation, profiled mountain walks, depression filling, wind/rain shadows, flow accumulation, and downstream biome assignment. It does not use real-world elevation. Ironfront adopts the geography-first sequence and coherent fields, not Crownfall's hex grid, fantasy rules, or entire generator.

## Limits

This is transformed real relief plus procedural deformation, not plate tectonics or full erosion simulation. Five source patches can retain recognizable structural families. Detached islands are decorative until naval traversal exists. Across seeds, playable land fraction and starting fairness vary. Connectivity and reproducibility do not validate multiplayer balance.
