# Connected country terrain

Replaced the circular relief studies with a deterministic shared height surface driven by native land and biome contours. Added cross-border ridges, broad foothills, uplands, local river/site/road cuts, consistent tile normals and exact triangle height sampling for camera clearance. Added named terrain navigation and a marker visibility toggle for visual review. Removed the superseded radial module and renderer; its camera invariant moved into the new tests.

Browser inspection on Meridian confirms the former separated pieces now form a broad multi-peak coastal mountain belt. Model scale and the existing city–farm–outpost review corridor are retained. Heights remain preview data, with no campaign pathfinding or save changes.

Regressions cover geographic coverage, subdivision invariance, local reservation effects, river/road clearance, water, interpolation, camera clearance, tile seams, disposal, determinism and source immutability. All 270 tests, TypeScript checking and the production build pass. The initial sandbox test run was interrupted; the complete run outside the sandbox passed. The existing bundle-size advisory remains.

Browser verification covered range overview, closer mountain zoom, and the original soldier/tank beside city buildings, with no console errors. The new surface remains a coarse geographic foundation: close mountain slopes still need adaptive detail and further art tuning before final visual approval.
