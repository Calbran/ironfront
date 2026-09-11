# Full-city commanded skirmish — 2026-09-10

Open `/city-diorama.html?case=citywide&seed=732`. The full city stages six friendly infantry and one tank against six defending infantry, initially paused. Select infantry squad, individual buttons, or box-select; Shift adds to selection. Right-click ground to move; click a red enemy or its marker to focus fire. Attack orders try reachable firing positions when blocked or out of range. Start/pause controls simulation; reset creates a fresh scenario.

The server owns movement, health, target choice, seeded firing and delayed tank impacts. It uses the shared fire kernel with one representative per infantry model, a 0.25-second exchange and provisional 4x damage tuning for this isolated test. Movement advances at 20 Hz; snapshots poll at roughly 6.7 Hz. Buildings use the same seeded full-city geometry and block shots; low obstacles reduce exposure. Casualties disappear from the scene and markers. Tracers and recoil are presentation only. Enemy infantry hold their positions and return fire; this is not a tactical maneuver AI.

Sessions are ephemeral and separate from campaign saves. Opaque bearer keys restrict commands; clients cannot command enemies or supply health. Sessions expire after 20 idle minutes. Full-city plan generation runs in a worker with a bounded cache; the first load can take about 25 seconds. This is not a full-scale multiplayer benchmark, and the presentation still uses simple tracer/casualty effects.

Validation includes deterministic fire and casualty tests, ownership, pause and movement-order tests. Live browser review confirmed start/pause, enemy casualties and the full-city scene.
