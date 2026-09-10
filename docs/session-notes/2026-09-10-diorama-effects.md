# Visible diorama smoke and lighting

The user could not see previously documented effects. Inspection confirmed that smoke used tiny 15%-opacity polyhedra on factories only, and windows/lamps were emissive materials without illumination of other surfaces. The previous description did not imply bloom or actual local lighting.

Implemented soft radial-texture billboards at correctly transformed chimney outlets, capped at 12 emitters and six puffs per emitter. Factories take priority, followed by selected urban chimneys. Replaced the old incorrect rotated factory offset. Added three actual non-shadow-casting point lights at civic lamps and a Dusk lighting toggle. Daylight remains the default. No gameplay or campaign changes.

Typecheck, build and diff checks passed. Browser runner verified effect counts and dusk state, captured city/depot/street/dusk/winter/phone views, regenerated 128–1024 buildings and completed without browser errors or overflow. Reviewed smoke in the depot view and actual pools of light in dusk. Screenshots: `.impeccable/review/city-effects/`.

Results: `docs/prototypes/city-effects-results-2026-09-10.json`. Same local headless Linux setup as the urban-kit run; short diagnostic samples, not hardware certification or isolated GPU timing. Rendering remains slow in this environment. Smoke remains one instanced draw, light count stays three; more lights/bloom are not approved production defaults.
