# 013 — Continuous squad routes across regions

Date: 2026-09-09

## Accepted direction

The owner wants the same precise squad movement across regional borders, replacing army movement orders as the primary player control. Squads remain individually selectable, with groups as shortcuts for mass orders. This supersedes the within-region restriction in decision 012.

## Implemented

Move and queued waypoints route through connected non-mountain territories. Each region leg uses land-tested local routing; shared boundary edges provide continuous crossings. Squads keep their identities, exact positions and persisted routes after crossing. Water and disconnected routes reject atomically. Up to 32 squads and eight pending waypoints retain the existing command limits.

Multi-squad Move orders resolve deterministic formation lanes around each commanded waypoint. Slots run across the direction of travel, with mobile and armored squads sorted toward an outer lane so mixed groups travel beside infantry instead of sharing its center. Spacing scales within a bounded world-space range. Slots shrink toward the clicked point when coastlines, holes, or narrow terrain do not fit them; an individually unreachable slot falls back to the original valid destination. Single-squad orders remain exact.

The first direct order retires that group's strategic travel/cover plan. Unselected siblings hold their current positions; selected squads follow their own routes. Existing army counters and box selections are group selection shortcuts: right-click now issues the same squad route command. The panel exposes individual selection, Select whole group, Move, Hold and waypoints. Legacy advance/redeploy/reserve/sector buttons are removed; group information retains supply, withdrawal risk and air support. The legacy API remains for bots and saved strategic orders. An explicit legacy API order still restores legacy group behavior.

Hostile entry creates a server-resolved engagement at the squad's actual region. Capture requires surviving non-retreating invaders of one owner and no surviving defenders. Headquarters and siblings are not moved or counted as present by a direct capture. A hostile region cannot be used to advance into further hostile land before securing it; returning toward friendly land remains possible. Captures consolidate for six campaign hours before another hostile border crossing. This is territorial capture, not a separate settlement-control mechanic.

Direct squads below their group's percentage risk threshold or low morale attempt a continuous route to adjacent friendly land. Without a traversable fallback they fight on. Group reserves remain shared; replenishment requires every surviving squad to be on connected supply. Isolated squads take attrition at empty reserves. Only living, stationary squads on connected friendly supply outside active engagements replenish strength. Losing the old headquarters does not teleport or surrender squads elsewhere.

## Provisional tuning and limits

Speeds, formation spacing, six-hour consolidation, percentage withdrawal thresholds and shared logistics need playtesting. Routing follows polygon land geometry, not road costs, building footprints, facing or line of sight. Border routing chooses a shortest region corridor, so squads may temporarily close up at a narrow shared gateway; pathological narrow legacy corridors can reject rather than cross water. Formation lanes separate destinations and approaches but are not a full local collision or obstacle-avoidance simulation. Army organization/recruitment, bot orders and older campaign strategic orders still exist internally. Automatic combat fires within range; a manually ordered squad does not chase a distant defender automatically.

## Verification

Regression tests cover bounded crossing speed, independent siblings, restoration from serialized state, old-HQ loss, contested entry, capture/consolidation and mountain rejection. Generated-map testing routes across every traversable adjacent border in a fixture. Existing local-order tests cover authentication, atomic rejection, SQLite reopen, distinct group destinations, and the vehicle outer-lane rule. The isolated browser fixture checks cross-region coordinates, queued return routes, Hold, pointer placement and Shift-right-click at desktop and phone widths.
