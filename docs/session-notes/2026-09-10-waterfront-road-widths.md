# Waterfront road widths

Fixed the rendering order that deformed entire road cross sections with the river. Centerlines now move first, followed by road ribbons, end caps and joined curb/sidewalk geometry in transformed coordinates. Inverse terrain sampling keeps those surfaces at their intended heights without applying the bend twice.

Validation: typecheck, production build, street-edge regression tests and browser gallery/close waterfront checks. Close capture: `.impeccable/review/waterfront-roads/waterfront.png`.

Close visual review also exposed repeated square caps on curve segments. Adjacent segments now share mitered cross sections, removing the small curb steps. A curved-strip perimeter regression test covers this case.

Follow-up: connected endpoint caps now stop inside the receiving road footprint, eliminating angled-junction ears. Acute curb miters are capped at 1.5 times the offset. Regression tests cover diagonal T joins and corner extension; close browser review verifies the result.
