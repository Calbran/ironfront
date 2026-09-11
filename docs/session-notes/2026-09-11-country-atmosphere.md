# Country atmosphere and close terrain

Implemented a low-poly sky dome shaded with a horizon/zenith gradient, sun glow and procedural drifting cloud shapes. The same cloud field projects soft shadows onto ground along the sun vector. Existing night brightness is retained; sky/cloud colors follow the lighting cycle. No additional shadow maps, downloaded textures or volumetric passes. Clouds appear in the sky backdrop; their terrain effect is a ground-material projection, not building occlusion.

Terrain version 9 uses broader rolling hills/ridges, wide settlement transitions and sloped floodplain edges with a submerged river bed. Bridges remain above water rather than following the lowered bed. An initial steep version failed road generation; broader transitions pass the targeted connectivity, bridge route, atomic command and save-migration tests. Existing geometry migration pauses saves and clears stale routes without moving valid units.

Close-range ground now has world-space soil noise, fine grit and pebble flecks, filtered against aliasing and faded over 65–220 units. Existing grass batches use five short blades per tuft at miniature scale. This adds no movement obstacles.

Browser review covered day, the river crossing and close infantry terrain without shader errors. Typecheck/build and the eight targeted country tests passed. Full regression result follows below.

Full regression: all 293 tests passed (193.98 seconds). Follow-up shader tuning blends hatching to half strength and double line frequency over fragment distances 450–100, using fixed world-space frequencies to avoid sliding patterns. Nearby pebble flecks now have contrasting shaded/lit faces. No further authoritative changes after the full regression run.
