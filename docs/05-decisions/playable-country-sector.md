# Playable country sector

Date: 2026-09-11

## Accepted direction

Build one playable city–hamlet–bridge–outpost stretch before expanding interaction across the global map. Keep authored building/unit scale, individual squad orders and optional grouping. Ground movement must respect geography; air units are exempt. Routes must survive reload and server restart.

## Implemented proof

`/country-slice.html` is linked from the pacing preview. It selects a dry, gentle sector around a real Meridian river reach (source center 14664, 15744; existing 14.3 model/logical scale). The bounded sector is 3000 × 1800 model units. The shared city street/parcel rules now produce a separately seeded inland settlement with size-dependent density and model selection, rendered by the detailed diorama builder. Its civic architecture is reused; the fixed test layout and canal are not. Smaller outskirts buildings face sidewalks, occupied plots receive development, and empty parcels keep natural ground. A generated fuel/provisions stop and an offline Painswick-derived satellite town connect through their actual entrance sockets. Display plinths are omitted. The city and town use the same plan for visuals and navigation. This is a geographic sector adapter, not the full country campaign renderer.

Two individually commanded infantry representatives, a tank and scout airship receive authenticated server orders. Right-click moves, Shift-right-click queues, Shift-select groups, Hold stops, and Take cover assigns distinct available sandbag slots. Infantry use the existing walk/crouch rig at .55 scale. Tanks turn at a bounded angular speed with counter-moving tracks before advancing. Airships cross directly above the surface.

Ground routes use a bounded fine lattice, shared building envelopes, river clearance, bridge decks, mountain biome exclusion and slope checks. Roads are cheaper paths in this proof; road preference is not a speed bonus. Weighted A* is interactive routing, not a shortest-path guarantee. A 350,000-node search budget and 512-point route queue bound work; a command rejects atomically when its group cannot route.

Separate SQLite rows store hashed session credentials and complete authoritative movement state. Elapsed movement is resolved analytically from saved server timestamps, including time away and process downtime. No client combat or movement authority. Polls receive current snapshots; visibility return and long gaps snap to current server positions instead of replaying missed movement. The review runs paused initially, with explicit 1× or 20× pace. API restarts reconnect to the saved sector.

## Provisional tuning and limits

This is a single-player persisted movement proof. It has no combat, enemy AI, capture, recruitment, supply or campaign ownership. Land-area victory remains unchanged. Scenery cover currently gives a position and crouch pose, not combat protection. There is no dynamic unit-to-unit collision or congestion model. The selected reach is gentle; arbitrary slope terraces and full mountain-crossing design are not certified by this sector. The server regenerates the fixed versioned plan; future geometry changes require migration of saved routes.

Infantry speed 1.43, tank speed 2.3, airship speed 6 model units/second and tank turn rate .8 radians/second are review tuning. The scene batches city buildings/streets and loads nearby POI assets. This bounded proof does not establish whole-country performance or competitive pacing.

## Follow-up accepted direction

Treat dioramas and country set pieces as examples of reusable generation rules and assets, not literal square modules. Settlement size and setting should influence development, with less dense outskirts, roadside services and developed street frontages. Global roads should use the same street texture language, markings, curbs and connected powerlines. Real map data should inform settlement structure.

Implemented bounds: town/city/metropolis selection budgets are 120/360/850 lots within the current street grammar, without scaling model meshes. Only the bounded sector consumes the new city adapter; global settlement placeholders remain. The Painswick OSM source is offline, attributed and downloadable; it guides the satellite town, not an exact real-world reconstruction. Size-based lots and frontage/landscaping values are provisional. Geometry version 5 clears prior queued orders, retains valid positions, relocates only blocked units and pauses saved sessions.

Unused terminal streets are pruned back to their last serviced frontage; empty redundant loops can be removed only while maintaining connectivity. The selected external city exit is retained. Its country approach holds the street width through the junction, then smoothly widens to the six-unit highway over 32 units. Shared junction outlines cut the outgoing road through the city curb.

