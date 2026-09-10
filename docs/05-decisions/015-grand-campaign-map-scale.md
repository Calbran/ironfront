# 015 — Larger worlds with broader territory sizes

Date: 2026-09-09

## Accepted direction

The owner wants a grand-scale map suitable for a two-to-four-week campaign, with greater territory-area variance and a larger world rather than many additional small regions.

## Implemented first pass

Version-4 new maps double both world dimensions: the four-nation base is 4,800 × 3,200 instead of 2,400 × 1,600. Area still scales with nation count. Territory count remains eight per nation (32 at four nations), preserving management density. The raster remains eight world units, retaining coastline and land-routing detail.

Connected territory growth now uses a seeded, skewed speed range of 0.5–3.0, replacing 0.7–1.4. This allows large hinterlands alongside compact regions. Existing separated seed sites, land-only growth, reciprocal adjacency and mountain-pass connectivity remain. This is not a hard minimum/maximum area ratio; terrain and bottlenecks also shape the result.

Capital choice prefers remaining land components with room for four starting regions. Expansion claims peripheral neighbors before highly connected junctions, reducing the chance of stranding later starts. This preserves the existing initial-allocation target; it does not establish equal starting area or balanced positions.

Map zoom extends to 1200% so the expanded geography still supports close unit control. Fit still shows the whole world, and selecting/deselecting still preserves the camera. Existing saved campaigns keep their geography and routes; new generation does not rescale saves.

## Observations and provisional limits

On Meridian, Boreal, Ironfront and Survey-1, the 80th/20th-percentile territory area ratio is approximately 5.0–9.1, versus 2.4–3.8 before. Total mainland area is approximately four times the earlier baseline. The tested compact regions remain above 5% of their map's mean region area; these samples are not a universal size-floor guarantee.

This pass does not rebalance economy, supply, combat ranges, movement speed or campaign duration. Direct movement remains distance-based with existing region-area/suppression scaling and its speed cap; legacy strategic travel and supply remain region-hop abstractions. Bigger geography alone does not validate a two-to-four-week conquest pace. Campaign pacing and starting-area fairness remain playtest work.

## Verification

Generator tests cover determinism, region counts, area scaling, varied sizes, land/feature containment, reciprocal adjacency, connected passes, and twenty-seed geographic checks. Gameplay tests include starting allocations and full-duration deterministic bot campaigns. Existing cross-region route and persistence checks remain part of the full suite. Browser checks exercise four/eight-nation previews, preview/campaign geography equality, maximum zoom and Fit at desktop and phone widths.

Superseded in part by decision 016: the owner clarified that more territories and neutral expansion space are required, not merely larger territories. Version 5 uses 24 territories per nation while retaining these expanded world dimensions.
