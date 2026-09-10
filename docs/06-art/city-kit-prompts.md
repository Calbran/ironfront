# City kit generation prompts

Generated using the built-in ImageGen tool. Final assets live in `apps/web/public/art/city-kit/`. Earlier atlas revisions with baked checkerboards were discarded; the installed atlas is an RGBA PNG.

## Building atlas

Transparent PNG game sprites atlas, actual alpha channel, transparent background, no checkerboard representation. ONE 6 by 6 square sprite sheet, exactly 36 isolated sprites centered in uniformly spaced cells. Flat TRUE TOP-DOWN plan view from directly overhead of Victorian steampunk BUILDING ROOFS. ONLY roofs, no side walls/front facades, no perspective, no city ground or whole city. Simple handsome painterly slate roofs and muted brick/copper roofs, broad shapes and restrained details legible small. Strong clean silhouettes, very subtle consistent lighting. Each object fills only center 65% of its cell. Row1: six house roofs, gable/hip/L/courtyard/square/narrow variants. Row2: six workshop and shop roof variants. Row3: six industrial rooftops, warehouses, sawtooth factories, foundry, engine shed, barracks, depot. Row4: two warehouse/factory rooftops then four civic rooftops: town hall, clock tower viewed from straight above, market hall, domed guildhall. Row5: two landmark rooftops fort gate and observatory, then four props viewed straight down: circular water tank, brass boiler, round chimney mouth, dock crane. Row6: six overhead props crates, stacked timber, tree canopy, fountain, glass greenhouse, mooring bollards. No lettering, no numbers, no grid lines. Actual transparent alpha background. No checkerboard, no black rectangle backgrounds. This is a texture atlas for in-game buildings that must blend onto arbitrary map terrain.

## Ground textures

Each texture used this template, with the substitutions below:

One seamless tileable {name} ground texture for a directly overhead steampunk strategy game city. Square 256x256 intended source tile, no border. Muted desaturated warm gray-brown {material}. Flat even overhead lighting, very low contrast, no strong shadows, no objects, no text, no perspective, no vignette. Opposite edges must tile seamlessly. Readable quiet backdrop beneath separate building sprites.

- dirt: fine packed earth, no large rocks or vegetation
- paving: broad rectangular stone paving with restrained variation
- cobbles: small worn irregular cobblestones

Actual generated source dimensions are 1254 × 1254, preserved without resizing. These are provisional game assets; review replacements at gameplay scale, not only at source resolution.
