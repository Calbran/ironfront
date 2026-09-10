# Modular city art kit

Generated with the built-in ImageGen tool for Ironfront. Runtime layouts are assembled by `packages/game-core/src/cityLayout.ts`; Pixi rendering lives in `apps/web/src/settlementGraphics.ts`.

## Current files

- `buildings-atlas.png`: 1254 × 1254 RGBA PNG, 6 × 6 evenly spaced cells, 209 × 209 pixels per cell. Transparent background; center anchor. The loader trims each cell to its nontransparent bounds, so source padding does not shrink the visible building. Index is row-major, zero-based.
- `dirt.png`, `paving.png`, `cobbles.png`: 1254 × 1254 ground textures, used subtly beneath the central plaza.

| Sprite indexes | Purpose |
|---|---|
| 0–11 | Houses, shops, workshops |
| 12–19 | Warehouses, factories, industrial buildings |
| 20–25 | Civic buildings and landmarks |
| 26–35 | Tanks, machinery, crane, crates, timber, trees, fountain, greenhouse, moorings |

## Adding art

Make individual objects, not complete city pictures. Use a consistent overhead camera and lighting, muted slate/brick/copper colors, transparent PNG backgrounds, and no baked terrain or long shadows. Keep each object centered inside its cell with generous transparent padding. Roads and docks are currently drawn procedurally.

For future hand-authored assets, target 128 × 128 source pixels for houses/props and 256 × 256 for landmarks/industry. Ground tiles can be 256 × 256 seamless images. Pixel dimensions describe source detail; world-space footprints come from the generator. An atlas replacement must preserve the current 6 × 6 index mapping and equal cells, or update the loader and sprite definitions together. Test at both overview and close zoom.

This is a first art pass. Source images are larger than the requested nominal sizes; the renderer uses their actual dimensions. Sprite padding, perspective consistency, and terrain blending can be refined in later art passes.

See [generation prompts](../../../../../docs/06-art/city-kit-prompts.md).

## Port kit

`port-atlas-v1.png`: 1536 × 1024 RGBA, 3 × 2 cells (512 pixels each). Row-major: pier, warehouse, harbor office, crane, cargo, quay. Buildings stay in their original orientation. Flat deck pieces align to docks. See [port prompts](../../../../../docs/06-art/port-kit-prompts.md). Ground textures are retained as source assets but the circular plaza stamp is no longer used.
