# 040 — River-cut district comparison

## Accepted direction

The user authorized a river through the district, bank-shaped parcels, selected connected bridges, waterfront setbacks and purposeful residual space before generated-world rollout.

## Implemented

River through district is a separate flat comparison. A straight channel at z=-94 splits the six source parcels into dry convex pieces before any new frontage placement. Both banks have streets; two seeded cross streets receive bridges. Other crossing approaches stop at the bank streets and reconnect through those bridges. Full envelope, street and entrance clearance checks apply to the clipped parcels. Fitted counts replace arbitrary target counts in this mode.

The presentation carves a channel, sets a separate water level, and adds quay paving and retaining walls with bridge openings. Larger remaining interiors retain inset gardens; narrow pieces stay paved. Existing civic access and the flat/hill comparisons remain. The channel is a controlled test input, not new campaign geography.

## Provisional and remaining

This demonstrates water-first clipping on an authored straight river and street network. It does not choose crossings over arbitrary rivers, handle bends/tributaries or combine river cutting with the hill profile. Those modes are mutually exclusive in the UI. Bridge locations, setbacks and quay dimensions remain visual tuning. General world terrain, performance rollout and authoritative navigation are unfinished.
