# Military animation review

## Anti-tank team

Added an anti-tank launcher role using the original infantry rig and scale. The two-person review station has a rocket gunner, rifle escort and ammunition crate. The gunner uses an industrial shoulder tube, brass reinforcement bands, rocket nose and spare-round pack, with single-shot launch, smoke, a short projectile trail and a visible reload. It is available through the diorama camera selector. No campaign damage/recruitment rules or faction exclusivity were added.

## Run-cycle follow-up

Used the user's contact/down/push/up reference to replace the sped-up walking gait. The armed run now has longer stance travel, bent-knee heel recovery, opposing hip/shoulder rotation and a brief lifted flight phase instead of pinning a foot down throughout. Cycle duration is 0.8 seconds; forward speed is 2.6 model units/second. Added stride/flight checks and a browser run frame. Timings remain provisional art tuning; live campaign walk/aim tables retain their existing inputs.

## Cover and armor follow-up

Low-cover sequences now rise/fire/duck in place, including when an edge-peek clip is selected. Tall-wall guards retain side peeks. Muzzle-height checks cover rifle and LMG poses; reduced the LMG firing crouch so the longer barrel clears the bags. Tanks get roughly doubled barrel travel, quick recoil with slower recovery, a small opposite-to-turret hull kick and larger fading smoke. Added settle/finite-value checks and browser frames for the late cover cycle and lingering tank smoke.

## LMG follow-up

The user requested faster, more imposing LMG fire. The review now shows eight-round bursts at a provisional 600 rpm, short burst pauses, stronger flashes and brief tracers with slightly staggered firing phases. Larger receivers, barrel cooling bands, folded bipods and drums preserve the original soldier scale. Crouched reloads rise slightly to clear the longer barrel. Added a cadence/disabled-fire invariant and retained grounded-pose checks. These edits affect the diorama actors, not campaign combat balance or the static GLB catalog.

- Built a separate military training diorama with the existing units and shared infantry proportions.
- Added infantry pose sampling and authored cover/reload sequences, instanced tank tracks, turret traverse and barrel recoil.
- Added playback controls and close-up views; linked the study from the military model catalog.
- Checked finite grounded poses across every infantry clip/role, cover firing exposure, reload exclusivity and the existing infantry/model invariants. Browser checks cover rendering, scrubbing, stepping, slow motion and mobile width.
- Remains an animation study. No authoritative campaign behavior or city-generation code was changed for this task.
- Validation complete: typecheck, production build, all 42 test files, desktop/mobile Chromium controls and HTTP 200 through the existing Tailscale preview URL. Vite retains its existing large-chunk advisory.
