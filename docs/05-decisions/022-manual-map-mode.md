# 022 — Manual map mode

## Accepted direction

The owner requested strategy view as a toggle.

## Shipped behavior

The existing mode label is now an accessible toggle beside the zoom controls. Terrain is the default. Strategy and terrain are independently selectable at any zoom; zoom, Fit, and region focus do not change the selected mode. Camera and selection are preserved. Strategy suppresses scenery, roads, and tactical unit graphics consistently; box selection follows the explicit mode. Terrain still scales detail with zoom. The choice lasts for the mounted map, rather than persisting across reloads. Lobby previews are unchanged.
