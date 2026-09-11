# Eight-direction port graphics — 2026-09-10

The initial interpretation—one guaranteed port town per nation—was incorrect and was removed. The request concerned the graphic's eight possible shoreline orientations, not campaign generation.

Generated `apps/web/public/art/settlements/port-directions-v1.png`, a genuine-alpha 4 × 2 atlas ordered N, NE, E, SE / S, SW, W, NW. The first attempt was rejected because it painted a checkerboard into RGB. The accepted atlas was verified as 32-bit ARGB with a zero-alpha corner.

The initial renderer chose the closest authored view from the middle dock's water-facing normal and capped residual correction at 22.5 degrees. Ordinary port qualification and settlement generation remained unchanged.

Screenshot follow-up exposed inward-facing ports. The atlas had vertically reversed the requested orientation order, and dock normals could select a different nearby shore on tight coastal geometry. The renderer now uses the verified S, SE, E, NE / N, NW, W, SW frame order and samples visible open water around the city at four radii. Dock direction remains only a fallback.

### 2026-09-10 — Correct harbor building scale

Reduced directional port artwork from 2 times the settlement radius to 0.85 times, capped at 180 world units. The atlas contains a warehouse and dock office rather than a full city; fitting it to a city footprint exaggerated individual buildings. Kept orientation, settlement placement, badges and mechanics unchanged. Verified a side-by-side browser comparison against city art and the former harbor scale. Typecheck/build passed. Existing campaigns update on refresh.


### 2026-09-10 — Harbor shoreline attachment

Port artwork and its badge now anchor to the nearest rendered coastline edge around the validated dock. Internal territory borders are excluded. A short approach joins the saved settlement location to the compact harbor; gameplay locations remain unchanged. The coastline normal selects the view, with corrected diagonal atlas mapping N/NE/E/SE/S/SW/W/NW = 4/7/2/3/0/1/6/5. All eight orientations were visually checked against shoreline fixtures. Settlement tests, typecheck and build pass. Existing campaigns update on refresh.
