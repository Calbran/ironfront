# 030 — Physical region layouts

## Accepted direction

Regions need coherent themes comparable to farmland, rather than isolated decorative sprites. The owner requested scrapyards, mountainous regions and large lakes with bridges, and confirmed that their features must affect movement and cover. Generation must establish the major features and usable routes before placing settlements and scenery.

## Implemented foundation

New geography generates optional, versioned `terrainLayout` data after physical coordinates are scaled and before national-port reservations and ordinary settlement placement. Suitable inland, non-agricultural plains receive scrapyards or lake crossings; selected highlands receive mountain-pass layouts. Unsuitable candidates are skipped. A seeded quota keeps themes a minority of the map.

Each saved layout contains solid/water polygons, bridge deck polygons, bridge centerlines, and access routes. Scrapyards use storage bays with a connected service-lane grid; mountain passes retain open approaches between ridge footprints; lakes have an actual traversable deck, shore access routes, and solid abutment rocks. Candidate layouts preserve the pre-existing navigation components and region anchors. Bridge approaches must be reachable, and a swept traversal of the full deck must succeed. Settlement candidates reserve their footprint outside the obstacles and crossings. National ports remain on unthemed coastal land.

Rendering uses those same saved polygons. Region-wide ground treatments replace the earlier decorative countryside pockets. Biome scenery is suppressed through the existing raster inside themed districts, avoiding both conflicting artwork and expensive per-sprite polygon scans. Derived settlement roads use the updated movement checks.

## Movement and cover

Ground endpoint and swept-segment checks reject solid obstacles and water. A bridge overrides only the part of a water footprint beneath its deck; it never overrides a solid obstacle. Segment checks split at polygon and deck edges, preventing tunneling. Ground routing, tactical displacement, pursuit, cover movement, and stale-route validation share these checks. Air movement ignores the new footprints.

Physical cover applies within 24 world units outside a solid footprint, only when that obstacle lies between the target and the incoming source. It uses the existing provisional 1.3 defensive divisor and is available to either faction regardless of territory ownership. It is not a region-wide bonus. The selected-unit panel indicates a nearby terrain-cover opportunity; protection still depends on incoming direction. Existing settlement/fort cover rules remain available.

## Persistence and limits

Layouts are generated only for new maps and persist with the world. Save loading does not add new obstacles to old campaigns. There is no live terrain editing, destructible bridge, naval unit, new economy, or weighted victory objective. Existing territory ownership/scoring is unchanged. Lakes are local movement surfaces within their owning territory, not new territories or global coastline edits. Existing rivers retain their previous movement behavior.

This ships the generation and interaction foundation with initial procedural artwork. Scrap detailing, ridge silhouettes, theme density, route widths, cover distance and combat tuning are provisional. Physical cover is not full projectile/line-of-sight simulation; the existing combat resolver applies a defensive benefit rather than stopping every shot.

## Validation

Nine dedicated tests cover water/deck endpoints, swept collision, thin obstacles, ground detours, air exemptions, directional cover, connectivity rejection, deterministic generation across three seeds, settlement clearance, real movement ticks, stale routes, atomic API rejection, database reopen, legacy-save preservation, and actual cover damage for a non-owning faction. The full regression suite passes.

The isolated browser check renders all three themes, selects a squad and orders it across a real generated bridge, verifies the saved route, rejects an open-water order, and captures desktop and phone views. Script: `scripts/terrain-layout-browser.ts`.
