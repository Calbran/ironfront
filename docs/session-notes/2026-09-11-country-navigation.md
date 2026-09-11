# Country navigation

The physical scale made world-sized markers practically invisible. Added a fixed-pixel HTML overlay projected from the 3D location anchors, with accessible clickable names, resource initials, player base labels and a military-reference marker. Regional-city names get first priority in a bounded screen-space label layout. Other colliding labels hide but remain available on hover/keyboard focus and in the focus selector. Behind-camera/outside-frustum markers are hidden. Overlay is disposed with the scene.

Wheel zoom now targets the cursor, with speed 5 at country distances and 1.5 near detail. Explicit 4× zoom buttons clamp to orbit distance limits; Fit country and click-to-focus provide fast jumps. Geometry scale, strategic calculations and live campaign behavior are unchanged. TypeScript check passes; this is a presentation-only change.
