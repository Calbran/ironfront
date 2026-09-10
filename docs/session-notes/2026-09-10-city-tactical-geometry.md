# City tactical geometry — 2026-09-10

Added a lazy full-city tactical inspection layer: conservative building/civic obstacles, candidate cover normals, road-only vehicle movement, dry-ground infantry movement, protected canal crossings and a town-hall precinct query. Added inspection controls and a sample approach path for each mover. Core regressions cover two generated river seeds, blocked endpoints, civic gates, wall crossings and bridge routes. This is a standalone geometry foundation; campaign combat and ownership are unchanged. Remaining limitations are recorded in decision 050.

Validation: type checking, all 43 test files and production build passed. Chromium verified both route buttons and hiding the overlay with no page errors. Seed 732 produced 886 obstacles, 2,359 cover candidates and successful sample routes for both movers; checks took about 3.3 seconds each on this host. Screenshots/results are under `.impeccable/review/city-tactics/` (local ignored artifacts). This timing is an inspection baseline, not a real-time pathfinding budget.

Follow-up: added three selectable local test soldiers, click/right-click controls, walking poses, stop/deselect and route display. Route search uses A*; render placement follows bridge arch height. Core tests exercise movement segments, arrival, blocked orders, stop, bridge traversal and invalid selection. No campaign state is modified.

Movement-trial validation: all 44 test files, type checking and production build passed. Chromium verified click selection, right-click movement/arrival, blocked orders, Escape, selecting after camera rotation, stopping and regeneration cleanup without page errors. Local screenshots/results: `.impeccable/review/city-units/`. The sidebar selection buttons center on each soldier's current position.

Gait/control follow-up: infantry now walk at nominal 0.9 scene units/second (formerly 3), with deterministic per-unit pace variation, stride-linked bob/sway and interpolated poses. Checked route deviations and line-of-sight simplification reduce rigid grid movement. Left-drag/Shift selects groups; right-click orders with spaced destinations, right-drag orbits, middle-drag pans. Orders reject atomically if a selected soldier has no safe route. Dynamic avoidance between moving units remains excluded.

Control follow-up: middle-drag now owns click-anchored orbit regardless of selection. Panning remains on WASD only; right click/right drag are reserved for movement and facing orders.

Integrated follow-ups: running clip matched to 1.43-unit nominal movement; tracked tank selection; traversable low planting and physical body footprints; directional cover and covered poses; local sandbag/test-shot demonstration; click-anchored orbit; selection-dependent right-drag destination/facing orders; colored ghost previews sharing final placement logic; sidebar focus and independent scrolling fixes. Preview colors evaluate cover in the proposed facing direction, and path reachability is checked on release. These supersede the earlier walking and unconditional-right-orbit interaction. Campaign authority remains untouched.

Formation-fit follow-up: projected invalid ghost slots onto real oriented obstacle faces and searched along those edges, with a bounded nearby fallback for occupied ground. Added regressions for three soldiers fitting outside the hall wall with full cover and matching committed destinations.

Vehicle cover follow-up: added the jeep, live friendly hull cover, vehicle-aware destination fitting, and regressions for movement, exposed attacks, nonfriendly and destroyed vehicles. Typecheck, all 44 test files and production build passed. Preview cover remains facing-based; actual attack queries use the supplied threat position.

Documentation follow-up: recorded accepted attacker-relative cover direction and the proposed event-based query strategy, with performance validation, multiple-attacker/flanking/movement tests, and deferred height-aware visibility. Linked it from the city roadmap; no mechanics changed.
