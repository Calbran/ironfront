# Victorian city variety and refined surfaces

User requested more Victorian/steampunk architecture, less repeated appearance, refined generated-world ground/scenery in city studies, and an airship for review.

Implemented seven shared procedural models: commercialTowerGothic, commercialTowerObservatory, commercialTowerExchange, urbanBayTerrace, urbanDutchGable, urbanGlassArcade and warehouseSawtooth. City presentation selects alternatives deterministically inside the original lot envelope; layout and tactical footprints stay attached to the original plan. Facade tints vary by placement. Small stone/grass clusters use tree anchors with street, river and building clearance; tall trees preserve the original canopy width. The refined terrain grain is now a shared resource used by generatedLandscape and city ground, paths, soil and planting. Existing tree materials and kit batching are reused.

The patrol airship reuses createMilitaryModel at the city infantry transform (0.55), cruises in an ellipse above the highest rendered mesh and animates its propellers. Airship camera holds the craft in place for inspection; selecting a city camera resumes flight. Generation and disposal release its resources.

Validation: typecheck and production build passed, with the existing large-chunk warning. A geometry audit checked all seven model bounds against cityBuildingEnvelope, ensured distant variants exist and checked seeded tower diversity. Full-city seed 732 was inspected at skyline, capital and airship views; winter and dusk were exercised. No new simulation rules, campaign mutations or production performance claims. This pass transfers the surface treatment into the city studies; arbitrary-world terrain-first city rollout remains on the roadmap.

Suggested future art priorities (proposals): tram stops and civic transit shelters; hanging trade signs and shop awnings; district-specific rooftop tanks, service pipework and industrial gantries; delivery carts and a small civilian population after animation/culling budgets are measured.
