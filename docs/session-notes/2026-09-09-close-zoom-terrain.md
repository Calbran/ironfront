# Close-zoom terrain — 2026-09-09

Addressed blurry magnified ground with higher-resolution material baking and a second, smaller-scale world-anchored material frequency. Source crops are no longer reduced to 256-pixel stamps; land uses 512-pixel stamps in 2048-pixel blends. The fine layer fades smoothly during camera gestures and shares cached textures with the broad layer. Clipping matches coast and biome geometry, beneath roads/rivers/scenery. No new image assets or gameplay changes.

Typecheck and production build passed; build retains its existing chunk-size advisory.

Desktop (1440px) and mobile (390px) browser checks passed for asset loading, camera zoom/Fit, runtime errors, and horizontal overflow. Close-zoom screenshots at 916% were visually reviewed: fine grain is visible without large fuzzy material blobs, with readable roads, icons, and scenery above it.
