# 031 — Starting zones and travel-time geography

## Accepted direction

Campaigns run over several weeks with limited micromanagement. Cities and useful points of interest must require meaningful travel commitments. Each player receives a reserved placement zone and chooses a home-base site within it. A zone can include plains, farmland, forest or settled terrain. The initial base supplies basic resource generation. A placement reservation is not ownership of the entire zone. Later forward bases are distinct from the starting economic center.

## Provisional pacing targets

Normal real time: first expansion opportunity 1–2 hours; several nearby alternatives 2–4 hours; likely contested frontier 6–12 hours; cross-map commitment 24+ hours. These are infantry reference targets, not validated balance. Daily check-in frequency remains undecided. Combat, recruitment and resource rates are not locked by these targets.

## Starting-site rules to implement in campaign setup

- Reserve disjoint zones before players place bases; do not favor first joiners. Publish only approved legal placement cells, not an unchecked arbitrary click area.
- Reject water, impassable ground, occupied building footprints and sites lacking a viable ground exit. Preview actual navigable travel routes before commitment.
- Validate every selectable cell for accessible expansion, resources and transport. Audit route-time differences across players, not just zone centers. Reject or regenerate failing zones; never silently approve a trapped start.
- Supply the same minimum starter economy and reserve buffer everywhere. Terrain changes expansion opportunities, not whether the player can begin. Exact rates and base footprint are still open tuning decisions.
- Base placement must eventually be an atomic, server-validated, saved action with exactly one starting base per player. Reservation is not a free territorial grant. No deployment or collection click should be required to keep basic income running.

## Implemented diagnostic, not campaign setup

`/pacing-preview.html` generates a local read-only world, derives four proposed zones from existing capital allocation, samples up to five land-valid positions per zone, and measures routes to six nearest settlement objectives from a selected candidate. Overlay labels use the existing unsuppressed infantry speed per traversed region and existing ground paths, not straight-line ETA rings. This does not claim fastest travel-time routing: the current region path planner selects a hop-based corridor. Roads do not currently accelerate these estimates. Combat, consolidation, orders and supply can delay actual movement.

The study does not certify starts: resource nodes, full footprint legality, all candidate fairness, frontier distances and cross-map timing are not yet audited. It does not alter allocation, production, saves or the city battle. Existing larger map dimensions and legacy speed limits remain unchanged so their mismatch can be measured before tuning.

## Next gates

1. Choose the expected check-in rhythm and acceptable offline loss window.
2. Model resource objectives, home-base footprint and minimum starter economy.
3. Audit all placement cells and representative seeds, incorporating road/transport rules when defined.
4. Tune world extent/objective spacing/speeds together; then wire authoritative placement and persistence.
