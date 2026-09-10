# 050 — City tactical geometry inspection

## Accepted direction

City tanks should turn on their tracks gradually. The movement trial now pivots at a provisional 0.55 radians/second, then accelerates along its checked path. Independent belt travel drives the rendered links. Swept rectangular hull clearance is still excluded; the existing circular route-clearance model remains in use.

Establish urban movement, building/wall obstacles, cover candidates and a town-hall control area before adding more model variants. City control remains centered on the hall; land ownership remains the victory measure.

## Implemented

The full-city preview can inspect infantry and vehicle routes. Pure game-core queries derive conservative obstacle envelopes from fitted buildings, the hall, civic walls/pillars and gardens. Civic wall dimensions are shared with rendering. Cover candidates have an obstacle ID and an outward normal, and must leave standing clearance. Water is blocked except at the two rendered bridges. Vehicles are restricted to carriageways; infantry can cross dry ground and pass the civic gates. A bounded cardinal-grid search validates endpoint connectors and every segment; failed routes stay empty. The overlay displays obstacles, cover, the precinct boundary and one approach route. Tactical data is created for the full-city movement trial and discarded on regeneration; overlays are created only on request.

## Provisional and excluded

Scene-unit radii, grade limits, grid resolution and the rectangular precinct boundary are inspection tuning, not validated combat balance. The study does not simulate occupancy, cover bonuses, line of sight, interiors, destruction, construct placement or capture timers. Decorative cars, benches, utility props, civic monuments and detailed vertical stair/bridge geometry are not yet fully represented by the collision query. Therefore these routes are geometry candidates, not authoritative squad orders. Vehicle turning radius and swept vehicle orientation remain future work. Tests check sampled circular clearance, not a continuous exact navmesh.

Campaign capture (022), site cover (011), persistence and authority are unchanged. Next: complete prop/vertical collision metadata, audit reachable entrances and construction space, then connect server-validated tactical orders with restart and capture-contest regressions.

## Selectable movement trial

The full-city planner now spawns three infantry models with individual click selection, right-click movement, stop and deselect controls. Shared baked walking poses animate movement. Orders use the prototype route query; blocked orders retain the previous valid route. Route search now uses an admissible Manhattan A* heuristic over the same cardinal grid. Soldiers follow the rendered bridge arch height. Regeneration discards all test state and listeners. This local trial does not send campaign commands, resolve combat, occupy interiors or transfer ownership; unit avoidance and complete prop/vertical collision remain future work.

## Gait and group controls

Accepted follow-up: movement should have gentle variance and footstep bobbing, at a pace matched to the walk cycle. Left drag selects a group, right click orders, right drag orbits, and middle drag pans. Implemented in the city trial with Shift-additive selection and spaced group destinations. Group orders are accepted only when every selected soldier has a valid destination/route. The nominal walk speed is now 0.9 scene units/second with small deterministic differences; 1.1 scene units advances one complete walk cycle. These are visual tuning values, not campaign balance. Routes lose redundant grid corners and receive bounded, collision-checked deviations; interpolated walk poses and small distance-driven torso bob/sway provide the gait. Group stop and Escape affect the selection. Units still do not dynamically avoid one another during travel.

## Current trial interaction contract (supersedes the walking/control tuning above)

- Infantry default to the existing running clip. At model scale 0.55, the nominal speed is 1.43 scene units/second and a cycle covers 1.144 units, matching the model's 0.8-second run cycle. Foot-ground normalization, interpolated poses and subtle checked path variation remain.
- Three infantry, one tracked steam tank and one jeep can be selected. Left drag selects and Shift adds. Right click places an order; right drag places the order at the press point and sets facing from the drag. Middle drag always orbits around the clicked ground point without recentering on press. WASD pans; there is no mouse-pan binding.
- During a right-drag order, translucent destination models show facing and cover poses. Blue means none, gold partial, green full; red means a blocked placement. Cover is evaluated against the proposed facing direction. Preview and commit share the placement calculation; full route reachability is validated on release, and no order is issued during preview.
- Infantry pass through lawns/low planting and use body footprints plus 0.25 clearance rather than roof/attachment envelopes. Buildings, substantial civic walls, sandbags and unbridged water remain obstacles. Vehicles stay on roads. Lawn surface height and bridge arch height are used for presentation.
- Infantry cover is directional: nearby buildings provide full protection from a shot crossing their footprint, low walls/sandbags provide partial, and unprotected approaches provide none. Stopped infantry use braced/leaning or crouched poses. Preview shot probes use 20 baseline damage, 50% through partial cover and zero through full cover. These are explicit local test values, not campaign balance. Test health can be reset; the probe is not a death/combat simulation.
- Sidebar controls return keyboard focus to the canvas after buttons, toggles and dropdown changes; actual text editing still suppresses WASD. The desktop sidebar scrolls independently to avoid moving the canvas and invalidating pointer coordinates.

