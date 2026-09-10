# 027 — Steam jeep and squad transport

## Accepted direction — September 10, 2026

The owner requested a Victorian/steampunk jeep for mobile infantry. Each vehicle must hold one full infantry squad of six units. Infantry must eventually be able to enter and exit vehicles for transportation. The existing infantry model is the size reference.

## Implemented

A separate TypeScript/Three.js model study at `/jeep-preview.html`, built alongside the application. Dark enamel, riveted sides, brass grille/lamps, copper boiler/plumbing, four wheels, six inward-facing passenger seats, separate driver station, rear step and hinged tailgate. Named passenger attachment groups preserve six places in downloadable GLB exports. Reference figures reproduce the existing infantry prototype's body dimensions and palette with simplified static standing/seated poses; helmet height is 1.925 model units. No arbitrary rescaling between soldiers and vehicle.

The inspection UI supports orbit/zoom, overhead view, passenger visibility, lowering the tailgate and downloading an empty vehicle GLB. This is an art study, not the campaign's vehicle renderer or a gameplay boarding implementation.

## Provisional choices

Two three-person benches and a separate driver are modeling choices, not a newly approved crew/manpower rule. Approximate body envelope is 5.9 × 2.5 × 2.4 model units (length/width/height); the infantry scale has no established meter conversion. Six passengers are additional to the depicted driver. Materials, dimensions, cost, speed and combat behavior have not been balance validated.

## Future server-authoritative transport

Implement trusted embark/disembark commands with atomic ownership, proximity, capacity and eligibility validation; persisted passenger/vehicle relationships; safe ground-valid exit positions; and restart tests preventing lost/duplicated passengers. Embarked squads must move with their carrier and not independently act on the map. Vehicle destruction, passenger casualties, loading time, transport orders and the existing two-vehicle mobile squad roster need explicit design resolution before implementation. The visual preview grants no transport authority and changes no saved forces.

## Distance-view refinement — September 10, 2026

Owner requested soldier-like simplification for distant viewing. The default model now has 692 triangles and two merged vertex-colored meshes with shared geometry/material resources. Removed details too small to read at distance. Six seat transforms, infantry scale and tailgate pivot are preserved. This implements model simplification, not vehicle crowd instancing or transport gameplay.
