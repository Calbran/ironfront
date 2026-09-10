# Faction model proof batch — 2026-09-10

Added the three approved provisional faction signatures plus engineers to the existing military kit and preview. The heavy landship has a larger purpose-built hull with side guns; Guards retain the original body geometry under blue uniforms and armor; the gunship has a compact twin-turbine silhouette; engineers carry tools instead of rifles. All use existing model coordinates, with the documented 0.55 city transform reserved for integration.

Verification: all ten models rendered and exported in Chromium, desktop/mobile controls and error checks passed, and exported GLB metadata retained scale/model identity. Visually reviewed all four new perspective screenshots. Model invariants check shared body scale, member counts, faction metadata, named turret/turbine nodes, finite transforms and triangle budgets. Typecheck, model tests and build passed; the existing build-size advisory remains. No live game rules or active city generator code changed.
