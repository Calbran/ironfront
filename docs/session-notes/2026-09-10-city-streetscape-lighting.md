# City streetscape, lights and distant windows

Final verification: all 172 regression tests passed, along with TypeScript and production build. The live full-city preview accepted a selected tank order onto clear plaza paving and reported the unit moving. Distant dusk windows were visually present across the city overview. The short lighting measurement was interrupted by source reload, so no before/after performance claim is recorded.

Follow-up: tank plaza rejection was caused by the roads-only walkability condition. CITY_PLAZA_SURFACE now defines both rendering and the extra vehicle traversal surface, with radius clearance and existing obstacle/water checks. Regression coverage for seeds 732/735 checks vehicle routes through the gate, planting/wall rejection and existing bridge access. Camera-orbit diagnosis: rotation preserves camera-target distance and zoom, but uses a ground pivot and orthographic projection. The user's apparent zoom-out at shallow angles is consistent with ground foreshortening and orbiting below the clicked roof. No camera change was requested or applied in this pass.

User approved tram stops, hanging signs and rooftop service machinery, asked about lighting cost, and reported flickering new tower roofs and windows disappearing at distance.

Implemented tram-stop shelters at checked street-accent sites, trade-sign fixtures within existing urban facade envelopes, and supported rooftop tanks/pipes on selected residential/industrial models. Shelter placement uses a longer checked footprint than the small props it replaces. These are visual models; tram transport and prop collision are not implemented.

Street lanterns and signs become emissive at dusk. Static pavement spill is a single merged additive surface batch with terrain-following vertices. It adds no light or shadow cameras. The existing three civic point lights still illuminate real geometry; static pools do not illuminate walls/units or create moving shadows. This is the affordable first lighting pass, not physically complete city illumination. Shared geometry/material disposal includes the pool batch.

Distant window geometry now uses one outward-facing quad for each original window box, retaining the original windowSeed attribute and room-light shader. An audit checked matching seed sets and exactly one sixth the window triangle count across all 29 windowed models. Full/distant model footprint checks and typecheck/build pass. Full-city seed 732 was visually checked at dusk overview with windows visible.

Roof flicker came from the new tower floor body and cornice slab both ending at the same Y coordinate. Cornice tops now sit 0.06 units above the floor top; snow caps sit above the raised deck. This fixes the three new tower families without depth-bias masking.
