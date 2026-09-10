# Terrain, settlements, and world space — 2026-09-09

Implemented decision 017: v6 coordinate expansion without more territories, capital-centered opening camera, continuous biome paint clipped to the smoothed land mesh, forest/mountain symbols, readable labels, and clickable building clusters. The compact HUD supports an authoritative Garrison order with physical-arrival cover and persisted assignment. Existing campaigns retain geography; city ownership follows its territory.

Validation: typecheck, all 15 test files, and production build passed. Desktop 1440px and phone 390px browser checks verify preview/campaign geography equality, dimensions/counts, zoom/Fit, settlement selection retaining squads, successful Garrison requests, and no browser errors. Core/API tests cover arrival, serialization, ownership loss, cancellation, secrecy, authentication, and atomic mixed-group rejection. Numerical balance remains provisional.