## Sector controls and playback — 2026-09-11

Accepted direction: carry RTS box selection and drag-order previews into the playable sector, with continuous visual movement. Shipped: left-drag selects, Shift adds (Shift-click toggles), right-drag anchors a destination and chooses formation facing, Shift queues, and empty-click/Escape clears selection. Middle-drag orbits. Preview requests validate routes on a server-side copy and do not commit orders. Final facing is persisted; tanks turn at the existing bounded rate.

Client rendering advances a disposable copy of the latest approved route between snapshots, blending small corrections over 120 ms. Projection is capped at two seconds and visibility/long-gap recovery still snaps. Clients do not submit positions or resolve combat. Preview debounce, four-unit formation spacing and playback timing are provisional. This is fixed-width formation facing, not variable-width formation drawing.

## Shared tactical interaction contract — 2026-09-11

The city battle interaction is canonical for tactical previews. The country sector consumes the same left-click/marquee selection, terrain-anchored middle orbit, right-click/right-drag order, scroll zoom and WASD/Q/E camera controllers. Shift remains additive selection and additionally requests queued server orders in the sector. Destination previews use translucent unit ghosts like the city battle; sector colors communicate pending, accepted or rejected routes because its current server response does not expose the city's directional cover categories.

Control and preview presentation are shared; simulation is not. City combat remains a local/server battle test with its own tactical placement rules. The sector continues to render only server-approved persisted movement and cannot adopt client-resolved city movement.

Perspective wheel zoom scales camera distance around the terrain point beneath the cursor and clamps only at the existing sector distance limits. Distant units stop rendering as miniature meshes and use the shared tactical marker layer. Below 0.7 projected pixels per city unit, detailed city geometry is replaced by one instanced building-silhouette batch and one flat street mesh; it returns above 1 pixel per unit. At strategic camera distance, textured road ribbons, curbs, bridges and roadside props yield to the country highway line layer. These thresholds are presentation tuning, not visibility or simulation rules.

Follow-up accepted direction: outskirts should occupy more of the settlement than the concentrated downtown, with developed ground beneath buildings. Shipped tuning expands town/city/metropolis reach to 105/170/230 units, caps lots at 120/440/950, and begins lower-rise replacement at 32% of that reach. Occupied inner suburban parcels receive textured developed ground; the fringe retains individual frontage pads. Geometry version 6 safely migrates prior routes. Distant silhouettes now retain material colors, appearance variants and deterministic lot tints using coarse material masses in one instanced draw call. Ground markers transition over 6–3 projected pixels per unit, airships over 0.6–0.3; models hide only once markers are fully opaque. All thresholds remain provisional.

Satellite towns retain inexpensive material-colored building masses whenever full POI assets unload. Their positions, dimensions and rotations follow the same building plan; no simulation or footprint change. Bridge approach bends are moved outside the deck and rendering raises the continuous road surface over it. The structural deck no longer repeats the street texture. Geometry version 7 invalidates obsolete saved routes through the existing safe migration.

## Tank steering and off-road movement

Accepted: tanks should follow smooth routes and traverse grass/open ground rather than being restricted to street centers. Implemented: remove the city road/plaza-only eligibility rule; retain obstacles, planted beds, water, bounds and slopes. Shared vehicle planning simplifies lattice paths and rounds corners only where sampled segments clear the vehicle radius. The country sector uses the same smoothing on complete tank routes. Gentle heading errors (up to 0.25 radians) are corrected during travel at 0.8 radians/second; sharper changes still pivot before proceeding. Route endpoints and authoritative command validation remain exact. These are provisional steering values, not a full vehicle dynamics model; existing queued routes are not rewritten.

## Refined country presentation

