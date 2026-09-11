# Close city camera — 2026-09-10

Implemented the requested close perspective inspection mode in the local city diorama. Street View targets the selection or last surface pivot, with an infantry fallback. Planning View restores its saved pose. Existing middle-drag surface anchoring is shared between both projections, and unit projection and terrain orders now read the current camera. Airship review also respects projection mode.

Foreground building shaders reveal up to eight selected targets with a soft stippled corridor. Existing material hooks, including emissive windows, are chained. This retains instancing and avoids transparent-object sorting; it does not remove building shadows or provide camera collision. Tuning is provisional.

Validation: four focused camera/cutaway tests pass, TypeScript passes, Vite build passes with the existing large-chunk warning. Browser inspection confirms close street rendering and planning overview restoration. Automated mouse-orbit and movement interaction were not fully exercised in this pass.
