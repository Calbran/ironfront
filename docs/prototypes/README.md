# Infantry rendering study

Open `/prototypes/infantry-benchmark.html` on the development or production server. This is a standalone exported visual study, not a campaign renderer feature. It uses a captured Ironfront map and a pinned Three.js 0.170.0 CDN module, so first load requires internet access.

- `infantry-overlay.fragment.html`: editable source for the exported study.
- `../../apps/web/public/prototypes/infantry-benchmark.html`: standalone export, including controls and styling.
- [Benchmark report](infantry-benchmark.md): test conditions, successive implementations, measurements and limitations.

Small soldiers are the selected presentation direction. The prototype retains individual movement and firing schedules, while interpolating shared walking/aiming poses and instancing body parts and muzzle flashes. Repositioning does not implement cover selection, collision or combat authority. All outcomes remain outside the actual game.

The source/export are HTML study artifacts rather than application modules. A live integration should follow the project's TypeScript architecture and use measured game-state updates. The exported page can be regenerated using the visualize skill's `scripts/render.py <source-fragment> <destination-html>` command; its styling and wrapper are bundled in the checked-in export.

Validation: inspected small and enlarged models, aiming, walking, timeline scrubbing and the visibility toggle in the browser. The benchmark completed through 4,000 animated soldiers with instance counts and padded viewport checks passing. No application or server behavior changed.
