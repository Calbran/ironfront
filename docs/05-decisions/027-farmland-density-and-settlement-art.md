# 027 — Farmland density and settlement art

## Accepted direction

The owner asked for smoother farmland edges, less agricultural dominance on some seeds, and visible city artwork inside the deliberately cleared settlement footprints.

## Shipped behavior

Farmland keeps raw region-clipped fragments for clearance and simulation-adjacent geometry, but draws infrastructure-clipped parcel overdraw through the same shared smoothed region masks used by terrain and borders. This removes the raster staircase at coasts and administrative edges without changing land, roads, rivers, movement, or saved geography.

New maps rank fertile regions deterministically, then cap agriculture to 24% of passable land area and 26% of passable regions. The existing smooth fertility field still clusters neighboring farms. At least one suitable agricultural region is retained on unusually dry seeds. This is a generation change, so saved `landUse` remains unchanged.

At detail zoom, five retained transparent settlement sprites fill the existing city clearings according to hamlet, village, town, city, and metropolis rank. The readable owner-colored type/tier badge remains above the artwork for interaction and control. Asset-load failure falls back to the badge alone. This partially supersedes decision 020's icon-only presentation while preserving its label hierarchy and interaction rules.

Farmland and decorative vegetation use a tier-specific elliptical settlement footprint derived from the displayed sprite's width and source aspect ratio, plus a small world-space margin. This replaces the old layout-radius circle, allowing cultivation and scenery closer to transparent corners while preserving a clean edge around visible buildings.

## Provisional tuning

The 24% area cap, 26% region cap, settlement footprint scale, and detail threshold remain visual/balance tuning. Generated replacement atlas exploration did not produce true alpha and is not a runtime asset.
