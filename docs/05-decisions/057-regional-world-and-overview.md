# 057 — Regional development and a readable strategic map

Date: 2026-09-13. Status: accepted direction; provisional implementation/tuning.

## Accepted direction

The owner requested one integrated pass covering natural countryside and farmland, larger industrial/outpost settlements, hamlets through very large metropolises, more meaningful locations and a strategic overview that clearly communicates terrain, roads, developments, allied forces/buildings and enemies in vision. Keep the generator and improve one stable reference world. Physical buildings and units retain their dimensions. Camera scale changes presentation, never campaign authority.

## Implemented direction

New geography version 3 composes shared settlement, country POI, terrain and road owners. Urban scale adds connected blocks and buildings rather than scaling models. Major seats receive distinct urban ranks, safe inland anchors, industrial districts and satellite settlements. Additional scenic sites are discoverable but excluded from automatic income/capture creation.

Regional farmland is polygonal land use with shared boundaries, coherent crop bands, nearby-route orientation and conservative clearance of water, steep ground, roads and inhabited footprints. Field containment is shared by vegetation and vehicle traversal. Woodland uses a broader seeded density field in version 3. The terrain lattice has 1024 intervals, subdued lowland relief and smoothly reserved pads.

The overview reduces texture contrast, fades hatching at regional distance, budgets names by rank and occupied screen area, groups nearby authorized unit markers, and reveals minor streets at closer scales. Places search retains access to hidden labels. Emplacements and natural terrain landmarks have distinct markers. Large city detail uses bounded camera neighborhoods through the shared POI renderer.

## Provisional tuning and boundaries

Settlement extents/counts, field sizes/crops, vegetation, marker clustering and zoom thresholds are visual/gameplay hypotheses, not calibrated populations or balanced multiplayer settings. Production still uses fixed Meridian geography; varying player counts needs explicit campaign-size/pacing work when multiplayer is integrated. Roads still use conservative connection rejection. Railways, geological mineral distribution, a production economy, handcrafted historical neighborhoods and continuous high-resolution terrain streaming are not introduced by this pass. Land owned remains the victory direction; no weighted-zone scoring is added.

Version-1/2 campaigns keep their persisted plans and version dispatch. Starting the new world creates an independent command and retains the prior recovery key.
