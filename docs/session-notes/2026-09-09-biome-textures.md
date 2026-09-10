# Biome ground textures — 2026-09-09

User requested repeating patterns for biome ground. Created four original materials with the built-in image-generation tool; preserved full-size PNGs and exported 512px WebP runtime files. Exact prompts are in docs/06-art/biome-texture-prompts.md.

Integrated globally aligned FillPattern materials in terrainGraphics. Mirrored sampler wrapping maintains continuous edges; scale follows saved geography cell size. Existing coastline/biome clipping, rivers, symbols, ownership and visibility remain. Loading is asynchronous, disposal-safe and falls back to solid colors. This is presentation only, with no world regeneration or mechanics changes.

Typecheck and build pass. scripts/biome-browser.ts verifies all four textures load in a disposable campaign at desktop/phone sizes, exercises zoom/Fit, records overview/detail screenshots, and checks page errors/overflow. Reviewed material repetition and map readability. Four runtime tiles total about 350 KB. Reflected repetition can be recognizable in isolated swatches; contrast and tile scale remain art tuning.
