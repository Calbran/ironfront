# Continuous curb corners

User identified gaps and disconnected corners. Replaced the approximate road-sample curb exclusion with a pure presentation helper that unions square-ended road rectangles by splitting edges at exact intersections and keeping exterior boundary segments. Closed loops drive joined curb and sidewalk bands. Shared/duplicate strips lose internal boundaries. Matching carriageway end caps fill the road footprint. Dedicated bridge spans keep their own transition geometry.

Focused tests cover straight roads, T junctions, angled crossings and duplicate strips. Typecheck/build and waterfront browser verification passed. Reviewed the corner capture, then narrowed bridge-only curb exclusion so it does not remove unrelated waterfront corners. This is presentation geometry, not a change to simulation roads or movement.
