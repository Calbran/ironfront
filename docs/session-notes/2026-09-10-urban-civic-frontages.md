# Urban civic frontages and steam utilities — 2026-09-10

Removed all authored home/shop lots from full-city generation and replaced the oversized civic surround with three fitted frontage parcels around the actual town hall square. Existing authored studies retain their original layouts. Added a regression invariant prohibiting those old town variants in full-city mode while preserving the hall's actual street-bounded reserve.

Bridge decks now use the road material and arched center markings while retaining structural sides. Added shared instanced manhole, valve and vent models. Covers avoid water, intersections and parked cars; up to eight use short steam plumes in the existing camera-facing particle mesh. Seed 732 renders 858 buildings including the hall, 24 covers, eight street steam sources, and 120 total particles including building smoke.

Validation: typecheck and standard/public builds passed; all 41 test files and 96 seed audits passed. Results: docs/prototypes/civic-frontages-audit-2026-09-10.json. Asset envelope and detail-reduction checks passed for all new models. Public browser checks returned no page errors, verified the absence of old town buildings, counted manholes and ground steam, and exercised camera rotation/WASD. Inspected the close civic render under .impeccable/review/final-city. Refreshed https://brutus.tail250251.ts.net/ with the city-only build.

The assets remain visual: no authoritative cover, navigation obstacles or construction mechanics changed.
