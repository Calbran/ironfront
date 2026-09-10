# 034 — Urban kit footprint contract

## Accepted direction

Continue the miniature city roadmap from the pulled Three.js experiment. Stage 1 establishes compatible urban assets at consistent unit scale before broader city generation.

## Implemented in the study

Corner shops use wrapped side windows and cornices, tenements add rear balconies and grouped chimneys, and warehouses use loading doors and a raised roof monitor. Commercial block ends reserve corner variants; seeded interior construction remains. Warehouses alternate with factories within industrial lots. Instances still share geometry/materials.

`cityBuildingKit.ts` supplies nominal body dimensions for placement checks and the new model bodies. It also describes local street/service entrance anchors for future planner integration; those anchors do not yet drive routing. Existing conservative clearance padding remains. Exact budgets, repeat-seed results, partial blocks and fixed model scale have regression coverage.

## Provisional and remaining

This is the first stage-1 asset pass. Nominal rectangles are not complete foundation/roof attachment envelopes. Dedicated service structures, larger mills, irregular blocks, LODs and terrain-first rollout remain open. Art tuning is subject to review. No building entry, cover, collision, construction or capital-capture mechanic is introduced.