Remaining: complete prop collision and vertical traversal, dynamic unit avoidance, vehicle swept-shape constraints, and server-authoritative combat/capture integration. Existing campaign rules and land-area victory remain unchanged.

## Formation fitting at obstacles

Blocked intended slots now project to nearby oriented obstacle faces and slide along those faces to find separated, traversable positions. Open-ground offsets resolve occupied slots. The search stays within 4.5 scene units of each intended slot; positions remain red when no nearby fit exists. Facing is preserved, and cover is recalculated at the fitted position. Preview and release use the same fitting result; reachability is still checked before committing the order. This is bounded destination fitting, not dynamic avoidance while moving.

## Friendly vehicle cover

The local trial includes a friendly jeep alongside the tank. Living friendly vehicles supply oriented hull footprints at their current positions: tanks provide full cover, jeeps partial. Cover queries and destination previews refresh as vehicles move; old positions do not retain cover. Destination fitting also avoids vehicle hulls. This does not implement avoidance along moving routes.

Protection is directional, evaluated by intersecting the soldier-to-attacker segment with nearby cover footprints. Flanking fire that misses the footprint receives no cover reduction. Preview indicators assume a threat along the ordered facing; future combat must query the actual shooter for each attack, rather than reuse the indicator. Current queries are two-dimensional; elevation and body-part visibility remain future work. No performance benchmark or campaign combat integration is claimed.

## Future combat: line-of-fire cover — accepted direction

Cover is relative to each attacker, not a permanent bonus attached to a soldier's position or covered animation. Evaluate the line from the actual shooter to the target when resolving each attack. A friendly tank may provide full cover and a friendly jeep partial cover only when its hull intercepts that line. A flank or rear attack that bypasses the obstacle receives no protection from it. The same soldier can therefore have full cover against one enemy and none against another. Vehicle motion must affect subsequent queries immediately; an old hull position cannot continue protecting troops.

The order preview may assume an incoming threat along the chosen facing, but its color and pose are advisory. They must never be reused as authoritative protection for every attack. Keep sight/target visibility distinct from local cover: this trial's nearby-footprint check is not a complete world visibility or fog-of-war system.

### Proposed implementation and performance gates

Start with simple collision footprints and spatial indexing of nearby static obstacles and moving vehicle hulls. Resolve protection on authoritative attack events in game-core through the server's combat flow. Refresh client indicators less frequently if profiling requires it; animation and renderer meshes do not decide damage. Any cached result must be invalidated by relevant shooter, target or obstacle movement and obstacle-state changes.

Benchmark representative battle sizes before committing to update rates or budgets. Measure query count and p50/p95/p99 resolution time for dense streets, many moving vehicles and simultaneous attacks. Avoid an every-frame all-shooters-versus-all-targets sweep. This is a proposed optimization strategy, not a measured performance guarantee.

Required regressions: protected frontal shot; exposed flank/rear shot; two attackers with different cover results for one target; rotated and moving vehicle hulls; preview facing differing from the real shooter; obstacle removal; deterministic resolution and persisted/restarted authoritative state.

### Deferred and provisional

Height-aware line tests, elevated shooters, sampled head/torso exposure, penetrable materials, weapon-specific effects and wreck cover remain future design work. The current two-dimensional trial cannot establish those outcomes. None/partial/full are the intended categories; existing test damage multipliers are provisional and are not validated campaign balance. This record adds no combat implementation or change to campaign capture/victory rules.
