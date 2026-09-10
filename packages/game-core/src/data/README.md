# Earth relief atlas v1

`earth-relief.json` contains five 192 × 128 samples of real signed elevation, in metres, plus a derived signed coastal-distance field in sample-cell units. Runtime generation is deterministic TypeScript and makes no network requests.

Source: [Mapzen Terrain Tiles on AWS](https://registry.opendata.aws/terrain-tiles/), accessed 2026-09-09. Each sample records its geographic bounds (west, south, east, north), original zoom-5 Terrarium tile URLs, and SHA-256 checksums of downloaded PNG bytes. Sources cover the Gulf of Mexico, Mediterranean, Southeast Asia, Pacific North America, and Scandinavia. See the in-app [attribution page](../../../../apps/web/public/terrain-attribution.html) and the [upstream license/credit document](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).

## Acquisition and preprocessing

1. Project sample bounds into Web Mercator tile coordinates at zoom 5; fetch the intersecting Terrarium tiles.
2. Decode height as `R × 256 + G + B / 256 − 32768`, following the [Terrarium specification](https://github.com/tilezen/joerd/blob/master/docs/formats.md).
3. Mosaic float elevations, crop at the projected bounds, and bilinearly resample to 192 × 128. The initial atlas was prepared with Python/Pillow/NumPy outside the application runtime.
4. Mark positive elevation as land. Compute four-neighbor Manhattan distance to water (padding sample edges with water) and distance to land; store their difference as signed coastal distance.
5. Store elevation rounded to whole metres and integer distance arrays in row-major order. Include exact source hashes and bounds so acquisition is auditable. Atlas changes require a version bump rather than silent replacement.

These are modified data: the game rotates, reflects, warps, combines and erodes samples, normalizes relief, and uses arbitrary world-coordinate units. It must not represent these generated maps as real places or imply endorsement by the source providers. Licensing and attribution are displayed in `apps/web/public/terrain-attribution.html`.
