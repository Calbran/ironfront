# 043 — Seeded integrated city composition

## Accepted direction

The user rejected near-identical seed layouts and asked that cities combine the work developed so far into distinct compositions.

## Shipped behavior

The street-first planner selects diagonal-quarter, quay-grid, converging-avenue or cross-town-boulevard skeletons before parcel subdivision. Seeded dimensions, street cuts and avenue geometry affect both roads and building orientation. Flat district growth varies between axial, broad and asymmetric expansion.

Parcel roles combine existing residential variants, commercial shops/towers and waterfront industrial buildings with the civic precinct, quays, bridges, boat, landscaping, terrain, curbs, lamps and lighting. Larger commercial sites are attempted before smaller infill. Building envelopes and entrance checks still govern placement. The older hill-only comparison bounds the northern edge and attaches its crossing to the actual west street.

Gallery cards name compositions and frame the entire built city. The 28-building town is labeled an authored reference rather than presented as a variable city generator.

## Provisional tuning and limits

Four skeleton families, role thresholds and growth weights are authored study parameters. Civic placement and rectangular district exteriors remain constrained; this does not complete arbitrary geographic city generation or campaign rollout. Geometry audits do not certify visual quality.
