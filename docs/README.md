# Documentation

The organization follows Crownfall, with a deliberately smaller starting scope.

| Area | Read |
|---|---|
| Direction | [Vision](01-design/vision.md), [game blueprint](01-design/game-blueprint.md), [theme and factions](01-design/thematic-direction.md) |
| Interface | [Built visual system](../DESIGN.md), [working style guide](06-art/style-guide.md) |
| Scope | [Proof and MVP](01-design/mvp.md) |
| Rules | [Campaign systems](02-systems/campaign-systems.md), [armies and fronts](02-systems/fronts-and-armies.md), [geography](02-systems/continental-geography.md) |
| Engineering | [Stack and architecture](03-technical/tech-stack.md), [hosting](03-technical/self-hosting.md) |
| Delivery | [Roadmap](04-roadmap/mvp-checklist.md) |
| Decisions | [001: direction](05-decisions/001-lightweight-land-conquest.md), [002: architecture](05-decisions/002-authoritative-browser-proof.md), [003: armies and fronts](05-decisions/003-armies-and-fronts.md), [004: Ironfront and terrain](05-decisions/004-ironfront-and-continental-terrain.md) |

**Accepted** means the owner established the direction. **Provisional** means a concrete hypothesis for playtesting. **Implemented** describes code, not approval or balance validation. PROJECT_STATE.md is the current save file; session notes and CHANGELOG.md preserve history.

Latest generator decisions: [clean terrain and preview](05-decisions/005-clean-terrain-and-map-preview.md), [Earth-derived geography](05-decisions/006-earth-derived-geography.md).

Latest feature direction: [007: compact territories and local features](05-decisions/007-territory-features.md).

Latest visibility rules: [010: vision and force identity](05-decisions/010-vision-and-force-identity.md).

Latest controls: [011: group controls and cover](05-decisions/011-group-controls-and-cover.md).

Direct local positioning: [012: local squad orders](05-decisions/012-local-squad-orders.md).

Current primary movement: [013: cross-region squad orders](05-decisions/013-cross-region-squad-orders.md) supersedes the local-only restriction in 012.

Current interface layout: [014: command HUD](05-decisions/014-command-hud-layout.md).

Current new-map scale: [015: grand-campaign map scale](05-decisions/015-grand-campaign-map-scale.md).

Current territory count and nation spacing: [016: neutral expansion space](05-decisions/016-neutral-expansion-space.md).

Current terrain, settlement interactions, and physical world scale: [017: terrain and settlements](05-decisions/017-terrain-settlements-and-world-space.md).

Seeded modular cities: [018: layout and spacing](05-decisions/018-seeded-modular-cities.md), [asset kit](../apps/web/public/art/city-kit/README.md), [art prompts](06-art/city-kit-prompts.md).

Harbor art: [port kit and prompts](06-art/port-kit-prompts.md).

Current forest/mountain decoration: [019: seeded biome scenery](05-decisions/019-seeded-biome-scenery.md).

Authored settlements: [decision 019](05-decisions/019-authored-settlement-scenes.md), [asset catalog](../apps/web/public/art/settlement-scenes/README.md), [generation prompts](06-art/settlement-scene-prompts.md).

Current settlement presentation: [020: abstract icons](05-decisions/020-abstract-settlement-icons.md), superseding authored city scenes.

Ground movement obstacles and air exemption: [020: mountain collision](05-decisions/020-ground-mountain-collision.md).

Water art: [ocean and river texture specifications/prompts](06-art/water-textures.md).

Terrain accents, town roads, and consistent sprite dimensions: [021: shared visual scale](05-decisions/021-terrain-accents-and-scale.md), [accent art and prompt](06-art/terrain-accent-prompt.md).

Current city occupation rules: [022: physical settlement capture](05-decisions/022-settlement-capture.md).

Map view control: [022: manual strategy/terrain toggle](05-decisions/022-manual-map-mode.md).

Contextual scenery: [023: farmland, riverbanks, and vegetation groups](05-decisions/023-contextual-landscape.md).

Mobile infantry model and accepted six-person transport direction: [027: steam jeep](05-decisions/027-steam-jeep-transport.md).

- [028: Live infantry rendering](05-decisions/028-live-infantry-rendering.md) — model integration, culling and limits.

- [Three.js migration experiment](prototypes/threejs-migration.md) — isolated miniature-world renderer study.

- [Crafted miniature art scene](prototypes/crafted-miniature-scene.md) — summer/winter reference diorama, standalone development study.

- [Full-world miniature performance](prototypes/world-performance.md) — chunked kit rendering and synthetic workload measurements.

- [Live campaign integration and soak](prototypes/live-campaign-performance.md).
- [Generated-region landscape study](prototypes/generated-landscape.md).

- [Town generation and pipeline audit](prototypes/town-generation-audit.md).

- [Large-city diorama and building benchmark](prototypes/large-city-diorama.md).
- [030: City capitals and large-city study](05-decisions/030-city-capitals-and-large-city-study.md).

Real-city settlement direction: [031 — street seeds](05-decisions/031-real-city-street-seeds.md).

Crafted settlement blocks: [032 — neighborhoods and developed ground](05-decisions/032-crafted-neighborhood-blocks.md).

Dense district direction: [033 — steampunk districts](05-decisions/033-dense-steampunk-districts.md).

Current development plan: [miniature city roadmap](04-roadmap/miniature-city-development.md).

Urban kit continuation: [034 — footprint contract](05-decisions/034-urban-kit-footprints.md).

Civic-square treatment: [035 — Victorian civic square](05-decisions/035-victorian-civic-square.md).

Industrial and skyline kit: [036 — mills and steampunk towers](05-decisions/036-industrial-kit-and-steampunk-skyline.md).

City detail and block recipes: [037 — envelopes and detail levels](05-decisions/037-city-envelopes-detail-and-block-recipes.md).

- [Angled street parcel study](05-decisions/038-angled-street-parcel-study.md): bounded street-first comparison, fitting rules and remaining terrain work.

- [Terrain fitting study](05-decisions/039-terrain-fitting-study.md): level foundations, graded surfaces, protected northern crossing and scope limits.

- [River-cut district](05-decisions/040-river-cut-district.md): parcel clipping, connected crossings and waterfront comparison limits.

- [Combined terrain and river](05-decisions/041-combined-terrain-river.md): shared corridor transform, rigid fit checks and remaining world integration.

- [City seed gallery and bounded audit](05-decisions/042-city-seed-gallery.md)

- [Seeded integrated city composition](05-decisions/043-seeded-city-composition.md)

- [World-generated river samples](05-decisions/044-world-river-samples.md)

- [District infill and fitted foundations](05-decisions/045-city-infill-and-foundations.md)

- [Dense full-tile city direction](05-decisions/046-full-tile-city-direction.md)

- [047 — City-wide planner](05-decisions/047-city-wide-planner.md): full-tile grid, civic core, district allocation and remaining tactical work.

Military models: [047 — infantry-scaled kit](05-decisions/047-military-model-kit.md), [GLB asset catalog](../apps/web/public/art/military/README.md).

Faction model proofs: [048 — signature units and engineers](05-decisions/048-faction-model-studies.md).
- [048 — Varied city and asset library](05-decisions/048-varied-city-and-asset-library.md): angled blocks, civic variants, free camera and 19 shared low-poly models.
- [049 — Urban civic frontages](05-decisions/049-urban-civic-frontages.md): fitted square surroundings, road bridge decks and steam utilities.

- [050 — City tactical geometry inspection](05-decisions/050-city-tactical-geometry.md): prototype movement/obstacle queries, cover candidates and town-hall boundary.
