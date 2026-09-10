# Urban kit continuation — 2026-09-10

Pulled main fast-forward from 552cf8e to 0adb6aa with a clean checkout. Read current state and the miniature-city roadmap; continued stage 1 in the bounded city study. Added corner shops, tenements and warehouses, shared nominal body dimensions, reserved commercial corner placement, and seed/partial-budget/constant-scale regressions. The browser runner now accepts portable environment overrides. No campaign rules changed.

Validation: npm run typecheck, all 32 test files, npm run build and git diff --check passed. City browser checks covered 128/256/512/1024 buildings, camera presets, winter and 390px layout without errors or horizontal overflow. Reviewed city/street and winter phone captures under `.impeccable/review/city-diorama/`. Dev server remains on 127.0.0.1:5173; city study is `/city-diorama.html`.

Performance evidence: `docs/prototypes/urban-kit-results-2026-09-10.json`. This Linux headless Chromium run measured p95 131–402ms across ordinary samples, 79–106 draw calls. It ran alongside validation jobs for part of the sample; GPU backend/hardware equivalence to historical Mac results was not established. These are diagnostic measurements, not accepted production budgets or a controlled before/after comparison. Multi-city LOD and performance remain open roadmap work. Earlier reports were preserved.

Next: review the new kit at unit scale, then complete full footprint/roof attachment envelopes, larger mill and service assets and LODs before proceeding to irregular block composition. Stage 1 is not declared complete.
