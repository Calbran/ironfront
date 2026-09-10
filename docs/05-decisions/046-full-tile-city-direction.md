# 046 — Dense full-tile city direction

## Accepted direction

The user clarified that the whole square terrain tile should be covered by a city. Blocks should support many buildings, with street-facing rows and wedge-shaped buildings where needed. A dense central civic/commercial core should contain the town hall and tallest towers, with residential, commercial and industrial districts distributed across the city. Deliberate streets, waterways, parks and courtyards remain open.

## Shipped components

The neighborhood fitter now uses final street bearings for rigid buildings and their doors. A second frontage pass fills compatible gaps, including a compact industrial workshop model and clear-access rear industrial placement attempts. Steps follow final doorway coordinates. Smoke billboards account for rotated city parents, and residual-space seating is smaller without large slab bases.

## Unimplemented direction

Full-tile street growth, central civic-anchor placement, a city-wide density/height field, distributed district allocation and wedge-aware polygon footprints require the next generator architecture. The existing bounded study is not the final city layout. These targets should not be represented as already shipped or as validated performance budgets.

## Accepted urban warfare purpose

The city is intended to host fights within its streets and blocks. Players should be able to create defensive constructs including sandbags, barbed wire and anti-vehicle emplacements. Soldiers should use buildings and walls as cover. City control is centered on the town hall, consistent with decision 030.

Generation must therefore provide connected movement routes, tactical open spaces, cover geometry and usable construction space alongside density. These are requirements for the next architecture, not implemented mechanics in this diorama. Precise placement rules, cover representation, construction costs/timing, destruction and town-hall contest rules remain unresolved. Existing physical settlement capture (022) and site-level cover (011) continue unchanged. Land ownership remains the default victory measure.
