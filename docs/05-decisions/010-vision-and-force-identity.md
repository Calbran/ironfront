# 010 — Vision and force identity

Date: 2026-09-09

## Accepted direction

The owner requested clearer identification of their faction and units, and a vision mechanic that prevents seeing everything happening on the map.

## Implemented first pass

- Owned territories and living army/squad locations reveal their own region and adjacent passable regions. Vision is recalculated per authenticated response; losing a source removes its live intelligence immediately on the next poll.
- Terrain, settlements, national borders and land standings remain public strategic information. There is no unexplored geography or remembered enemy contact layer yet.
- The API projects a separate player view without mutating the save. Distant armies, squads and engagements are absent from the payload; unseen garrisons/buildings are hidden. Visible enemy formations expose their presence and strength but not routes, targets, reserves, logistics or standing orders. Enemy resource stockpiles and private dispatches are withheld. Host status grants no additional vision.
- Fog shades out-of-sight regions. The region inspector labels unknown garrisons explicitly. A persistent nation/faction badge identifies the player; cyan borders and square army symbols identify their forces. Coral markers with a diamond identify other forces. There are no alliances in this slice.
- Vision applies to existing campaigns on reload without migration or resetting saves. Combat simulation still runs with the complete authoritative state.

## Limits and provisional choices

Whole-region vision and one-neighbor reach are initial tuning. There is no terrain raycasting, stealth, altitude bonus, reconnaissance aircraft mission, or last-seen contact memory. Public borders can reveal territorial gains but never expose the hidden fight itself. Historical enemy reports are not retroactively unlocked by visiting their region.

## Validation

Tests cover two authenticated player views, host restrictions, secret orders and reports, distant squads/engagements, gaining/losing vision, mountain blocking and preservation of the full save. Browser battle checks cover the identity badge, fog and tactical detail on desktop and phone.

### Political overview — 2026-09-09

Owner requested clear region colors, borders and controller names when zoomed out. Campaigns now switch to political strategy view below 145% zoom. Each connected holding is labeled with its current controller; public owner colors remain legible under lighter fog. Terrain detail returns on approach. Military vision filtering is unchanged.

### Nation lettering refinement

The owner specified a Crusader Kings 2-like overview: unboxed nation names across controlled land and no local icons/names until zooming in. Strategy view now fits spaced serif lettering along continuous land baselines and suppresses all army/battle/route markers alongside the already hidden settlements. This supersedes compact army markers at strategy zoom; they return above 145%.
