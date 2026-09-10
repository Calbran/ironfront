# Port eligibility — 2026-09-09

The owner identified an inland port marker in campaign 1886A31B. Inspection showed Wolfswick at `(7428, 1764)`, about 548 world units from its nearest coastline. Neighboring settlements had constrained its actual city-layout radius to about 194 units, and its generated port layout contained zero docks. The prior classifier used only a loose size-rank distance of 667 units for a metropolis, so it could label a city as a port even when its built footprint did not approach the shore.

Port eligibility now uses the settlement's actual constrained layout radius and requires a traversable connector to the coast plus at least one dock with a land endpoint on land and its outer endpoint in water. Settlements that fail either check continue through the existing riverside, terrain, industrial, or market selection. Wolfswick now resolves deterministically as riverside with zero docks. Saved settlement coordinates and geography are unchanged; existing campaigns receive the visual correction on refresh.

Validation: typecheck and the city-layout regression pass. Coverage includes a nearby working port, distant-coast rejection, legal dock endpoints, and the invariant that every layout classified as a port has at least one dock.
