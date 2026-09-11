# Country lighting and terrain hatching

Final user tuning: reduce ink strength .55→.45 and underlying slope darkening .10→.08. Line half-width now interpolates .018–.06 based on pixel footprint, giving finer close-up strokes without moving their world-space positions. Distant fading is unchanged.

User visibility follow-up: the original slope thresholds and fine strokes hid most ink on gentle country terrain. Lowered slope thresholds, broadened line spacing to 14/18 units, increased contrast, and separated ink fade (2800–5500 camera distance) from ground-texture LOD. Confirmed visible slope hatching in the live Sector overview without shader errors.

Raised day-only sun and hemisphere contributions; retained night intensity values. Connected the embedded city and shared POI kit's existing dusk/window materials to country time. Added modest two-direction slope hatching based on the current sun vector. Flat terrain remains clean, hatching is world anchored and derivative filtered, and fades with overview detail. No extra textures, meshes or render passes.

Validation: npm run typecheck and npm run build passed (existing bundle-size warning). Browser Day/Night review confirmed illuminated windows, brighter daytime and no shader errors; inspected terrain near the bridge. This pass changes presentation only; no simulation tests rerun. Hatch strength remains subject to visual review.
