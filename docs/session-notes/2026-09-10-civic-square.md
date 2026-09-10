# Civic square and daylight windows — 2026-09-10

Added the requested low stone enclosure, clipped planting beds and benches around the existing town hall. Clear gates and the front approach remain; the front wall was moved inside the market-shop setback during review. Victorian pediment/dormers, clock trim and copper rooftop equipment strengthen the hall silhouette without enlarging it.

Window occupancy now affects glass/emission only at dusk through a shared shader uniform. Daylight uses consistent non-emissive glass. The room pattern is stable per window and building instance, with no added lights or draw calls. Earlier all-day variation is superseded.

Validation: typecheck/build and the focused civic-square browser check passed. Reviewed 160-building daylight and dusk captures; the script also checks 28 buildings, switching back to daylight, winter and a 390px viewport. No page errors, missing assets (favicon excluded) or horizontal overflow. Captures and short performance diagnostics: `.impeccable/review/civic-square/`. These are not production performance guarantees.

Initial inspection caught a mixed indexed/extruded geometry batch failure; normalized batch inputs fixed it. The prior long window run was interrupted by hot reload and reported React root warnings; the fresh focused run passed. No gameplay rules changed. Larger mills/service buildings, full attachment bounds and LOD remain stage-1 work before more varied blocks.

## Full-block follow-up

Owner requested removal of the four front shops and grounds extending to the streets. Shops now sit behind the original rear market row, facing a connected rear street; base and district building budgets remain unchanged. Walls sit inside the x ±24 / z -18 and 19 street boundaries, with broad planted wings and front/rear/side openings. A conservative footprint regression protects the civic reservation. Fresh 28/160-building daylight/dusk/winter/phone browser checks passed without page errors or missing assets, and the expanded square was visually reviewed.
