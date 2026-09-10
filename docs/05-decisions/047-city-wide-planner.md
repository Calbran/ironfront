# 047 — City-wide planning pass

## Accepted direction

Implement the full-tile city structure before expanding the model catalog. The town hall remains the civic anchor; taller commercial blocks surround it, residential blocks extend to the perimeter, and waterfront industry has a geographic role. Preserve connected streets and building entrances for later tactical integration.

## Shipped in the visual study

The `citywide` case builds a 320-by-320 street and parcel grid around the existing civic precinct and dock. Seeded block proportions vary around fixed civic and river anchors. Two crossings connect both river banks. Shared parcel edges generate one street, rather than disconnected district platforms. Commercial tower height increases toward the civic center; existing frontage models fill the remaining districts. The combined fitter checks final world-space placement, river clearance, entrances and foundations. The river remains a sampled, smoothed world-generation reach.

The seed gallery defaults to this case; the diorama has a Full city toggle. Older bounded studies remain available for regression comparisons.

## Provisional / not implemented

Grid spacing, district thresholds, building counts and height falloff are visual tuning. This is not yet a general organic street-growth algorithm. The authored dock and civic precinct are retained; arbitrary coastlines, confluences and terrain remain future work. Wedge-shaped models, richer secondary commercial centers, navigation/collision export, cover and construction placement are subsequent passes. Current campaign capture, combat and land-owned victory rules are unchanged.
