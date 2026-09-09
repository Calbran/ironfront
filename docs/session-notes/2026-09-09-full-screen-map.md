# Session: full-screen map and left context panel

## Request

Make regions/map look much larger; add mouse zoom and pan. Follow-up: map must take the whole screen, and all contextual information must occupy one left panel.

## Changes

Full-viewport campaign canvas, 200% opening zoom, 100–600% cursor-anchored wheel zoom, left/middle/right drag, 5px drag threshold, Fit button, preserved camera during polling. Labels/counters stay readable at larger scales. A closable left pane owns Nation, Command, Dispatches, Session, and selected-region information on all viewports. Campaign overview and dispatch floating boxes were consolidated into that pane after review. Lobby remains an overview. No simulation, map-generation, or campaign data changes.

## Verification

Typecheck and production build pass. Desktop/phone create/join/build/order flow passes without page errors or horizontal overflow. Camera smoke passes full viewport bounds, 200% start, cursor anchoring, drag selection suppression, poll persistence, fit reset, all-scale pan, and left context/session. The design detector reported palette/type documentation advisories (including pre-existing Georgia/map colors); no new palette or type direction was introduced.

Independent visual review: **ship — requested map/UI scope**. The requested consolidation fix was scored resolved on updated desktop and phone captures. DESIGN.md and its sidecar reflect the final arrangement.
