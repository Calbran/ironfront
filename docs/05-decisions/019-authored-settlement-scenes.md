# 019 — Authored settlement scenes

## Accepted direction

The owner prefers designed, dense settlement illustrations over realistic procedural placement of individual buildings. Support border towns, rural towns, industrial centers, ports, and grand metropolises with railways, skyscrapers, and airship towers. Keep original artwork orientation and aspect ratio. City scale should express more architecture, not enlarged houses.

## Implemented

Fifteen authored scene variants replace the procedural building/road layer. The campaign seed and settlement ID choose a stable variant. Size and geographic archetype choose a scene family. Each illustration has a separately calibrated world-space width; cities and metropolises may add adjoining districts without scaling up the core. Extra districts are omitted when land or neighboring settlements cannot accommodate them. Saved settlement coordinates, selection, and authoritative garrison behavior are preserved.

Five transparent scene atlases and an ambient transport atlas are loaded from the project art directory. Uniform sprite scale preserves proportions. At overview the map keeps small settlement markers; close zoom reveals artwork and separate ambient smoke, train, and airship layers. Reduced-motion preferences disable ambient animation. Ambient vehicles confer no gameplay effect and are not controllable units.

## Provisional / limits

Physical widths and district composition are visual tuning. Individual houses within an authored illustration are not simulated, independently targetable, or pixel-exact world scale. Port art keeps its original viewpoint rather than rotating to match arbitrary coasts; primary illustrations are symbolic settlement representations and can visually overhang narrow land. Extra districts use land checks. Independent city capture, economy, railway logistics, and airship gameplay remain outside this visual pass.

The previous pure block generator and its tests remain available, but the map no longer draws its individual buildings. See the settlement-scenes README and prompt record for art specifications.

The owner clarified that atlas cells must not imply equal map sizes. Border variants use 160–180 world units; metropolitan variants use 900–980, roughly five times wider. Variants within one family also have different widths to accommodate their composition. These dimensions preserve each source image’s aspect ratio.

## Terrain scale and train removal

The owner found the cities too large relative to mountain scenery and requested removing trains while retaining airships. All scene widths are now half the previous calibration (border 80–90; metropolis 450–490 world units), retaining relative architecture scale and source proportions. The animated train/rail overlay is removed. Airship and smoke dimensions are halved to match. Settlement placement/counts and underlying gameplay are unaffected.

## Varied silhouettes

The owner requested alternatives to circular clusters. Six additional authored compositions add linear, branching, rectangular, and L-shaped outlines. Seed selection uses the expanded catalog. Different aspect ratios are preserved and each scene has its own width calibration; no transformation forces them into a common circle or square. The library now contains 21 settlement scenes.
