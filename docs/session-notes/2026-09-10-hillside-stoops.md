# Hillside stoop correction

User identified long pale strips along the sloped boulevard. The previous approach placed eight steps all the way to each street center and warped their tops with terrain. Replaced these with rise-dependent short stoops, bounded by road half-width plus clearance and capped at 1.25 units. Near-level doors keep the existing paving. Treads remain level, risers reach the ground, and masonry matches the surrounding paving. This is a presentation correction without generation or gameplay changes.

Validation: typecheck/build and terrain-study browser checks; review captures under .impeccable/review/terrain-district. No new simulation tests were needed for this geometry-only correction.
