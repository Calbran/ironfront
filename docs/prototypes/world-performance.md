# Full-world miniature performance experiment

Implemented on `codex/threejs-miniatures`, in `/three-preview.html`. Open **World stress test** to set 0 / 2,000 / 8,000 synthetic soldiers, concentrate them at the camera, force full-detail comparison, or measure the current view for five seconds. Reference-scene and generated-world buildings/trees now use the same asset factory.

## Rendering changes

- Detailed buildings, deciduous trees, conifers and winter caps are instanced by material/variant within 70-model-unit spatial chunks. Generate at most eight newly visible chunks per animation frame. Keep a nearby cache, evict invisible instance buffers after roughly 180 render frames or under cache pressure; retain shared geometry/materials. Full-detail comparison intentionally retains all visible chunks.
- Orthographic zoom selects detail: tactical uses the shared miniature kit; regional uses the existing simplified buildings/forest; continent uses settlement markers and suppresses roads, rocks and stress troops. Strategy ownership remains a separate user-controlled mode.
- Detailed shadows are restricted to tactical/full-detail views. Building sprite mode suppresses detailed buildings while retaining the detailed trees rather than drawing both representations.
- Synthetic troops share the existing baked infantry poses and instanced parts. Frustum checks restrict pose submission to visible troops. Distributed placement uses settlement anchors; concentrated placement follows the camera. These positions are synthetic and may overlap terrain/buildings; no campaign simulation, navigation, collision or orders are measured.
- Reference art scene continues to merge static parts by material, using the same extracted asset factory.

## Reproduce

Start Vite on port 5187 and run `node --import tsx scripts/world-performance-browser.ts`. `CHROMIUM_PATH` overrides the installed Chrome executable. Run with other rendering tasks closed. Reports/screenshots are written to `/private/tmp/ironfront-world-performance`; the recorded result JSON accompanies this document.

Each case settles for two seconds and measures four seconds of requestAnimationFrame intervals. A case reports median, p95/p99 frame interval, frames over 33.4 ms, peak submitted calls/triangles and peak visible synthetic troops. Pan cases traverse the map and can finish over empty terrain; use peak visible counts instead of interpreting the final count as the entire workload. Force-full-detail is a comparison, not the default recommended mode.

`geometryMiB` estimates typed geometry and instance-matrix buffers attached to the scene, not total GPU memory or peak allocation. Texture count is a resource count, not bytes. `jsHeapMiB` is Chromium's sampled JS heap and fluctuates with garbage collection. Neither includes all browser/driver memory. GPU timing queries and a long-session leak audit are not included.

CPU-throttled cases use Chrome's 4× CPU throttling on the same local GPU. The phone case changes viewport dimensions on the same desktop. Neither constitutes testing a low-end GPU or real phone. Frame pacing near 16.7 ms is display-limited and does not establish spare GPU capacity.

## Scope boundary

This measures one existing-size seeded world with the new building/tree kit, winter caps, existing simplified terrain/roads/rocks and synthetic troop animation. It does not replicate the reference scene's dense sculpted ground mesh, water treatment, bridge/field/prop population across the continent. It excludes live campaign simulation/networking and long-session asset churn. The art kit's memory/detail management is implemented; adopting the entire reference terrain treatment still requires another budget check.

The objective is evidence for the migration, not a universal frame-rate guarantee. Before adoption, repeat on the chosen minimum device, broader seeds, higher pixel ratios, and an actual populated campaign. Keep the detail limits enabled even when this machine can draw the unrestricted comparison.

## Recorded local results

World: **14,400 × 9,600 world units; 96 regions; 64 settlements; 2,135 trees.**

Browser: 149.0.7827.55. GPU reported by WebGL: `ANGLE (Apple, ANGLE Metal Renderer: Apple M5, Unspecified Version)`.

| Scenario | p95 frame interval | Peak visible soldiers | Peak draw calls | Peak triangles |
|---|---:|---:|---:|---:|
| tactical-2000 | 17.8 ms | 32 | 99 | 715,772 |
| regional-2000 | 17.8 ms | 782 | 256 | 553,680 |
| continent-8000 | 18.2 ms | 0 | 141 | 39,900 |
| pan-8000 | 18.1 ms | 125 | 110 | 1,113,378 |
| battle-2000 | 17.8 ms | 2,000 | 99 | 1,400,636 |
| battle-8000 | 16.8 ms | 8,000 | 246 | 3,868,714 |
| winter-battle-8000 | 16.8 ms | 8,000 | 270 | 4,154,237 |
| cpu4x-pan-8000 | 18.6 ms | 125 | 110 | 1,113,378 |
| cpu4x-battle-8000 | 19.2 ms | 8,000 | 246 | 3,868,714 |
| continent-full-detail | 16.8 ms | 0 | 1,219 | 2,833,716 |
| return-tactical | 17.9 ms | 32 | 99 | 715,772 |
| phone-viewport | 18.3 ms | 32 | 97 | 715,528 |

No sampled frame exceeded 33.4 ms; no page errors. The CPU-throttled battle sampled 220 frames in approximately four seconds (about 55 FPS). Other cases were close to 60 FPS. These short samples establish neither sustained minimum-device performance nor extra headroom beyond the display cap.

Compared with forced full detail, automatic continent mode submitted about **98.6% fewer triangles** and **88.4% fewer draw calls**. This comparison used 8,000 configured but hidden synthetic soldiers in automatic continent mode versus no synthetic soldiers in forced-detail mode; the geometry reduction is primarily scenery detail.

Resident high-detail chunks fell from 44 in forced continent detail to 9 on return to the tactical view. Estimated attached geometry/instance buffers returned from 9.38 MiB to 9.08 MiB. Sampled JS heap ranged approximately 37–57 MiB. Shared asset buffers remain resident by design. This single cycle is not a memory-leak audit.

Raw data: [world-performance-results.json](world-performance-results.json).
