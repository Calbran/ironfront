# City prop scale pass

The user's screenshot showed a civic bench seat nearly at soldier chest height. Corrected civic/garden/parcel seating, walls/pillars, hedges, lamps, bins/crates, drums, small fences, parked vehicles, street equipment and trial sandbags against the original city infantry. Manholes retain road-surface height while shrinking horizontally. Civic obstacle widths share the rendering dimensions. Added a cross-check against the actual infantry rig to keep seats near knee height and civic walls below shoulder height.

Browser review places a soldier beside the bench. The comparison script accepts the expanded city roster, including the concurrently added jeep.

Validation: full suite passed (44 files), plus the new infantry/prop proportion regression. The city comparison rendered without runtime errors and verified arrival near the civic seating. A bounded `advanceTestUnits` preview helper advances local trial state for screenshots without waiting on slow software-rendered movement. No campaign state is involved.
