# 022 — Physical settlement capture

Date: 2026-09-09

## Accepted direction

A player can select eligible units, right-click a city, and choose **Capture**. The city's icon changes to the controlling nation's color when occupation succeeds.

## Implemented

Settlement control is authoritative, persistent, and separate from region ownership. New campaigns record an initial controller for every settlement; legacy saves without that field inherit the surrounding region's owner until the city is explicitly captured.

Living player-owned ground squads other than generated garrisons are eligible. A capture order uses the existing validated local/cross-region movement system. Issuing an order does not change control: at least one ordered squad must physically enter the city's 24-unit occupation radius. Any living hostile or neutral squad in that radius contests the city and prevents capture. On success, all squads in that capture order switch to a city-garrison assignment and a public combat dispatch records the change.

The tactical map displays controlled city symbols in the owning nation's color and neutral cities in charcoal. Hover text identifies the controller. With an eligible squad selected, right-clicking a hostile or uncontrolled city opens a short Capture/Cancel context menu. Ordinary right-click movement remains unchanged away from a city.

## Boundaries

City control does not transfer the surrounding territory, change land-area victory scoring, or introduce weighted key-zone scoring. Region conquest remains governed by the existing force and consolidation rules. Capture radius and defender thresholds are provisional tuning values.

## Verification

Core coverage verifies delayed physical capture, hostile contesting, persistence, garrison assignment, event reporting, and authenticated API acceptance. Browser verification covers the right-click menu and owner-color refresh.
