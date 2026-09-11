# City planning camera

Date: 2026-09-10
Status: Implemented; control mapping and floor-only anchoring accepted by the owner.

Use orthographic projection for city planning to keep building scale consistent. Default elevation is 55 degrees, constrained to 40–75 degrees during normal orbit. Overview resets framing; Neighborhood moves closer; Overhead explicitly permits a near-vertical view. Street view remains perspective with a 36-degree field of view.

WASD pans. Middle-drag changes heading and tilt about the floor point under the initial cursor position; buildings must never supply the pivot. The anchor stays fixed during the drag. If the terrain ray misses, project the current focus onto terrain. Alt + middle-drag pans horizontally. Q/E rotates about terrain beneath the current focus. Scroll down zooms in, preserving the cursor's floor position in planning view. Right-click and right-drag retain unit orders and facing.

Validation: ten focused camera regression tests, typecheck and production build pass. The new controller test places a roof above the floor and verifies that the off-center orbit anchor remains at floor height and retains its screen position. Browser review confirms the view presets and control hints.
