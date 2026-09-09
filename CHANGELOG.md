# Changelog

## 2026-09-09 — Full-screen map and mouse camera

Expanded the campaign map to the whole viewport with a 200% initial view, cursor-anchored mouse-wheel zoom, all-scale drag panning, and Fit reset. Consolidated campaign information, selected-region orders, reports, and session details into one collapsible left panel. Capped label/counter screen sizes and increased text raster resolution for crisp zooming. Added a browser camera interaction check.

## 2026-09-09 — First documented playable proof

Established vision, blueprint, factions, executable rule notes, architecture, hosting instructions, milestone roadmap, and two decision records. Implemented a persistent server-authoritative browser campaign with generated land, faction selection, claimable automated nations, construction, standing army orders, combat, abstract air support, and land-area victory. Added automated rules/persistence/authorization tests and verified desktop/mobile multiplayer flow. SQLite is the local proof adapter; PostgreSQL and public-launch accounts remain future work.

## 2026-09-09 — Armies and coherent fronts

- Added line, assault, and mobile army presets with meaningful infantry/motorized/artillery/armor composition; automatic sector defense and traveling reserves.
- Added persistent legal offensive corridors, friendly redeployment, capture consolidation, connected depot relays, finite army supplies, risk policies, and legal fallback retreats. Removed distant relocation.
- Added save upgrades preserving existing campaigns and sessions, authoritative API validation, army command controls, route previews, and military invariant/restart tests. Numerical values remain provisional.

## 2026-09-09 — Ironfront continental geography

Renamed the product Ironfront. Added 384–768 territory continents with named provinces, irregular coasts, inland seas, decorative islands, rivers and continuous forest/plain/mountain relief. Impassable mountains remain unowned and outside conquest scoring. Added geography invariants and desktop/mobile browser checks. Kept saved maps and session identifiers compatible; new campaigns opt into the new generator.

## 2026-09-09 — Density and zoom correction

Reduced continental density by75% to72–192 territories (96 with four players), with two provinces per seat. Extended zoom-out to35%, made territory boundaries visible at overview, smoothed shared boundaries, and corrected old-map polygon fills. Cached geometry and deferred detail refresh during zoom gestures. Added an original-map notice and session/lobby guidance without rewriting saves.
