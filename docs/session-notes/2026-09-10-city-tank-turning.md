# City tank turning

Replaced the vehicle branch's heading interpolation and route-directed translation with a bounded track pivot, then forward acceleration. The renderer now uses moving tread links and independent signed belt travel. Tests exercise opposing belt motion, turn-rate bounds, absence of sideways movement, route clearance, arrival and stopped belts. The study still uses conservative circular navigation clearance; hull-orientation collision and campaign integration remain separate.

Validation: typecheck, all 44 test files and build passed. The focused city-tank browser check passed a road reversal with opposing track motion and no lateral movement. The broader existing city-units browser script failed its separate infantry arrival-coordinate assertion during concurrent city-control work; it is not reported as passing. Destination-facing orders also use the bounded pivot after arrival.
