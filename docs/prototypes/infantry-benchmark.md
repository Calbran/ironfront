# Infantry overlay benchmark — September 10, 2026

## Shared animation revision — latest

Same visible browser and machine, 1102 × 528 CSS pixels, pixel ratio 1.10, small models and shadows enabled. Same 0/500/1,000/1,500/2,000/3,000/4,000 sequence, 1.5 seconds warm-up plus approximately 4 seconds sampling per count. All counts passed instance-count and viewport-position validation. One local run per revision; no cross-device or whole-game guarantee.

| Soldiers | Average FPS | 95th-percentile frame interval | Median animation + render submission | Reported draw calls | Reported triangles |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 165.0 | 6.2 ms | 0.1 ms | 1 | 2 |
| 500 | 165.0 | 6.2 ms | 1.2 ms | 14 | 174,242 |
| 1,000 | 165.0 | 6.2 ms | 2.4 ms | 14 | 348,502 |
| 1,500 | 165.0 | 6.2 ms | 3.7 ms | 14 | 522,762 |
| 2,000 | 165.0 | 6.2 ms | 4.8 ms | 14 | 697,022 |
| 3,000 | 124.7 | 12.2 ms | 7.8 ms | 14 | 1,045,502 |
| 4,000 | 90.7 | 12.2 ms | 10.7 ms | 14 | 1,394,022 |

At 2,000 soldiers, median CPU update/submission fell from 24.7 to 4.8 ms. At 4,000 it fell from 54.3 to 10.7 ms; average FPS rose from 17.1 to 90.7. The prior overlay-only 60 FPS crossing has therefore moved beyond the largest tested count of 4,000. The new exact ceiling has not been measured. A 2,000-visible-soldier integration test is now reasonable on this machine; deployment budgets still require the live map and target devices.

Implementation changes:

- Precompute 65 walking poses and 25 aiming poses at each of five recoil strengths using the existing articulated rig. Interpolate neighboring phase matrices; recoil selects the nearest precomputed strength.
- Preserve independent positions, motion phases, shooting schedules, torso sway and crouch offsets. This is shared pose data, not synchronized soldiers.
- Keep the per-soldier construction rigs outside the rendered scene. Compose cached local-part matrices directly with each soldier's world transform, avoiding repeated inverse-kinematics solves and deep scene traversal during rendering.
- Upload only populated instance-buffer ranges and draw muzzle flashes in one shared instance batch. Geometry remains 348 triangles per soldier; shadows remain enabled.

Visual verification covered enlarged aiming silhouettes, small-size playback, timeline scrubbing and infantry visibility toggling. Cached animation is an approximation of the procedural rig, with interpolated phase samples and quantized recoil; it is not a claim of bit-identical vertex motion. Startup pose baking and soldier construction are excluded from steady-state timing. No animation has been moved to GPU execution in this revision; that remains a separate potential optimization.

The static terrain capture still excludes the live Pixi map, camera interactions, pathfinding, combat simulation and networking. CPU timings still measure update/submission, not GPU completion. Older sections below are historical results.

## Extended crowd benchmark: 500–4,000 soldiers

Same machine, visible browser, 1102 × 528 CSS pixels, pixel ratio 1.10, small models and enabled shadows. One run, 1.5 seconds warm-up plus approximately 4 seconds sampling per count. The larger-count layout deliberately distributes all soldiers within the viewport. Before accepting each row, the test verifies one submitted hip instance and two thigh instances per soldier, plus every soldier's screen-space center inside a padded viewport. Instance capacity was increased to 8,000 parts per batch to fit both legs of 4,000 soldiers. Unit construction remains outside timing.

| Soldiers | Average FPS | 95th-percentile frame interval | Median animation + render submission | Reported draw calls | Reported triangles |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 165.0 | 6.2 ms | 0.2 ms | 1 | 2 |
| 500 | 161.7 | 6.2 ms | 4.8 ms | 26 | 174,262 |
| 1,000 | 88.5 | 12.3 ms | 10.7 ms | 38 | 348,502 |
| 1,500 | 55.2 | 18.3 ms | 17.5 ms | 51 | 522,762 |
| 2,000 | 40.0 | 30.3 ms | 24.7 ms | 65 | 697,042 |
| 3,000 | 25.3 | 42.5 ms | 39.3 ms | 88 | 1,045,502 |
| 4,000 | 17.1 | 85.0 ms | 54.3 ms | 114 | 1,394,022 |

The tested 60 FPS crossing lies between 1,000 and 1,500 simultaneously animated soldiers; an exact threshold was not measured. The tested 30 FPS crossing lies between 2,000 and 3,000. These are overlay-only results, not whole-game capacities. A provisional 500–1,000 visible-soldier budget leaves more room for integration than 2,000, which already misses 60 FPS without the live map. Total campaign army size is a separate concern from simultaneously rendered individual soldiers.

