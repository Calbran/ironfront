# Shared tactical presentation — 2026-09-11

User reported missing city battle audio, gunshot effects and tank animation in the country slice, plus choppy running. Requested a project-wide standard to stop repeated implementation.

Root cause: country rendering used a separate full-distance firing-line effect, separate tank recoil, only one friendly tank's tread controller, snapshot-timed fire animation, and immediate soldier hiding on death. Physical infantry motion was shared but the client sampled its 50 ms steps directly and corrected only the aggregate squad position. Country shell arrivals applied damage without emitting an impact event.

Extracted the city implementation into the common tactical presentation owner, infantry animation/clips, effects and tank animation modules. Both city and country now consume it. Country adapters flatten soldiers, interpolate each member's correction, project only the leftover movement fraction in disposable state, supply terrain heights for sound, and retain corpses. Both tank teams receive independent tread controllers. Country authority emits bounded, persisted shell-impact events and supplies aim angle for moving upper-body aim.

Animation authoring now uses the same run-cycle data, tank tread implementation/recoil envelope, rifle/armor effects and audio; its timeline remains a test input. Preserved specialized weapon model attachments. Shared feedback clears on reset, suppresses snapshot replay and respects pause/hidden/disposal.

Added shared-system standards with a capability ownership map, required consumer audit, explicit contracts, adapter-level acceptance tests, preview inventory and known legacy gaps. Added a mandatory AGENTS entry and documentation index link. This is a workflow rule across systems, not a claim that campaign ownership/visibility has been consolidated already.

Validation results are appended after browser and full regression checks.

Validation: the full regression suite passed 309/309 tests. Typecheck and production build passed after final adapter/format changes (build retains the large-chunk advisory). Browser checks confirmed the country Sound control, playable encounter and retained fallen squad bodies; city battle initializes, starts and enables shared audio; animation authoring renders and advances with no reported runtime errors. A transient React duplicate-root warning appeared during hot reload in the city tab; a full reload produced no new warning. Sound quality and performance ceilings still require listening/measurement, not inferred from these checks.

Final affected-module rerun passed 16/16 tests after the cover/reload metadata changes. Git diff whitespace checks passed. Country encounter browser test ended in defeat; the persisted test encounter remains stopped at normal pace.

Fixed country movement bouncing: render projection now includes the encounter movement accumulator, converted from simulation seconds at the selected pace. Regression crosses irregular snapshot arrivals for infantry and tanks at 1x and 20x; finished encounters do not extrapolate. Focused presentation tests, typecheck and build pass. Browser loaded the change; saved encounter was already finished, so live movement visual verification remains pending.

Restored shared infantry idle presentation: breathing remains active while aimed or covered, relaxed soldiers retain individual weight-shift timing, and a separate cosmetic clock keeps idle movement alive while combat is paused. Movement suppresses idle sway; death/recoil keep their combat clock. City and country use the same implementation. Nine focused checks, typecheck and build pass; country page loads without runtime errors.

Country encounter recovery: finished battles now offer Restart encounter, rebuilding full squads and clearing prior combat state. Active battles reject redeployment. Run is disabled after victory/defeat and server commands explain that restart is required. Browser verified restart from saved defeat, fresh 6/6 squads, accepted move order and visible infantry movement; left paused at 1x. Focused encounter checks 6/6, typecheck and build pass.

Encounter recovery final regression: 312/312 tests passed. Full browser restart and movement verified; test encounter left paused at normal pace.
