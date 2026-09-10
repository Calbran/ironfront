# Local squad orders — 2026-09-09

Implemented the authorized first pass of direct within-region squad positioning. Server-side path validation checks polygon boundary crossings and uses an eight-unit land grid around concave boundaries/holes. Group commands validate completely before mutation. Optional saved local orders preserve compatibility with existing squads. Waypoints and mode survive reopen; player projections strip hostile route data.

Tactical substeps move manual squads along paths and hold them at their destinations. Automatic local pursuit and formation attraction do not override these orders; strategic army movement and retreat still take precedence. New army commands clear local plans. No new directional damage, building collision, line-of-sight or capture rules.

The map supports individual/Shift squad selection, right-click movement, Shift-right-click append, and confirmed path drawing. Command-panel checkboxes, coordinate inputs and tap-placement provide alternate access. Placement now wins over overlapping unit selection; sequential map commands are queued while earlier ones save. Existing army group controls remain.

Core validation: typecheck, ten test files and production build passed. New tests cover water/concavity, speed-bounded path following, exact Hold, waypoint completion, army overrides, atomic group rejection, ownership, route secrecy, campaign completion and restart continuation. Existing chunk-size advisory remains. Browser checks use scripts/local-movement-browser.ts with an isolated in-memory campaign.

Desktop (1440px) and phone (390px) checks passed for roster selection, Move, appended waypoints, Hold, map tap placement and Shift-right-click; final route screenshots inspected, with no page errors or horizontal overflow. Placement uses the same native pointer handler over terrain and unit marks to avoid overlapping-target selection. Server authority and existing local tactical pacing remain unchanged.

### Cross-region follow-up

Owner replaced the local-only restriction with continuous squad routes and group shortcuts. Implemented physical border routing, direct combat/capture, consolidation, routed withdrawal and position-aware recovery. Removed primary legacy movement/sector controls. Tests cover continuous crossings, unchanged siblings, restored routes, old-HQ loss, defended/undefended entry and generated borders. Decision 013 records remaining abstractions and provisional tuning.

Verification completed: `npm run typecheck`, all 11 test files and `npm run build` pass. The updated isolated browser fixture passes at 1440px and 390px for cross-region movement, queued return route, Hold, placement, Shift-right-click and whole-group selection/orders; no page errors or horizontal overflow. The group assertion excludes destroyed squads, which correctly cannot be selected. Production build retains the existing bundle-size advisory.
