# Manual strategy toggle — 2026-09-09

Replaced the automatic zoom threshold with a Strategy view button beside zoom controls, defaulting to terrain. Mode drives terrain, scenery, tactical graphics, and box selection consistently; view switches preserve camera and selection. Async terrain loading respects the chosen mode.

Typecheck and production build passed. Browser regression verifies accessible toggle state, identical camera coordinates and scale before/after toggles, mode retention through zoom and Fit, and no runtime errors or horizontal overflow. Desktop strategy rendering visually reviewed.
