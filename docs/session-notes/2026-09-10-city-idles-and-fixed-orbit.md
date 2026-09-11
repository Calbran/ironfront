# Fixed orbit and idle soldiers

User requested removal of building-anchored orbit and addition of small idle animations. Middle-drag now clones the camera target rather than raycasting scene geometry. Right-drag command placement retains terrain picking but does not set the remembered orbit anchor. Help text updated. The old surface-picking helper remains unused by the active controller.

Relaxed infantry use per-unit phased breathing (0.6% vertical-scale amplitude) and sway (0.009 radians), with no new meshes or draw calls. Running, aiming and cover take priority. This is a minimal procedural idle, not an authored skeletal animation with foot IK or head turns. Camera regression plus idle tests: seven pass; typecheck and build pass (existing chunk-size warning). Browser reload confirms the updated UI and running preview; animation feel still needs user review.
