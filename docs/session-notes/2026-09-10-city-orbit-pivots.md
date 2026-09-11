# Visible-surface camera pivots

User requested more natural camera pivots after noticing apparent pullback when moving from overhead to low viewing angles. Middle-drag previously intersected only the ground, even when a building was under the cursor.

The new picker uses the nearest visible opaque mesh surface, including instanced buildings. Invisible LODs and ancestors, transparent effects and non-depth-writing overlays cannot steal the pivot. Empty sky uses a camera-facing plane through the current target. Picking occurs once at drag start. The existing rigid rotation of camera and target retains the clicked point on screen without changing zoom or camera-target distance. Right-drag unit orders continue to pick terrain. Projection remains orthographic; this change does not eliminate ordinary foreshortening.

Two regression tests cover roof picking through hidden/translucent foreground geometry, instancing, empty-space fallback, screen-anchor stability through pitch/yaw and unchanged zoom/distance. TypeScript and production build pass; live preview startup verified. Automated browser middle-drag was not exercised with the available browser controls; rotation and picking are covered by the geometry tests.