At 1,000 soldiers the median CPU update/submission already takes 10.7 ms of a 16.7 ms budget; at 2,000 it takes 24.7 ms. The remaining scaling cost is consistent with per-soldier JavaScript animation, transform traversal and instance uploads, rather than a high draw-call count alone. Dedicated profiling is required to separate those costs from GPU work. Next optimizations to test are reduced animation update frequency for distant squads and GPU-driven or baked crowd animation. No full-game FPS guarantee follows from this test.

## Simplified, instanced revision

Second implementation measured in the same browser at the same 1102 × 528 CSS-pixel viewport, 1.10 pixel ratio, small size, shadows enabled, and identical schedule and benchmark durations. One run of each implementation; this is a local comparison, not a cross-device guarantee.

The soldier now uses 348 triangles, versus approximately 5,452 before (93.6% fewer). Colored body parts share geometry and material batches across the crowd. Knees, feet, torso, arms and rifle remain articulated, and individual squad schedules are retained. Muzzle flashes remain separate small meshes.

| Soldiers | Average FPS | 95th-percentile frame interval | Median animation + render submission | Reported draw calls | Reported triangles |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 165.0 | 6.2 ms | 0.3 ms | 1 | 2 |
| 32 | 165.0 | 6.2 ms | 0.5 ms | 13 | 11,138 |
| 64 | 165.0 | 6.2 ms | 0.7 ms | 14 | 22,294 |
| 128 | 165.0 | 6.2 ms | 1.1 ms | 16 | 44,606 |
| 256 | 165.0 | 6.2 ms | 2.1 ms | 19 | 89,210 |

At 256 soldiers, median CPU update/submission fell from 33.9 to 2.1 ms and reported draw calls fell from 9,991 to 19. The improvement combines geometry simplification, shared resources and instanced drawing; it must not be attributed to polygon reduction alone. All tested counts reached the same approximately 165 FPS scheduling ceiling as the empty scene, so these results do not establish maximum capacity. Instance batches disable whole-batch frustum culling and pack only active, visible soldier transforms. Shadow rendering remains enabled.

The benchmark still excludes the live Pixi map, pathfinding, combat simulation and GPU-completion timing. The earlier recommendation to optimize this prototype before crowds has been addressed for these tested counts; live-game integration and lower-end-device tests remain necessary.

## Original detailed revision

Measured in the visible Codex in-app browser on this machine, Chrome 152 / Windows. One run; results are not cross-device guarantees.

Viewport: 1102 × 528 CSS pixels. Pixel ratio: 1.10. Small soldiers, animated articulated geometry, shadow rendering enabled. Each count gets 1.5 seconds of warm-up and approximately 4 seconds of sampling. Counts are warmed and sampled separately; model construction is excluded. All test soldiers are animated and placed within the viewport. The background is a static capture of the actual Ironfront map.

| Soldiers | Average FPS | 95th-percentile frame interval | Median animation + render submission | Reported draw calls | Reported triangles |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 165.0 | 6.2 ms | 0.3 ms | 1 | 2 |
| 32 | 155.5 | 12.1 ms | 4.9 ms | 1,249 | 174,466 |
| 64 | 108.8 | 12.2 ms | 8.8 ms | 2,498 | 348,950 |
| 128 | 57.8 | 24.2 ms | 16.5 ms | 4,996 | 697,918 |
| 256 | 29.2 | 36.5 ms | 33.9 ms | 9,991 | 1,395,834 |

FPS is calculated from measured requestAnimationFrame intervals, including browser scheduling. CPU duration measures the animation update and renderer submission; it is not a GPU-completion timer. Draw and triangle counters come from Three.js renderer.info and should not be interpreted as a full accounting of every shadow pass. The 165 FPS empty-scene result reflects this environment's scheduling ceiling, not unlimited rendering capacity.

## Interpretation

This implementation works for a few visible squads on this machine. At 128 soldiers it is already below an average 60 FPS, with slower frames near 24 ms, before adding the live map renderer. At 256 soldiers it averages about 29 FPS. Submission and animation time rises roughly with soldier count, consistent with high per-soldier CPU/render overhead; isolated profiling would be needed to attribute the exact bottleneck.

The next production step is shared, optimized assets with fewer material batches and an animation pipeline that can batch crowds or use baked animation. Small, distant units should use simplified animation/geometry or sprite representations. The next integration benchmark must include the live Pixi terrain, labels, cities, camera movement, picking, effects and game simulation, followed by a lower-end-device run. These results do not certify whole-game performance.

## Squad behavior in this revision

- Small size is the default.
- Seeded individual placements form loose eight-person groups instead of straight ranks.
- Soldiers have different departure times, movement durations, pauses, and short repositioning paths.
- Shots have independently sampled intervals, with occasional longer pauses; firing is suppressed during movement.
- Walking phase follows distance traveled, with distinct phase offsets. Soldiers re-shoulder their rifles after moving and make small idle torso adjustments.
- Timeline scrubbing and replay are deterministic. Repositioning is visual choreography: there is no terrain-aware cover selection, line-of-sight solving or live combat logic.
