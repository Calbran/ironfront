# Authored settlement library

Five scene families, 21 variants total. Generated using the built-in ImageGen tool. Each `*-v1.png` scene atlas has three equal square cells in one horizontal row, 2172 × 724 RGBA. `ambient-v1.png` has two cells, 1774 × 887: airship, train. Cell alpha bounds are trimmed by the loader; sprites always scale uniformly, never rotate or flip.

| Family | World width by variant | Features |
|---|---:|---|
| border | 90 / 80 / 87.5 | Checkpoints, watchtowers, frontier depot |
| rural | 135 / 125 / 140 | Market, mill/workshops, guildhall |
| industrial | 210 / 200 / 215 | Foundry, railway depot, brassworks |
| port | 190 / 180 / 185 | Customs house, working docks, old seaport |
| metropolis | 470 / 450 / 490 | Skyscrapers/station, parliament/elevated rail, airship towers |

Widths are calibrated separately for each illustration against its architectural detail, independent of settlement rank. They are not constrained to equal display boxes. This remains provisional artistic calibration. Larger cities add compatible districts when land and nearby settlements allow. Architectural scale is approximate: the art is an illustrated map representation, not a building-accurate simulation.

Smoke and airships animate as separate cosmetic layers at close zoom. Reduced-motion preferences disable those animations. These are not player units or economic/logistics simulation. Port scenes preserve their authored viewing angle; their painted waterfront is symbolic rather than rotated to trace every shoreline.

To extend the library, keep the same camera, lighting, palette, and three-cell format. Add a new family or variant in the catalog and planner before referencing it. Source images are preserved at original resolution.

[Exact prompts](../../../../../docs/06-art/settlement-scene-prompts.md)

The train sprite is retained in the source atlas but is no longer rendered. The separate rail overlay is removed; rail infrastructure painted into authored scenes remains. All scene dimensions were reduced uniformly by 50% after review against terrain.

## Silhouette expansion

`shapes-v1.png`: 1536 × 1024 RGBA, 3 columns × 2 rows. Row-major: linear border town (170 world units), branching village (160), industrial strip (280), L-shaped port (220), L-shaped metropolis (360), metropolitan boulevard (380). These are additional variants with individually calibrated widths, not stretched copies of the original clusters.

[Silhouette generation prompt](../../../../../docs/06-art/settlement-shape-prompts.md)
