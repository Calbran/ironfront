# 2026-09-11 — Playable country sector

Added `/country-slice.html`, linked from the pacing preview. Pure generation selects a real Meridian river sector and inserts the existing district city and country POI plans at unchanged scale. Added a bridge-connected road spine, collision geometry, cover slots, four selectable units and persisted authoritative commands.

Fixed a country-road entrance issue discovered during integration: the chosen external navigation node could still be inside the site's reserved footprint, leaving its outgoing edges blocked. Navigation sockets now require a clear external node as well as a clear approach. Earlier 372/420 coverage figures describe the preceding version; the pacing preview computes the current coverage.

Verification: all 279 tests passed, including cross-bridge infantry/tank routes, air bypass, city collision, atomic invalid group orders, cover assignment, queued movement, bounded tank turns, timestamp-independent catch-up, SQLite reopen and API authentication. Typecheck and production build passed. Browser checks covered direct movement, a cross-sector order surviving reload, connected destination art, and fixed-height HUD. Local route timing sampled approximately 0.43 seconds for a cross-sector tank command on this host; this is not a production performance budget.

The prototype remains separate from live campaign authority and the temporary city battle. Combat, capture, whole-country rollout and arbitrary terrain city fitting are still outstanding. See the playable-country-sector decision for tuning and limits.
