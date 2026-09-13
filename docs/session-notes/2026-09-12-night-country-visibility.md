# Night country visibility — 2026-09-12

Country lighting mode is now saved in the sector state and submitted through the authenticated command route. The fixed Day and Night review modes and the automatic 20-minute cycle use the same daylight function as rendering.

Server response filtering and encounter acquisition pass that daylight value into the existing distance, forest concealment and terrain/building exposure checks. Fixed night applies a provisional 0.45 multiplier to every observer's nominal range. Selected-unit cyan rings and range labels use the same adjusted values.

Enemy groups remain group contacts: detecting any living member reveals the sanitized group. Marker collision avoidance can displace its badge from the detected member's actual position, so the badge itself is not a range measurement.

Validation: nine country-encounter tests and nine sector tests pass, including day/night airship boundary filtering and persistence of the Night command. Typecheck and production build pass. Browser review confirmed that fixed Night persists through the API and changes the scout airship label from 1.8 km to 818 m.
