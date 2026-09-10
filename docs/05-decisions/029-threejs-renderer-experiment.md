# 029 — Isolate a Three.js renderer experiment

## Accepted direction

The user requested an experimental branch to explore a miniature-world Three.js migration while preserving existing work. They explicitly asked to skip Impeccable for this task. Existing assets, authoritative simulation, saved coordinates and React interfaces should remain reusable.

The user subsequently chose a fixed isometric camera. Keep the same angle across all distance presets, with pan and zoom; free rotation and overhead mode are removed. Models remain useful for consistent depth, lighting and asset reuse.

## Provisional

Three.js as the production world renderer; miniature scale ratios; replacement building volumes; terrain appearance; winter biome treatment. This experiment does not validate final art direction, campaign performance or cover integration.

## Implemented in the experiment

A standalone `/three-preview.html` entry reuses generated world data and existing infantry/jeep sources, offers the original Pixi renderer for comparison, and supports model/sprite buildings and terrain palette studies. Original checkout and campaign authority are preserved. See [prototype notes](../prototypes/threejs-migration.md).

The user requested restoration of Pixi interactions. The experiment now supports friendly generated-army selection and a manual strategy mode following the existing control conventions. This remains a read-only generated preview, not live campaign command integration.

The user approved building one crafted-miniature reference scene before extending the art across the generated world. `/reference-preview.html` implements that bounded summer/winter study. Its final art quality and adoption into campaign generation remain subject to review; see the scene notes for limitations.

The user accepted the reference scene as sufficient for now and requested scaling/performance work before further art detail. Implemented shared building/tree assets, spatial instance chunks, zoom-based detail and synthetic whole-world benchmarks. No minimum hardware or campaign-performance guarantee has been accepted.

The user authorized live campaign integration and a 30-minute real-server soak, followed by refining one generated region toward the crafted-miniature reference. The experiment now offers an opt-in live renderer while retaining Pixi as default. Generated landscape refinement remains preview-only; it does not change authoritative terrain or cover. Expansion across the continent and final asset quality remain provisional.

The user approved a terrain-aware riverside town and a review of generator ordering/efficiency. One experimental town now plans connected streets and street-facing lots from existing routes and terrain constraints. Ordering, model dimensions and town tuning remain provisional; continuous slope handling and campaign-wide adoption are not yet implemented.

The user subsequently accepted the current town visually as a working baseline. Broader settlement patterns and regional-road integration are proposed next steps, not yet authorized implementation; see the town-generation audit.

The user then authorized continuing development. Settlement-pattern expansion and regional-road entrances are now implemented in the preview with explicit legacy fallbacks. This supersedes their earlier proposed-only status; further asset-kit expansion and yard detail remain proposed.
