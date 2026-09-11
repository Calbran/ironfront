# Shared tactical controls — 2026-09-11

Consolidated the repeated city and country-sector pointer code around the city battle contract. Both now use shared marquee selection, floor-anchored middle orbit/right-drag facing and WASD/Q/E navigation. The right-drag controller carries Shift queue intent for the sector without changing city order behavior. Country destinations now use translucent model ghosts and continue to request route validation from the API before showing accepted or blocked feedback.

The city and sector retain separate simulation adapters because one is a battle test and the other is persisted server-authoritative movement. A delayed city unit overlay now attaches to the owned viewport host rather than relying on the canvas still having a parent during regeneration.

Follow-up: perspective zoom now uses the same cursor anchor as planning zoom with a stable exponential distance ratio. Shared unit markers cull miniature meshes once their screen size is no longer legible. The sector adds an ultra-distance city representation using a single instanced building box batch and a single street ribbon mesh, while strategic roads collapse to highway lines. Detail returns with hysteresis when zooming in.

Validation: the full 285-test suite passed after consolidating controls. The final presentation pass passed six camera, two unit-marker and three country-road tests, plus typecheck and production build. Clean browser loads succeeded for both city and sector views. Sector overview reported the silhouette/strategic LODs, four unit markers and 7 draw calls versus 368 before batching and far-detail suppression; detailed geometry restored while zooming toward the city.
