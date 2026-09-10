# Generated agricultural land use

Accepted: farmland should be part of world generation, providing rural space between settlements, and scenery should not overlap roads or cultivated fields.

Implemented: new regions persist optional `landUse` (`agricultural`, `settled`, `wilderness`). Fertile lowland coverage and seeded spatial variation select agricultural regions before settlement placement. Agricultural regions receive no settlement or one hamlet/village, instead of the regular town/city placement pass. Farmland presentation follows the saved land-use designation. Region borders remain a complete administrative partition; rural space is land use within regions, not gaps between territories.

Shared scenery clearance checks test full decorative sprite footprints against field polygons and road shoulders. Decorative hills and natural clutter are filtered before rendering, and biome scenery waits for the land-use layout to avoid load-order races. Authoritative mountain obstacles remain intact.

Old campaigns retain settlement locations and use the legacy farmland selection when landUse is absent; they receive the overlap correction on reload. Movement, capture, supply, and economy remain unchanged. Agricultural frequency and hamlet probability are provisional tuning.
