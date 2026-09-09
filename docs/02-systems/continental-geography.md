# Continental geography

**Accepted direction:** Ironfront uses a continent with many territories, forests and plains, and impassable mountain regions that nobody can own. Victory remains land ownership, without weighted objectives.

## Implemented

New campaigns generate a 2,400 × 1,600 world with 72 territories for 2–3 seats, 96 for four seats, then 24 per seat up to 192. Territories form contiguous named provinces. Provinces organize the map visually; they confer no scoring or economic bonus.

A seeded land field creates peninsulas, bays, inland sea shores, and a connected playable mainland. Offshore islands are decorative in this proof. There is no naval movement or island conquest. Territory borders follow a shared raster partition, with reciprocal adjacency. Equal starting territory counts do not guarantee equal area or equally favorable geography.

Correlated elevation and moisture create broad plains, forests, highlands and mountain ranges. Mountains are unowned, have no garrison or buildings, and cannot be built on, entered, supplied through, or captured. They are excluded from the victory denominator. Mountain placement preserves a connected traversable mainland, leaving highland passes through ranges. Forest and highland modifiers follow the military rules; plains are the baseline. Rivers are visual features, with no crossing penalty yet.

The client draws procedural shaded terrain beneath translucent ownership colors. At continent scale, province names and national boundaries lead. Zoom reveals local territory boundaries and names. Mouse-wheel zoom anchors beneath the cursor, dragging pans, and Fit restores the continent overview. Selection and military context remain in the left panel.

## Persistence and scope

Existing campaigns retain their saved geography. Create a new campaign to use this generator; the server does not rewrite saved maps. The approved product name is Ironfront. The existing SQLite filename, Docker volume, and browser storage keys retain their previous identifiers to preserve saves and sessions.

Generation, mountain routing, scoring exclusions, deterministic seeds, reciprocal adjacency and connected traversable land have automated coverage. The larger map's starting economy, travel times and month-long pacing still need playtesting. Visual rivers, province groups, and decorative islands are not additional simulation systems.

## Density and camera revision

Following playtest feedback, the four-player default is 96 territories (75% fewer than the first continental generator) and eight provinces. Zoom spans 35–600%, with Fit at 100%. Territory borders stay visible at overview; local labels still emerge on approach. Shared boundaries are gently smoothed while retaining their junctions. Zoom gestures reuse the existing scene and defer detail refresh until 180ms after input stops. Static bounds and territory contours are cached per campaign. Saved campaigns keep their territory graph; the UI identifies original coarse saves and explains how to create a current map.
