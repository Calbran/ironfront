# Farmland and settlement art — 2026-09-09

The reported stair-step came from drawing farm fragments clipped to raw raster territory contours beneath separately smoothed display edges. Fields now retain raw fragments for clearance but render infrastructure-clipped overdraw through the shared smoothed agricultural-region mask.

New maps select fertile agricultural regions deterministically with a 24% passable-area cap and 26% passable-region cap. Six-seed unit coverage stays at or below 25%; a three-seed browser review measured Boreal 24.0%, Ironfront 21.6%, and Meridian 23.8%.

Detail zoom now loads the retained transparent hamlet-through-metropolis sprites into existing settlement clearings, with the interactive owner/type badge kept above the art. A newly generated five-tier atlas was rejected because both generation attempts baked a checkerboard into RGB rather than producing alpha.

Validation: typecheck, 105 tests, production build, desktop/phone settlement interaction and garrison flow, and the new three-seed `scripts/landscape-browser.ts` visual pass. No browser page errors were observed.

Follow-up: the remaining circular padding around settlement art came from using `CityLayout.radius` as a circular farm exclusion. It now uses tier-specific elliptical sprite footprints with a small world-space margin, and the same geometry guides nearby decorative vegetation clearance.
