# 041 — Combined terrain and river study

## Accepted direction

The user authorized combining uneven terrain and a gently bending river in one district, retaining graded bridge approaches, dry foundations and safe building rejection across seeds.

## Implemented

Combined terrain & river selects a unified corridor-coordinate study. A seeded sinusoidal bend transforms the clipped river district's streets, quays, parcels and static surfaces together. A two-dimensional height function rises away from the protected bank corridor and varies across the district, returning to the civic neighborhood's existing elevation. Bank approaches stay level at the bridges and the water surface stays level through the bend.

Building meshes remain rigid: positions and orientations follow the corridor transform, then full world-space envelopes are checked against the transformed street network and other buildings. Candidates too close to the curved water corridor, exceeding foundation relief, or blocking another entrance are omitted. Foundations use world-space footprint samples. The planner records canonical lots and foundation heights; shared transform helpers define their rendered world positions. Smoke follows rigid building transforms.

The comparison reuses the existing curbs, arched bridges, quays, boat and limited lighting. Flat, hill and straight-river studies remain available. Tests cover four seeds, deterministic fitted counts, dry world-space envelopes, overlap/entrance clearance and foundation support. No campaign mechanics change.

## Limits

This remains a bounded authored corridor, not general terrain-first network routing. It does not ingest arbitrary world heightmaps or river splines, choose new bridge sites, reroute steep roads, or roll out to campaign maps. Candidates are rejected rather than relocated. Curve amplitude, slope profile and 1.2-unit foundation relief are provisional art tuning. General 2D terrain sampling and world integration remain next work.
