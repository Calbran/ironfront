# 020 — Ground mountain collision

## Accepted

Visible mountain graphics block ground movement. Air movement is exempt.

## Implemented

Mountain scenery and circular base footprints are frozen together on campaign creation or idempotent save upgrade. The public map renders the server's saved mountain placements. Footprint radius is 42% of the sprite's maximum world-space dimension; this is a ground-base approximation, not pixel-perfect alpha collision.

Ground endpoint validation, local grid routing and segment checks reject footprints. Segment checks also prevent tunneling between route nodes. Border planning validates the far side of a crossing and can try another region corridor when a crossing is blocked. Attack pursuit and retreat routes pass through the same route planner. Existing saved routes are rechecked before displacement and rerouted to remaining waypoints, or stopped if no route remains. Legacy local motion is segment-checked against footprints.

Initialization preserves settlement clearings, region centers and existing living squad positions. Candidates that cover indispensable existing land passages are omitted from both collision and the visible scenery. No forced relocation or invisible obstacle is added at a protected site. Ground navigation caches are invalidated when footprints are installed.

`movementLayer` defaults to ground. The air layer ignores mountain footprints and can traverse mountain regions in local/cross-region routing. Existing abstract air support remains unaffected; this does not add recruitable aircraft squads or change aerial combat rules. No building/tree collision or mountain line-of-sight blocking is introduced.

## Verification and limits

Ground detours, endpoint rejection, swept-segment checks, air bypass, stale routes, atomic API rejection and database reopen are tested. Browser interaction verifies a selected squad receives a route around a visible mountain and rejects an interior click. Footprint shape and clearance are provisional tuning. Legacy strategic armies retain their existing abstract region-arrival model; precise squad routes are the physical movement path.
