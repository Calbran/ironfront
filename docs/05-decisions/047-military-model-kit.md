# 047 — Infantry-scaled military model kit

## Accepted direction — 2026-09-10

The owner requested review of the current city generator and infantry model, followed by tank, airship, artillery emplacement, sandbags, barbed wire and LMG squad models at compatible scale.

## Reviewed context

The city work uses seeded connected street skeletons, rigid footprint/access fitting, waterfront deformation, dense district infill and a civic center. Decision 046 sets the next full-tile city target and accepted urban warfare constraints. This remains a separate study rather than live generated-city navigation/cover. Its infantry instances use the existing `bakeInfantry` geometry with a uniform 0.55 scene scale.

## Implemented

Six reusable low-poly model constructors, exported GLBs and `/military-preview.html` with the original infantry beside each model, shared model-unit grid, orbit/zoom, overhead view and export. Named turret, propeller, defense-join and squad-role nodes prepare future integration. All models use infantry coordinates without individual size normalization. The LMG inspection squad reuses the exact baked soldier geometry, replacing only one rifle with an LMG; the six-person composition is provisional presentation.

The kit has 936–2,740 triangles per asset. Meshes use merged vertex-colored geometry rather than a draw call for every small component. No new textures, live draw loop, recruitment or combat authority is added to campaigns. The standalone preview is loaded separately. Runtime crowd capacity and gameplay integration remain unvalidated.

## Boundaries

Apply the city renderer's same 0.55 transform to the entire kit when integrating. Current assets do not implement emplacement construction, barbed-wire collision, tank combat, playable airships, LMG suppression, or individual squad animation. Dimensions/footprints are visual tuning, not validated real-world measures or balance.

See [asset catalog](../../apps/web/public/art/military/README.md).
