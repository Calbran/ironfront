# Infantry benchmark — Apple M5, September 10, 2026

Measured commit: `b0d60d5` (shared-animation infantry prototype). One run in the visible Codex in-app browser, Chrome 152, on macOS 26.5. Hardware: Apple M5, 10-core integrated GPU, 16 GiB unified memory.

Development server: `http://127.0.0.1:5173/`. Benchmark: `/prototypes/infantry-benchmark.html`.

Scene viewport: 596 × 286 CSS pixels; renderer pixel ratio 1.5. Small soldiers, shadows enabled. Each count receives 1.5 seconds warm-up and approximately 4 seconds sampling. The benchmark reported completion with every tested soldier submitted and positioned inside the viewport.

| Soldiers | Average FPS | P95 frame interval | Median animation + render submission | Draw calls | Triangles |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 60.0 | 17.1 ms | 0.4 ms | 1 | 2 |
| 500 | 60.0 | 17.2 ms | 3.9 ms | 14 | 174,242 |
| 1,000 | 60.0 | 16.8 ms | 3.7 ms | 14 | 348,502 |
| 1,500 | 60.0 | 16.8 ms | 5.4 ms | 14 | 522,762 |
| 2,000 | 60.0 | 16.8 ms | 7.4 ms | 14 | 697,022 |
| 3,000 | 60.0 | 16.8 ms | 9.8 ms | 14 | 1,045,502 |
| 4,000 | 60.0 | 16.8 ms | 12.8 ms | 14 | 1,394,042 |

All tested counts reached this browser/display's approximately 60 FPS scheduling ceiling. This establishes no capacity above 4,000. The slight non-monotonic CPU timings at 500 and 1,000 are from one run, not repeated statistical estimates.

This is an overlay over a static terrain capture. It excludes the live map, pathfinding, combat simulation and networking. CPU duration measures update/submission, not GPU completion. Startup model construction and pose baking are excluded. The earlier Windows measurements used a different viewport and pixel ratio, so these results are not a controlled machine-to-machine comparison. Whole-game performance remains unmeasured here.
