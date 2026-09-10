# City prop scale audit — 2026-09-10

The reference is the existing infantry rig rendered at 0.55 scale: approximately one scene unit to the helmet (pose dependent). Dimensions below are scene units, not a new campaign distance system. Props keep their world locations; local dimensions change.

| Item | Finding and correction |
|---|---|
| Civic benches | Width 2.8 → 1.4; seat center 0.65 → 0.36; back top 1.5 → 0.71. Legs, depth and back thickness reduced. |
| Garden and parcel benches | Match the civic seat width, depth and height; garden seats now include backs and legs. |
| Civic boundary | Wall top 0.96 → 0.60; thickness 0.67 → 0.36. Pillars 1.82 → about 1.08 overall; width 0.85 → 0.50. Navigation uses the same widths. |
| Civic planting | Shrubs and hedge heights reduced; garden footprints retained. |
| Lamps | Entire fixture reduced to 70% around its existing pole location; light position follows the fixture. Resulting height about 2.5 soldiers. |
| Bins and small crates | Reduced to roughly waist/knee height, with narrower lids and bodies. |
| Oil drums | Reduced from 1.3 diameter × 1.2 height to 0.5 × 0.5. Larger fixed industrial storage tanks remain industrial structures. |
| Domestic fences | Posts 0.9 → 0.6 high; thinner rails and posts. |
| Parked cars/vans | Placement scale 0.85 → 0.55; roofs now roughly soldier height. |
| Kiosks, clocks, hydrants, bollards, boilers, valves, vents | Per-item scale factors in `cityPropScale.ts`; human-operated equipment now follows the soldier reference. |
| Manholes | Diameter reduced to 60%, with vertical position preserved to avoid sinking below the road. |
| Buildings, bridges, cranes, monuments, mature trees | Reviewed as structures/landscape rather than furniture; no blanket shrink. Large civic doors and monumental towers remain intentional. |
| Military models | Already share infantry coordinates and a 0.55 city placement scale; retained. |
| City trial sandbags | Individual bags halved in width/depth, with more bags preserving the barricade footprint; wall height reduced to about 0.65. |

These are provisional visual proportions. Circular navigation clearance and incomplete decorative-prop collision remain existing prototype limitations. Building footprints and the campaign map scale are not changed by this pass.
