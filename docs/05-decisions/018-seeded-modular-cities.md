# 018 — Seeded modular cities

## Accepted direction

Build cities from reusable graphics, with seed-driven variation and archetypes influenced by their location. Coastal settlements can be ports. Reduce crowded settlement placement and repeated whole-city stamps.

## Implemented

A pure deterministic layout planner uses the world seed and settlement ID. It produces streets, building footprints, landmarks, props, and docks. Coast proximity selects ports; rivers select riverside towns; forests favor woodland settlements and highlands fortified towns. Other towns use market or industrial layouts. Size controls the footprint and building budget. Layouts combine individual sprites from a 36-cell transparent atlas, with three optional ground textures and a vector fallback.

Ports align to the coast and place docks only where their ends reach water. Port classification requires the shore to be within reach of the settlement's actual constrained footprint and at least one geometrically valid dock; a merely coastal territory or a distant shoreline is not enough. Building footprints and streets are checked against the territory land polygon. Buildings avoid each other and roads; neighboring settlements constrain footprint size across territory boundaries. Layout plans are cached on the client. Overview markers remain compact; detailed buildings occupy fixed world space.

New maps favor one primary settlement per territory, with occasional small satellite villages where space allows. Global spacing checks cross territory boundaries and keep major cities farther apart. Existing campaigns retain settlement coordinates and names, but receive the new visual layouts. A new campaign is required for the spacing changes.

Clicking a settlement still selects it and preserves the existing authoritative garrison flow. The dock and hover text identify its archetype. These visuals introduce no new city economy, combat authority, independent capture rules, or per-building simulation.

## Provisional

Building counts, settlement frequency, spacing, archetype distribution, and art are first-pass tuning. No new save schema is required. Future art can replace atlas cells without replacing the layout algorithm. Asset dimensions, mapping, and prompts are recorded in the city-kit README and art documentation.

## Compact frontage refinement

The owner found the first layouts too sparse and repetitive. Layout v2 uses ordered frontage lots along offset blocks, winding spines, or loop streets, with larger building footprints and narrow alley gaps. Oriented rectangle separation replaces circular building exclusion. Transparent sprite-cell margins are trimmed during loading. All sizes stay in world space; no zoom compensation enlarges city art at overview. This refinement applies to existing campaigns without regeneration.

## Fixed-orientation template refinement

The owner requested preserving the generated art's viewing angle and using consistent templates. Layout v3 therefore supersedes arbitrary street rotations with authored plans per archetype: port quays, riverside terraces, market square, industrial blocks, woodland main street, and fortified courtyard. Building and prop rotation is zero, including collision geometry. Seeds choose occupants and dimensions within each plan. Land clipping and the coast connector remain geographic; building art does not rotate to follow them. New directional art would be required before reintroducing rotated buildings.

## Block filling and harbor kit

The owner requested filled city blocks with appropriately sized sprites and removal of the circular plaza. Layout v4 partitions template coordinates into rectangular parcels, reserves street clearance, then subdivides usable parcels into building lots. Buildings occupy most of their lot; larger lots favor industrial buildings in relevant archetypes. Land clipping and oriented road collision checks reject invalid lots. The old circular ground stamp is removed. A six-piece harbor atlas supplies warehouse, harbor office, crane, cargo, pier, and quay art. Only the flat pier and quay rotate; building art retains its authored view. This remains cosmetic and compatible with existing campaigns.
