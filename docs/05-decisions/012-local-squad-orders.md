# 012 — Direct local squad orders

Date: 2026-09-09

## Accepted direction

The owner authorized the proposed first pass of precise squad movement, waypoint routes and Hold positions inside a region, using the existing persistent squads. Strategic army travel remains responsible for crossing regions. Directional weapons, detailed cover/line of sight and cross-region flanking remain subsequent design work.

## Implemented

Own living squads can receive an authenticated `squad-order` with Move or Hold. A group of up to 32 distinct squads validates atomically; each move has up to eight queued user waypoints. Direct paths are checked against all territory boundary rings, including holes. If blocked, an eight-unit land grid finds a route through cardinal neighbors, then removes redundant bends using boundary-tested line segments. Invalid water, mountain, foreign-region and unreachable destinations reject the whole command without altering orders.

The server persists local mode, region, user waypoints and remaining path on each squad. Tactical substeps spend a finite movement distance along the path; arrival switches to Hold. Manually positioned squads do not participate in automatic formation attraction/separation or chase out-of-range enemies, but still exchange fire within range. Their displayed members retain cosmetic spacing and the calmer movement interpolation. Manual movement is not a new attack-move mode or a directional flank bonus.

New army movement/Hold/sector/cover orders replace local orders. Region relocation, strategic travel after an engagement and emergency retreat/recovery clear them. Army air-support and risk-policy changes preserve them. A travelling army must Hold before local placement unless its squads are already in an active engagement. Group members must each be able to reach the requested point inside their own current region. Enemy local routes are removed from player projections.

## Interface

At detail zoom, clicking an own squad selects it; Shift-click adds another. Army-level counters and box selection retain army behavior. The Command panel lists individual squads with checkboxes and provides Hold, Choose position on map, and coordinate-based Move/Add waypoint controls for keyboard access. Right-click with squads selected moves locally; Shift-right-click appends a waypoint. Touch users can activate placement and tap land. The selected squad's confirmed remaining route and waypoint markers are drawn on the map. Explicit army selection/deselection clears squad targeting.

## Limits and tuning

Movement speed reuses tactical role/suppression scaling; exact values remain provisional. Local routing follows region land geometry, not building footprints or forest/road costs. Rivers without coastline holes remain traversable. Cover still uses the existing army-level cover assignment; this change does not create sandbags, directional weapons, or line of sight. Shared destinations can overlap server squad centers; visual member spacing is non-authoritative. Cross-region travel and regional capture remain army abstractions. Very narrow non-raster legacy corridors may reject local routing rather than cross water. The former city-capture limitation is superseded by [decision 022](022-settlement-capture.md).

## Verification

Tests cover lake/concave-boundary routing, bounded motion, waypoint completion, exact Hold, army override, atomic validation, ownership, route secrecy, ended campaigns, persistence and deterministic continuation after reopen. Browser checks use an isolated in-memory campaign; no user campaign is created or changed.
