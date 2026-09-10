# 005 — Clean terrain and lobby map generation

Date: 2026-09-09

Accepted: Use clean textures for now and allow generating new maps in the lobby. Map seeds should change continent shape.

Implemented: Flat terrain colors replace procedural relief and grain. Editing a valid seed or nation count refreshes the preview; Generate new map chooses a fresh seed. The selected preview uses the same deterministic generator and inputs as campaign creation. Large land masses, orientation, bays, and lake placement vary by seed. Existing campaign geography is preserved.

Provisional: Terrain palette and shape parameters are presentation/generation choices; starting fairness and balance remain unvalidated.

Accepted follow-up: Increasing players must increase world size, not only territory density. Implemented with area proportional to nation count, 24 territories per nation, and lobby dimensions. The four-nation baseline is 2,400 × 1,600.
