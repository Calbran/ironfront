# River through the district

Added selectable river-cut comparison. The planner clips source parcels along both protected banks before fitting buildings. Bank streets connect interrupted boulevard/perimeter approaches to two retained cross-street bridges. Fitted pieces reuse envelope and access clearance checks. Quay paving, retaining walls with bridge openings and a carved bed replace empty waterfront strips.

Validation: deterministic multi-seed tests check dry parcel boundaries, building envelopes, overlap, street access and exactly two channel crossings. Browser coverage switches modes/seeds, captures daylight and winter/dusk, tests phone layout and restores regular controls. Captures: .impeccable/review/river-district. This remains a straight authored channel; hill and river-cut modes are separate pending general 2D terrain integration.
