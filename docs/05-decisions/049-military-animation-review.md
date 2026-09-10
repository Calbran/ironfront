# Military animation review

## Accepted direction

Include an RPG/anti-tank infantry unit in the military art review. The implemented study is a rocket gunner and rifle escort with a launcher, spare ammunition and reload/launch presentation. Faction assignment and gameplay statistics are provisional and are not implemented by this study.

Low cover is fired over from the protected position; going around cover is reserved for tall walls. Tank shots should produce heavier smoke and recoil, including a tiny backward hull kick. The review applies these directions; campaign integration remains separate.

Review the existing military models together at original infantry scale. Soldiers need walk, run, aim, fire, crouch, cover peek/return and reload actions. Tanks need moving tracks, turret traverse and firing feedback.

## Implemented study

`/animation-review.html` provides a deterministic 24-second loop with pause, seek, frame stepping, speed and camera controls. Original articulated infantry geometry supplies riflemen, guards, LMGs and engineers; three actors represent each role. Sandbags, tall wall sections and wire stage the cover actions. Standard tanks, landships, artillery, both aircraft and the jeep share the same model coordinates.

Procedural infantry pose sampling extends the existing rig without replacing its live walk/aim tables. Reload gestures lower the weapon and move the support hand; the LMG drum lifts, disappears during exchange and returns. Moving tank links follow signed hull travel, turret pivots traverse and separate barrels recoil. Aircraft use existing propeller/turbine pivots. The jeep demonstrates translation and tailgate opening.

## Provisional and excluded

Durations, poses, recoil strength and formation spacing are animation tuning. These are reusable procedural poses on an authored timeline, not exported GLB skeletal clips. Reloading is illustrative rather than a mechanically detailed weapon-specific action. The scene does not implement ammunition, automatic cover selection, line-of-fire simulation or campaign combat. Engineers demonstrate tool movement rather than gunfire. Jeep wheels are not yet articulated.

All objects retain scale 1 in original model units; city integration must apply the shared 0.55 transform used for its infantry. Close-up cameras hide the overview labels so poses remain visible.
