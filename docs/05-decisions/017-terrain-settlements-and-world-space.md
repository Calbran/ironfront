# 017 — Terrain, settlements, and world space

## Accepted direction

Present continuous forests, plains, and mountains; make settlements recognizable and interactive. Increase physical world space substantially while keeping territory management manageable. Open at a useful campaign view and keep names readable. Land area remains the victory measure.

## Implemented first pass

- Version 6 expands generation coordinates threefold in both dimensions: four nations use 14,400 × 9,600 with 96 territories; eight use 20,376 × 13,584 with 192. This is nine times version-5 area, with unchanged territory counts and starting-allocation rules. Scale coordinates after generation to preserve the existing raster workload. Saved navigation cell size follows the scale; old saves default to their original cell size.
- Saved campaigns retain their geography. New campaigns are required for the larger physical world. Continuous biome paint, forest and mountain symbols, building clusters, and clearer labels also work with compatible existing geography.
- Campaigns open centered on the player's capital at 300%. Fit remains the explicit whole-continent overview; camera position survives normal updates and selections. Preview remains an overview.
- Settlement clusters vary with settlement size. Clicking one shows its name, size, ownership, and garrison action in the existing compact bottom dock, retaining selected squads.
- Garrison is an authoritative squad move order to a friendly settlement. Its assignment persists. Cover applies only while within 24 world units of the site and while its region remains friendly. Existing cover mitigation applies (incoming ground damage divided by 1.3). New squad orders cancel the assignment. Group validation is atomic; enemy state does not expose assignments.

## Provisional / deferred

Scale, travel duration, cover radius, and mitigation require campaign playtesting. Settlements inherit territory ownership; they are not separate capture or victory points. No new city economy, supply radius, garrison capacity, building interiors, or recruitment rules are introduced. Biome patches are visual; existing region terrain rules remain authoritative, without new local concealment or line-of-sight mechanics.
