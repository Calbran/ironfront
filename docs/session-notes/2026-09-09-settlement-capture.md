# Settlement capture — 2026-09-09

Implemented player-directed city occupation. Selected living ground squads can right-click a non-friendly settlement, choose Capture, travel through the existing authoritative route system, and change the city's persistent owner after uncontested arrival. Capturing squads remain assigned to the city as a garrison. City symbols and hover text now show the city controller independently of the region.

This does not change territory control or land-based victory. Automated tests cover arrival, contesting, persistence and API authorization; typecheck, full tests, production build and browser interaction were run for the change.
