# 019 — Seeded biome scenery

## Accepted direction

Replace triangle terrain markers with varied tree and mountain sprites arranged into recognizable biomes.

## Implemented

The pure `generateBiomeScenery` generator derives decorative placements from existing region geometry and continuous biome patches. Seeded jitter, density variation, sprite selection and size variation produce clustered forest cover, dense rocky mountains and sparse highland outcrops. Placement follows biome shapes across political boundaries. Land-envelope checks, settlement-layout clearings and rasterized river corridors keep scenery out of protected areas.

An eight-sprite transparent atlas provides four tree and four mountain/foothill variants. The client trims atlas cells, fixes sprite size in world space, and groups sprites spatially to hide off-screen groups. Sprites render below labels, cities, units, ownership and fog. Layout is generated once per map mount; campaign updates and camera changes do not reseed it. Existing maps benefit without regeneration. Texture failure retains ground materials without resurrecting triangle markers.

## Provisional and deferred

Density, artwork, spacing and scale are visual tuning. Sprite placement is cosmetic and does not add collisions, line of sight, local cover or movement costs. Existing authoritative terrain rules remain in effect. No new state is persisted for decorations.
