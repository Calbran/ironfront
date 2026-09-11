# Expanded countryside and farmland


## Expandable country layouts and farmland references — 2026-09-11

The country gallery now defaults to expanded, irregular farmland. Its size selector offers 14 / 32 / 72 convex crop parcels across 320 / 640 / 1,280 model units. Seeded subdivision, varied crop colors and row orientation follow the aerial farmland references. Grass lanes separate parcels; low hedge obstacles include eight-unit gates. Buildings and cover retain their tactical dimensions. Non-agricultural templates expand by joining one, four, or nine independently seeded modules with connected streets, sharing instanced assets.

Crop surfaces and furrows are clipped to the same parcel polygons, tessellated into non-overlapping color bands, and batched into one geometry/material. This avoids distant depth flicker and per-row draw calls. Gallery collection mode deliberately retains compact templates. Existing calls without a size option retain their previous output, so existing world placement is not silently enlarged.

Boundary: the new 171.6x physical-separation pacing scene still needs terrain streaming and placement integration; these are reusable size presets, not a fully populated enlarged country. No authoritative battle behavior is added here. Largest generation remains bounded rather than unbounded terrain generation.

Validation: expansion tests cover deterministic layouts, unchanged building footprints, clear spine roads, convex non-overlapping parcels, and finite bounded renderer geometry. Browser reviewed estate and district presets. Final full checks recorded in the task response.

Final verification: six focused country tests pass, TypeScript and production build pass. Browser reviewed expanded market blocks and both farmland scales, including the camera-depth fix. The full regression run remained active in port-generation tests after 163 reported passes; no full-suite success is claimed.
