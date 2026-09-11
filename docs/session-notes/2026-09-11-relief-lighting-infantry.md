# Relief, lighting and shared infantry movement

Corrected the missing shared infantry movement stage: cityUnitTrial and country commands now call variedMovementRoute, which removes lattice steps and applies deterministic collision-checked offsets. Country units persist separate guides, trim guides at reached anchors and retain exact final positions. Adaptive sampling and separate guide/derived-path limits bound long-country-route work. Simulation still owns actual paths.

Added gentle actual terrain relief, clearances around settlements and transitions beside rivers. Geometry version 8 uses the existing safe migration. Lower ambient lighting, moving daylight/moonlight, near terrain shadows, atmospheric haze, non-periodic surface noise and overview color/mesh simplification address the flat/bright/repetitive appearance. The Light selector defaults to a 20-minute wall-clock visual cycle, with fixed Day and Night choices. This does not change simulation time, visibility or combat rules.

Focused checks passed for exact infantry endpoints, deterministic deviations, narrow-corridor fallback and bounded long routes. All eight sector tests passed after updating the old flat-height and single-waypoint expectations. Browser verified the lighting selector and night rendering without shader errors. Final full-suite results are recorded in PROJECT_STATE.md.

Final validation: 293 tests passed, with no failures or cancellations; typecheck/build passed. Daytime bridge and nighttime city views were inspected. The temporary review tab was closed after verification.
