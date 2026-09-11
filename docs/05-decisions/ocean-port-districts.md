# Ocean-only port districts

Date: 2026-09-11
Status: Implemented in the full-city planner. Ocean-only zoning and reuse of the existing design language are accepted; dimensions and density remain provisional.

## Rules and appearance

The street-first planner accepts a typed waterfront in its local frame: open water lies beyond the +Z shore, with land behind it. A parcel qualifies only when the supplied edge is ocean, its complete footprint is on land and inside the serviced frontage, and it is within the coastal band. River, lake, absent, distant and undersized frontages do not qualify. This does not infer a port from a region-level coastal flag.

The seaward row contains cargo quays; the next band contains bonded warehouses. A lower-rise harbor quarter joins them to the commercial city. Reuse the warehouse, foundry, engine house, canopy workshop, arcade, mansard and copper-frontage models. Preserve the civic skyline inland. Existing footprint, foundation, connected street and entrance-clearance checks remain in force.

Ocean rendering cuts the city terrain at the shore and extends open water beyond it. Stone/brick quay walls, timber piers, iron truss cranes, bollards, crates and small steam lighters use the existing materials and baked geometry batches. Only parcels with a usable waterfront edge receive piers; touching a coast at one triangular corner does not create a duplicate berth.

## Review and integration limits

`/city-diorama.html?case=ocean-port&seed=732` opens a coastal full-city fixture. The full-city terrain selector includes Ocean shore / port, and Harbor frames the shoreline. The server accepts the same ocean profile and generates identical city lots for its isolated skirmish.

This fixture has a straight local coastline. Arbitrary world coast sampling and rotation into this local frame remain the responsibility of world-to-city placement, which is not yet connected to detailed tactical cities. The separate pacing-world view still uses representative miniatures. Piers and vessels are scenery outside the current ground navigation boundary; this change does not add shipping, embarkation, naval combat, port income or campaign persistence.

## Validation

Focused checks cover ocean eligibility and inland/river/lake exclusion, three coastal seeds, all three zone families, legal dry-land building footprints, street connectivity, clear entrances, determinism, ocean movement exclusion and split-parcel berth deduplication. Browser review verified the port counts, Harbor framing, cranes, piers and vessels. Typecheck and production build pass. Full-suite result is recorded in CHANGELOG.md.

## Curved coastline extension — 2026-09-11

Implemented: optional ordered shoreline samples replace the straight coast in the ocean preview. The +Z-side ocean remains the local convention. Samples must cover the declared frontage, advance strictly along X, and remain at most 48 units inland of shoreZ (which must exceed 108). This bounded convention gives a monotonic projection from the existing city street frame: coastal displacement fades linearly to zero by Z=60. Its exact inverse supports tactical ground queries. Invalid geometry fails explicitly rather than producing folded streets.

Source parcels stay in the canonical street frame. The combined fitter tests rigid building envelopes in the displaced frame, preserves entrances and connected streets, and checks shore breakpoints along footprint edges so an inlet cannot hide between dry corners. The plan retains the actual shoreline separately from the canonical parcels. Caller-supplied valid coastlines are passed through generation and tactical geometry.

Quay sections and the ocean mesh use the sampled coast. Berths use the local water normal; the complete pier/ship reservation is checked against land and neighboring berths. Sharp changes and insufficient clear water suppress a berth. The renderer rotates complete dock assemblies without shearing them and shares standard UV/normal attributes with existing material batches.

The ocean-port fixture now includes a curved coast. This supersedes the straight-fixture limitation above; automatic extraction/orientation of arbitrary world coastlines remains separate. Closed basins, branching shores and steep shoreline elevation are not a general solved harbor-placement problem. Coastal structures retain their existing decorative/navigation scope.
