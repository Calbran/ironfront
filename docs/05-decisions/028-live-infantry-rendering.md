# 028 — Live infantry rendering

Date: 2026-09-10. Status: implemented presentation slice; whole-game crowd capacity unvalidated.

The approved 348-triangle infantry model now renders over the live campaign map. The implementation bundles the same Three.js version used by the prototype, lazily loads the renderer at readable detail, and bakes shared walk/aim/recoil poses. Instanced body parts avoid per-soldier rig traversal. Lightweight contact shadows replace the prototype's directional shadow-map pass.

A transparent canvas follows the Pixi camera and does not receive pointer events. Pixi retains squad picking, health indicators, order previews, projectiles and vehicle glyphs. Friendly and opposing coats match the prototype's two palettes; this is not a separate faction-uniform system. Infantry and garrison squads receive models; artillery and vehicle rendering are retained.

## Authority and visibility

Only the campaign's tactical snapshot and existing interpolated member positions drive location, direction and movement. There are no staged routes or independently simulated battles in this layer. Firing/recoil uses the existing shot timing. Server ownership, fog-of-war filtering, combat and movement rules remain authoritative.

The viewport excludes offscreen squads from individual member animation, retaining inexpensive center tracking for orders and targeting. Per-soldier viewport checks pack only visible instances, with padding to avoid popping at edges. At overview, strategy view or insufficient projected model height, models are hidden and existing formation/army indicators remain. Hidden-page work is suspended by the squad layer. World geometry and server simulation are not culled.

The renderer is disposed with the map, including instance buffers, geometries, materials and canvas. WebGL startup/context failure returns to the existing glyph representation. Reloading the map can recreate the renderer. It uses the squad layer's existing approximately 30 Hz visual update cadence, so prototype 60 FPS numbers must not be presented as live-game results.

## Verification and limits

Tests cover model triangle count, finite articulated poses, viewport/LOD boundaries, and offscreen animation omission with re-entry. Live checks cover selection, authoritative move status, viewport culling and strategy view. Existing campaigns receive the presentation on reload; no new campaign or save migration is required.

The live model is intentionally small relative to buildings and vehicles. Zoom in to inspect soldiers. A large mixed-arms live-map benchmark remains necessary before promising a production visible-unit budget. Buildings and terrain do not depth-occlude this separate overlay, and the simple contact shadows are cosmetic.
