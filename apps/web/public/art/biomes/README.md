# Ironfront biome ground tiles

Built-in image-generation artwork, exported as 512 × 512 WebP runtime tiles.

- plains-v1.webp — muted meadow grass and earth
- forest-v1.webp — moss and leaf litter
- highlands-v1.webp — dry heath and scattered stones
- mountains-v1.webp — slate, limestone and scree

The game now blends randomized crops/rotations into cached periodic materials; raw mirrored tiling is retained only in the source swatch preview. Adjacent territories share one world-space origin, so patterns do not restart at borders. One composite tile spans 96 navigation cells (2,304 world units in v6 maps). Ownership and fog overlays remain above the material; rivers, settlements, terrain symbols, labels and units render separately. Solid biome colors remain the loading/failure fallback.

Open preview.html for nine-tile swatches. Sources: docs/06-art/source/biomes/. Exact prompts: docs/06-art/biome-texture-prompts.md. These are presentation assets and confer no gameplay effects.

## Scenery atlas

`scenery-atlas-v1.webp` contains four trees on the top row and four peaks/foothills/ridges below, with transparent backgrounds. Runtime trims around the alpha content and sizes sprites in world space. The pure biomeScenery generator arranges them across existing terrain patches with clearings. Exact generation prompt: docs/06-art/biome-scenery-prompt.md; original PNG: docs/06-art/source/biomes/scenery-atlas-v1.png.
