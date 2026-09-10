# Water textures

Generated with the built-in ImageGen tool, saved under `apps/web/public/art/water/`. Both native sources are 1254 × 1254 PNG. Runtime periodic blending uses the existing ground-material helper to avoid obvious tile seams. Ocean ripples are anchored to world coordinates; the river texture fills the existing smoothed paths. These are visual materials, not changes to navigation or geography.

## Ocean prompt

Seamless tileable ocean water texture for a directly overhead strategy map. Square image filled edge to edge with deep desaturated teal-blue water, very subtle broad currents and small soft wave ripples. Quiet low contrast, matte painterly surface, no strong highlights, no white foam, no coastline, no land, no objects, no text, no perspective or horizon, no vignette. Opposite edges must join seamlessly. Dark enough that ivory map labels remain clear. Refined natural water detail rather than noisy speckling. Base palette around #234b59 and #193b49.

## River prompt

Seamless tileable river WATER SURFACE texture, square, directly overhead strategy game. Only water fills the entire image, no river banks or river shape. Muted medium blue teal around #477e89, subtle thin elongated current streaks generally vertical, soft brighter glints, calm flowing freshwater. Low contrast painterly realism, no large waves, no whitewater, no foam, no rocks, no objects, no land, no text, no perspective, no vignette. Opposite edges tile seamlessly. It will be clipped inside narrow winding river paths. Clearer and lighter than a deep dark teal ocean, but restrained and natural.

## Ocean rendering refinement

The ocean now uses `oceanSurface.ts` rather than the periodic ground-material helper. It composes one seeded 4096 × 4096 runtime surface with irregular positions/crops, varied scales, and only gentle directional changes. The image spans twice the largest map dimension, never wraps, and fades to the background at its outer edge. This removes visible tile repetition and quarter-turn swirls. The original source asset is unchanged. Rivers still use periodic blending.

### Coastal transition

Shore rendering follows the shared smoothed coastline mesh and offshore islands. A soft, translucent turquoise shelf preserves the ocean texture underneath, followed by a narrow wet-sand and pale-sand edge. Land fills cover the inner half of the shelf; internal territorial borders receive no shore. Widths are world-space and do not change navigable land, cover, or movement. Strategic mode retains its simplified political map.