Accepted follow-up: complete the sky/clouds/cloud shadows, stronger geographic relief and river channel, and add soldier-scale surface detail. Shipped version-9 terrain uses broad relief with wide settlement/river transitions, submerged channel bed and raised banks. The existing safe migration clears obsolete routes and pauses the slice. Procedural sky clouds and ground shadow projection share time and sun direction; this is cosmetic, not weather simulation. Close soil/grit and pebble flecks fade out independently of world-scale color fields; culled grass batches use short blade clusters. Cloud darkness, ridge heights and detail distances remain visual tuning. The initial steeper relief was rejected by road-connectivity validation and replaced with broader transitions.

Follow-up visual direction: brighter daytime, retained night lighting, and illustrative crosshatching informed by sun direction. Implemented terrain-only world-space ink on slopes turned away from sunlight, with screen-derivative filtering and overview fade. Existing physical lighting/shadows remain; this adds no geometry, simulation changes or extra shadow pass. Dusk now drives the embedded city's and country kit's existing warm-window materials. These visual strengths remain provisional.

Follow-up accepted direction: reduce washed-out lighting, add actual elevation variation and a day/night cycle, and simplify terrain at strategic distance. Implemented gentle seeded relief with settlement/river transitions in authoritative geometry version 8. Country roads and movement use those same heights. Far terrain reduces triangle count by roughly 16× and fades surface detail toward a restrained average palette. Non-periodic noise replaces sine-band repetition. Near shadows, atmospheric haze and a 20-minute wall-clock lighting cycle are visual review tuning; fixed Day/Night modes are available. The lighting cycle is independent of movement pause/pace and does not affect combat or visibility.

Infantry follow-up: both previews now call the same route simplification/variation helper. Personal deviations are deterministic and collision checked, not random per-frame wandering. The sector persists a separate guide and actual path; exact endpoints are retained. Long routes adapt sample spacing to bound storage and clearance work. Navigation guide queues retain a 512-point cap, with a separate 4096-point cap for derived footsteps.

Style refinement accepted after image review: favor a stylized miniature landscape over realistic painted grass. Implemented broad meadow/lush/dry/earth color fields, soft slightly angular transitions and restrained grain. Small detail remains in the existing models rather than painted blades or pebbles. This supersedes the stronger textured-ground treatment while retaining its lighting and scenery.

Accepted: extend the original refined landscape treatment across the country slice at consistent scale. Implemented: shared miniature trees/pines at approximately the refined area's half-scale, clustered placement, nearby grass/shrub/rock instances, meadow/worn-ground palette variation, slope coloration and soft directional shadows. Coarse grove geometry remains at overview distance. Road, river and settlement margins remain clear. Scenery is cosmetic; this pass shades existing relief rather than altering authoritative heights or adding movement blockers. Density and detail distances are provisional.

## Shared soldier behavior and encounter review

Accepted: a squad is a selection group of independent soldiers, initially six, and must reuse the city battle controls and tactical behavior. Implemented shared placement, cover evaluation/reaction, infantry movement and preview styling; country state persists each member rather than rendering a rigid formation. Local ghost placement and authoritative order placement call the same solver. The optional bridge/outpost encounter remains a bounded proof with provisional tuning; campaign ownership/victory rules are unchanged. Crossing the city edge no longer requires a designated road portal: traversable land permits entry/exit anywhere, with collision-checked routing around obstacles.

Follow-up: road proximity no longer changes navigation cost; all traversable ground has equal cost. Every visible living soldier supplies a selection hit target mapped to its parent squad, with duplicate marquee hits collapsed to one squad selection.

## Dense forests and continuous woodland LOD

Accepted: broad, dense low-poly forests at the existing tree scale, with roads and rivers cutting through them. Generation now uses broad irregular woodland fields and spaced, jittered trunks rather than isolated eight-tree clusters. Infrastructure footprints remain clear; forests continue on both sides. Nearby trees use instancing and spatial culling. Beyond the detailed area, occupied patches use low-poly canopy geometry, selected per tile rather than a global zoom switch, so woods remain visible at shallow angles. Forest ground shading follows the same density field. Density and LOD distances remain provisional visual tuning. No new trunk collision rules were introduced.
