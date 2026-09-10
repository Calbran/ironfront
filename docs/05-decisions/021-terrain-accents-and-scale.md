# 021 — Terrain accents, settlement roads, and shared visual scale

## Accepted direction

The owner requested varied small terrain accents, smaller utility poles tied to nearby towns, winding roads around mountains, and consistent sprite scale, especially much smaller trees.

## Shipped behavior

`visualScale.ts` supplies world-space sizes for trees, mountains, terrain accents, roads, poles, and unit glyphs. At current map scale, tree width is 22 world units (previously about 67), poles are 8, flowers 10, and mountains remain 360 before seeded variation. Trees form denser stands of smaller canopies. Physical unit glyph sizing no longer depends on viewport size. Cartographic settlement badges, labels, and selection controls remain readable screen-space indicators.

Seeded hill, scrub, grass, wildflower, reed, and stone sprites enrich terrain. Field fences appear near rural settlements. Small details appear at closer zoom and are culled outside the viewport. Artwork and exact prompt are in [the asset record](../06-art/terrain-accent-prompt.md).

Nearby settlements receive a sparse network of roads using valid ground routes. Gentle variation is accepted only where segments remain legal; roads avoid water and physical mountain obstacles. Short connections can carry small utility poles alongside the road. The network is decorative and does not guarantee every town is connected. It gives no movement or economic bonus. New decorative layouts appear when existing campaigns reload, without changing campaign authority or saved mountain obstacles.

## Provisional tuning

Sprite dimensions, density, road distance/degree limits, and detail zoom thresholds are presentation tuning, not validated real-world measurements. Hills and accents do not introduce additional movement obstacles.

Follow-up: roads use a 4.8-world-unit inner stroke; all utility artwork was reduced by 20%. Utility connections preserve every route segment and use the validated road centerline when a complete roadside offset is unavailable, maintaining continuity across region gateways.

Close-zoom material follow-up: land blends use 2048-pixel canvases and 512-pixel stamps instead of 1024/256. Broad color variation spans 96 navigation cells; a second frequency spans 16 and smoothly fades to 55% opacity between 300% and 800% zoom. Both frequencies share one cached texture per biome (64 MiB of base RGBA pixels across four land materials) and identical land geometry. Water remains at its prior resolution. These are provisional visual settings, using existing authored material detail rather than newly generated art.
