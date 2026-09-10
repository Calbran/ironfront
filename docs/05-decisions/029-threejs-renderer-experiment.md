# 029 — Isolate a Three.js renderer experiment

## Accepted direction

The user requested an experimental branch to explore a miniature-world Three.js migration while preserving existing work. They explicitly asked to skip Impeccable for this task. Existing assets, authoritative simulation, saved coordinates and React interfaces should remain reusable.

## Provisional

Three.js as the production world renderer; miniature scale ratios; replacement building volumes; terrain appearance; winter biome treatment. This experiment does not validate final art direction, campaign performance or cover integration.

## Implemented in the experiment

A standalone `/three-preview.html` entry reuses generated world data and existing infantry/jeep sources, offers the original Pixi renderer for comparison, and supports model/sprite buildings and terrain palette studies. Original checkout and campaign authority are preserved. See [prototype notes](../prototypes/threejs-migration.md).
