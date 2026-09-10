# 023 — Contextual landscape detail

## Accepted direction

The owner approved farmland, richer riverbanks, and clustered vegetation to give bare terrain readable intermediate-scale features, with individual elements matching existing world scale.

## Shipped behavior

A deterministic cosmetic landscape pass places irregular pasture, crop, and plowed parcels around plains settlements, oriented with a nearby road when available. Furrows and broken scrub hedges distinguish fields. Parcels avoid settlement clearances, roads, rivers, mountains, forest patch corners, and one another. Meadow pockets, scrub clusters, small groves, and elongated riverbank reed beds use existing authored sprites; riverbanks also receive occasional trees.

Individual trees, scrub, reeds, and flowers retain shared `visualScale` dimensions. Larger landscape footprints come from grouping many small elements. Field widths span approximately 3–7 navigation cells (72–168 current world units), compared with 22 for a typical tree. Small details are visible at closer zoom; strategy mode hides the cosmetic layer. Existing campaigns receive layouts on reload. These are decorative features and do not add economy, cover, collision, or movement rules.

## Provisional tuning

Field counts, planting density, tint, and zoom thresholds remain visual tuning. This pass does not add authored industrial landmarks or new bridge mechanics.
