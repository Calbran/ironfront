# 044 — World-generated river samples

## Accepted direction

Use actual seeded world-generation rivers in city previews instead of only authored left-to-right channels.

## Shipped behavior

The gallery defaults to `worldgen`. World seed `city-<numeric seed>` generates four-seat geography through the existing continent generator. A reach is selected from its river polylines, uniformly scaled and placed in the study corridor. The source compass bearing is restored by rotating the complete city. Exported audits retain world seed, river index and reach start. No world generation algorithm or campaign authority changes.

The study still fits rigid buildings with road, bank and entrance checks, and rejects unsafe candidates. A two-entry cache avoids regenerating geography for each surface vertex. No synthetic bend is substituted when sampling fails.

## Provisional limits

Selection uses up to 24 source points, requires monotonic progress along the reach chord, and limits scaled transverse deviation to 35 units. This selects compatible real reaches; it does not handle every world river. Full loops, confluences, lakes and imported world terrain are future work. The surrounding terrain and civic anchor still come from the city study. The short authored secondary waterfront remains a reference feature.

## River smoothing refinement

After the user identified hard drainage-grid corners, the city adapter now retains raw source points and derives a separate smoothed reach using three corner-cutting passes. Endpoints stay fixed and convex interpolation avoids overshoot or reversal of the local corridor axis. Rendering and fitting share the smoothed curve. This does not modify authoritative campaign geography.

## Local waterfront deformation

The user requested that far block edges stop copying the river. Full displacement now applies only across the channel/bank band (canonical z -101 through -87), falling linearly to zero at -138 and -50. Northern study bounds remain at or beyond -138. These distances are provisional study tuning. Given the selected reach deviation limit of 35, each 37-unit transition remains invertible. Foundations sample the inverse transform rather than approximate it from the lot center.

## Road surface construction

The river transform now shapes road centerlines before road ribbons, end caps and curb/sidewalk unions are constructed. Road cross sections therefore retain their widths rather than inheriting lateral compression. Heights use the inverse corridor transform; parcel paving still follows its transformed boundary.
